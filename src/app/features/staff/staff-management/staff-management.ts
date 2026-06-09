import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  DaySchedule,
  StaffMember,
  StaffWeeklyScheduleEntry
} from '../../../core/models/business.models';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessProfileService } from '../../../core/services/business-profile.service';
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
  private readonly businessProfileService = inject(BusinessProfileService);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly isAdding = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly staffList = signal<StaffMember[]>([]);
  protected readonly selectedStaffId = signal<string | null>(null);
  protected readonly ownerUserId = signal<string | null>(null);
  protected readonly businessHours = signal<DaySchedule[]>([]);

  protected readonly addForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required]
  });

  protected readonly editForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    isBookable: [true],
    weeklySchedule: this.fb.array(DAYS.map((day) => this.createDayGroup(day)))
  });

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.ownerUserId.set(user?.id ?? null);
    });
    this.loadBusinessHours();
    this.loadStaffRoster();
  }

  protected get editWeeklySchedule(): FormArray {
    return this.editForm.controls.weeklySchedule;
  }

  protected selectedStaff(): StaffMember | null {
    const id = this.selectedStaffId();
    return this.staffList().find((s) => s.id === id) ?? null;
  }

  protected isOwnerStaff(staff: StaffMember): boolean {
    return staff.userId === this.ownerUserId();
  }

  protected hoursSummary(staff: StaffMember): string {
    const availableDays = staff.weeklySchedule.filter((d) => d.isAvailable);
    if (availableDays.length === 0) {
      return 'No hours set';
    }
    const first = availableDays[0];
    const sameHours = availableDays.every(
      (d) => d.startTime === first.startTime && d.endTime === first.endTime
    );
    if (sameHours && availableDays.length >= 5) {
      return `${availableDays.length} days · ${first.startTime}–${first.endTime}`;
    }
    return `${availableDays.length} day(s) available`;
  }

  protected selectStaff(staff: StaffMember): void {
    this.selectedStaffId.set(staff.id);
    this.editForm.patchValue({
      fullName: staff.fullName,
      isBookable: staff.isBookable
    });
    this.patchWeeklySchedule(this.editWeeklySchedule, staff.weeklySchedule);
    this.clearMessages();
  }

  protected startAddStaff(): void {
    this.selectedStaffId.set(null);
    this.addForm.reset({ fullName: '' });
    this.clearMessages();
  }

  protected onDayAvailableChange(index: number): void {
    this.syncDayValidators(this.editWeeklySchedule, index);
  }

  protected copyBusinessHours(): void {
    const schedule = this.businessHoursToStaffSchedule(this.businessHours());
    this.patchWeeklySchedule(this.editWeeklySchedule, schedule);
    this.successMessage.set('Business hours copied to schedule.');
  }

  protected addStaff(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    this.isAdding.set(true);
    this.clearMessages();

    const { fullName } = this.addForm.getRawValue();
    const weeklySchedule = this.businessHoursToStaffSchedule(this.businessHours());

    this.staffService
      .create({
        fullName,
        isBookable: true,
        weeklySchedule
      })
      .subscribe({
        next: (staff) => {
          this.isAdding.set(false);
          this.staffList.update((list) => [...list, staff]);
          this.selectStaff(staff);
          this.addForm.reset({ fullName: '' });
          this.successMessage.set(`${staff.fullName} added to your team.`);
        },
        error: (err) => {
          this.isAdding.set(false);
          this.errorMessage.set(this.extractError(err));
        }
      });
  }

  protected saveSelectedStaff(): void {
    const staff = this.selectedStaff();
    if (!staff) {
      return;
    }

    this.editWeeklySchedule.controls.forEach((_, i) => this.onDayAvailableChange(i));

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.clearMessages();

    const { fullName, isBookable, weeklySchedule } = this.editForm.getRawValue();

    this.staffService
      .update(staff.id, {
        fullName,
        isBookable,
        weeklySchedule: weeklySchedule as StaffWeeklyScheduleEntry[]
      })
      .subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.staffList.update((list) =>
            list.map((item) => (item.id === updated.id ? updated : item))
          );
          this.successMessage.set(`${updated.fullName}'s profile updated.`);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(this.extractError(err));
        }
      });
  }

  protected removeStaff(staff: StaffMember): void {
    if (this.isOwnerStaff(staff)) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${staff.fullName} from your team? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    this.clearMessages();
    this.staffService.remove(staff.id).subscribe({
      next: () => {
        this.staffList.update((list) => list.filter((s) => s.id !== staff.id));
        if (this.selectedStaffId() === staff.id) {
          this.selectedStaffId.set(null);
        }
        this.successMessage.set(`${staff.fullName} removed from your team.`);
      },
      error: (err) => {
        this.errorMessage.set(this.extractError(err));
      }
    });
  }

  private loadStaffRoster(): void {
    this.isLoading.set(true);
    this.staffService.listMine().subscribe({
      next: (staff) => {
        this.staffList.set(staff);
        this.isLoading.set(false);
        if (staff.length > 0 && !this.selectedStaffId()) {
          this.selectStaff(staff[0]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.extractError(err));
      }
    });
  }

  private loadBusinessHours(): void {
    this.businessProfileService.getMyBusiness().subscribe({
      next: (business) => this.businessHours.set(business.workingHours ?? []),
      error: () => this.businessHours.set([])
    });
  }

  private businessHoursToStaffSchedule(hours: DaySchedule[]): StaffWeeklyScheduleEntry[] {
    return DAYS.map((day) => {
      const businessDay = hours.find((h) => h.day === day);
      return {
        dayOfWeek: day,
        isAvailable: businessDay?.isOpen ?? false,
        startTime: businessDay?.isOpen ? businessDay.openTime : undefined,
        endTime: businessDay?.isOpen ? businessDay.closeTime : undefined
      };
    });
  }

  private patchWeeklySchedule(
    formArray: FormArray,
    schedule: StaffWeeklyScheduleEntry[]
  ): void {
    formArray.clear();
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
      formArray.push(group);
    });
    formArray.controls.forEach((_, i) => this.syncDayValidators(formArray, i));
  }

  private syncDayValidators(formArray: FormArray, index: number): void {
    const group = formArray.at(index);
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
