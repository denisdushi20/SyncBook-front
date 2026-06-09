export type AnalyticsRange = 'month' | '90days' | 'year';

export interface BookingStatusBreakdown {
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
  cancelledCount: number;
  pendingPercent: number;
  confirmedPercent: number;
  completedPercent: number;
  cancelledPercent: number;
}

export interface TopService {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  revenue: number;
}

export interface DailyBookingTrend {
  date: string;
  bookingCount: number;
}

export interface AnalyticsDashboard {
  range: AnalyticsRange;
  fromUtc: string;
  toUtc: string;
  totalRevenue: number;
  potentialRevenue: number;
  totalBookings: number;
  averageOrderValue: number;
  bookingFulfillmentRatePercent: number;
  bookingStats: BookingStatusBreakdown;
  topPerformingServices: TopService[];
  bookingTrends: DailyBookingTrend[];
}
