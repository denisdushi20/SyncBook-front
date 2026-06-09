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
  customerName?: string;
  status: 'Pending' | 'Confirmed';
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, DemoBookingPanelComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent {
  protected readonly newBookingIds = signal<Set<string>>(new Set());

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
      {
        id: result.id,
        startUtc: result.startUtc,
        serviceName: result.serviceName,
        customerName: result.customerName,
        status: result.status
      },
      ...items
    ]);

    this.newBookingIds.update((ids) => new Set(ids).add(result.id));
    window.setTimeout(() => {
      this.newBookingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(result.id);
        return next;
      });
    }, 2400);
  }

  protected isNewBooking(id: string): boolean {
    return this.newBookingIds().has(id);
  }

  protected pendingCount(): number {
    return this.todayAppointments().filter((a) => a.status === 'Pending').length;
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
