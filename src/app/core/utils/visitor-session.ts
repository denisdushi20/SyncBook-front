const SESSION_PREFIX = 'syncbook_visitor_session_';
const EMAIL_PREFIX = 'syncbook_visitor_email_';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidVisitorEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed);
}

export function getVisitorSessionId(businessId: string): string {
  const key = `${SESSION_PREFIX}${businessId}`;
  const existing = localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export function getVisitorEmail(businessId: string): string | null {
  const key = `${EMAIL_PREFIX}${businessId}`;
  const stored = localStorage.getItem(key);
  return stored?.trim() || null;
}

export function setVisitorEmail(businessId: string, email: string): void {
  const key = `${EMAIL_PREFIX}${businessId}`;
  localStorage.setItem(key, email.trim().toLowerCase());
}

export function clearVisitorEmail(businessId: string): void {
  const key = `${EMAIL_PREFIX}${businessId}`;
  localStorage.removeItem(key);
}
