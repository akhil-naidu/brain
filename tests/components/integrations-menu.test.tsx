import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationsMenu } from "@/components/chat/integrations-menu";
import {
  canEnableConnection,
  integrationStatusText,
  shouldOfferConnectionConfigure,
  shouldOfferConnectionConnect,
  shouldOfferConnectionDisconnect,
} from "@/lib/chat/connection-ui";

const fetchConnectionStatuses = vi.hoisted(() =>
  vi.fn(async () => [
    { id: "clickup", displayName: "ClickUp", status: "connected" as const },
    { id: "slack", displayName: "Slack", status: "needs_sign_in" as const },
    { id: "asana", displayName: "Asana", status: "needs_setup" as const, detail: "Set ASANA" },
    { id: "gmail", displayName: "Gmail", status: "needs_sign_in" as const },
    { id: "dflow", displayName: "dFlow", status: "needs_sign_in" as const },
    { id: "github", displayName: "GitHub", status: "needs_setup" as const, detail: "Set GITHUB" },
  ]),
);

vi.mock("@/lib/chat/connections-status-api", async () => {
  const actual = await vi.importActual("@/lib/chat/connections-status-api");
  return {
    ...actual,
    fetchConnectionStatuses,
  };
});

afterEach(() => {
  cleanup();
  fetchConnectionStatuses.mockClear();
});

describe("integrationStatusText", () => {
  it("renders loading, status, and error fallbacks", () => {
    expect(integrationStatusText({ loading: true, status: undefined, statusError: null })).toBe(
      "Checking…",
    );
    expect(
      integrationStatusText({
        loading: false,
        status: { id: "slack", displayName: "Slack", status: "needs_sign_in" },
        statusError: null,
      }),
    ).toBe("Sign in");
    expect(
      integrationStatusText({
        loading: false,
        status: { id: "asana", displayName: "Asana", status: "needs_setup" },
        statusError: null,
      }),
    ).toBe("Set up needed");
    expect(
      integrationStatusText({
        loading: false,
        status: undefined,
        statusError: "boom",
      }),
    ).toBe("Status unavailable");
  });
});

describe("canEnableConnection", () => {
  it("allows enabling only when connected", () => {
    expect(
      canEnableConnection({
        id: "clickup",
        displayName: "ClickUp",
        status: "connected",
      }),
    ).toBe(true);
    expect(
      canEnableConnection({
        id: "slack",
        displayName: "Slack",
        status: "needs_sign_in",
      }),
    ).toBe(false);
    expect(
      canEnableConnection({
        id: "asana",
        displayName: "Asana",
        status: "needs_setup",
      }),
    ).toBe(false);
    expect(canEnableConnection(undefined)).toBe(false);
  });
});

describe("shouldOfferConnectionConnect", () => {
  it("offers Connect only when sign-in is needed", () => {
    expect(
      shouldOfferConnectionConnect({
        id: "slack",
        displayName: "Slack",
        status: "needs_sign_in",
      }),
    ).toBe(true);
    expect(
      shouldOfferConnectionConnect({
        id: "clickup",
        displayName: "ClickUp",
        status: "connected",
      }),
    ).toBe(false);
    expect(
      shouldOfferConnectionConnect({
        id: "asana",
        displayName: "Asana",
        status: "needs_setup",
      }),
    ).toBe(false);
    expect(shouldOfferConnectionConnect(undefined)).toBe(false);
  });
});

describe("shouldOfferConnectionDisconnect", () => {
  it("offers Disconnect only when connected", () => {
    expect(
      shouldOfferConnectionDisconnect({
        id: "clickup",
        displayName: "ClickUp",
        status: "connected",
      }),
    ).toBe(true);
    expect(
      shouldOfferConnectionDisconnect({
        id: "slack",
        displayName: "Slack",
        status: "needs_sign_in",
      }),
    ).toBe(false);
    expect(shouldOfferConnectionDisconnect(undefined)).toBe(false);
  });
});

describe("shouldOfferConnectionConfigure", () => {
  it("offers Configure only when setup is needed", () => {
    expect(
      shouldOfferConnectionConfigure({
        id: "asana",
        displayName: "Asana",
        status: "needs_setup",
      }),
    ).toBe(true);
    expect(
      shouldOfferConnectionConfigure({
        id: "slack",
        displayName: "Slack",
        status: "needs_sign_in",
      }),
    ).toBe(false);
    expect(
      shouldOfferConnectionConfigure({
        id: "clickup",
        displayName: "ClickUp",
        status: "connected",
      }),
    ).toBe(false);
    expect(shouldOfferConnectionConfigure(undefined)).toBe(false);
  });
});

describe("IntegrationsMenu status", () => {
  it("loads connection status when the menu trigger is pressed", async () => {
    render(
      <IntegrationsMenu
        enabledConnections={{
          asana: true,
          clickup: true,
          dflow: true,
          github: false,
          gmail: true,
          slack: true,
        }}
        onConnectionEnabledChange={vi.fn()}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Tools" }));

    await waitFor(() => {
      expect(fetchConnectionStatuses).toHaveBeenCalled();
    });
  });
});
