import { Injectable } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AvailabilityChangedEvent } from '../models/business.models';

@Injectable({ providedIn: 'root' })
export class PublicBookingAvailabilityHubService {
  private connection: HubConnection | null = null;
  private activeBusinessId: string | null = null;

  private readonly availabilityChangedSubject = new Subject<AvailabilityChangedEvent>();
  readonly availabilityChanged$ = this.availabilityChangedSubject.asObservable();

  async joinBusiness(businessId: string): Promise<void> {
    if (!businessId) {
      return;
    }

    if (this.activeBusinessId === businessId && this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    await this.leaveBusiness();

    this.activeBusinessId = businessId;
    this.connection = new HubConnectionBuilder()
      .withUrl(environment.publicAvailabilityHubUrl)
      .withAutomaticReconnect()
      .configureLogging(environment.production ? LogLevel.Warning : LogLevel.Information)
      .build();

    this.connection.on('AvailabilityChanged', (raw: Record<string, unknown>) => {
      this.availabilityChangedSubject.next(this.normalizeEvent(raw));
    });

    this.connection.onreconnected(async () => {
      if (this.activeBusinessId) {
        await this.connection?.invoke('JoinAvailability', this.activeBusinessId);
      }
    });

    try {
      await this.connection.start();
      await this.connection.invoke('JoinAvailability', businessId);
    } catch {
      this.connection = null;
      this.activeBusinessId = null;
    }
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
  }

  private normalizeEvent(raw: Record<string, unknown>): AvailabilityChangedEvent {
    return {
      businessId: String(raw['businessId'] ?? raw['BusinessId'] ?? ''),
      startUtc: String(raw['startUtc'] ?? raw['StartUtc'] ?? ''),
      endUtc: String(raw['endUtc'] ?? raw['EndUtc'] ?? '')
    };
  }
}
