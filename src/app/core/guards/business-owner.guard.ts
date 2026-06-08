import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const businessOwnerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.needsBusinessOnboarding()) {
    return router.createUrlTree(['/business-onboarding']);
  }

  if (authService.isBusinessOwner() && authService.getCurrentUser()?.businessId) {
    return true;
  }

  if (authService.isCustomer()) {
    return router.createUrlTree(['/']);
  }

  return router.createUrlTree(['/login']);
};
