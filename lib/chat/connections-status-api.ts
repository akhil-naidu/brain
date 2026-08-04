import { z } from "zod";

const connectionStatusSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  status: z.enum(["connected", "needs_sign_in", "needs_setup"]),
  detail: z.string().optional(),
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
  needs_sign_in: "Sign in when asked",
  needs_setup: "Needs setup",
};

export function connectionStatusLabel(status: ConnectionStatus["status"]): string {
  return CONNECTION_STATUS_LABELS[status];
}
