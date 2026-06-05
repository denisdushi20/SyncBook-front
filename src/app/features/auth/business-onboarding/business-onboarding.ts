import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

@Component({
  selector: 'app-business-onboarding',
  imports: [ReactiveFormsModule],
  templateUrl: './business-onboarding.html',
  styleUrl: './business-onboarding.scss'
})
export class BusinessOnboardingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly imagePreview = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    category: ['', Validators.required],
    description: [''],
    image: [''],
    services: this.fb.array([this.createServiceGroup()]),
    workingHours: this.fb.array(DAYS.map((day) => this.createDayGroup(day)))
  });

  ngOnInit(): void {
    if (!this.authService.getPendingRegistration()) {
      this.router.navigate(['/register']);
    }
  }

  protected get services(): FormArray {
    return this.form.controls.services;
  }

  protected get workingHours(): FormArray {
    return this.form.controls.workingHours;
  }

  protected addService(): void {
    this.services.push(this.createServiceGroup());
  }

  protected removeService(index: number): void {
    if (this.services.length > 1) {
      this.services.removeAt(index);
    }
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

  protected onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Please select a valid image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage.set('Image must be smaller than 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.form.controls.image.setValue(result);
      this.imagePreview.set(result);
      this.errorMessage.set(null);
    };
    reader.readAsDataURL(file);
  }

  protected onSubmit(): void {
    this.workingHours.controls.forEach((_, i) => this.onDayOpenChange(i));

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const pending = this.authService.getPendingRegistration();
    if (!pending) {
      this.router.navigate(['/register']);
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { name, email, phone, category, description, image, services, workingHours } =
      this.form.getRawValue();

    const fullName = `${pending.firstName} ${pending.lastName}`.trim();

    this.authService.checkBusinessNameAvailable(name).subscribe({
      next: ({ available }) => {
        if (!available) {
          this.errorMessage.set('A business with this name already exists. Please choose a different name.');
          this.isSubmitting.set(false);
          return;
        }

        this.submitRegistration(pending, fullName, {
          name,
          email,
          phone,
          category,
          description,
          image,
          services,
          workingHours
        });
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Unable to verify business name availability. Please try again.');
      }
    });
  }

  private submitRegistration(
    pending: { email: string; password: string },
    fullName: string,
    businessData: {
      name: string;
      email: string;
      phone: string;
      category: string;
      description: string;
      image: string;
      services: { name: string; durationMinutes: string }[];
      workingHours: { day: string; isOpen: boolean; openTime: string; closeTime: string }[];
    }
  ): void {
    const { name, email, phone, category, description, image, services, workingHours } = businessData;

    this.authService
      .register({
        fullName,
        email: pending.email,
        password: pending.password,
        role: 'BusinessOwner',
        business: {
          name,
          email,
          phone: phone || undefined,
          category: category || undefined,
          description: description || undefined,
          image: image || undefined,
          services: services
            .filter((s) => s.name.trim())
            .map((s) => ({
              name: s.name.trim(),
              durationMinutes: s.durationMinutes ? Number(s.durationMinutes) : undefined
            })),
          workingHours: workingHours.map((d) => ({
            day: d.day,
            isOpen: d.isOpen,
            openTime: d.isOpen ? d.openTime : undefined,
            closeTime: d.isOpen ? d.closeTime : undefined
          }))
        }
      })
      .subscribe({
        next: () => {
          this.authService.clearPendingRegistration();
          this.authService
            .login({ email: pending.email, password: pending.password })
            .subscribe({
              next: () => {
                this.isSubmitting.set(false);
                this.router.navigate(['/dashboard']);
              },
              error: () => {
                this.isSubmitting.set(false);
                this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
              }
            });
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const message = err.error?.message ?? 'Business onboarding failed. Please try again.';

          if (err.status === 409 && message.toLowerCase().includes('business')) {
            this.errorMessage.set(message);
            return;
          }

          if (err.status === 409) {
            this.authService.clearPendingRegistration();
            this.errorMessage.set('This email is already registered. Please sign in.');
            setTimeout(() => this.router.navigate(['/login']), 2000);
            return;
          }

          this.errorMessage.set(message);
        }
      });
  }

  private createServiceGroup() {
    return this.fb.nonNullable.group({
      name: ['', Validators.required],
      durationMinutes: ['']
    });
  }

  private createDayGroup(day: string) {
    const isOpen = day !== 'Sunday';
    const group = this.fb.nonNullable.group({
      day: [day],
      isOpen: [isOpen],
      openTime: [isOpen ? '09:00' : ''],
      closeTime: [isOpen ? '17:00' : '']
    });

    if (isOpen) {
      group.get('openTime')?.setValidators([Validators.required]);
      group.get('closeTime')?.setValidators([Validators.required]);
    }

    return group;
  }
}
