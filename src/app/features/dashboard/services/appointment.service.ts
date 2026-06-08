import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import {
  Appointment,
  CreateInternalAppointmentPayload,
  InternalAppointmentSlot
} from '../../../core/models/business.models';
import { wallClockSortKey } from '../../../core/utils/appointment-time';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  readonly appointments$ = this.appointmentsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  loadForRange(from: Date, to: Date): Observable<Appointment[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const params = new HttpParams()
      .set('from', from.toISOString())
      .set('to', to.toISOString());

    return this.http
      .get<Record<string, unknown>[]>('/api/businesses/me/appointments', { params })
      .pipe(
        map((items) => items.map((item) => this.normalizeAppointment(item))),
        tap({
          next: (appointments) => {
            this.appointmentsSubject.next(appointments);
            this.loadingSubject.next(false);
          },
          error: () => {
            this.appointmentsSubject.next([]);
            this.loadingSubject.next(false);
            this.errorSubject.next('Failed to load appointments.');
          }
        })
      );
  }

  getInternalSlots(
    date: string,
    serviceId: string,
    staffId?: string
  ): Observable<InternalAppointmentSlot[]> {
    let params = new HttpParams().set('date', date).set('serviceId', serviceId);
    if (staffId) {
      params = params.set('staffId', staffId);
    }

    return this.http
      .get<Record<string, unknown>>('/api/appointments/internal/slots', { params })
      .pipe(
        map((response) => {
          const slotsRaw = (response['slots'] ?? response['Slots'] ?? []) as Record<string, unknown>[];
          return slotsRaw.map((slot) => this.normalizeSlot(slot));
        })
      );
  }

  createInternal(payload: CreateInternalAppointmentPayload): Observable<Appointment> {
    return this.http
      .post<Record<string, unknown>>('/api/appointments/internal', payload)
      .pipe(
        map((item) => this.normalizeAppointment(item)),
        tap((appointment) => this.addAppointment(appointment))
      );
  }

  confirmAppointment(id: string): Observable<Appointment> {
    return this.http
      .patch<Record<string, unknown>>(`/api/businesses/me/appointments/${id}/status`, {
        status: 'Confirmed'
      })
      .pipe(
        map((item) => this.normalizeAppointment(item)),
        tap((appointment) => this.updateAppointment(appointment))
      );
  }

  updateAppointment(appointment: Appointment): void {
    this.addAppointment(appointment);
  }

  addAppointment(appointment: Appointment): void {
    const current = this.appointmentsSubject.value;
    const withoutDuplicate = current.filter((a) => a.id !== appointment.id);
    const updated = [...withoutDuplicate, appointment].sort(
      (a, b) => wallClockSortKey(a.startUtc) - wallClockSortKey(b.startUtc)
    );
    this.appointmentsSubject.next(updated);
  }

  private normalizeAppointment(raw: Record<string, unknown>): Appointment {
    return {
      id: String(raw['id'] ?? raw['Id'] ?? ''),
      businessId: String(raw['businessId'] ?? raw['BusinessId'] ?? ''),
      customerName: String(raw['customerName'] ?? raw['CustomerName'] ?? ''),
      customerEmail: String(raw['customerEmail'] ?? raw['CustomerEmail'] ?? ''),
      customerPhone: raw['customerPhone'] != null || raw['CustomerPhone'] != null
        ? String(raw['customerPhone'] ?? raw['CustomerPhone'])
        : undefined,
      serviceId: raw['serviceId'] != null || raw['ServiceId'] != null
        ? String(raw['serviceId'] ?? raw['ServiceId'])
        : undefined,
      serviceName: String(raw['serviceName'] ?? raw['ServiceName'] ?? ''),
      startUtc: String(raw['startUtc'] ?? raw['StartUtc'] ?? ''),
      endUtc: String(raw['endUtc'] ?? raw['EndUtc'] ?? ''),
      bufferMinutes: raw['bufferMinutes'] != null || raw['BufferMinutes'] != null
        ? Number(raw['bufferMinutes'] ?? raw['BufferMinutes'])
        : undefined,
      staffId: raw['staffId'] != null || raw['StaffId'] != null
        ? String(raw['staffId'] ?? raw['StaffId'])
        : undefined,
      staffName: raw['staffName'] != null || raw['StaffName'] != null
        ? String(raw['staffName'] ?? raw['StaffName'])
        : undefined,
      status: (raw['status'] ?? raw['Status'] ?? 'Pending') as Appointment['status']
    };
  }

  private normalizeSlot(raw: Record<string, unknown>): InternalAppointmentSlot {
    return {
      startUtc: String(raw['startUtc'] ?? raw['StartUtc'] ?? ''),
      endUtc: String(raw['endUtc'] ?? raw['EndUtc'] ?? ''),
      label: String(raw['label'] ?? raw['Label'] ?? '')
    };
  }
}
