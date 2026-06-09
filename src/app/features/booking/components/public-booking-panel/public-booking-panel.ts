import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { merge, of } from 'rxjs';
import { catchError, debounceTime, switchMap, tap } from 'rxjs/operators';
import {
  Business,
  BusinessServiceItem,
  InternalAppointmentSlot
} from '../../../../core/models/business.models';
import { PublicBookingAvailabilityHubService } from '../../../../core/services/public-booking-availability-hub.service';
import { PublicBookingService } from '../../../../core/services/public-booking.service';

@Component({
  selector: 'app-public-booking-panel',
  imports: [ReactiveFormsModule],
  templateUrl: './public-booking-panel.html',
  styleUrl: './public-booking-panel.scss'
})
export class PublicBookingPanelComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly publicBookingService = inject(PublicBookingService);
  private readonly availabilityHub = inject(PublicBookingAvailabilityHubService);

  readonly businessId = input<string | null>(null);
  readonly showBusinessSelector = input(false);
  readonly compact = input(false);
  readonly booked = output<void>();
  readonly businessChanged = output<string>();

  protected readonly businesses = signal<Business[]>([]);
  protected readonly services = signal<BusinessServiceItem[]>([]);
  protected readonly availableSlots = signal<InternalAppointmentSlot[]>([]);
  protected readonly selectedSlot = signal<InternalAppointmentSlot | null>(null);
  protected readonly isLoadingSlots = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    businessId: [''],
    customerName: ['', Validators.required],
    customerEmail: ['', [Validators.required, Validators.email]],
    customerPhone: ['', Validators.required],
    serviceId: ['', Validators.required],
    date: ['', Validators.required]
  });

  constructor() {
    merge(
      this.form.controls.businessId.valueChanges,
      this.form.controls.serviceId.valueChanges,
      this.form.controls.date.valueChanges
    )
      .pipe(
        debounceTime(200),
        tap(() => {
          this.selectedSlot.set(null);
          this.successMessage.set(null);
        }),
        switchMap(() => this.fetchSlots()),
        takeUntilDestroyed()
      )
      .subscribe();

    this.availabilityHub.availabilityChanged$
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        const activeBusinessId = this.form.controls.businessId.value;
        if (!activeBusinessId || event.businessId !== activeBusinessId) {
          return;
        }

        this.fetchSlots().subscribe();
      });
  }

  ngOnInit(): void {
    const fixedBusinessId = this.businessId();
    if (fixedBusinessId) {
      this.form.patchValue({ businessId: fixedBusinessId });
      this.loadBusiness(fixedBusinessId);
      void this.availabilityHub.joinBusiness(fixedBusinessId);
    } else if (this.showBusinessSelector()) {
      this.publicBookingService.getBusinesses().subscribe({
        next: (items) => {
          this.businesses.set(items);
          if (items.length > 0) {
            const first = items[0];
            this.form.patchValue({ businessId: first.id });
            this.services.set(first.services);
            this.businessChanged.emit(first.id);
          }
        },
        error: () => this.errorMessage.set('Failed to load businesses.')
      });
    }

    this.form.patchValue({ date: this.formatDateInput(new Date()) });

    this.form.controls.businessId.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      if (id) {
        this.loadBusiness(id);
        void this.availabilityHub.joinBusiness(id);
      } else {
        void this.availabilityHub.leaveBusiness();
      }
    });
  }

  protected onBusinessChange(): void {
    const id = this.form.controls.businessId.value;
    if (id) {
      this.form.patchValue({ serviceId: '' });
      this.loadBusiness(id);
      this.businessChanged.emit(id);
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

    const { businessId, customerName, customerEmail, customerPhone, serviceId } =
      this.form.getRawValue();

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.publicBookingService
      .createBooking({
        businessId,
        customerName,
        customerEmail,
        customerPhone,
        serviceId,
        startTime: slot.startUtc,
        endTime: slot.endUtc
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('Booking confirmed! Your appointment is pending owner confirmation.');
          this.selectedSlot.set(null);
          this.form.patchValue({
            customerName: '',
            customerEmail: '',
            customerPhone: ''
          });
          this.booked.emit();
          this.fetchSlots().subscribe();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.message ?? 'Failed to create booking.');
        }
      });
  }

  private loadBusiness(id: string): void {
    this.publicBookingService.getBusiness(id).subscribe({
      next: (business) => this.services.set(business.services),
      error: () => this.errorMessage.set('Failed to load business services.')
    });
  }

  private fetchSlots() {
    const { businessId, serviceId, date } = this.form.getRawValue();
    if (!businessId || !serviceId || !date) {
      this.availableSlots.set([]);
      this.isLoadingSlots.set(false);
      return of([]);
    }

    this.isLoadingSlots.set(true);

    return this.publicBookingService.getSlots(businessId, date, serviceId).pipe(
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
