import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OtpInputComponent } from '../../../core/components/otp-input/otp-input';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [ReactiveFormsModule, RouterLink, OtpInputComponent],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss'
})
export class VerifyEmailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly isResending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  ngOnInit(): void {
    const pending = this.authService.getPendingRegistration();
    if (!pending) {
      this.router.navigate(['/register']);
      return;
    }

    this.email.set(pending.email);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.authService.verifyRegistrationCode(this.email(), this.form.controls.code.value).subscribe({
      next: () => {
        this.authService.setVerifiedEmail(this.email());
        this.isSubmitting.set(false);
        this.router.navigate(['/onboarding-transition'], {
          queryParams: { phase: 'account-verified' }
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Invalid verification code.');
      }
    });
  }

  protected resendCode(): void {
    this.isResending.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.sendRegistrationCode(this.email()).subscribe({
      next: (response) => {
        this.isResending.set(false);
        this.successMessage.set(response.message);
      },
      error: (err) => {
        this.isResending.set(false);
        this.errorMessage.set(err.error?.message ?? 'Unable to resend code.');
      }
    });
  }
}
