import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BillingService } from '../../../core/services/billing.service';
@Component({
  selector: 'app-payment-complete',
  templateUrl: './payment-complete.html',
  styleUrl: './payment-complete.scss'
})
export class PaymentCompleteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly billingService = inject(BillingService);
  private readonly authService = inject(AuthService);

  protected readonly phase = signal<'confirming' | 'error'>('confirming');
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (!sessionId) {
      this.phase.set('error');
      this.errorMessage.set('Missing payment session. Please try again from the plan page.');
      return;
    }

    this.billingService.confirmCheckout(sessionId).subscribe({
      next: (response) => {
        this.authService.persistSession(response);
        this.billingService.clearSelectedPlan();
        void this.router.navigate(['/onboarding-transition'], {
          queryParams: { phase: 'workspace-creating' }
        });
      },
      error: (err) => {
        this.phase.set('error');
        this.errorMessage.set(err.error?.message ?? 'Unable to confirm payment. Please contact support.');
      }
    });
  }

  protected retryChoosePlan(): void {
    void this.router.navigate(['/choose-plan']);
  }
}
