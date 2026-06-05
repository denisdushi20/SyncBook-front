import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WeatherService, WeatherForecast } from './core/services/weather.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly weatherService = inject(WeatherService);

  protected readonly title = signal('SyncBook');
  protected readonly forecasts = signal<WeatherForecast[]>([]);
  protected readonly apiStatus = signal<'loading' | 'connected' | 'error'>('loading');

  constructor() {
    this.weatherService.getForecast().subscribe({
      next: (data) => {
        this.forecasts.set(data);
        this.apiStatus.set('connected');
      },
      error: () => this.apiStatus.set('error')
    });
  }
}
