import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface BusinessServiceItem {
  name: string;
  durationMinutes?: number;
}

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface Business {
  id: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  category?: string;
  image?: string;
  services: BusinessServiceItem[];
  workingHours: DaySchedule[];
}

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private readonly http = inject(HttpClient);

  getBusinesses(): Observable<Business[]> {
    return this.http
      .get<Record<string, unknown>[]>('/api/businesses')
      .pipe(map((items) => items.map((item) => this.normalizeBusiness(item))));
  }

  getBusiness(id: string): Observable<Business> {
    return this.http
      .get<Record<string, unknown>>(`/api/businesses/${id}`)
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
