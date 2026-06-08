import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

export interface DemoBookingResult {
  id: string;
  startUtc: string;
  endUtc: string;
  serviceName: string;
  status: 'Pending';
}

interface DemoBusiness {
  id: string;
  name: string;
  services: { id: string; name: string; durationMinutes: number }[];
}

const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    id: 'demo-glow',
    name: 'Glow Studio',
    services: [
      { id: 'demo-haircut', name: 'Haircut', durationMinutes: 30 },
      { id: 'demo-color', name: 'Color Treatment', durationMinutes: 60 }
    ]
  },
  {
    id: 'demo-zen',
    name: 'Zen Spa',
    services: [
      { id: 'demo-massage', name: 'Swedish Massage', durationMinutes: 45 },
      { id: 'demo-facial', name: 'Facial', durationMinutes: 30 }
    ]
  }
];

const DEMO_SLOT_LABELS = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];

@Component({
  selector: 'app-demo-booking-panel',
  imports: [ReactiveFormsModule],
  templateUrl: './demo-booking-panel.html',
  styleUrl: './demo-booking-panel.scss'
})
export class DemoBookingPanelComponent {
  private readonly fb = inject(FormBuilder);
  private nextId = 1;

  readonly booked = output<DemoBookingResult>();

  protected readonly businesses = DEMO_BUSINESSES;
  protected readonly availableSlots = signal<string[]>([]);
  protected readonly selectedSlot = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    businessId: [DEMO_BUSINESSES[0].id, Validators.required],
    serviceId: ['', Validators.required],
    customerName: ['', Validators.required]
  });

  constructor() {
    this.form.controls.businessId.valueChanges.subscribe(() => {
      this.form.patchValue({ serviceId: '' });
      this.selectedSlot.set(null);
      this.availableSlots.set([]);
      this.successMessage.set(null);
    });

    this.form.controls.serviceId.valueChanges.subscribe((serviceId) => {
      this.selectedSlot.set(null);
      this.successMessage.set(null);
      this.availableSlots.set(serviceId ? [...DEMO_SLOT_LABELS] : []);
    });
  }

  protected servicesForSelectedBusiness() {
    const id = this.form.controls.businessId.value;
    return DEMO_BUSINESSES.find((b) => b.id === id)?.services ?? [];
  }

  protected selectSlot(slot: string): void {
    this.selectedSlot.set(slot);
    this.successMessage.set(null);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const slot = this.selectedSlot();
    if (!slot) {
      return;
    }

    const { serviceId } = this.form.getRawValue();
    const business = DEMO_BUSINESSES.find((b) => b.id === this.form.controls.businessId.value);
    const service = business?.services.find((s) => s.id === serviceId);
    if (!service) {
      return;
    }

    const [hours, minutes] = slot.split(':').map(Number);
    const today = new Date();
    const start = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)
    );
    const end = new Date(start.getTime() + service.durationMinutes * 60_000);

    const result: DemoBookingResult = {
      id: `demo-${this.nextId++}`,
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
      serviceName: service.name,
      status: 'Pending'
    };

    this.successMessage.set('Demo booking sent — watch the owner dashboard update!');
    this.selectedSlot.set(null);
    this.form.patchValue({ customerName: '' });
    this.booked.emit(result);
  }
}
