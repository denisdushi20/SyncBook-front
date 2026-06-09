import { Injectable, inject } from '@angular/core';

import {

  HubConnection,

  HubConnectionBuilder,

  HubConnectionState,

  LogLevel

} from '@microsoft/signalr';

import { BehaviorSubject, Subject } from 'rxjs';

import { environment } from '../../../environments/environment';

import {

  HubConnectionStatus,

  NewBookingAlert,

  VisitorChatMessage

} from '../models/business.models';

import { AuthService } from './auth.service';

import { SupportChatService } from './support-chat.service';



@Injectable({ providedIn: 'root' })

export class BookingAlertsHubService {

  private readonly authService = inject(AuthService);

  private readonly supportChatService = inject(SupportChatService);



  private connection: HubConnection | null = null;

  private activeBusinessId: string | null = null;



  private readonly liveNotificationSubject = new BehaviorSubject<NewBookingAlert | null>(null);

  private readonly bookingToastSubject = new Subject<NewBookingAlert>();

  private readonly newBookingCountSubject = new BehaviorSubject<number>(0);



  readonly liveNotification$ = this.liveNotificationSubject.asObservable();

  readonly bookingToast$ = this.bookingToastSubject.asObservable();

  readonly newBookingCount$ = this.newBookingCountSubject.asObservable();



  private readonly visitorMessageSubject = new Subject<VisitorChatMessage>();

  readonly visitorMessage$ = this.visitorMessageSubject.asObservable();



  private readonly connectionStateSubject = new BehaviorSubject<HubConnectionStatus>('disconnected');

  readonly connectionState$ = this.connectionStateSubject.asObservable();



  private readonly lastErrorSubject = new BehaviorSubject<string | null>(null);

  readonly lastError$ = this.lastErrorSubject.asObservable();



  constructor() {

    this.authService.currentUser$.subscribe((user) => {

      if (user?.role === 'BusinessOwner' && user.businessId) {

        void this.startConnection(user.businessId);

        this.supportChatService.hydrateForOwner();

      } else {

        void this.stopConnection();

      }

    });

  }



  resetBookingCount(): void {

    this.newBookingCountSubject.next(0);

  }



  async sendMessageToVisitor(

    visitorSessionId: string,

    message: string,

    visitorConnectionId?: string

  ): Promise<void> {

    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {

      throw new Error(this.lastErrorSubject.value ?? 'Not connected to support chat.');

    }



    await this.connection.invoke('SendMessageToVisitor', {

      visitorSessionId,

      visitorConnectionId: visitorConnectionId ?? null,

      message

    });

  }



  private async startConnection(businessId: string): Promise<void> {

    if (this.activeBusinessId === businessId && this.connection?.state === HubConnectionState.Connected) {

      this.connectionStateSubject.next('connected');

      return;

    }



    await this.stopConnection();

    this.activeBusinessId = businessId;

    this.connectionStateSubject.next('connecting');

    this.lastErrorSubject.next(null);



    this.connection = new HubConnectionBuilder()

      .withUrl(environment.notificationHubUrl, {

        accessTokenFactory: () => this.authService.getToken() ?? ''

      })

      .withAutomaticReconnect()

      .configureLogging(environment.production ? LogLevel.Warning : LogLevel.Information)

      .build();



    this.connection.on('NewBookingAlert', (raw: Record<string, unknown>) => {

      const alert = this.normalizeAlert(raw);

      this.liveNotificationSubject.next(alert);

      this.bookingToastSubject.next(alert);

      this.newBookingCountSubject.next(this.newBookingCountSubject.value + 1);

    });



    this.connection.on('ReceiveVisitorMessage', (raw: Record<string, unknown>) => {

      const message = this.normalizeVisitorMessage(raw);

      this.visitorMessageSubject.next(message);

      this.supportChatService.notifyLiveMessage(message);

    });



    this.connection.onreconnecting(() => {

      this.connectionStateSubject.next('connecting');

    });



    this.connection.onreconnected(async () => {

      if (this.activeBusinessId) {

        await this.connection?.invoke('JoinBusinessAlerts', this.activeBusinessId);

      }

      this.connectionStateSubject.next('connected');

      this.lastErrorSubject.next(null);

    });



    this.connection.onclose(() => {

      if (this.activeBusinessId) {

        this.connectionStateSubject.next('disconnected');

      }

    });



    try {

      await this.connection.start();

      await this.connection.invoke('JoinBusinessAlerts', businessId);

      this.connectionStateSubject.next('connected');

    } catch (err) {

      this.connection = null;

      this.activeBusinessId = null;

      const message = err instanceof Error ? err.message : 'Failed to connect to owner alerts.';

      this.lastErrorSubject.next(message);

      this.connectionStateSubject.next('error');

    }

  }



  private async stopConnection(): Promise<void> {

    if (this.connection) {

      try {

        await this.connection.stop();

      } catch {

        // ignore disconnect errors

      }

    }



    this.connection = null;

    this.activeBusinessId = null;

    this.connectionStateSubject.next('disconnected');

  }



  private normalizeVisitorMessage(raw: Record<string, unknown>): VisitorChatMessage {

    return {

      messageId: String(raw['messageId'] ?? raw['MessageId'] ?? ''),

      threadId: String(raw['threadId'] ?? raw['ThreadId'] ?? ''),

      businessId: String(raw['businessId'] ?? raw['BusinessId'] ?? ''),

      message: String(raw['message'] ?? raw['Message'] ?? ''),

      visitorConnectionId: String(

        raw['visitorConnectionId'] ?? raw['VisitorConnectionId'] ?? ''

      ),

      visitorSessionId: String(raw['visitorSessionId'] ?? raw['VisitorSessionId'] ?? ''),

      visitorEmail: String(raw['visitorEmail'] ?? raw['VisitorEmail'] ?? ''),

      sentAtUtc: String(raw['sentAtUtc'] ?? raw['SentAtUtc'] ?? new Date().toISOString())

    };

  }



  private normalizeAlert(raw: Record<string, unknown>): NewBookingAlert {

    return {

      notificationId: String(raw['notificationId'] ?? raw['NotificationId'] ?? ''),

      appointmentId: String(raw['appointmentId'] ?? raw['AppointmentId'] ?? ''),

      businessId: String(raw['businessId'] ?? raw['BusinessId'] ?? ''),

      customerName: String(raw['customerName'] ?? raw['CustomerName'] ?? ''),

      serviceId: String(raw['serviceId'] ?? raw['ServiceId'] ?? ''),

      serviceName: String(raw['serviceName'] ?? raw['ServiceName'] ?? ''),

      startUtc: String(raw['startUtc'] ?? raw['StartUtc'] ?? ''),

      endUtc: String(raw['endUtc'] ?? raw['EndUtc'] ?? ''),

      source: String(raw['source'] ?? raw['Source'] ?? '')

    };

  }

}

