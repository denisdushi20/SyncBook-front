import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  NgZone,
  output,
  signal,
  viewChild
} from '@angular/core';
import { AuthService, GoogleSignInIntent } from '../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-google-sign-in',
  template: `
    <div class="google-sign-in">
      <div #googleButton class="google-btn-host"></div>
      @if (isSigningIn()) {
        <p class="google-signing-in">Signing in with Google…</p>
      }
    </div>
  `,
  styles: `
    .google-sign-in {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .google-btn-host {
      display: flex;
      justify-content: center;
      min-height: 44px;
      width: 100%;
    }

    .google-signing-in {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
    }
  `
})
export class GoogleSignInComponent {
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly buttonHost = viewChild.required<ElementRef<HTMLDivElement>>('googleButton');

  readonly intent = input<GoogleSignInIntent>('login');
  readonly signInError = output<string>();

  protected readonly isSigningIn = signal(false);

  constructor() {
    afterNextRender(() => {
      this.waitForGoogleIdentity()
        .then(() => this.renderButton())
        .catch(() => this.signInError.emit('Google Sign-In could not be loaded.'));
    });
  }

  private waitForGoogleIdentity(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      let attempts = 0;
      const maxAttempts = 200;

      const interval = window.setInterval(() => {
        attempts += 1;
        if (window.google?.accounts?.id) {
          window.clearInterval(interval);
          resolve();
          return;
        }

        if (attempts >= maxAttempts) {
          window.clearInterval(interval);
          reject(new Error('Google Identity Services timed out.'));
        }
      }, 50);
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
      callback: (response) => this.onGoogleCredential(response.credential),
      auto_select: false,
      cancel_on_tap_outside: true
    });

    window.google!.accounts.id.renderButton(host, {
      theme: 'outline',
      size: 'large',
      width: Math.min(360, host.offsetWidth || 360),
      text: 'continue_with',
      shape: 'rectangular',
      type: 'standard'
    });
  }

  private onGoogleCredential(credential: string): void {
    this.ngZone.run(() => {
      this.isSigningIn.set(true);

      this.authService.loginWithGoogle(credential, this.intent()).subscribe({
        next: () => {
          this.isSigningIn.set(false);
          this.authService.navigateAfterAuth();
        },
        error: (err) => {
          this.isSigningIn.set(false);
          this.signInError.emit(err.error?.message ?? 'Google sign-in failed.');
        }
      });
    });
  }
}
