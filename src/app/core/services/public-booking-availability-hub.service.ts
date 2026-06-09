import { Injectable } from '@angular/core';

import {

  HubConnection,

  HubConnectionBuilder,

  HubConnectionState,

  LogLevel

} from '@microsoft/signalr';

import { BehaviorSubject, Subject } from 'rxjs';

import { environment } from '../../../environments/environment';

import {

  AvailabilityChangedEvent,

  BusinessConfigChangedEvent,

  BusinessStatusChangedEvent,

  DaySchedule,

  HubConnectionStatus

} from '../models/business.models';



@Injectable({ providedIn: 'root' })

export class PublicBookingAvailabilityHubService {

  private connection: HubConnection | null = null;

  private activeBusinessId: string | null = null;

  private joinPromise: Promise<void> | null = null;



  private readonly availabilityChangedSubject = new Subject<AvailabilityChangedEvent>();

  readonly availabilityChanged$ = this.availabilityChangedSubject.asObservable();



  private readonly businessConfigChangedSubject = new Subject<BusinessConfigChangedEvent>();

  readonly businessConfigChanged$ = this.businessConfigChangedSubject.asObservable();



  private readonly businessStatusChangedSubject = new Subject<BusinessStatusChangedEvent>();

  readonly businessStatusChanged$ = this.businessStatusChangedSubject.asObservable();



  private readonly ownerMessageSubject = new Subject<string>();

  readonly ownerMessage$ = this.ownerMessageSubject.asObservable();



  private readonly connectionStateSubject = new BehaviorSubject<HubConnectionStatus>('disconnected');

  readonly connectionState$ = this.connectionStateSubject.asObservable();



  private readonly lastErrorSubject = new BehaviorSubject<string | null>(null);

  readonly lastError$ = this.lastErrorSubject.asObservable();



  async joinBusiness(businessId: string): Promise<void> {

    if (!businessId) {

      return;

    }



    if (this.activeBusinessId === businessId && this.connection?.state === HubConnectionState.Connected) {

      this.connectionStateSubject.next('connected');

      return;

    }



    if (this.joinPromise) {

      await this.joinPromise;

      if (this.activeBusinessId === businessId && this.connection?.state === HubConnectionState.Connected) {

        return;

      }

    }



    this.joinPromise = this.startConnection(businessId);

    try {

      await this.joinPromise;

    } finally {

      this.joinPromise = null;

    }

  }



  getConnectionId(): string | null {

    return this.connection?.connectionId ?? null;

  }



  isConnected(): boolean {

    return this.connection?.state === HubConnectionState.Connected;

  }



  async sendMessageToOwner(

    businessId: string,

    message: string,

    visitorSessionId: string,

    visitorEmail: string

  ): Promise<void> {

    await this.joinBusiness(businessId);



    if (!this.connection || this.connection.state !== HubConnectionState.Connected) {

      throw new Error(this.lastErrorSubject.value ?? 'Not connected to support chat.');

    }



    const connectionId = this.connection.connectionId;

    if (!connectionId) {

      throw new Error('Connection id unavailable.');

    }



    await this.connection.invoke(
      'SendMessageToOwner',
      businessId,
      message,
      connectionId,
      visitorSessionId,
      visitorEmail
    );

  }



  async leaveBusiness(): Promise<void> {

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



  private async startConnection(businessId: string): Promise<void> {
    if (
      this.activeBusinessId === businessId &&
      this.connection?.state === HubConnectionState.Connected
    ) {
      this.connectionStateSubject.next('connected');
      return;
    }

    if (this.activeBusinessId !== businessId) {
      await this.leaveBusiness();
    }

    this.activeBusinessId = businessId;

    this.connectionStateSubject.next('connecting');

    this.lastErrorSubject.next(null);



    this.connection = new HubConnectionBuilder()

      .withUrl(environment.publicAvailabilityHubUrl)

      .withAutomaticReconnect()

      .configureLogging(environment.production ? LogLevel.Warning : LogLevel.Information)

      .build();



    this.connection.on('AvailabilityChanged', (raw: Record<string, unknown>) => {

      this.availabilityChangedSubject.next(this.normalizeEvent(raw));

    });



    this.connection.on('BusinessConfigChanged', (businessId: string, updatedHours: unknown) => {

      this.businessConfigChangedSubject.next({

        businessId: String(businessId),

        workingHours: this.normalizeWorkingHours(updatedHours)

      });

    });



    this.connection.on('BusinessStatusChanged', (businessId: string, isLive: boolean) => {

      this.businessStatusChangedSubject.next({

        businessId: String(businessId),

        isLive: Boolean(isLive)

      });

    });



    this.connection.on('ReceiveOwnerMessage', (message: string) => {

      this.ownerMessageSubject.next(String(message));

    });



    this.connection.onreconnecting(() => {

      this.connectionStateSubject.next('connecting');

    });



    this.connection.onreconnected(async () => {

      if (this.activeBusinessId) {

        await this.connection?.invoke('JoinAvailability', this.activeBusinessId);

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

      await this.connection.invoke('JoinAvailability', businessId);

      this.connectionStateSubject.next('connected');

    } catch (err) {

      this.connection = null;

      this.activeBusinessId = null;

      const message = err instanceof Error ? err.message : 'Failed to connect to support chat.';

      this.lastErrorSubject.next(message);

      this.connectionStateSubject.next('error');

      throw err;

    }

  }



  private normalizeEvent(raw: Record<string, unknown>): AvailabilityChangedEvent {

    return {

      businessId: String(raw['businessId'] ?? raw['BusinessId'] ?? ''),

      startUtc: String(raw['startUtc'] ?? raw['StartUtc'] ?? ''),

      endUtc: String(raw['endUtc'] ?? raw['EndUtc'] ?? '')

    };

  }



  private normalizeWorkingHours(raw: unknown): DaySchedule[] {

    if (!Array.isArray(raw)) {

      return [];

    }



    return raw.map((entry) => {

      const d = entry as Record<string, unknown>;

      return {

        day: String(d['day'] ?? d['Day'] ?? ''),

        isOpen: Boolean(d['isOpen'] ?? d['IsOpen']),

        openTime: (d['openTime'] ?? d['OpenTime']) as string | undefined,

        closeTime: (d['closeTime'] ?? d['CloseTime']) as string | undefined

      };

    });

  }

}

