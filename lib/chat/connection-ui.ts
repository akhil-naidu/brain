import { connectionOffersAppSetup, connectionUsesPatAuth } from "@/lib/chat/connection-catalog";
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

export function shouldOfferConnectionDisconnect(
  status: ConnectionStatus | undefined,
  connectionId?: string,
): boolean {
  if (connectionId && connectionUsesPatAuth(connectionId)) {
    return false;
  }
  return status?.status === "connected";
}

/**
 * Static OAuth apps and PAT apps (Snowflake) can be configured by workspace
 * admins / host operator. DCR apps (ClickUp, dFlow) never need it.
 */
export function shouldOfferConnectionConfigure(
  status: ConnectionStatus | undefined,
  connectionId: string,
): boolean {
  return Boolean(status?.canConfigureApp) && connectionOffersAppSetup(connectionId);
}

export function connectionConfigureLabel(status: ConnectionStatus | undefined): string {
  return status?.status === "needs_setup" ? "Set up" : "App settings";
}

/** Member-facing hint when credentials are missing and they cannot configure. */
export function connectionAdminSetupHint(
  status: ConnectionStatus | undefined,
  _connectionId?: string,
): string | null {
  if (status?.status !== "needs_setup" || status.canConfigureApp) {
    return null;
  }
  return "A workspace admin needs to set up this app before you can connect.";
}

/** Users can only turn a connection on after it is signed in. */
export function canEnableConnection(status: ConnectionStatus | undefined): boolean {
  return status?.status === "connected";
}
