import { AsyncPipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  afterNextRender,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Chart,
  ChartConfiguration,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { AnalyticsDashboard, AnalyticsRange } from '../../../core/models/analytics.models';
import { AnalyticsService } from '../services/analytics.service';

Chart.register(
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend
);

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: '90days', label: '90 days' },
  { value: 'year', label: 'Year' }
];

const REVENUE_COLORS = ['#10b981', '#34d399', '#059669', '#6ee7b7', '#047857'];

interface MonthSelection {
  year: number;
  month: number;
}

@Component({
  selector: 'app-analytics-dashboard',
  imports: [AsyncPipe, CurrencyPipe, DecimalPipe],
  templateUrl: './analytics-dashboard.html',
  styleUrl: './analytics-dashboard.scss'
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {
  private readonly analyticsService = inject(AnalyticsService);

  @ViewChild('trendsCanvas') private trendsCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueCanvas') private revenueCanvas?: ElementRef<HTMLCanvasElement>;

  protected readonly rangeOptions = RANGE_OPTIONS;
  protected readonly selectedRange = signal<AnalyticsRange>('month');
  protected readonly selectedMonth = signal<MonthSelection>(this.currentUtcMonth());
  protected readonly dashboard$ = this.analyticsService.dashboard$;
  protected readonly loading$ = this.analyticsService.loading$;
  protected readonly error$ = this.analyticsService.error$;

  private trendsChart: Chart | null = null;
  private revenueChart: Chart | null = null;
  private trendsChartKind: 'bar' | 'line' | null = null;
  private pendingDashboard: AnalyticsDashboard | null = null;
  private trendDatesIso: string[] = [];

  constructor() {
    this.analyticsService.dashboard$.pipe(takeUntilDestroyed()).subscribe((dashboard) => {
      if (!dashboard) {
        return;
      }
      this.pendingDashboard = dashboard;
      afterNextRender(() => this.renderCharts());
    });
  }

  ngOnInit(): void {
    this.loadDashboard('month');
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  protected selectRange(range: AnalyticsRange): void {
    if (this.selectedRange() === range) {
      return;
    }
    this.selectedRange.set(range);
    if (range === 'month') {
      this.selectedMonth.set(this.currentUtcMonth());
    }
    this.loadDashboard(range, true);
  }

  protected shiftTrendMonth(delta: number): void {
    const current = this.selectedMonth();
    const shifted = new Date(Date.UTC(current.year, current.month - 1 + delta, 1));
    this.selectedMonth.set({
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1
    });
    this.selectedRange.set('month');
    this.loadDashboard('month', true);
  }

  protected trendsChartSubtitle(dashboard: AnalyticsDashboard): string {
    if (dashboard.range !== 'month' || dashboard.bookingTrends.length === 0) {
      return 'Daily bookings over the selected period';
    }

    const first = dashboard.bookingTrends[0].date;
    const parsed = new Date(`${first}T00:00:00Z`);
    return parsed.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  protected monthNavigatorLabel(): string {
    const { year, month } = this.selectedMonth();
    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
    return label;
  }

  private loadDashboard(range: AnalyticsRange, forceRefresh = false): void {
    const month = this.selectedMonth();
    this.analyticsService
      .loadDashboard(range, {
        forceRefresh,
        year: range === 'month' ? month.year : undefined,
        month: range === 'month' ? month.month : undefined
      })
      .subscribe();
  }

  private currentUtcMonth(): MonthSelection {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }

  private renderCharts(): void {
    if (!this.pendingDashboard) {
      return;
    }

    this.renderTrendsChart(this.pendingDashboard);
    this.renderRevenueChart(this.pendingDashboard);
  }

  private renderTrendsChart(dashboard: AnalyticsDashboard): void {
    const canvas = this.trendsCanvas?.nativeElement;
    if (!canvas) {
      return;
    }

    const isMonthView = dashboard.range === 'month';
    const chartKind: 'bar' | 'line' = isMonthView ? 'bar' : 'line';

    if (this.trendsChart && (this.trendsChart.canvas !== canvas || this.trendsChartKind !== chartKind)) {
      this.destroyTrendsChart();
    }

    this.trendDatesIso = dashboard.bookingTrends.map((t) => t.date);
    const labels = dashboard.bookingTrends.map((t) => this.formatTrendLabel(t.date, isMonthView));
    const data = dashboard.bookingTrends.map((t) => t.bookingCount);
    const pointRadii = data.map((count) => (count > 0 ? 5 : 0));

    const trendTooltipTitle = (items: { dataIndex?: number }[]) => {
      const index = items[0]?.dataIndex ?? 0;
      const isoDate = this.trendDatesIso[index];
      if (!isoDate) {
        return '';
      }
      return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      });
    };

    const trendTooltipLabel = (count: number) =>
      count === 1 ? ' 1 booking' : ` ${count} bookings`;

    const trendScales = {
      x: {
        title: isMonthView
          ? { display: true, text: 'Day of month', color: '#64748b', font: { size: 11 } }
          : { display: false },
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        ticks: {
          color: '#64748b',
          maxRotation: 0,
          autoSkip: !isMonthView,
          maxTicksLimit: isMonthView ? 31 : 12,
          callback: (_value: string | number, index: number) => labels[index] ?? ''
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.15)' },
        ticks: { color: '#64748b', precision: 0, stepSize: 1 }
      }
    };

    if (this.trendsChart) {
      const dataset = this.trendsChart.data.datasets[0];
      this.trendsChart.data.labels = labels;
      dataset.data = data;
      if (this.trendsChartKind === 'bar') {
        dataset.backgroundColor = data.map((count) =>
          count > 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(148, 163, 184, 0.2)'
        );
      } else if ('pointRadius' in dataset) {
        (dataset as { pointRadius?: number[] }).pointRadius = pointRadii;
      }
      this.trendsChart.update();
      return;
    }

    if (chartKind === 'bar') {
      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Bookings',
              data,
              backgroundColor: data.map((count) =>
                count > 0 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(148, 163, 184, 0.2)'
              ),
              borderColor: '#10b981',
              borderWidth: 1,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#e2e8f0',
              bodyColor: '#e2e8f0',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              borderWidth: 1,
              callbacks: {
                title: trendTooltipTitle,
                label: (ctx) => trendTooltipLabel(ctx.parsed.y ?? 0)
              }
            }
          },
          scales: trendScales
        }
      };
      this.trendsChart = new Chart(canvas, config);
    } else {
      const config: ChartConfiguration<'line'> = {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Bookings',
              data,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              fill: true,
              tension: 0.2,
              pointRadius: pointRadii,
              pointBackgroundColor: '#10b981',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#e2e8f0',
              bodyColor: '#e2e8f0',
              borderColor: 'rgba(16, 185, 129, 0.4)',
              borderWidth: 1,
              callbacks: {
                title: trendTooltipTitle,
                label: (ctx) => trendTooltipLabel(ctx.parsed.y ?? 0)
              }
            }
          },
          scales: trendScales
        }
      };
      this.trendsChart = new Chart(canvas, config);
    }

    this.trendsChartKind = chartKind;
  }

  private renderRevenueChart(dashboard: AnalyticsDashboard): void {
    const services = dashboard.topPerformingServices;

    if (services.length === 0) {
      this.destroyRevenueChart();
      return;
    }

    const canvas = this.revenueCanvas?.nativeElement;
    if (!canvas) {
      return;
    }

    if (this.revenueChart && this.revenueChart.canvas !== canvas) {
      this.destroyRevenueChart();
    }

    const labels = services.map((s) => s.serviceName);
    const data = services.map((s) => s.revenue);

    if (this.revenueChart) {
      this.revenueChart.data.labels = labels;
      this.revenueChart.data.datasets[0].data = data;
      this.revenueChart.data.datasets[0].backgroundColor = REVENUE_COLORS;
      this.revenueChart.update();
      return;
    }

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: REVENUE_COLORS,
            borderColor: '#fff',
            borderWidth: 2,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#64748b',
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#e2e8f0',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(16, 185, 129, 0.4)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const value = ctx.parsed;
                return ` $${value.toFixed(2)}`;
              }
            }
          }
        }
      }
    };

    this.revenueChart = new Chart(canvas, config);
  }

  private formatTrendLabel(date: string, monthView: boolean): string {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (monthView) {
      return String(parsed.getUTCDate());
    }

    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  }

  private destroyTrendsChart(): void {
    this.trendsChart?.destroy();
    this.trendsChart = null;
    this.trendsChartKind = null;
  }

  private destroyRevenueChart(): void {
    this.revenueChart?.destroy();
    this.revenueChart = null;
  }

  private destroyCharts(): void {
    this.destroyTrendsChart();
    this.destroyRevenueChart();
  }
}
