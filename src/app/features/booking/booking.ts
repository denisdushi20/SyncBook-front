import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Business } from '../../core/models/business.models';
import { BusinessService } from '../../core/services/business.service';

@Component({
  selector: 'app-booking',
  imports: [RouterLink],
  templateUrl: './booking.html',
  styleUrl: './booking.scss'
})
export class BookingComponent implements OnInit {
  private readonly businessService = inject(BusinessService);

  protected readonly businesses = signal<Business[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadBusinesses();
  }

  protected retry(): void {
    this.loadBusinesses();
  }

  protected formatDuration(minutes?: number): string {
    if (!minutes) return '';
    return `${minutes} min`;
  }

  protected formatWorkingHoursSummary(business: Business): string {
    const openDays = business.workingHours.filter((d) => d.isOpen);
    if (openDays.length === 0) return 'Closed';

    const dayAbbrevs = openDays.map((d) => d.day.slice(0, 3));
    const first = openDays[0];
    const sameHours = openDays.every(
      (d) => d.openTime === first.openTime && d.closeTime === first.closeTime
    );

    const dayRange =
      dayAbbrevs.length === 7
        ? 'Every day'
        : dayAbbrevs.length > 2
          ? `${dayAbbrevs[0]}–${dayAbbrevs[dayAbbrevs.length - 1]}`
          : dayAbbrevs.join(', ');

    if (sameHours && first.openTime && first.closeTime) {
      return `${dayRange} · ${first.openTime}–${first.closeTime}`;
    }

    return openDays
      .map((d) => `${d.day.slice(0, 3)} ${d.openTime}–${d.closeTime}`)
      .join(', ');
  }

  private loadBusinesses(): void {
    this.loading.set(true);
    this.error.set(null);

    this.businessService.getBusinesses().subscribe({
      next: (data) => {
        this.businesses.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load businesses. Please check your connection and try again.');
        this.loading.set(false);
      }
    });
  }
}
