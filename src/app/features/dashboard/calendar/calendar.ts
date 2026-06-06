import { DatePipe } from '@angular/common';

import { Component, computed, effect, inject, signal } from '@angular/core';

import { Appointment, CalendarViewMode } from '../../../core/models/business.models';

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

  imports: [DatePipe],

  templateUrl: './calendar.html',

  styleUrl: './calendar.scss'

})

export class CalendarComponent {

  private readonly appointmentService = inject(AppointmentService);



  protected readonly viewMode = signal<CalendarViewMode>('month');

  protected readonly currentDate = signal(new Date());

  protected readonly appointments = signal<Appointment[]>([]);

  protected readonly isLoading = signal(false);

  protected readonly errorMessage = signal<string | null>(null);



  protected readonly weekdayLabels = getWeekdayLabels();

  protected readonly hourSlots = buildHourSlots();



  protected readonly monthCells = computed(() => buildMonthGrid(this.currentDate()));

  protected readonly weekDays = computed(() => buildWeekDays(this.currentDate()));



  constructor() {

    effect(() => {

      const view = this.viewMode();

      const date = this.currentDate();

      const { from, to } = getRangeForView(view, date);



      this.isLoading.set(true);

      this.errorMessage.set(null);



      this.appointmentService.loadForRange(from, to).subscribe({

        next: (items) => {

          this.appointments.set(items);

          this.isLoading.set(false);

        },

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

}

