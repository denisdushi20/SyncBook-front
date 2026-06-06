import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { Appointment } from '../../../core/models/business.models';

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

  private normalizeAppointment(raw: Record<string, unknown>): Appointment {
    return {
      id: String(raw['id'] ?? raw['Id'] ?? ''),
      businessId: String(raw['businessId'] ?? raw['BusinessId'] ?? ''),
      customerName: String(raw['customerName'] ?? raw['CustomerName'] ?? ''),
      customerEmail: String(raw['customerEmail'] ?? raw['CustomerEmail'] ?? ''),
      serviceName: String(raw['serviceName'] ?? raw['ServiceName'] ?? ''),
      startUtc: String(raw['startUtc'] ?? raw['StartUtc'] ?? ''),
      endUtc: String(raw['endUtc'] ?? raw['EndUtc'] ?? ''),
      status: (raw['status'] ?? raw['Status'] ?? 'Pending') as Appointment['status']
    };
  }
}
