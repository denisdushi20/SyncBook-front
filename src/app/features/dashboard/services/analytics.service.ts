import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, map, Observable, of, tap } from 'rxjs';
import {
  AnalyticsDashboard,
  AnalyticsRange,
  BookingStatusBreakdown,
  DailyBookingTrend,
  TopService
} from '../../../core/models/analytics.models';

export interface AnalyticsLoadOptions {
  forceRefresh?: boolean;
  year?: number;
  month?: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);

  private readonly dashboardSubject = new BehaviorSubject<AnalyticsDashboard | null>(null);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly selectedRangeSubject = new BehaviorSubject<AnalyticsRange>('month');

  private lastLoadedKey: string | null = null;

  readonly dashboard$ = this.dashboardSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly selectedRange$ = this.selectedRangeSubject.asObservable();

  loadDashboard(range: AnalyticsRange, options: AnalyticsLoadOptions = {}): Observable<AnalyticsDashboard> {
    const { forceRefresh = false, year, month } = options;
    const cacheKey = this.buildCacheKey(range, year, month);

    if (!forceRefresh && this.lastLoadedKey === cacheKey && this.dashboardSubject.value) {
      this.loadingSubject.next(false);
      return of(this.dashboardSubject.value);
    }

    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.selectedRangeSubject.next(range);

    let params = new HttpParams().set('range', range);
    if (range === 'month' && year != null && month != null) {
      params = params.set('year', year).set('month', month);
    }

    return this.http
      .get<Record<string, unknown>>('/api/analytics/dashboard', { params })
      .pipe(
        map((raw) => this.normalizeDashboard(raw)),
        tap({
          next: (dashboard) => {
            this.dashboardSubject.next(dashboard);
            this.lastLoadedKey = cacheKey;
            this.loadingSubject.next(false);
          },
          error: () => {
            this.loadingSubject.next(false);
            this.errorSubject.next('Failed to load analytics data.');
          }
        })
      );
  }

  private normalizeDashboard(raw: Record<string, unknown>): AnalyticsDashboard {
    const statsRaw = (raw['bookingStats'] ?? raw['BookingStats'] ?? {}) as Record<string, unknown>;
    const topServicesRaw = (raw['topPerformingServices'] ?? raw['TopPerformingServices'] ?? []) as Record<
      string,
      unknown
    >[];
    const trendsRaw = (raw['bookingTrends'] ?? raw['BookingTrends'] ?? []) as Record<string, unknown>[];

    return {
      range: this.normalizeRange(raw['range'] ?? raw['Range'] ?? 'month'),
      fromUtc: String(raw['fromUtc'] ?? raw['FromUtc'] ?? ''),
      toUtc: String(raw['toUtc'] ?? raw['ToUtc'] ?? ''),
      totalRevenue: Number(raw['totalRevenue'] ?? raw['TotalRevenue'] ?? 0),
      potentialRevenue: Number(raw['potentialRevenue'] ?? raw['PotentialRevenue'] ?? 0),
      totalBookings: Number(raw['totalBookings'] ?? raw['TotalBookings'] ?? 0),
      averageOrderValue: Number(raw['averageOrderValue'] ?? raw['AverageOrderValue'] ?? 0),
      bookingFulfillmentRatePercent: Number(
        raw['bookingFulfillmentRatePercent'] ?? raw['BookingFulfillmentRatePercent'] ?? 0
      ),
      bookingStats: this.normalizeBookingStats(statsRaw),
      topPerformingServices: topServicesRaw.map((item) => this.normalizeTopService(item)),
      bookingTrends: trendsRaw.map((item) => this.normalizeTrend(item))
    };
  }

  private normalizeBookingStats(raw: Record<string, unknown>): BookingStatusBreakdown {
    return {
      pendingCount: Number(raw['pendingCount'] ?? raw['PendingCount'] ?? 0),
      confirmedCount: Number(raw['confirmedCount'] ?? raw['ConfirmedCount'] ?? 0),
      completedCount: Number(raw['completedCount'] ?? raw['CompletedCount'] ?? 0),
      cancelledCount: Number(raw['cancelledCount'] ?? raw['CancelledCount'] ?? 0),
      pendingPercent: Number(raw['pendingPercent'] ?? raw['PendingPercent'] ?? 0),
      confirmedPercent: Number(raw['confirmedPercent'] ?? raw['ConfirmedPercent'] ?? 0),
      completedPercent: Number(raw['completedPercent'] ?? raw['CompletedPercent'] ?? 0),
      cancelledPercent: Number(raw['cancelledPercent'] ?? raw['CancelledPercent'] ?? 0)
    };
  }

  private normalizeTopService(raw: Record<string, unknown>): TopService {
    return {
      serviceId: String(raw['serviceId'] ?? raw['ServiceId'] ?? ''),
      serviceName: String(raw['serviceName'] ?? raw['ServiceName'] ?? 'Unknown'),
      bookingCount: Number(raw['bookingCount'] ?? raw['BookingCount'] ?? 0),
      revenue: Number(raw['revenue'] ?? raw['Revenue'] ?? 0)
    };
  }

  private normalizeTrend(raw: Record<string, unknown>): DailyBookingTrend {
    return {
      date: String(raw['date'] ?? raw['Date'] ?? ''),
      bookingCount: Number(raw['bookingCount'] ?? raw['BookingCount'] ?? 0)
    };
  }

  private buildCacheKey(range: AnalyticsRange, year?: number, month?: number): string {
    if (range === 'month' && year != null && month != null) {
      return `${range}:${year}-${month}`;
    }
    return range;
  }

  private normalizeRange(raw: unknown): AnalyticsRange {
    const value = String(raw ?? 'month').toLowerCase();
    if (value === '30days') {
      return 'month';
    }
    if (value === 'month' || value === '90days' || value === 'year') {
      return value;
    }
    return 'month';
  }
}
