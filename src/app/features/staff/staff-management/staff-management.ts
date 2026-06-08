import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { StaffWeeklyScheduleEntry } from '../../../core/models/business.models';
import { StaffService } from '../../../core/services/staff.service';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Component({
  selector: 'app-staff-management',
  imports: [ReactiveFormsModule],
  templateUrl: './staff-management.html',
  styleUrl: './staff-management.scss'
})
export class StaffManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly staffService = inject(StaffService);

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly staffName = signal('');

  protected readonly scheduleForm = this.fb.nonNullable.group({
    isBookable: [true],
    weeklySchedule: this.fb.array(DAYS.map((day) => this.createDayGroup(day)))
  });

  ngOnInit(): void {
    this.loadStaffProfile();
  }

  protected get weeklySchedule(): FormArray {
    return this.scheduleForm.controls.weeklySchedule;
  }

  protected onDayAvailableChange(index: number): void {
    const group = this.weeklySchedule.at(index);
    const isAvailable = group.get('isAvailable')?.value;
    const startTime = group.get('startTime');
    const endTime = group.get('endTime');

    if (isAvailable) {
      startTime?.setValidators([Validators.required]);
      endTime?.setValidators([Validators.required]);
    } else {
      startTime?.clearValidators();
      endTime?.clearValidators();
      startTime?.setValue('');
      endTime?.setValue('');
    }
    startTime?.updateValueAndValidity();
    endTime?.updateValueAndValidity();
  }

  protected saveSchedule(): void {
    this.weeklySchedule.controls.forEach((_, i) => this.onDayAvailableChange(i));

    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.clearMessages();

    const { isBookable, weeklySchedule } = this.scheduleForm.getRawValue();

    this.staffService
      .updateMyStaffProfile({
        isBookable,
        weeklySchedule: weeklySchedule as StaffWeeklyScheduleEntry[]
      })
      .subscribe({
        next: (staff) => {
          this.staffName.set(staff.fullName);
          this.isSaving.set(false);
          this.successMessage.set('Your staff schedule has been updated.');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(this.extractError(err));
        }
      });
  }

  private loadStaffProfile(): void {
    this.isLoading.set(true);
    this.staffService.getMyStaffProfile().subscribe({
      next: (staff) => {
        this.staffName.set(staff.fullName);
        this.scheduleForm.patchValue({ isBookable: staff.isBookable });
        this.patchWeeklySchedule(staff.weeklySchedule);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.extractError(err));
      }
    });
  }

  private patchWeeklySchedule(schedule: StaffWeeklyScheduleEntry[]): void {
    this.weeklySchedule.clear();
    DAYS.forEach((day) => {
      const existing = schedule.find((e) => e.dayOfWeek === day);
      const group = this.createDayGroup(day);
      if (existing) {
        group.patchValue({
          dayOfWeek: existing.dayOfWeek,
          isAvailable: existing.isAvailable,
          startTime: existing.startTime ?? '',
          endTime: existing.endTime ?? ''
        });
      }
      this.weeklySchedule.push(group);
    });
    this.weeklySchedule.controls.forEach((_, i) => this.onDayAvailableChange(i));
  }

  private createDayGroup(day: string): FormGroup {
    return this.fb.nonNullable.group({
      dayOfWeek: [day],
      isAvailable: [day !== 'Sunday'],
      startTime: ['09:00'],
      endTime: ['17:00']
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
