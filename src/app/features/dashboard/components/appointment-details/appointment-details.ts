import { DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { Appointment } from '../../../../core/models/business.models';
import { AppointmentService } from '../../services/appointment.service';

@Component({
  selector: 'app-appointment-details',
  imports: [DatePipe],
  templateUrl: './appointment-details.html',
  styleUrl: './appointment-details.scss'
})
export class AppointmentDetailsComponent {
  private readonly appointmentService = inject(AppointmentService);

  readonly appointment = input.required<Appointment>();
  readonly closed = output<void>();
  readonly updated = output<Appointment>();

  protected readonly isConfirming = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected confirmAppointment(): void {
    const appt = this.appointment();
    if (appt.status !== 'Pending') {
      return;
    }

    this.isConfirming.set(true);
    this.errorMessage.set(null);

    this.appointmentService.confirmAppointment(appt.id).subscribe({
      next: (updated) => {
        this.isConfirming.set(false);
        this.updated.emit(updated);
        this.closed.emit();
      },
      error: (err) => {
        this.isConfirming.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Failed to confirm appointment.');
      }
    });
  }
}
