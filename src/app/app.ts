import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BookingAlertsHostComponent } from './core/components/booking-alerts-host/booking-alerts-host';
import { HeaderComponent } from './core/components/header/header';
import { SupportChatAlertsHostComponent } from './core/components/support-chat-alerts-host/support-chat-alerts-host';
import { VisitorChatHostComponent } from './core/components/visitor-chat-host/visitor-chat-host';
import { WeatherService, WeatherForecast } from './core/services/weather.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    BookingAlertsHostComponent,
    SupportChatAlertsHostComponent,
    VisitorChatHostComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly weatherService = inject(WeatherService);
  private readonly router = inject(Router);

  protected readonly forecasts = signal<WeatherForecast[]>([]);
  protected readonly apiStatus = signal<'loading' | 'connected' | 'error'>('loading');
  protected readonly isFullBleedPage = signal(this.isFullBleedRoute(this.router.url));
  protected readonly hideChrome = signal(this.shouldHideChrome(this.router.url));

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        const url = this.normalizeUrl(nav.urlAfterRedirects);
        this.isFullBleedPage.set(this.isFullBleedRoute(url));
        this.hideChrome.set(this.shouldHideChrome(url));
      });

    this.weatherService.getForecast().subscribe({
      next: (data) => {
        this.forecasts.set(data);
        this.apiStatus.set('connected');
      },
      error: () => this.apiStatus.set('error')
    });
  }

  private normalizeUrl(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  private isFullBleedRoute(url: string): boolean {
    const path = this.normalizeUrl(url);
    if (path.startsWith('/dashboard')) return true;
    const fullBleedRoutes = ['/', '/booking', '/login', '/register', '/business-onboarding', '/forgot-password', '/reset-password', '/verify-email'];
    return fullBleedRoutes.includes(path);
  }

  private shouldHideChrome(url: string): boolean {
    const path = this.normalizeUrl(url);
    return path === '/business-onboarding' || path.startsWith('/dashboard');
  }
}