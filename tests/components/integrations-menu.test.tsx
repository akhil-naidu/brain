import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  integrationStatusText,
  IntegrationsMenu,
  shouldOfferConnectionConnect,
} from "@/components/chat/integrations-menu";

const fetchConnectionStatuses = vi.hoisted(() =>
  vi.fn(async () => [
    { id: "clickup", displayName: "ClickUp", status: "connected" as const },
    { id: "slack", displayName: "Slack", status: "needs_sign_in" as const },
    { id: "asana", displayName: "Asana", status: "needs_setup" as const, detail: "Set ASANA" },
    { id: "gmail", displayName: "Gmail", status: "needs_sign_in" as const },
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
    ).toBe("Needs setup");
    expect(
      integrationStatusText({
        loading: false,
        status: undefined,
        statusError: "boom",
      }),
    ).toBe("Status unavailable");
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

describe("IntegrationsMenu status", () => {
  it("loads connection status when the menu trigger is pressed", async () => {
    render(
      <IntegrationsMenu
        enabledConnections={{ asana: true, clickup: true, gmail: true, slack: true }}
        onConnectionEnabledChange={vi.fn()}
      />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Connections" }));

    await waitFor(() => {
      expect(fetchConnectionStatuses).toHaveBeenCalled();
    });
  });
});
