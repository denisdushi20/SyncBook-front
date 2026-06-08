import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleSignInComponent } from '../../../core/components/google-sign-in/google-sign-in';
import { PasswordInputComponent } from '../../../core/components/password-input/password-input';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, GoogleSignInComponent, PasswordInputComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('registered') === 'true') {
      this.successMessage.set('Account created successfully. Please sign in.');
    }
    if (this.route.snapshot.queryParamMap.get('reset') === 'true') {
      this.successMessage.set('Password reset successfully. Please sign in.');
    }
  }

  protected readonly form = this.fb.nonNullable.group({
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

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.authService.navigateAfterAuth();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Invalid email or password.');
      }
    });
  }

  protected onGoogleError(message: string): void {
    if (message) {
      this.errorMessage.set(message);
    }
  }
}
