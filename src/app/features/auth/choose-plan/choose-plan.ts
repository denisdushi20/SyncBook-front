import { Component, inject, OnInit, signal } from '@angular/core';
import { BillingPlan, BillingService } from '../../../core/services/billing.service';

@Component({
  selector: 'app-choose-plan',
  templateUrl: './choose-plan.html',
  styleUrl: './choose-plan.scss'
})
export class ChoosePlanComponent implements OnInit {
  private readonly billingService = inject(BillingService);

  protected readonly plans = signal<BillingPlan[]>([]);
  protected readonly loadingPlanId = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly highlightedPlanId = signal<string | null>(null);

  ngOnInit(): void {
    this.highlightedPlanId.set(this.billingService.getSelectedPlan());

    this.billingService.getPlans().subscribe({
      next: (plans) => this.plans.set(plans),
      error: () => this.errorMessage.set('Unable to load plans. Please refresh and try again.')
    });
  }

  protected formatPrice(plan: BillingPlan): string {
    return this.billingService.formatPrice(plan.priceCents, plan.currency);
  }

  protected isHighlighted(planId: string): boolean {
    const highlighted = this.highlightedPlanId();
    return highlighted ? highlighted === planId : planId === 'professional';
  }

  protected selectPlan(planId: string): void {
    this.loadingPlanId.set(planId);
    this.errorMessage.set(null);

    this.billingService.createCheckoutSession(planId).subscribe({
      next: ({ url }) => {
        if (!url) {
          this.loadingPlanId.set(null);
          this.errorMessage.set('Unable to start checkout. Please try again.');
          return;
        }

        window.location.href = url;
      },
      error: (err) => {
        this.loadingPlanId.set(null);
        this.errorMessage.set(err.error?.message ?? 'Unable to start checkout. Please try again.');
      }
    });
  }
}
