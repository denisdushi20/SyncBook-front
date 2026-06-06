export interface BusinessServiceItem {
  id?: string;
  name: string;
  durationMinutes?: number;
}

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface Business {
  id: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  category?: string;
  image?: string;
  services: BusinessServiceItem[];
  workingHours: DaySchedule[];
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Cancelled';

export interface Appointment {
  id: string;
  businessId: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startUtc: string;
  endUtc: string;
  status: AppointmentStatus;
}

export type CalendarViewMode = 'month' | 'week' | 'day';
