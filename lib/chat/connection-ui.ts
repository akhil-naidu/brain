import { connectionNeedsStaticAppCredentials } from "@/lib/chat/connection-catalog";
import { connectionStatusLabel, type ConnectionStatus } from "@/lib/chat/connections-status-api";

export function integrationStatusText(input: {
  readonly loading: boolean;
  readonly status: ConnectionStatus | undefined;
  readonly statusError: string | null;
}): string {
  if (input.loading) {
    return "Checking…";
  }
  if (input.status) {
    return connectionStatusLabel(input.status.status);
  }
  if (input.statusError) {
    return "Status unavailable";
  }
  return "—";
}

export function shouldOfferConnectionConnect(status: ConnectionStatus | undefined): boolean {
  return status?.status === "needs_sign_in";
}

export function shouldOfferConnectionDisconnect(status: ConnectionStatus | undefined): boolean {
  return status?.status === "connected";
}

/**
 * Static-credential apps can be configured anytime (initial Set up or later App settings).
 * DCR apps (ClickUp, dFlow) never need this control.
 */
export function shouldOfferConnectionConfigure(
  status: ConnectionStatus | undefined,
  connectionId: string,
): boolean {
  return Boolean(status) && connectionNeedsStaticAppCredentials(connectionId);
}

export function connectionConfigureLabel(status: ConnectionStatus | undefined): string {
  return status?.status === "needs_setup" ? "Set up" : "App settings";
}

/** Users can only turn a connection on after it is signed in. */
export function canEnableConnection(status: ConnectionStatus | undefined): boolean {
  return status?.status === "connected";
}
