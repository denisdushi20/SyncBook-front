import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export type UserRole = 'Customer' | 'BusinessOwner';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  businessId?: string;
}

export interface BusinessService {
  name: string;
  durationMinutes?: number;
}

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface BusinessOnboardingData {
  name: string;
  email: string;
  phone?: string;
  category?: string;
  description?: string;
  image?: string;
  services: BusinessService[];
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

const TOKEN_KEY = 'syncbook_token';
const PENDING_REGISTRATION_KEY = 'syncbook_pending_registration';

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
      tap((response) => {
        this.clearPendingRegistration();
        localStorage.setItem(TOKEN_KEY, response.token);
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout(): void {
    this.clearPendingRegistration();
    localStorage.removeItem(TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  getPostLoginRoute(): string {
    return this.isBusinessOwner() ? '/dashboard' : '/';
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
}
