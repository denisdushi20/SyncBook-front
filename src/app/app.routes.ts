import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { pendingRegistrationGuard } from './core/guards/pending-registration.guard';
import { HomeComponent } from './features/home/home';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';
import { BusinessOnboardingComponent } from './features/auth/business-onboarding/business-onboarding';
import { DashboardComponent } from './features/dashboard/dashboard';
import { DashboardLayoutComponent } from './features/dashboard/dashboard-layout/dashboard-layout';
import { BookingComponent } from './features/booking/booking';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'booking', component: BookingComponent },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  {
    path: 'business-onboarding',
    component: BusinessOnboardingComponent,
    canActivate: [guestGuard, pendingRegistrationGuard]
  },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [{ path: '', component: DashboardComponent }]
  },
  { path: '**', redirectTo: '' }
];
