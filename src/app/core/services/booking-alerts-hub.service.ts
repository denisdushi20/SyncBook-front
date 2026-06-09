import { Injectable, inject } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NewBookingAlert } from '../models/business.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class BookingAlertsHubService {
  private readonly authService = inject(AuthService);

  private connection: HubConnection | null = null;
  private activeBusinessId: string | null = null;

  private readonly liveNotificationSubject = new BehaviorSubject<NewBookingAlert | null>(null);
  private readonly bookingToastSubject = new Subject<NewBookingAlert>();
  private readonly newBookingCountSubject = new BehaviorSubject<number>(0);

  readonly liveNotification$ = this.liveNotificationSubject.asObservable();
  readonly bookingToast$ = this.bookingToastSubject.asObservable();
  readonly newBookingCount$ = this.newBookingCountSubject.asObservable();

  constructor() {
    this.authService.currentUser$.subscribe((user) => {
      if (user?.role === 'BusinessOwner' && user.businessId) {
        void this.startConnection(user.businessId);
      } else {
        void this.stopConnection();
      }
    });
  }

  resetBookingCount(): void {
    this.newBookingCountSubject.next(0);
  }

  private async startConnection(businessId: string): Promise<void> {
    if (this.activeBusinessId === businessId && this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    await this.stopConnection();
    this.activeBusinessId = businessId;

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

    this.connection.onreconnected(async () => {
      if (this.activeBusinessId) {
        await this.connection?.invoke('JoinBusinessAlerts', this.activeBusinessId);
      }
    });

    try {
      await this.connection.start();
      await this.connection.invoke('JoinBusinessAlerts', businessId);
    } catch {
      this.connection = null;
      this.activeBusinessId = null;
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
