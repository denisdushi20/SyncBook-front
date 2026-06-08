import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Business } from '../../../core/models/business.models';
import { PublicBookingService } from '../../../core/services/public-booking.service';
import { PublicBookingPanelComponent } from '../components/public-booking-panel/public-booking-panel';

@Component({
  selector: 'app-booking-detail',
  imports: [RouterLink, PublicBookingPanelComponent],
  templateUrl: './booking-detail.html',
  styleUrl: './booking-detail.scss'
})
export class BookingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly publicBookingService = inject(PublicBookingService);

  protected readonly business = signal<Business | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const businessId = this.route.snapshot.paramMap.get('businessId');
    if (!businessId) {
      this.error.set('Business not found.');
      this.loading.set(false);
      return;
    }

    this.publicBookingService.getBusiness(businessId).subscribe({
      next: (data) => {
        this.business.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load business.');
        this.loading.set(false);
      }
    });
  }
}
