/**
 * Appointment timestamps are stored with a UTC marker but represent
 * wall-clock business hours (e.g. 09:00 means 9 AM, not 9 AM UTC converted).
 */
export const APPOINTMENT_WALL_CLOCK_TZ = 'UTC';

export function getWallClockHour(iso: string): number {
  return new Date(iso).getUTCHours();
}

export function getWallClockMinute(iso: string): number {
  return new Date(iso).getUTCMinutes();
}

export function isSameWallClockDay(iso: string, day: Date): boolean {
  const parsed = new Date(iso);
  return (
    parsed.getUTCFullYear() === day.getFullYear() &&
    parsed.getUTCMonth() === day.getMonth() &&
    parsed.getUTCDate() === day.getDate()
  );
}

export function formatWallClockTime(iso: string): string {
  const parsed = new Date(iso);
  const hours = String(parsed.getUTCHours()).padStart(2, '0');
  const minutes = String(parsed.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function wallClockSortKey(iso: string): number {
  const parsed = new Date(iso);
  return Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
    parsed.getUTCHours(),
    parsed.getUTCMinutes(),
    parsed.getUTCSeconds()
  );
}

export function wallClockDayStart(day: Date): number {
  return Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
}
