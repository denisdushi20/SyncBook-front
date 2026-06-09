import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { VisitorChatBusinessService } from '../../services/visitor-chat-business.service';
import { VisitorChatWidgetComponent } from '../visitor-chat-widget/visitor-chat-widget';

@Component({
  selector: 'app-visitor-chat-host',
  imports: [VisitorChatWidgetComponent],
  template: `
    @if (visible() && chatBusiness.businessId()) {
      <app-visitor-chat-widget
        [businessId]="chatBusiness.businessId()!"
        [businessName]="chatBusiness.businessName()"
        [disabled]="disabled()"
        [showBusinessPicker]="chatBusiness.pickerEnabled()"
        [businesses]="chatBusiness.businesses()"
      />
    }
  `
})
export class VisitorChatHostComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly chatBusiness = inject(VisitorChatBusinessService);

  protected readonly visible = signal(false);
  protected readonly disabled = signal(false);
  private resolving = false;

  ngOnInit(): void {
    void this.resolveForUrl(this.router.url);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        void this.resolveForUrl(nav.urlAfterRedirects);
      });
  }

  private async resolveForUrl(url: string): Promise<void> {
    const path = url.split('?')[0].split('#')[0];

    if (path.startsWith('/dashboard') || this.isAuthRoute(path)) {
      this.visible.set(false);
      this.chatBusiness.clear();
      return;
    }

    if (this.resolving) {
      return;
    }

    this.resolving = true;
    try {
      const detailMatch = path.match(/^\/booking\/([^/]+)$/);
      if (detailMatch) {
        this.visible.set(true);
        const businesses = await this.chatBusiness.ensureLoaded(path, detailMatch[1]);
        if (businesses.length === 0) {
          this.visible.set(false);
          return;
        }
        const selected = businesses.find((b) => b.id === this.chatBusiness.businessId());
        this.disabled.set(selected?.isLive === false);
        return;
      }

      if (path === '/' || path === '/booking') {
        this.visible.set(true);
        const businesses = await this.chatBusiness.ensureLoaded(path);
        if (businesses.length === 0) {
          this.visible.set(false);
          return;
        }
        this.disabled.set(false);
        return;
      }

      this.visible.set(false);
      this.chatBusiness.clear();
    } finally {
      this.resolving = false;
    }
  }

  private isAuthRoute(path: string): boolean {
    return [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/business-onboarding',
      '/onboarding-transition',
      '/choose-plan',
      '/payment/complete'
    ].some((route) => path === route || path.startsWith(`${route}/`));
  }
}
