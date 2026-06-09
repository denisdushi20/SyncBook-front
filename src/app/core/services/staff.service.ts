import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  CreateStaffPayload,
  StaffMember,
  StaffWeeklyScheduleEntry,
  UpdateMyStaffProfilePayload,
  UpdateStaffPayload
} from '../models/business.models';

@Injectable({ providedIn: 'root' })
export class StaffService {
  private readonly http = inject(HttpClient);

  getByBusinessId(businessId: string, bookableOnly = true): Observable<StaffMember[]> {
    const params = new HttpParams()
      .set('businessId', businessId)
      .set('bookableOnly', String(bookableOnly));

    return this.http
      .get<Record<string, unknown>[]>('/api/staff', { params })
      .pipe(map((items) => items.map((item) => this.normalizeStaffMember(item))));
  }

  listMine(): Observable<StaffMember[]> {
    return this.http
      .get<Record<string, unknown>[]>('/api/businesses/me/staff')
      .pipe(map((items) => items.map((item) => this.normalizeStaffMember(item))));
  }

  create(payload: CreateStaffPayload): Observable<StaffMember> {
    return this.http
      .post<Record<string, unknown>>('/api/businesses/me/staff', payload)
      .pipe(map((item) => this.normalizeStaffMember(item)));
  }

  update(id: string, payload: UpdateStaffPayload): Observable<StaffMember> {
    return this.http
      .put<Record<string, unknown>>(`/api/businesses/me/staff/${id}`, payload)
      .pipe(map((item) => this.normalizeStaffMember(item)));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/businesses/me/staff/${id}`);
  }

  getMyStaffProfile(): Observable<StaffMember> {
    return this.http
      .get<Record<string, unknown>>('/api/businesses/me/staff/me')
      .pipe(map((item) => this.normalizeStaffMember(item)));
  }

  updateMyStaffProfile(payload: UpdateMyStaffProfilePayload): Observable<StaffMember> {
    return this.http
      .put<Record<string, unknown>>('/api/businesses/me/staff/me', payload)
      .pipe(map((item) => this.normalizeStaffMember(item)));
  }

  private normalizeStaffMember(raw: Record<string, unknown>): StaffMember {
    const scheduleRaw = (raw['weeklySchedule'] ?? raw['WeeklySchedule'] ?? []) as Record<
      string,
      unknown
    >[];

    return {
      id: String(raw['id'] ?? raw['Id'] ?? ''),
      userId: String(raw['userId'] ?? raw['UserId'] ?? ''),
      businessId: String(raw['businessId'] ?? raw['BusinessId'] ?? ''),
      fullName: String(raw['fullName'] ?? raw['FullName'] ?? ''),
      isBookable: Boolean(raw['isBookable'] ?? raw['IsBookable'] ?? false),
      weeklySchedule: scheduleRaw.map((entry) => this.normalizeScheduleEntry(entry))
    };
  }

  private normalizeScheduleEntry(raw: Record<string, unknown>): StaffWeeklyScheduleEntry {
    return {
      dayOfWeek: String(raw['dayOfWeek'] ?? raw['DayOfWeek'] ?? ''),
      startTime: (raw['startTime'] ?? raw['StartTime']) as string | undefined,
      endTime: (raw['endTime'] ?? raw['EndTime']) as string | undefined,
      isAvailable: Boolean(raw['isAvailable'] ?? raw['IsAvailable'] ?? false)
    };
  }
}
