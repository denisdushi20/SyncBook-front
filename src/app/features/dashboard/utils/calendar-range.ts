import { CalendarViewMode } from '../../../core/models/business.models';
import {
  formatWallClockTime,
  getWallClockHour,
  isSameWallClockDay,
  wallClockSortKey
} from '../../../core/utils/appointment-time';

export interface CalendarRange {
  from: Date;
  to: Date;
}

export function getRangeForView(view: CalendarViewMode, date: Date): CalendarRange {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  switch (view) {
    case 'month': {
      const from = new Date(base.getFullYear(), base.getMonth(), 1);
      const to = new Date(base.getFullYear(), base.getMonth() + 1, 1);
      return { from, to };
    }
    case 'week': {
      const day = base.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const from = new Date(base);
      from.setDate(base.getDate() + diffToMonday);
      const to = new Date(from);
      to.setDate(from.getDate() + 7);
      return { from, to };
    }
    case 'day': {
      const from = new Date(base);
      const to = new Date(base);
      to.setDate(base.getDate() + 1);
      return { from, to };
    }
  }
}

export function shiftDate(date: Date, view: CalendarViewMode, direction: -1 | 1): Date {
  const next = new Date(date);

  switch (view) {
    case 'month':
      next.setMonth(next.getMonth() + direction);
      break;
    case 'week':
      next.setDate(next.getDate() + direction * 7);
      break;
    case 'day':
      next.setDate(next.getDate() + direction);
      break;
  }

  return next;
}

export function formatRangeLabel(view: CalendarViewMode, date: Date): string {
  switch (view) {
    case 'month':
      return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    case 'week': {
      const { from, to } = getRangeForView('week', date);
      const end = new Date(to);
      end.setDate(end.getDate() - 1);
      const sameMonth = from.getMonth() === end.getMonth();
      const startFmt = from.toLocaleDateString(undefined, {
        month: sameMonth ? undefined : 'short',
        day: 'numeric'
      });
      const endFmt = end.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      return `${startFmt} – ${endFmt}`;
    }
    case 'day':
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
  }
}

export interface CalendarDayCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface CalendarHourSlot {
  hour: number;
  label: string;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function getWeekdayLabels(): string[] {
  return WEEKDAY_LABELS;
}

export function buildMonthGrid(date: Date): CalendarDayCell[] {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const startOffset = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startOffset);

  const today = new Date();
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    cells.push({
      date: cellDate,
      isCurrentMonth: cellDate.getMonth() === date.getMonth(),
      isToday: isSameDay(cellDate, today)
    });
  }

  return cells;
}

export function buildWeekDays(date: Date): CalendarDayCell[] {
  const { from } = getRangeForView('week', date);
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const cellDate = new Date(from);
    cellDate.setDate(from.getDate() + index);
    return {
      date: cellDate,
      isCurrentMonth: true,
      isToday: isSameDay(cellDate, today)
    };
  });
}

export function buildHourSlots(startHour = 8, endHour = 20): CalendarHourSlot[] {
  return Array.from({ length: endHour - startHour + 1 }, (_, index) => {
    const hour = startHour + index;
    return {
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`
    };
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getAppointmentsForDay<T extends { startUtc: string; status: string }>(
  appointments: T[],
  day: Date
): T[] {
  return appointments
    .filter(
      (appointment) =>
        isSameWallClockDay(appointment.startUtc, day) && appointment.status !== 'Cancelled'
    )
    .sort((a, b) => wallClockSortKey(a.startUtc) - wallClockSortKey(b.startUtc));
}

export function getAppointmentHour(startUtc: string): number {
  return getWallClockHour(startUtc);
}

export function formatAppointmentTime(startUtc: string): string {
  return formatWallClockTime(startUtc);
}
