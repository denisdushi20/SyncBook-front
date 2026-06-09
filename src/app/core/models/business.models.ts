export interface BusinessServiceItem {
  id?: string;
  name: string;
  durationMinutes?: number;
  price?: number;
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

export interface CreateStaffPayload {
  fullName: string;
  isBookable?: boolean;
  weeklySchedule?: StaffWeeklyScheduleEntry[];
}

export interface UpdateStaffPayload {
  fullName: string;
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
  isLive?: boolean;
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';

export interface Appointment {
  id: string;
  businessId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceId?: string;
  serviceName: string;
  servicePrice?: number;
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

export interface NewBookingAlert {
  notificationId: string;
  appointmentId: string;
  businessId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  startUtc: string;
  endUtc: string;
  source: 'PublicForm' | string;
}

export interface AvailabilityChangedEvent {
  businessId: string;
  startUtc: string;
  endUtc: string;
}

export interface BusinessConfigChangedEvent {
  businessId: string;
  workingHours: DaySchedule[];
}

export interface BusinessStatusChangedEvent {
  businessId: string;
  isLive: boolean;
}

export interface VisitorChatMessage {
  messageId: string;
  threadId: string;
  businessId: string;
  message: string;
  visitorConnectionId: string;
  visitorSessionId: string;
  visitorEmail: string;
  sentAtUtc: string;
}

export interface ChatLine {
  text: string;
  from: 'visitor' | 'owner';
  sentAt: string;
}

export interface SupportChatThreadDto {
  id: string;
  businessId: string;
  visitorSessionId: string;
  visitorEmail?: string | null;
  lastVisitorConnectionId?: string;
  lastMessageAtUtc: string;
  unreadForOwner: number;
  lastMessagePreview?: string;
}

export interface SupportChatMessageDto {
  id: string;
  threadId: string;
  businessId: string;
  visitorSessionId: string;
  from: 'Visitor' | 'Owner' | 'visitor' | 'owner';
  text: string;
  sentAtUtc: string;
}

export type HubConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
