import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const subscriptionGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.needsBusinessOnboarding()) {
    return router.createUrlTree(['/business-onboarding']);
  }

  if (authService.hasActiveSubscription()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};

export const paidSubscriptionGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (authService.needsBusinessOnboarding()) {
    return router.createUrlTree(['/business-onboarding']);
  }

  if (!authService.hasActiveSubscription()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
