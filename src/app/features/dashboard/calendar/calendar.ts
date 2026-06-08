import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Appointment, CalendarViewMode } from '../../../core/models/business.models';
import { AppointmentDetailsComponent } from '../components/appointment-details/appointment-details';
import { CreateAppointmentComponent } from '../components/create-appointment/create-appointment';
import { AppointmentService } from '../services/appointment.service';
import {
  buildHourSlots,
  buildMonthGrid,
  buildWeekDays,
  formatAppointmentTime,
  formatRangeLabel,
  getAppointmentHour,
  getAppointmentsForDay,
  getRangeForView,
  getWeekdayLabels,
  shiftDate
} from '../utils/calendar-range';

@Component({
  selector: 'app-calendar',
  imports: [DatePipe, CreateAppointmentComponent, AppointmentDetailsComponent],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss'
})
export class CalendarComponent {
  private readonly appointmentService = inject(AppointmentService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly viewMode = signal<CalendarViewMode>('month');
  protected readonly currentDate = signal(new Date());
  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showCreateModal = signal(false);
  protected readonly prefillDate = signal<string | null>(null);
  protected readonly selectedAppointment = signal<Appointment | null>(null);

  protected readonly weekdayLabels = getWeekdayLabels();
  protected readonly hourSlots = buildHourSlots();

  protected readonly monthCells = computed(() => buildMonthGrid(this.currentDate()));
  protected readonly weekDays = computed(() => buildWeekDays(this.currentDate()));

  constructor() {
    this.appointmentService.appointments$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => this.appointments.set(items));

    effect(() => {
      const view = this.viewMode();
      const date = this.currentDate();
      const { from, to } = getRangeForView(view, date);

      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.appointmentService.loadForRange(from, to).subscribe({
        next: () => this.isLoading.set(false),
        error: () => {
          this.isLoading.set(false);
          this.errorMessage.set('Failed to load appointments.');
        }
      });
    });
  }

  protected rangeLabel(): string {
    return formatRangeLabel(this.viewMode(), this.currentDate());
  }

  protected setViewMode(mode: CalendarViewMode): void {
    this.viewMode.set(mode);
  }

  protected goToToday(): void {
    this.currentDate.set(new Date());
  }

  protected goPrev(): void {
    this.currentDate.set(shiftDate(this.currentDate(), this.viewMode(), -1));
  }

  protected goNext(): void {
    this.currentDate.set(shiftDate(this.currentDate(), this.viewMode(), 1));
  }

  protected openCreateModal(date?: Date): void {
    const target = date ?? this.currentDate();
    this.prefillDate.set(this.formatDateInput(target));
    this.showCreateModal.set(true);
  }

  protected closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.prefillDate.set(null);
  }

  protected onAppointmentCreated(): void {
    this.closeCreateModal();
  }

  protected openDetails(appointment: Appointment): void {
    this.selectedAppointment.set(appointment);
  }

  protected closeDetails(): void {
    this.selectedAppointment.set(null);
  }

  protected onAppointmentUpdated(): void {
    this.closeDetails();
  }

  protected dayAppointments(day: Date): Appointment[] {
    return getAppointmentsForDay(this.appointments(), day);
  }

  protected hourAppointments(day: Date, hour: number): Appointment[] {
    return this.dayAppointments(day).filter((a) => getAppointmentHour(a.startUtc) === hour);
  }

  protected formatTime(startUtc: string): string {
    return formatAppointmentTime(startUtc);
  }

  protected statusClass(status: string): string {
    return `appt-chip--${status.toLowerCase()}`;
  }

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
