import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatLine, SupportChatThreadDto, VisitorChatMessage } from '../../../../core/models/business.models';
import { BookingAlertsHubService } from '../../../../core/services/booking-alerts-hub.service';
import { SupportChatService } from '../../../../core/services/support-chat.service';

interface VisitorThread {
  threadId: string;
  visitorSessionId: string;
  visitorEmail: string | null;
  visitorConnectionId: string | null;
  label: string;
  messages: ChatLine[];
  unread: number;
}

@Component({
  selector: 'app-live-chat-pane',
  imports: [DatePipe],
  templateUrl: './live-chat-pane.html',
  styleUrl: './live-chat-pane.scss'
})
export class LiveChatPaneComponent implements OnInit {
  private readonly bookingAlertsHub = inject(BookingAlertsHubService);
  private readonly supportChatService = inject(SupportChatService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isOpen = signal(false);
  protected readonly activeThreadId = signal<string | null>(null);
  protected readonly replyDraft = signal('');
  protected readonly isSending = signal(false);
  protected readonly sendError = signal<string | null>(null);
  protected readonly isLoadingThreads = signal(false);

  private readonly threads = signal<Map<string, VisitorThread>>(new Map());
  private audioContext: AudioContext | null = null;

  protected readonly threadList = computed(() =>
    [...this.threads().values()].sort((a, b) => {
      const aLast = a.messages.at(-1)?.sentAt ?? '';
      const bLast = b.messages.at(-1)?.sentAt ?? '';
      return bLast.localeCompare(aLast);
    })
  );

  protected readonly activeThread = computed(() => {
    const id = this.activeThreadId();
    return id ? (this.threads().get(id) ?? null) : null;
  });

  protected readonly unreadTotal = computed(() =>
    this.threadList().reduce((sum, thread) => sum + thread.unread, 0)
  );

  ngOnInit(): void {
    this.loadPersistedThreads();

    this.supportChatService.threads$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((apiThreads) => {
        this.mergeApiThreads(apiThreads);
      });

    this.bookingAlertsHub.visitorMessage$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((incoming) => {
        this.handleIncomingMessage(incoming);
      });

    this.destroyRef.onDestroy(() => {
      if (this.audioContext) {
        void this.audioContext.close();
        this.audioContext = null;
      }
    });
  }

  protected toggleOpen(): void {
    this.isOpen.update((open) => !open);
    this.sendError.set(null);
  }

  protected selectVisitor(threadId: string): void {
    this.activeThreadId.set(threadId);
    this.markThreadRead(threadId);
    this.sendError.set(null);
    void this.loadThreadMessages(threadId);
  }

  protected onReplyDraftInput(value: string): void {
    this.replyDraft.set(value);
  }

  protected onReplySubmit(event: Event): void {
    event.preventDefault();
    this.sendReply();
  }

  protected sendReply(): void {
    const thread = this.activeThread();
    const text = this.replyDraft().trim();

    if (!thread || !text) {
      return;
    }

    this.isSending.set(true);
    this.sendError.set(null);

    void this.bookingAlertsHub
      .sendMessageToVisitor(thread.visitorSessionId, text, thread.visitorConnectionId ?? undefined)
      .then(
        () => {
          this.upsertThread(
            thread.threadId,
            thread.visitorSessionId,
            thread.visitorEmail,
            thread.visitorConnectionId,
            { text, from: 'owner', sentAt: new Date().toISOString() }
          );
          this.replyDraft.set('');
          this.isSending.set(false);
        },
        () => {
          this.sendError.set('Failed to send reply.');
          this.isSending.set(false);
        }
      );
  }

  protected visitorLabel(visitorEmail: string | null | undefined, visitorSessionId: string): string {
    if (visitorEmail?.trim()) {
      return visitorEmail.trim();
    }

    return `Visitor ${visitorSessionId.slice(0, 6)}`;
  }

  private loadPersistedThreads(): void {
    this.isLoadingThreads.set(true);
    this.supportChatService.loadOwnerThreads().subscribe({
      next: (threads) => {
        this.mergeApiThreads(threads);
        this.isLoadingThreads.set(false);

        const unread = threads.filter((t) => (t.unreadForOwner ?? 0) > 0);
        if (unread.length > 0) {
          const first = unread[0];
          this.activeThreadId.set(first.id);
          this.isOpen.set(true);
          void this.loadThreadMessages(first.id);
        }
      },
      error: () => this.isLoadingThreads.set(false)
    });
  }

  private mergeApiThreads(apiThreads: SupportChatThreadDto[]): void {
    this.threads.update((map) => {
      const next = new Map(map);

      for (const thread of apiThreads) {
        const existing = next.get(thread.id);
        next.set(thread.id, {
          threadId: thread.id,
          visitorSessionId: thread.visitorSessionId,
          visitorEmail: thread.visitorEmail ?? existing?.visitorEmail ?? null,
          visitorConnectionId: thread.lastVisitorConnectionId ?? existing?.visitorConnectionId ?? null,
          label: this.visitorLabel(thread.visitorEmail, thread.visitorSessionId),
          messages: existing?.messages ?? [],
          unread: thread.unreadForOwner ?? 0
        });
      }

      return next;
    });
  }

  private handleIncomingMessage(incoming: VisitorChatMessage): void {
    const line: ChatLine = {
      text: incoming.message,
      from: 'visitor',
      sentAt: incoming.sentAtUtc
    };

    const isViewingSender =
      this.isOpen() && this.activeThreadId() === incoming.threadId;

    this.upsertThread(
      incoming.threadId,
      incoming.visitorSessionId,
      incoming.visitorEmail || null,
      incoming.visitorConnectionId,
      line,
      !isViewingSender
    );
    this.activeThreadId.set(incoming.threadId);
    this.isOpen.set(true);
    this.markThreadRead(incoming.threadId);
    this.playChatPing();
  }

  private loadThreadMessages(threadId: string): void {
    this.supportChatService.getOwnerThreadMessages(threadId).subscribe({
      next: (messages) => {
        this.threads.update((map) => {
          const existing = map.get(threadId);
          if (!existing) {
            return map;
          }

          const next = new Map(map);
          next.set(threadId, {
            ...existing,
            messages: messages.map((m) => this.supportChatService.toChatLine(m))
          });
          return next;
        });
      }
    });
  }

  private upsertThread(
    threadId: string,
    visitorSessionId: string,
    visitorEmail: string | null,
    visitorConnectionId: string | null,
    line: ChatLine,
    incrementUnread = false
  ): void {
    this.threads.update((map) => {
      const next = new Map(map);
      const existing = next.get(threadId);
      const resolvedEmail = visitorEmail ?? existing?.visitorEmail ?? null;

      if (existing) {
        next.set(threadId, {
          ...existing,
          visitorSessionId,
          visitorEmail: resolvedEmail,
          visitorConnectionId: visitorConnectionId ?? existing.visitorConnectionId,
          label: this.visitorLabel(resolvedEmail, visitorSessionId),
          messages: [...existing.messages, line],
          unread: incrementUnread ? existing.unread + 1 : existing.unread
        });
      } else {
        next.set(threadId, {
          threadId,
          visitorSessionId,
          visitorEmail: resolvedEmail,
          visitorConnectionId,
          label: this.visitorLabel(resolvedEmail, visitorSessionId),
          messages: [line],
          unread: incrementUnread ? 1 : 0
        });
      }

      return next;
    });
  }

  private markThreadRead(threadId: string): void {
    this.threads.update((map) => {
      const existing = map.get(threadId);
      if (!existing || existing.unread === 0) {
        return map;
      }

      const next = new Map(map);
      next.set(threadId, { ...existing, unread: 0 });
      return next;
    });

    this.supportChatService.markThreadRead(threadId).subscribe();
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
