import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Business } from '../models/business.models';
import { PublicBookingService } from './public-booking.service';

@Injectable({ providedIn: 'root' })
export class VisitorChatBusinessService {
  private readonly publicBookingService = inject(PublicBookingService);

  private readonly selectedBusinessId = signal<string | null>(null);
  private readonly selectedBusinessName = signal<string | null>(null);
  private readonly availableBusinesses = signal<Business[]>([]);
  private readonly showBusinessPicker = signal(false);

  private loadPromise: Promise<Business[]> | null = null;
  private loadedPath: string | null = null;

  readonly businessId = this.selectedBusinessId.asReadonly();
  readonly businessName = this.selectedBusinessName.asReadonly();
  readonly businesses = this.availableBusinesses.asReadonly();
  readonly pickerEnabled = this.showBusinessPicker.asReadonly();

  async ensureLoaded(path: string, preselectedId?: string): Promise<Business[]> {
    if (this.loadedPath === path && this.availableBusinesses().length > 0) {
      return this.availableBusinesses();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = firstValueFrom(this.publicBookingService.getBusinesses())
      .then((businesses) => {
        const liveBusinesses = businesses.filter((b) => b.isLive !== false);

        this.loadedPath = path;
        this.setBusinesses(liveBusinesses, true, preselectedId);
        return liveBusinesses;
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  setBusinesses(businesses: Business[], enablePicker = true, preselectedId?: string): void {
    const existingKey = this.availableBusinesses()
      .map((b) => b.id)
      .join('|');
    const nextKey = businesses.map((b) => b.id).join('|');
    if (existingKey === nextKey && this.selectedBusinessId()) {
      return;
    }

    this.availableBusinesses.set(businesses);
    this.showBusinessPicker.set(enablePicker && businesses.length > 0);

    const preselected = preselectedId
      ? businesses.find((b) => b.id === preselectedId)
      : undefined;
    const live = preselected ?? businesses.find((b) => b.isLive !== false) ?? businesses[0];
    if (live) {
      this.selectBusiness(live.id, live.name);
    }
  }

  selectBusiness(id: string, name?: string): void {
    if (this.selectedBusinessId() === id) {
      if (name) {
        this.selectedBusinessName.set(name);
      }
      return;
    }

    this.selectedBusinessId.set(id);
    if (name) {
      this.selectedBusinessName.set(name);
      return;
    }

    const match = this.availableBusinesses().find((b) => b.id === id);
    this.selectedBusinessName.set(match?.name ?? null);
  }

  clear(): void {
    this.selectedBusinessId.set(null);
    this.selectedBusinessName.set(null);
    this.availableBusinesses.set([]);
    this.showBusinessPicker.set(false);
    this.loadedPath = null;
    this.loadPromise = null;
  }
}
