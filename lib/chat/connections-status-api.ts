import { z } from "zod";

const connectionStatusSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  status: z.enum(["connected", "needs_sign_in", "needs_setup"]),
  detail: z.string().optional(),
  /** True when this user may open Set up / App settings for the connection. */
  canConfigureApp: z.boolean().optional(),
});

const responseSchema = z.object({
  connections: z.array(connectionStatusSchema),
});

export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;

export async function fetchConnectionStatuses(): Promise<readonly ConnectionStatus[]> {
  const response = await fetch("/api/connections/status", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Connection status request failed (${response.status})`);
  }
  const data: unknown = await response.json();
  return responseSchema.parse(data).connections;
}

const CONNECTION_STATUS_LABELS: Record<ConnectionStatus["status"], string> = {
  connected: "Connected",
  needs_sign_in: "Sign in",
  needs_setup: "Set up needed",
};

export function connectionStatusLabel(status: ConnectionStatus["status"]): string {
  return CONNECTION_STATUS_LABELS[status];
}

const authorizeResponseSchema = z.object({
  authorizeUrl: z.string().url(),
  callbackUrl: z.string().url(),
  displayName: z.string(),
});

export async function startConnectionAuthorize(
  connectionId: string,
): Promise<{ readonly authorizeUrl: string; readonly displayName: string }> {
  const response = await fetch(`/api/connections/${connectionId}/authorize`, {
    method: "POST",
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `Connection authorize failed (${response.status})`;
    throw new Error(error);
  }
  const parsed = authorizeResponseSchema.parse(data);
  return { authorizeUrl: parsed.authorizeUrl, displayName: parsed.displayName };
}

export function getSafeAuthorizeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export async function disconnectConnection(
  connectionId: string,
): Promise<{ readonly displayName: string }> {
  const response = await fetch(`/api/connections/${connectionId}/disconnect`, {
    method: "DELETE",
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `Connection disconnect failed (${response.status})`;
    throw new Error(error);
  }
  const parsed = z.object({ displayName: z.string() }).parse(data);
  return { displayName: parsed.displayName };
}

const connectionSetupSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  requiresClientSecret: z.boolean(),
  hasStoredCredentials: z.boolean().optional(),
  hasWorkspaceCredentials: z.boolean().optional(),
  hasCredentials: z.boolean(),
  credentialSource: z.enum(["workspace", "stored", "env"]).nullable(),
  /** Saved app id for managers to edit. Secrets are never returned. */
  storedClientId: z.string().nullable().optional(),
  clientIdEnv: z.string().optional(),
  clientSecretEnv: z.string().optional(),
  callbackPath: z.string(),
  callbackUrl: z.string().url(),
  canManageCredentials: z.boolean(),
});

export type ConnectionSetupInfo = z.infer<typeof connectionSetupSchema>;

export async function fetchConnectionSetup(connectionId: string): Promise<ConnectionSetupInfo> {
  const response = await fetch(`/api/connections/${connectionId}/setup`, { cache: "no-store" });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `Connection setup request failed (${response.status})`;
    throw new Error(error);
  }
  return connectionSetupSchema.parse(data);
}

export async function saveConnectionSetup(
  connectionId: string,
  input: { readonly clientId: string; readonly clientSecret?: string },
): Promise<{ readonly displayName: string }> {
  const response = await fetch(`/api/connections/${connectionId}/setup`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `Unable to save credentials (${response.status})`;
    throw new Error(error);
  }
  return z.object({ displayName: z.string() }).parse(data);
}

export async function clearConnectionSetup(
  connectionId: string,
): Promise<{ readonly displayName: string }> {
  const response = await fetch(`/api/connections/${connectionId}/setup`, {
    method: "DELETE",
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `Unable to clear credentials (${response.status})`;
    throw new Error(error);
  }
  return z.object({ displayName: z.string() }).parse(data);
}

export async function fetchWorkspaceConnectionSetup(
  connectionId: string,
): Promise<ConnectionSetupInfo> {
  const response = await fetch(`/api/workspaces/connections/${connectionId}/setup`, {
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `Workspace connection setup request failed (${response.status})`;
    throw new Error(error);
  }
  return connectionSetupSchema.parse(data);
}

export async function saveWorkspaceConnectionSetup(
  connectionId: string,
  input: { readonly clientId: string; readonly clientSecret?: string },
): Promise<{ readonly displayName: string }> {
  const response = await fetch(`/api/workspaces/connections/${connectionId}/setup`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `Unable to save workspace credentials (${response.status})`;
    throw new Error(error);
  }
  return z.object({ displayName: z.string() }).parse(data);
}

export async function clearWorkspaceConnectionSetup(
  connectionId: string,
): Promise<{ readonly displayName: string }> {
  const response = await fetch(`/api/workspaces/connections/${connectionId}/setup`, {
    method: "DELETE",
    cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : `Unable to clear workspace credentials (${response.status})`;
    throw new Error(error);
  }
  return z.object({ displayName: z.string() }).parse(data);
}
