import { Routes } from '@angular/router';
import { authenticatedRedirectGuard } from './core/guards/authenticated-redirect.guard';
import { authGuard } from './core/guards/auth.guard';
import { businessOwnerGuard } from './core/guards/business-owner.guard';
import { guestGuard } from './core/guards/guest.guard';
import { pendingRegistrationGuard, verifyEmailGuard } from './core/guards/pending-registration.guard';
import { HomeComponent } from './features/home/home';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';
import { BusinessOnboardingComponent } from './features/auth/business-onboarding/business-onboarding';
import { DashboardComponent } from './features/dashboard/dashboard';
import { DashboardLayoutComponent } from './features/dashboard/dashboard-layout/dashboard-layout';
import { CalendarComponent } from './features/dashboard/calendar/calendar';
import { BusinessProfileComponent } from './features/business-profile/business-profile';
import { StaffManagementComponent } from './features/staff/staff-management/staff-management';
import { UserSettingsComponent } from './features/dashboard/user-settings/user-settings';
import { AnalyticsDashboardComponent } from './features/dashboard/analytics/analytics-dashboard';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password';
import { VerifyEmailComponent } from './features/auth/verify-email/verify-email';
import { BookingComponent } from './features/booking/booking';
import { BookingDetailComponent } from './features/booking/booking-detail/booking-detail';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [authenticatedRedirectGuard] },
  { path: 'booking', component: BookingComponent },
  { path: 'booking/:businessId', component: BookingDetailComponent },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [guestGuard] },
  {
    path: 'verify-email',
    component: VerifyEmailComponent,
    canActivate: [guestGuard, verifyEmailGuard]
  },
  {
    path: 'business-onboarding',
    component: BusinessOnboardingComponent,
    canActivate: [guestGuard, pendingRegistrationGuard]
  },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard, businessOwnerGuard],
    children: [
      { path: '', component: DashboardComponent },
      { path: 'calendar', component: CalendarComponent },
      { path: 'profile', component: BusinessProfileComponent },
      { path: 'staff', component: StaffManagementComponent },
      { path: 'settings', component: UserSettingsComponent },
      { path: 'analytics', component: AnalyticsDashboardComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
