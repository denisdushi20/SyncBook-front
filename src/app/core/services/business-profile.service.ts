import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Business, BusinessServiceItem, DaySchedule } from '../models/business.models';

@Injectable({ providedIn: 'root' })
export class BusinessProfileService {
  private readonly http = inject(HttpClient);

  getMyBusiness(): Observable<Business> {
    return this.http
      .get<Record<string, unknown>>('/api/businesses/me')
      .pipe(map((item) => this.normalizeBusiness(item)));
  }

  updateWorkingHours(workingHours: DaySchedule[]): Observable<Business> {
    return this.http
      .put<Record<string, unknown>>('/api/businesses/me/working-hours', { workingHours })
      .pipe(map((item) => this.normalizeBusiness(item)));
  }

  addService(service: Omit<BusinessServiceItem, 'id'>): Observable<Business> {
    return this.http
      .post<Record<string, unknown>>('/api/businesses/me/services', service)
      .pipe(map((item) => this.normalizeBusiness(item)));
  }

  updateService(serviceId: string, service: Omit<BusinessServiceItem, 'id'>): Observable<Business> {
    return this.http
      .put<Record<string, unknown>>(`/api/businesses/me/services/${serviceId}`, service)
      .pipe(map((item) => this.normalizeBusiness(item)));
  }

  deleteService(serviceId: string): Observable<Business> {
    return this.http
      .delete<Record<string, unknown>>(`/api/businesses/me/services/${serviceId}`)
      .pipe(map((item) => this.normalizeBusiness(item)));
  }

  private normalizeBusiness(raw: Record<string, unknown>): Business {
    const servicesRaw = (raw['services'] ?? raw['Services'] ?? []) as Record<string, unknown>[];
    const hoursRaw = (raw['workingHours'] ?? raw['WorkingHours'] ?? []) as Record<string, unknown>[];

    return {
      id: String(raw['id'] ?? raw['Id'] ?? ''),
      name: String(raw['name'] ?? raw['Name'] ?? ''),
      email: String(raw['email'] ?? raw['Email'] ?? ''),
      phone: (raw['phone'] ?? raw['Phone']) as string | undefined,
      description: (raw['description'] ?? raw['Description']) as string | undefined,
      category: (raw['category'] ?? raw['Category']) as string | undefined,
      image: (raw['image'] ?? raw['Image']) as string | undefined,
      services: servicesRaw.map((s) => ({
        id: String(s['id'] ?? s['Id'] ?? ''),
        name: String(s['name'] ?? s['Name'] ?? ''),
        durationMinutes: (s['durationMinutes'] ?? s['DurationMinutes']) as number | undefined
      })),
      workingHours: hoursRaw.map((d) => ({
        day: String(d['day'] ?? d['Day'] ?? ''),
        isOpen: Boolean(d['isOpen'] ?? d['IsOpen']),
        openTime: (d['openTime'] ?? d['OpenTime']) as string | undefined,
        closeTime: (d['closeTime'] ?? d['CloseTime']) as string | undefined
      }))
    };
  }
}
