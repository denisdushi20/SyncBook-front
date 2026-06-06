import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { BusinessProfileService } from '../../core/services/business-profile.service';
import { BusinessServiceItem, DaySchedule } from '../../core/models/business.models';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Component({
  selector: 'app-business-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './business-profile.html',
  styleUrl: './business-profile.scss'
})
export class BusinessProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly businessProfileService = inject(BusinessProfileService);

  protected readonly isLoading = signal(true);
  protected readonly isSavingHours = signal(false);
  protected readonly isSavingService = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly services = signal<BusinessServiceItem[]>([]);
  protected readonly editingServiceId = signal<string | null>(null);

  protected readonly hoursForm = this.fb.nonNullable.group({
    workingHours: this.fb.array(DAYS.map((day) => this.createDayGroup(day)))
  });

  protected readonly serviceForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    durationMinutes: [null as number | null]
  });

  ngOnInit(): void {
    this.loadBusiness();
  }

  protected get workingHours(): FormArray {
    return this.hoursForm.controls.workingHours;
  }

  protected onDayOpenChange(index: number): void {
    const group = this.workingHours.at(index);
    const isOpen = group.get('isOpen')?.value;
    const openTime = group.get('openTime');
    const closeTime = group.get('closeTime');

    if (isOpen) {
      openTime?.setValidators([Validators.required]);
      closeTime?.setValidators([Validators.required]);
    } else {
      openTime?.clearValidators();
      closeTime?.clearValidators();
      openTime?.setValue('');
      closeTime?.setValue('');
    }
    openTime?.updateValueAndValidity();
    closeTime?.updateValueAndValidity();
  }

  protected saveWorkingHours(): void {
    this.workingHours.controls.forEach((_, i) => this.onDayOpenChange(i));

    if (this.hoursForm.invalid) {
      this.hoursForm.markAllAsTouched();
      return;
    }

    this.isSavingHours.set(true);
    this.clearMessages();

    this.businessProfileService
      .updateWorkingHours(this.hoursForm.getRawValue().workingHours as DaySchedule[])
      .subscribe({
        next: (business) => {
          this.services.set(business.services);
          this.isSavingHours.set(false);
          this.successMessage.set('Opening hours updated successfully.');
        },
        error: (err) => {
          this.isSavingHours.set(false);
          this.errorMessage.set(this.extractError(err));
        }
      });
  }

  protected startEditService(service: BusinessServiceItem): void {
    this.editingServiceId.set(service.id ?? null);
    this.serviceForm.setValue({
      name: service.name,
      durationMinutes: service.durationMinutes ?? null
    });
    this.clearMessages();
  }

  protected cancelEditService(): void {
    this.editingServiceId.set(null);
    this.serviceForm.reset({ name: '', durationMinutes: null });
  }

  protected saveService(): void {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    const { name, durationMinutes } = this.serviceForm.getRawValue();
    const payload = {
      name,
      durationMinutes: durationMinutes ?? undefined
    };

    this.isSavingService.set(true);
    this.clearMessages();

    const editingId = this.editingServiceId();
    const request$ = editingId
      ? this.businessProfileService.updateService(editingId, payload)
      : this.businessProfileService.addService(payload);

    request$.subscribe({
      next: (business) => {
        this.services.set(business.services);
        this.isSavingService.set(false);
        this.editingServiceId.set(null);
        this.serviceForm.reset({ name: '', durationMinutes: null });
        this.successMessage.set(editingId ? 'Service updated.' : 'Service added.');
      },
      error: (err) => {
        this.isSavingService.set(false);
        this.errorMessage.set(this.extractError(err));
      }
    });
  }

  protected deleteService(serviceId: string): void {
    this.clearMessages();
    this.businessProfileService.deleteService(serviceId).subscribe({
      next: (business) => {
        this.services.set(business.services);
        this.successMessage.set('Service removed.');
      },
      error: (err) => this.errorMessage.set(this.extractError(err))
    });
  }

  private loadBusiness(): void {
    this.isLoading.set(true);
    this.businessProfileService.getMyBusiness().subscribe({
      next: (business) => {
        this.services.set(business.services);
        this.patchWorkingHours(business.workingHours);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.extractError(err));
      }
    });
  }

  private patchWorkingHours(hours: { day: string; isOpen: boolean; openTime?: string; closeTime?: string }[]): void {
    this.workingHours.clear();
    DAYS.forEach((day) => {
      const existing = hours.find((h) => h.day === day);
      const group = this.createDayGroup(day);
      if (existing) {
        group.patchValue({
          day: existing.day,
          isOpen: existing.isOpen,
          openTime: existing.openTime ?? '',
          closeTime: existing.closeTime ?? ''
        });
      }
      this.workingHours.push(group);
    });
    this.workingHours.controls.forEach((_, i) => this.onDayOpenChange(i));
  }

  private createDayGroup(day: string): FormGroup {
    return this.fb.nonNullable.group({
      day: [day],
      isOpen: [day !== 'Sunday'],
      openTime: ['09:00'],
      closeTime: ['17:00']
    });
  }

  private clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private extractError(err: { error?: { message?: string } }): string {
    return err.error?.message ?? 'Something went wrong. Please try again.';
  }
}
