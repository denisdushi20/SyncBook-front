import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  DemoBookingPanelComponent,
  DemoBookingResult
} from './components/demo-booking-panel/demo-booking-panel';

interface DemoAppointment {
  id: string;
  startUtc: string;
  serviceName: string;
  status: 'Pending' | 'Confirmed';
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, DemoBookingPanelComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent {
  protected readonly todayAppointments = signal<DemoAppointment[]>([
    {
      id: 'demo-static-1',
      startUtc: new Date(
        Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 10, 0)
      ).toISOString(),
      serviceName: 'Haircut',
      status: 'Confirmed'
    }
  ]);

  protected onDemoBooked(result: DemoBookingResult): void {
    this.todayAppointments.update((items) => [
      ...items,
      {
        id: result.id,
        startUtc: result.startUtc,
        serviceName: result.serviceName,
        status: result.status
      }
    ]);
  }

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  }

  protected statusClass(status: string): string {
    return `mock-status--${status.toLowerCase()}`;
  }
}
