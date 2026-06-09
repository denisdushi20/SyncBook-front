import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  BillingInvoice,
  BillingService,
  SubscriptionOverview
} from '../../../core/services/billing.service';

@Component({
  selector: 'app-subscription',
  imports: [DatePipe],
  templateUrl: './subscription.html',
  styleUrl: './subscription.scss'
})
export class SubscriptionComponent implements OnInit {
  private readonly billingService = inject(BillingService);

  protected readonly overview = signal<SubscriptionOverview | null>(null);
  protected readonly invoices = signal<BillingInvoice[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly isOpeningPortal = signal(false);
  protected readonly portalError = signal<string | null>(null);

  ngOnInit(): void {
    this.billingService.getOverview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load subscription details. Please try again.');
        this.isLoading.set(false);
      }
    });

    this.billingService.getInvoices().subscribe({
      next: (invoices) => this.invoices.set(invoices)
    });
  }

  protected formatPrice(overview: SubscriptionOverview): string {
    if (overview.priceCents == null) {
      return '—';
    }

    return `${this.billingService.formatPrice(overview.priceCents, overview.currency)}/${overview.interval}`;
  }

  protected statusLabel(overview: SubscriptionOverview): string {
    if (overview.isLegacy) {
      return 'Legacy';
    }

    if (overview.active) {
      return 'Active';
    }

    if (overview.status === 'canceled') {
      return 'Canceled';
    }

    return overview.status ?? 'Inactive';
  }

  protected formatInvoiceAmount(invoice: BillingInvoice): string {
    return this.billingService.formatPrice(invoice.amountCents, invoice.currency);
  }

  protected openPortal(): void {
    this.isOpeningPortal.set(true);
    this.portalError.set(null);

    this.billingService.createPortalSession().subscribe({
      next: ({ url }) => {
        if (!url) {
          this.isOpeningPortal.set(false);
          this.portalError.set('Unable to open billing portal.');
          return;
        }

        window.location.href = url;
      },
      error: (err) => {
        this.isOpeningPortal.set(false);
        this.portalError.set(err.error?.message ?? 'Unable to open billing portal.');
      }
    });
  }
}
