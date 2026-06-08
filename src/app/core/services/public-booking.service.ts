import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  Business,
  CreatePublicAppointmentPayload,
  InternalAppointmentSlot,
  TodayAppointmentSummary
} from '../models/business.models';
import { BusinessService } from './business.service';

@Injectable({ providedIn: 'root' })
export class PublicBookingService {
  private readonly http = inject(HttpClient);
  private readonly businessService = inject(BusinessService);

  getBusinesses(): Observable<Business[]> {
    return this.businessService.getBusinesses();
  }

  getBusiness(id: string): Observable<Business> {
    return this.businessService.getBusiness(id);
  }

  getSlots(businessId: string, date: string, serviceId: string): Observable<InternalAppointmentSlot[]> {
    const params = new HttpParams().set('date', date).set('serviceId', serviceId);

    return this.http
      .get<Record<string, unknown>>(`/api/businesses/${businessId}/slots`, { params })
      .pipe(
        map((response) => {
          const slotsRaw = (response['slots'] ?? response['Slots'] ?? []) as Record<string, unknown>[];
          return slotsRaw.map((slot) => this.normalizeSlot(slot));
        })
      );
  }

  getTodayAppointments(businessId: string): Observable<TodayAppointmentSummary[]> {
    return this.http
      .get<Record<string, unknown>[]>(`/api/businesses/${businessId}/appointments/today`)
      .pipe(map((items) => items.map((item) => this.normalizeTodaySummary(item))));
  }

  createBooking(payload: CreatePublicAppointmentPayload): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>('/api/appointments/public', payload);
  }

  private normalizeSlot(raw: Record<string, unknown>): InternalAppointmentSlot {
    return {
      startUtc: String(raw['startUtc'] ?? raw['StartUtc'] ?? ''),
      endUtc: String(raw['endUtc'] ?? raw['EndUtc'] ?? ''),
      label: String(raw['label'] ?? raw['Label'] ?? '')
    };
  }

  private normalizeTodaySummary(raw: Record<string, unknown>): TodayAppointmentSummary {
    return {
      id: String(raw['id'] ?? raw['Id'] ?? ''),
      startUtc: String(raw['startUtc'] ?? raw['StartUtc'] ?? ''),
      endUtc: String(raw['endUtc'] ?? raw['EndUtc'] ?? ''),
      serviceName: String(raw['serviceName'] ?? raw['ServiceName'] ?? ''),
      status: (raw['status'] ?? raw['Status'] ?? 'Pending') as TodayAppointmentSummary['status']
    };
  }
}
