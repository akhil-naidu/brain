export type AuthSessionRow = {
  readonly token: string;
  readonly createdAt: Date | string;
  readonly updatedAt: Date | string;
  readonly expiresAt: Date | string;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
};

export function isAuthSessionRow(value: unknown): value is AuthSessionRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("token" in value) || typeof value.token !== "string" || !value.token) {
    return false;
  }
  return "createdAt" in value && "expiresAt" in value;
}

export function unwrapSessionList(value: unknown): readonly AuthSessionRow[] {
  if (Array.isArray(value)) {
    return value.filter(isAuthSessionRow);
  }
  if (typeof value === "object" && value !== null && "data" in value && Array.isArray(value.data)) {
    return value.data.filter(isAuthSessionRow);
  }
  return [];
}

/** Lightweight UA summary for session lists — not a full detector. */
export function describeUserAgent(userAgent: string | null | undefined): string {
  const ua = userAgent?.trim();
  if (!ua) {
    return "Unknown device";
  }

  let browser = "Browser";
  if (/Edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = "Opera";
  } else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) {
    browser = "Chrome";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = "Safari";
  }

  let os = "Unknown OS";
  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = "iOS";
  } else if (/Android/i.test(ua)) {
    os = "Android";
  } else if (/Mac OS X|Macintosh/i.test(ua)) {
    os = "macOS";
  } else if (/Windows/i.test(ua)) {
    os = "Windows";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  return `${browser} on ${os}`;
}

export function formatSessionWhen(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return date.toLocaleString();
}
