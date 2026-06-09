import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { VisitorChatMessage } from '../../models/business.models';
import { AuthService } from '../../services/auth.service';
import { SupportChatService } from '../../services/support-chat.service';

@Component({
  selector: 'app-support-chat-alerts-host',
  templateUrl: './support-chat-alerts-host.html',
  styleUrl: './support-chat-alerts-host.scss'
})
export class SupportChatAlertsHostComponent {
  private readonly supportChatService = inject(SupportChatService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeToast = signal<VisitorChatMessage | null>(null);
  protected readonly isOwner = signal(false);

  private audioContext: AudioContext | null = null;

  constructor() {
    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        this.isOwner.set(user?.role === 'BusinessOwner');
        if (user?.role !== 'BusinessOwner') {
          this.dismissToast();
        }
      });

    this.supportChatService.chatToast$
      .pipe(
        filter(() => this.isOwner()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((message) => {
        this.activeToast.set(message);
        this.playChatPing();
      });

    effect(() => {
      document.body.style.overflow = this.activeToast() ? 'hidden' : '';
    });

    this.destroyRef.onDestroy(() => {
      document.body.style.overflow = '';
      if (this.audioContext) {
        void this.audioContext.close();
        this.audioContext = null;
      }
    });
  }

  protected dismissToast(): void {
    this.activeToast.set(null);
  }

  private playChatPing(): void {
    try {
      this.audioContext ??= new AudioContext();
      void this.audioContext.resume();

      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const start = this.audioContext.currentTime;

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);

      oscillator.start(start);
      oscillator.stop(start + 0.2);
    } catch {
      // audio unavailable
    }
  }
}
