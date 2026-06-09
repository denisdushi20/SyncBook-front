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
  protected readonly isRejecting = signal(false);
  protected readonly isMarkingPaid = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected confirmAppointment(): void {
    this.runStatusAction('confirm');
  }

  protected rejectAppointment(): void {
    this.runStatusAction('reject');
  }

  protected markAsPaid(): void {
    const appt = this.appointment();
    if (appt.status !== 'Confirmed') {
      return;
    }

    this.isMarkingPaid.set(true);
    this.errorMessage.set(null);

    this.appointmentService.markAsPaid(appt.id).subscribe({
      next: (updated) => {
        this.isMarkingPaid.set(false);
        this.updated.emit(updated);
        this.closed.emit();
      },
      error: (err) => {
        this.isMarkingPaid.set(false);
        this.errorMessage.set(err?.error?.message ?? 'Failed to mark appointment as paid.');
      }
    });
  }

  protected formatStatus(status: Appointment['status']): string {
    if (status === 'Cancelled') return 'Rejected';
    if (status === 'Completed') return 'Paid';
    return status;
  }

  private runStatusAction(action: 'confirm' | 'reject'): void {
    const appt = this.appointment();
    if (appt.status !== 'Pending') {
      return;
    }

    const isConfirm = action === 'confirm';
    const busy = isConfirm ? this.isConfirming : this.isRejecting;
    busy.set(true);
    this.errorMessage.set(null);

    const request$ = isConfirm
      ? this.appointmentService.confirmAppointment(appt.id)
      : this.appointmentService.rejectAppointment(appt.id);

    request$.subscribe({
      next: (updated) => {
        busy.set(false);
        this.updated.emit(updated);
        this.closed.emit();
      },
      error: (err) => {
        busy.set(false);
        this.errorMessage.set(
          err?.error?.message ??
            (isConfirm ? 'Failed to confirm appointment.' : 'Failed to reject appointment.')
        );
      }
    });
  }
}
