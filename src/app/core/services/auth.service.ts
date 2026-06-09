import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { BusinessServiceItem, DaySchedule } from '../models/business.models';

export type UserRole = 'Customer' | 'BusinessOwner';
export type AuthProvider = 'Local' | 'Google';
export type GoogleSignInIntent = 'login' | 'business';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  businessId?: string;
}

export interface UserProfile extends AuthUser {
  firstName: string;
  lastName: string;
  authProvider: AuthProvider;
}

export interface BusinessOnboardingData {
  name: string;
  email: string;
  phone?: string;
  category?: string;
  description?: string;
  image?: string;
  services: BusinessServiceItem[];
  workingHours: DaySchedule[];
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  business?: BusinessOnboardingData;
}

export interface PendingRegistration {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface RegisterResponse {
  user: AuthUser;
}

interface EmailAvailabilityResponse {
  available: boolean;
}

interface MessageResponse {
  message: string;
}

const TOKEN_KEY = 'syncbook_token';
const PENDING_REGISTRATION_KEY = 'syncbook_pending_registration';
const VERIFIED_EMAIL_KEY = 'syncbook_verified_email';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);

  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const user = this.decodeToken(token);
      if (user) {
        this.currentUserSubject.next(user);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  }

  setPendingRegistration(data: PendingRegistration): void {
    sessionStorage.removeItem(VERIFIED_EMAIL_KEY);
    sessionStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(data));
  }

  getPendingRegistration(): PendingRegistration | null {
    const raw = sessionStorage.getItem(PENDING_REGISTRATION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingRegistration;
    } catch {
      return null;
    }
  }

  clearPendingRegistration(): void {
    sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
    sessionStorage.removeItem(VERIFIED_EMAIL_KEY);
  }

  setVerifiedEmail(email: string): void {
    sessionStorage.setItem(VERIFIED_EMAIL_KEY, email.trim().toLowerCase());
  }

  getVerifiedEmail(): string | null {
    return sessionStorage.getItem(VERIFIED_EMAIL_KEY);
  }

  isEmailVerifiedForPendingRegistration(): boolean {
    const pending = this.getPendingRegistration();
    const verified = this.getVerifiedEmail();
    if (!pending || !verified) return false;
    return pending.email.trim().toLowerCase() === verified;
  }

  sendRegistrationCode(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>('/api/auth/send-registration-code', { email });
  }

  verifyRegistrationCode(email: string, code: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>('/api/auth/verify-registration-code', { email, code });
  }

  checkEmailAvailable(email: string): Observable<EmailAvailabilityResponse> {
    return this.http.get<EmailAvailabilityResponse>('/api/auth/check-email', {
      params: { email }
    });
  }

  checkBusinessNameAvailable(name: string): Observable<EmailAvailabilityResponse> {
    return this.http.get<EmailAvailabilityResponse>('/api/auth/check-business-name', {
      params: { name }
    });
  }

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>('/api/auth/register', request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', request).pipe(
      tap((response) => this.persistSession(response))
    );
  }

  loginWithGoogle(idToken: string, intent: GoogleSignInIntent = 'login'): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/google', { idToken, intent }).pipe(
      tap((response) => this.persistSession(response))
    );
  }

  completeBusinessOnboarding(business: BusinessOnboardingData): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/complete-business-onboarding', { business }).pipe(
      tap((response) => this.persistSession(response))
    );
  }

  getCurrentUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/api/auth/me');
  }

  updateProfile(firstName: string, lastName: string): Observable<AuthResponse> {
    return this.http.put<AuthResponse>('/api/auth/me', { firstName, lastName }).pipe(
      tap((response) => this.persistSession(response))
    );
  }

  changePassword(newPassword: string, currentPassword?: string): Observable<void> {
    const body = currentPassword
      ? { currentPassword, newPassword }
      : { newPassword };
    return this.http.put<void>('/api/auth/password', body);
  }

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>('/api/auth/forgot-password', { email });
  }

  validateResetToken(token: string): Observable<{ valid: boolean }> {
    return this.http.get<{ valid: boolean }>('/api/auth/validate-reset-token', {
      params: { token }
    });
  }

  resetPassword(token: string, newPassword: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>('/api/auth/reset-password', { token, newPassword });
  }

  logout(): void {
    this.clearPendingRegistration();
    localStorage.removeItem(TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  getPostLoginRoute(): string {
    const user = this.currentUserSubject.value;
    if (!user) return '/';

    if (user.role === 'BusinessOwner') {
      return user.businessId ? '/dashboard' : '/business-onboarding';
    }

    return '/';
  }

  navigateAfterAuth(): void {
    const route = this.getPostLoginRoute();
    void this.router.navigateByUrl(route).then((navigated) => {
      if (!navigated) {
        window.location.assign(route);
      }
    });
  }

  needsBusinessOnboarding(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'BusinessOwner' && !user.businessId;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  isCustomer(): boolean {
    return this.currentUserSubject.value?.role === 'Customer';
  }

  isBusinessOwner(): boolean {
    return this.currentUserSubject.value?.role === 'BusinessOwner';
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private decodeToken(token: string): AuthUser | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));

      return {
        id: decoded.sub,
        fullName: decoded.name ?? '',
        email: decoded.email,
        role: decoded.role as UserRole,
        businessId: decoded.businessId
      };
    } catch {
      return null;
    }
  }

  private persistSession(response: AuthResponse): void {
    this.clearPendingRegistration();
    localStorage.setItem(TOKEN_KEY, response.token);
    this.currentUserSubject.next(response.user);
  }
}
