import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Appointment } from '../../core/models/business.models';
import {
  isSameWallClockDay,
  wallClockDayStart,
  wallClockSortKey
} from '../../core/utils/appointment-time';
import { AppointmentService } from './services/appointment.service';

interface DashboardStats {
  todayCount: number;
  pendingCount: number;
  confirmedThisWeek: number;
  upcoming: Appointment[];
}

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly stats = signal<DashboardStats | null>(null);

  ngOnInit(): void {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    this.appointmentService
      .loadForRange(startOfToday, endOfWeek)
      .pipe(map((appointments) => this.buildStats(appointments, startOfToday, endOfWeek)))
      .subscribe({
        next: (dashboardStats) => {
          this.stats.set(dashboardStats);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('Failed to load dashboard data.');
        }
      });
  }

  private buildStats(
    appointments: Appointment[],
    startOfToday: Date,
    endOfWeek: Date
  ): DashboardStats {
    const todayCount = appointments.filter(
      (a) => isSameWallClockDay(a.startUtc, startOfToday) && a.status !== 'Cancelled'
    ).length;

    const pendingCount = appointments.filter((a) => a.status === 'Pending').length;

    const confirmedThisWeek = appointments.filter(
      (a) => a.status === 'Confirmed' && wallClockSortKey(a.startUtc) < wallClockDayStart(endOfWeek)
    ).length;

    const upcoming = appointments
      .filter(
        (a) =>
          a.status !== 'Cancelled' &&
          wallClockSortKey(a.startUtc) >= wallClockDayStart(startOfToday)
      )
      .sort((a, b) => wallClockSortKey(a.startUtc) - wallClockSortKey(b.startUtc))
      .slice(0, 5);

    return { todayCount, pendingCount, confirmedThisWeek, upcoming };
  }
}
