import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge, of } from 'rxjs';
import { catchError, debounceTime, switchMap, tap } from 'rxjs/operators';
import {
  Appointment,
  BusinessServiceItem,
  InternalAppointmentSlot,
  StaffMember
} from '../../../../core/models/business.models';
import { BusinessProfileService } from '../../../../core/services/business-profile.service';
import { StaffService } from '../../../../core/services/staff.service';
import { AppointmentService } from '../../services/appointment.service';

@Component({
  selector: 'app-create-appointment',
  imports: [ReactiveFormsModule],
  templateUrl: './create-appointment.html',
  styleUrl: './create-appointment.scss'
})
export class CreateAppointmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly businessProfileService = inject(BusinessProfileService);
  private readonly staffService = inject(StaffService);
  private readonly appointmentService = inject(AppointmentService);

  readonly initialDate = input<string | null>(null);
  readonly closed = output<void>();
  readonly created = output<Appointment>();

  protected readonly services = signal<BusinessServiceItem[]>([]);
  protected readonly staffMembers = signal<StaffMember[]>([]);
  protected readonly availableSlots = signal<InternalAppointmentSlot[]>([]);
  protected readonly selectedSlot = signal<InternalAppointmentSlot | null>(null);
  protected readonly isLoadingSlots = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly businessId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    customerName: ['', Validators.required],
    customerEmail: ['', [Validators.required, Validators.email]],
    customerPhone: ['', Validators.required],
    staffId: ['', Validators.required],
    serviceId: ['', Validators.required],
    date: ['', Validators.required]
  });

  constructor() {
    merge(
      this.form.controls.staffId.valueChanges,
      this.form.controls.serviceId.valueChanges,
      this.form.controls.date.valueChanges
    )
      .pipe(
        debounceTime(200),
        tap(() => {
          this.selectedSlot.set(null);
          this.errorMessage.set(null);
        }),
        switchMap(() => this.fetchSlots()),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  ngOnInit(): void {
    const initial = this.initialDate();
    if (initial) {
      this.form.patchValue({ date: initial });
    } else {
      this.form.patchValue({ date: this.formatDateInput(new Date()) });
    }

    this.businessProfileService.getMyBusiness().subscribe({
      next: (business) => {
        this.businessId.set(business.id);
        this.services.set(business.services);
        this.loadStaff(business.id);
      },
      error: () => this.errorMessage.set('Failed to load business services.')
    });
  }

  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }

  protected selectSlot(slot: InternalAppointmentSlot): void {
    this.selectedSlot.set(slot);
    this.errorMessage.set(null);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const slot = this.selectedSlot();
    if (!slot) {
      this.errorMessage.set('Please select a time slot.');
      return;
    }

    const businessId = this.businessId();
    if (!businessId) {
      this.errorMessage.set('Business profile is not available.');
      return;
    }

    const { customerName, customerEmail, customerPhone, serviceId, staffId } = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.appointmentService
      .createInternal({
        businessId,
        customerName,
        customerEmail,
        customerPhone,
        serviceId,
        staffId,
        startTime: slot.startUtc,
        endTime: slot.endUtc
      })
      .subscribe({
        next: (appointment) => {
          this.isSubmitting.set(false);
          this.created.emit(appointment);
          this.closed.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const message = err?.error?.message ?? 'Failed to create appointment.';
          this.errorMessage.set(message);
        }
      });
  }

  private loadStaff(businessId: string): void {
    this.staffService.getByBusinessId(businessId, true).subscribe({
      next: (staff) => {
        this.staffMembers.set(staff);
        if (staff.length === 1) {
          this.form.patchValue({ staffId: staff[0].id });
        }
      },
      error: () => this.errorMessage.set('Failed to load staff members.')
    });
  }

  private fetchSlots() {
    const { serviceId, date, staffId } = this.form.getRawValue();
    if (!serviceId || !date || !staffId) {
      this.availableSlots.set([]);
      this.isLoadingSlots.set(false);
      return of([]);
    }

    this.isLoadingSlots.set(true);

    return this.appointmentService.getInternalSlots(date, serviceId, staffId).pipe(
      tap((slots) => {
        this.availableSlots.set(slots);
        this.isLoadingSlots.set(false);
      }),
      catchError(() => {
        this.availableSlots.set([]);
        this.isLoadingSlots.set(false);
        this.errorMessage.set('Failed to load available time slots.');
        return of([]);
      })
    );
  }

  private formatDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
