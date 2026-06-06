import { Component, ElementRef, inject, OnInit, output, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-google-sign-in',
  template: `<div #googleButton class="google-btn-host"></div>`,
  styles: `
    .google-btn-host {
      display: flex;
      justify-content: center;
      min-height: 44px;
    }
  `
})
export class GoogleSignInComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly buttonHost = viewChild.required<ElementRef<HTMLDivElement>>('googleButton');

  readonly signInError = output<string>();

  ngOnInit(): void {
    this.loadScript()
      .then(() => this.renderButton())
      .catch(() => this.signInError.emit('Google Sign-In could not be loaded.'));
  }

  private loadScript(): Promise<void> {
    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-gsi]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset['googleGsi'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private renderButton(): void {
    const clientId = environment.googleClientId;
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
      this.signInError.emit('Google Sign-In is not configured yet.');
      return;
    }

    const host = this.buttonHost().nativeElement;
    host.innerHTML = '';

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => this.handleCredential(response.credential)
    });

    window.google!.accounts.id.renderButton(host, {
      theme: 'outline',
      size: 'large',
      width: 360,
      text: 'continue_with',
      shape: 'rectangular'
    });
  }

  private handleCredential(credential: string): void {
    this.authService.loginWithGoogle(credential).subscribe({
      next: () => this.router.navigate([this.authService.getPostLoginRoute()]),
      error: (err) => {
        this.signInError.emit(err.error?.message ?? 'Google sign-in failed.');
      }
    });
  }
}
