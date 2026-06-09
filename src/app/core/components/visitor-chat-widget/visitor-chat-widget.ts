import { Component, computed, effect, inject, input, signal } from '@angular/core';

import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { Business, ChatLine, HubConnectionStatus } from '../../models/business.models';

import { AuthService } from '../../services/auth.service';

import { PublicBookingAvailabilityHubService } from '../../services/public-booking-availability-hub.service';

import { SupportChatService } from '../../services/support-chat.service';

import { VisitorChatBusinessService } from '../../services/visitor-chat-business.service';

import {
  clearVisitorEmail,
  getVisitorEmail,
  getVisitorSessionId,
  isValidVisitorEmail,
  setVisitorEmail
} from '../../utils/visitor-session';

@Component({
  selector: 'app-visitor-chat-widget',
  templateUrl: './visitor-chat-widget.html',
  styleUrl: './visitor-chat-widget.scss'
})
export class VisitorChatWidgetComponent {
  private readonly availabilityHub = inject(PublicBookingAvailabilityHubService);
  private readonly supportChatService = inject(SupportChatService);
  private readonly chatBusiness = inject(VisitorChatBusinessService);
  private readonly authService = inject(AuthService);

  readonly businessId = input.required<string>();
  readonly businessName = input<string | null>(null);
  readonly disabled = input(false);
  readonly showBusinessPicker = input(false);
  readonly businesses = input<Business[]>([]);

  protected readonly chatOpen = signal(false);
  protected readonly chatMessages = signal<ChatLine[]>([]);
  protected readonly chatDraft = signal('');
  protected readonly emailDraft = signal('');
  protected readonly isSendingChat = signal(false);
  protected readonly chatError = signal<string | null>(null);
  protected readonly emailError = signal<string | null>(null);
  protected readonly isHubReady = signal(false);
  protected readonly isLoadingHistory = signal(false);
  protected readonly visitorEmail = signal<string | null>(null);

  protected readonly canContinueWithEmail = computed(() =>
    isValidVisitorEmail(this.emailDraft())
  );

  private lastConnectedBusinessId: string | null = null;

  protected readonly connectionState = toSignal(this.availabilityHub.connectionState$, {
    initialValue: 'disconnected' as HubConnectionStatus
  });

  protected readonly connectionError = toSignal(this.availabilityHub.lastError$, {
    initialValue: null as string | null
  });

  constructor() {
    effect(() => {
      const id = this.businessId();
      if (!id || this.disabled()) {
        this.isHubReady.set(false);
        return;
      }

      this.resolveVisitorEmail(id);
      void this.connectAndLoad(id);
    });

    this.availabilityHub.ownerMessage$
      .pipe(takeUntilDestroyed())
      .subscribe((message) => {
        this.appendChatLine({ text: message, from: 'owner', sentAt: new Date().toISOString() });
        this.chatOpen.set(true);
      });
  }

  protected toggleChat(): void {
    const opening = !this.chatOpen();
    this.chatOpen.set(opening);
    this.chatError.set(null);
    this.emailError.set(null);

    if (opening) {
      const businessId = this.businessId();
      if (businessId) {
        this.resolveVisitorEmail(businessId);
      }
      if (this.visitorEmail()) {
        void this.loadHistory();
      }
    }
  }

  protected onChatDraftInput(value: string): void {
    this.chatDraft.set(value);
  }

  protected onEmailDraftInput(value: string): void {
    this.emailDraft.set(value);
    this.emailError.set(null);
  }

  protected onBusinessSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) {
      return;
    }

    this.chatBusiness.selectBusiness(value);
    this.lastConnectedBusinessId = null;
    this.chatMessages.set([]);
    this.chatError.set(null);
    this.emailError.set(null);
    this.resolveVisitorEmail(value);
    void this.connectAndLoad(value);
  }

  protected onEmailGateSubmit(event: Event): void {
    event.preventDefault();
    this.continueWithEmail();
  }

  protected continueWithEmail(): void {
    const businessId = this.businessId();
    const email = this.emailDraft().trim();

    if (!businessId) {
      return;
    }

    if (!isValidVisitorEmail(email)) {
      this.emailError.set('Enter a valid email address.');
      return;
    }

    setVisitorEmail(businessId, email);
    this.visitorEmail.set(email.toLowerCase());
    this.emailError.set(null);
    void this.loadHistory();
  }

  protected changeEmail(): void {
    const businessId = this.businessId();
    if (businessId) {
      clearVisitorEmail(businessId);
    }

    this.visitorEmail.set(null);
    this.emailDraft.set('');
    this.chatMessages.set([]);
    this.chatError.set(null);
    this.emailError.set(null);
    this.prefillCustomerEmail();
  }

  protected onComposerSubmit(event: Event): void {
    event.preventDefault();
    this.sendChatMessage();
  }

  protected sendChatMessage(): void {
    const text = this.chatDraft().trim();
    const businessId = this.businessId();
    const email = this.visitorEmail();

    if (!text || !businessId || !email || this.disabled()) {
      return;
    }

    this.isSendingChat.set(true);
    this.chatError.set(null);

    const sessionId = getVisitorSessionId(businessId);

    void this.sendMessage(businessId, text, sessionId, email).catch(() => {
      this.chatError.set(this.connectionError() ?? 'Failed to send message. Please try again.');
      this.isSendingChat.set(false);
    });
  }

  protected connectionLabel(): string {
    const state = this.connectionState();
    if (state === 'connected') return 'Connected';
    if (state === 'connecting') return 'Connecting…';
    if (state === 'error') return 'Offline';
    return 'Disconnected';
  }

  private resolveVisitorEmail(businessId: string): void {
    const stored = getVisitorEmail(businessId);
    if (stored) {
      this.visitorEmail.set(stored);
      this.emailDraft.set(stored);
      return;
    }

    const user = this.authService.getCurrentUser();
    if (user?.role === 'Customer' && user.email && isValidVisitorEmail(user.email)) {
      setVisitorEmail(businessId, user.email);
      this.visitorEmail.set(user.email.toLowerCase());
      this.emailDraft.set(user.email);
      return;
    }

    this.visitorEmail.set(null);
    this.prefillCustomerEmail();
  }

  private prefillCustomerEmail(): void {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'Customer' && user.email) {
      this.emailDraft.set(user.email);
    }
  }

  private async connectAndLoad(businessId: string): Promise<void> {
    if (
      this.lastConnectedBusinessId === businessId &&
      this.availabilityHub.isConnected()
    ) {
      this.isHubReady.set(true);
      if (this.chatOpen() && this.visitorEmail()) {
        await this.loadHistory();
      }
      return;
    }

    this.isHubReady.set(false);

    try {
      await this.availabilityHub.joinBusiness(businessId);
      this.isHubReady.set(this.availabilityHub.isConnected());
      this.lastConnectedBusinessId = businessId;

      if (this.chatOpen() && this.visitorEmail()) {
        await this.loadHistory();
      }
    } catch {
      this.isHubReady.set(false);
    }
  }

  private async loadHistory(): Promise<void> {
    const businessId = this.businessId();
    const email = this.visitorEmail();

    if (!businessId || !email) {
      return;
    }

    this.isLoadingHistory.set(true);
    const sessionId = getVisitorSessionId(businessId);

    this.supportChatService.getVisitorHistory(businessId, email, sessionId).subscribe({
      next: (messages) => {
        this.chatMessages.set(messages.map((m) => this.supportChatService.toChatLine(m)));
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.isLoadingHistory.set(false);
      }
    });
  }

  private async sendMessage(
    businessId: string,
    text: string,
    sessionId: string,
    visitorEmail: string
  ): Promise<void> {
    const connectionId = this.availabilityHub.getConnectionId() ?? undefined;

    try {
      if (this.availabilityHub.isConnected()) {
        await this.availabilityHub.sendMessageToOwner(
          businessId,
          text,
          sessionId,
          visitorEmail
        );
      } else {
        throw new Error('hub not connected');
      }
    } catch {
      await new Promise<void>((resolve, reject) => {
        this.supportChatService
          .sendVisitorMessage(businessId, sessionId, visitorEmail, text, connectionId)
          .subscribe({
            next: () => resolve(),
            error: (err) => reject(err)
          });
      });
    }

    this.appendChatLine({ text, from: 'visitor', sentAt: new Date().toISOString() });
    this.chatDraft.set('');
    this.isSendingChat.set(false);
  }

  private appendChatLine(line: ChatLine): void {
    this.chatMessages.update((messages) => [...messages, line]);
  }
}
