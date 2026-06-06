import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const pendingRegistrationGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    authService.clearPendingRegistration();
    return router.createUrlTree([authService.getPostLoginRoute()]);
  }

  if (authService.getPendingRegistration() && authService.isEmailVerifiedForPendingRegistration()) {
    return true;
  }

  if (authService.getPendingRegistration()) {
    return router.createUrlTree(['/verify-email']);
  }

  return router.createUrlTree(['/register']);
};

export const verifyEmailGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    authService.clearPendingRegistration();
    return router.createUrlTree([authService.getPostLoginRoute()]);
  }

  if (authService.getPendingRegistration()) {
    return true;
  }

  return router.createUrlTree(['/register']);
};
