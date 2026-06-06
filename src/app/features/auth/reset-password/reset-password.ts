import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OtpInputComponent } from '../../../core/components/otp-input/otp-input';
import { PasswordInputComponent } from '../../../core/components/password-input/password-input';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, OtpInputComponent, PasswordInputComponent],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly isResending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly infoMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    },
    { validators: (group) => (group.value.newPassword === group.value.confirmPassword ? null : { mismatch: true }) }
  );

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.email.set(email);
    if (!email) {
      this.errorMessage.set('Enter your email on the forgot password page first.');
    } else {
      this.infoMessage.set(`Enter the 6-digit code sent to ${email}.`);
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || !this.email()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { code, newPassword } = this.form.getRawValue();

    this.authService.resetPassword(this.email(), code, newPassword).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/login'], { queryParams: { reset: 'true' } });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Failed to reset password.');
      }
    });
  }

  protected resendCode(): void {
    if (!this.email()) return;

    this.isResending.set(true);
    this.errorMessage.set(null);

    this.authService.forgotPassword(this.email()).subscribe({
      next: () => {
        this.isResending.set(false);
        this.infoMessage.set('A new verification code has been sent.');
      },
      error: () => {
        this.isResending.set(false);
        this.errorMessage.set('Unable to resend code.');
      }
    });
  }
}
