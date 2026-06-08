import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PasswordInputComponent } from '../../../core/components/password-input/password-input';
import { AuthProvider, AuthService, UserProfile } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-settings',
  imports: [ReactiveFormsModule, PasswordInputComponent],
  templateUrl: './user-settings.html',
  styleUrl: './user-settings.scss'
})
export class UserSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly passwordMessage = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly isSavingPassword = signal(false);

  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    },
    { validators: (group) => (group.value.newPassword === group.value.confirmPassword ? null : { mismatch: true }) }
  );

  ngOnInit(): void {
    this.authService.getCurrentUserProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.configurePasswordForm(profile.authProvider);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('Failed to load account information.');
        this.isLoading.set(false);
      }
    });
  }

  protected isLocalAccount(): boolean {
    return this.profile()?.authProvider === 'Local';
  }

  protected isGoogleAccount(): boolean {
    return this.profile()?.authProvider === 'Google';
  }

  private configurePasswordForm(authProvider: AuthProvider): void {
    const currentPasswordControl = this.passwordForm.controls.currentPassword;
    if (authProvider === 'Google') {
      currentPasswordControl.clearValidators();
    } else {
      currentPasswordControl.setValidators(Validators.required);
    }
    currentPasswordControl.updateValueAndValidity();
  }

  protected providerLabel(provider: AuthProvider | undefined): string {
    return provider === 'Google' ? 'Google' : 'Email & password';
  }

  protected onChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.isSavingPassword.set(true);
    this.passwordMessage.set(null);
    this.passwordError.set(null);

    const request = this.isLocalAccount()
      ? this.authService.changePassword(newPassword, currentPassword)
      : this.authService.changePassword(newPassword);

    request.subscribe({
      next: () => {
        this.isSavingPassword.set(false);
        this.passwordMessage.set('Password updated successfully.');
        this.passwordForm.reset();
      },
      error: (err) => {
        this.isSavingPassword.set(false);
        this.passwordError.set(err.error?.message ?? 'Failed to update password.');
      }
    });
  }
}
