import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GoogleSignInComponent } from '../../../core/components/google-sign-in/google-sign-in';
import { PasswordInputComponent } from '../../../core/components/password-input/password-input';
import { AuthService } from '../../../core/services/auth.service';
import { BillingService } from '../../../core/services/billing.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, GoogleSignInComponent, PasswordInputComponent],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly billingService = inject(BillingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

  ngOnInit(): void {
    const plan = this.route.snapshot.queryParamMap.get('plan');
    if (plan === 'starter' || plan === 'professional') {
      this.billingService.setSelectedPlan(plan);
    }
  }

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { firstName, lastName, email, password } = this.form.getRawValue();

    this.authService.checkEmailAvailable(email).subscribe({
      next: ({ available }) => {
        if (!available) {
          this.errorMessage.set('An account with this email already exists. Please sign in.');
          this.isSubmitting.set(false);
          return;
        }

        this.authService.sendRegistrationCode(email).subscribe({
          next: () => {
            this.authService.setPendingRegistration({ firstName, lastName, email, password });
            this.isSubmitting.set(false);
            this.router.navigate(['/verify-email']);
          },
          error: (err) => {
            this.isSubmitting.set(false);
            this.errorMessage.set(err.error?.message ?? 'Unable to send verification code.');
          }
        });
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Unable to verify email availability. Please try again.');
      }
    });
  }

  protected onGoogleError(message: string): void {
    if (message) {
      this.errorMessage.set(message);
    }
  }
}
