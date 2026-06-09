import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, tap } from 'rxjs';
import {
  ChatLine,
  SupportChatMessageDto,
  SupportChatThreadDto,
  VisitorChatMessage
} from '../models/business.models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SupportChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly unreadChatCountSubject = new BehaviorSubject<number>(0);
  private readonly chatToastSubject = new Subject<VisitorChatMessage>();
  private readonly threadsSubject = new BehaviorSubject<SupportChatThreadDto[]>([]);

  readonly unreadChatCount$ = this.unreadChatCountSubject.asObservable();
  readonly chatToast$ = this.chatToastSubject.asObservable();
  readonly threads$ = this.threadsSubject.asObservable();

  getVisitorHistory(businessId: string, email: string, sessionId?: string) {
    return this.http.get<SupportChatMessageDto[]>(
      `/api/support-chat/visitor/${businessId}/history`,
      {
        params: {
          email,
          ...(sessionId ? { sessionId } : {})
        }
      }
    );
  }

  sendVisitorMessage(
    businessId: string,
    visitorSessionId: string,
    visitorEmail: string,
    message: string,
    visitorConnectionId?: string
  ) {
    return this.http.post<VisitorChatMessage>('/api/support-chat/visitor/messages', {
      businessId,
      visitorSessionId,
      visitorEmail,
      visitorConnectionId: visitorConnectionId ?? null,
      message
    });
  }

  loadOwnerThreads() {
    return this.http.get<SupportChatThreadDto[]>('/api/businesses/me/support-chats').pipe(
      tap((threads) => {
        this.threadsSubject.next(threads);
        this.unreadChatCountSubject.next(
          threads.reduce((sum, thread) => sum + (thread.unreadForOwner ?? 0), 0)
        );
      })
    );
  }

  getOwnerThreadMessages(threadId: string) {
    return this.http.get<SupportChatMessageDto[]>(
      `/api/businesses/me/support-chats/${threadId}/messages`
    );
  }

  markThreadRead(threadId: string) {
    return this.http.post<void>(`/api/businesses/me/support-chats/${threadId}/read`, {}).pipe(
      tap(() => {
        const updated = this.threadsSubject.value.map((thread) =>
          thread.id === threadId ? { ...thread, unreadForOwner: 0 } : thread
        );
        this.threadsSubject.next(updated);
        this.unreadChatCountSubject.next(
          updated.reduce((sum, thread) => sum + (thread.unreadForOwner ?? 0), 0)
        );
      })
    );
  }

  hydrateForOwner(): void {
    const user = this.authService.getCurrentUser();
    if (user?.role !== 'BusinessOwner' || !user.businessId) {
      this.threadsSubject.next([]);
      this.unreadChatCountSubject.next(0);
      return;
    }

    this.loadOwnerThreads().subscribe({
      next: (threads) => {
        const unread = threads.filter((t) => (t.unreadForOwner ?? 0) > 0);
        if (unread.length > 0) {
          const latest = unread[0];
          this.chatToastSubject.next({
            messageId: '',
            threadId: latest.id,
            businessId: latest.businessId,
            message: latest.lastMessagePreview ?? 'New support message',
            visitorConnectionId: latest.lastVisitorConnectionId ?? '',
            visitorSessionId: latest.visitorSessionId,
            visitorEmail: latest.visitorEmail ?? '',
            sentAtUtc: latest.lastMessageAtUtc
          });
        }
      }
    });
  }

  notifyLiveMessage(message: VisitorChatMessage): void {
    this.chatToastSubject.next(message);

    const threads = this.threadsSubject.value;
    const existing = threads.find((t) => t.id === message.threadId);
    const updated: SupportChatThreadDto[] = existing
      ? threads.map((t) =>
          t.id === message.threadId
            ? {
                ...t,
                visitorEmail: message.visitorEmail || t.visitorEmail,
                lastMessagePreview: message.message,
                lastMessageAtUtc: message.sentAtUtc,
                lastVisitorConnectionId: message.visitorConnectionId,
                unreadForOwner: (t.unreadForOwner ?? 0) + 1
              }
            : t
        )
      : [
          {
            id: message.threadId,
            businessId: message.businessId,
            visitorSessionId: message.visitorSessionId,
            visitorEmail: message.visitorEmail,
            lastVisitorConnectionId: message.visitorConnectionId,
            lastMessageAtUtc: message.sentAtUtc,
            unreadForOwner: 1,
            lastMessagePreview: message.message
          },
          ...threads
        ];

    this.threadsSubject.next(updated);
    this.unreadChatCountSubject.next(
      updated.reduce((sum, thread) => sum + (thread.unreadForOwner ?? 0), 0)
    );
  }

  toChatLine(message: SupportChatMessageDto): ChatLine {
    const fromValue = String(message.from).toLowerCase();
    return {
      text: message.text,
      from: fromValue === 'owner' ? 'owner' : 'visitor',
      sentAt: message.sentAtUtc
    };
  }
}
