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

export interface StaffWeeklyScheduleEntry {
  dayOfWeek: string;
  startTime?: string;
  endTime?: string;
  isAvailable: boolean;
}

export interface StaffMember {
  id: string;
  userId: string;
  businessId: string;
  fullName: string;
  isBookable: boolean;
  weeklySchedule: StaffWeeklyScheduleEntry[];
}

export interface UpdateMyStaffProfilePayload {
  isBookable: boolean;
  weeklySchedule: StaffWeeklyScheduleEntry[];
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
  customerPhone?: string;
  serviceId?: string;
  serviceName: string;
  startUtc: string;
  endUtc: string;
  bufferMinutes?: number;
  staffId?: string;
  staffName?: string;
  status: AppointmentStatus;
}

export interface InternalAppointmentSlot {
  startUtc: string;
  endUtc: string;
  label: string;
}

export interface CreateInternalAppointmentPayload {
  businessId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  staffId: string;
  startTime: string;
  endTime: string;
  customBufferMinutes?: number;
}

export interface CreatePublicAppointmentPayload {
  businessId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  startTime: string;
  endTime: string;
}

export interface TodayAppointmentSummary {
  id: string;
  startUtc: string;
  endUtc: string;
  serviceName: string;
  status: AppointmentStatus;
}

export type CalendarViewMode = 'month' | 'week' | 'day';
