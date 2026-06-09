import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthResponse, AuthService } from './auth.service';

export interface BillingPlan {
  id: string;
  name: string;
  tagline: string;
  priceCents: number;
  currency: string;
  featured: boolean;
  features: string[];
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface SubscriptionStatus {
  active: boolean;
  planId?: string;
  status?: string;
  paidAt?: string;
}

export interface SubscriptionOverview {
  active: boolean;
  status?: string;
  planId?: string;
  planName?: string;
  priceCents?: number;
  currency: string;
  interval: string;
  autoRenewal: boolean;
  currentPeriodEnd?: string;
  paidAt?: string;
  isLegacy: boolean;
}

export interface BillingInvoice {
  id: string;
  date: string;
  amountCents: number;
  currency: string;
  status: string;
  description: string;
  receiptUrl?: string;
}

export interface PortalSessionResponse {
  url: string;
}

const SELECTED_PLAN_KEY = 'syncbook_selected_plan';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getPlans(): Observable<BillingPlan[]> {
    return this.http.get<BillingPlan[]>('/api/billing/plans');
  }

  createCheckoutSession(planId: string): Observable<CheckoutSessionResponse> {
    return this.http.post<CheckoutSessionResponse>('/api/billing/create-checkout-session', { planId });
  }

  confirmCheckout(sessionId: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/billing/confirm-checkout', { sessionId });
  }

  getSubscriptionStatus(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>('/api/billing/subscription');
  }

  getOverview(): Observable<SubscriptionOverview> {
    return this.http.get<SubscriptionOverview>('/api/billing/overview');
  }

  getInvoices(): Observable<BillingInvoice[]> {
    return this.http.get<BillingInvoice[]>('/api/billing/invoices');
  }

  createPortalSession(): Observable<PortalSessionResponse> {
    return this.http.post<PortalSessionResponse>('/api/billing/portal-session', {});
  }

  setSelectedPlan(planId: string): void {
    sessionStorage.setItem(SELECTED_PLAN_KEY, planId);
  }

  getSelectedPlan(): string | null {
    return sessionStorage.getItem(SELECTED_PLAN_KEY);
  }

  clearSelectedPlan(): void {
    sessionStorage.removeItem(SELECTED_PLAN_KEY);
  }

  formatPrice(priceCents: number, currency = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(priceCents / 100);
  }
}
