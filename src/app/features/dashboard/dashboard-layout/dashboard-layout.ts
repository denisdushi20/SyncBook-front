import { AsyncPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { BillingService } from '../../../core/services/billing.service';
import { BookingAlertsHubService } from '../../../core/services/booking-alerts-hub.service';
import { SupportChatService } from '../../../core/services/support-chat.service';
import { LiveChatPaneComponent } from '../components/live-chat-pane/live-chat-pane';

interface SubscriptionSummary {
  planLabel: string;
  renewalLabel: string | null;
}

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, LiveChatPaneComponent],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.scss'
})
export class DashboardLayoutComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly bookingAlertsHub = inject(BookingAlertsHubService);
  protected readonly supportChatService = inject(SupportChatService);
  private readonly billingService = inject(BillingService);
  private readonly router = inject(Router);

  protected readonly subscriptionSummary = signal<SubscriptionSummary | null>(null);

  ngOnInit(): void {
    this.billingService.getOverview().subscribe({
      next: (overview) => {
        if (overview.isLegacy) {
          this.subscriptionSummary.set({
            planLabel: 'Legacy workspace',
            renewalLabel: null
          });
          return;
        }

        const planLabel = overview.planName ?? overview.planId ?? 'Subscription';
        const renewalLabel = overview.currentPeriodEnd
          ? `Renews ${this.formatShortDate(overview.currentPeriodEnd)}`
          : overview.autoRenewal
            ? 'Auto-renewal on'
            : null;

        this.subscriptionSummary.set({ planLabel, renewalLabel });
      }
    });
  }

  private formatShortDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        if (nav.urlAfterRedirects.startsWith('/dashboard/calendar')) {
          this.bookingAlertsHub.resetBookingCount();
        }
      });
  }
}
