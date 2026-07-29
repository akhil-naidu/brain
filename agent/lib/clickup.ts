const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

export function requireClickUpToken(): string {
  const token = process.env.CLICKUP_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "CLICKUP_API_TOKEN is not set. Create a personal API token in ClickUp Settings → Apps and add it to .env.",
    );
  }
  return token;
}

export async function clickupFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${CLICKUP_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: requireClickUpToken(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      typeof body === "object" && body !== null
        ? JSON.stringify(body)
        : String(body);
    throw new Error(`ClickUp API ${response.status} ${response.statusText}: ${detail}`);
  }

  return body as T;
}
