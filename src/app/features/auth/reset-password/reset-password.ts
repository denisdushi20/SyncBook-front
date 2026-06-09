import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PasswordInputComponent } from '../../../core/components/password-input/password-input';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, PasswordInputComponent],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly token = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly isValidating = signal(true);
  protected readonly tokenValid = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    },
    { validators: (group) => (group.value.newPassword === group.value.confirmPassword ? null : { mismatch: true }) }
  );

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(token);

    if (!token) {
      this.isValidating.set(false);
      this.errorMessage.set('This reset link is invalid or has expired.');
      return;
    }

    this.authService.validateResetToken(token).subscribe({
      next: () => {
        this.isValidating.set(false);
        this.tokenValid.set(true);
      },
      error: () => {
        this.isValidating.set(false);
        this.errorMessage.set('This reset link is invalid or has expired.');
      }
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid || !this.token()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { newPassword } = this.form.getRawValue();

    this.authService.resetPassword(this.token(), newPassword).subscribe({
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
}
