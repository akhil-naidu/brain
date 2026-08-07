import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationsConnectionActions } from "@/components/chat/integrations-connection-actions";
import { IntegrationsMenu } from "@/components/chat/integrations-menu";
import {
  canEnableConnection,
  connectionAdminSetupHint,
  connectionConfigureLabel,
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
  it("offers configure only when canConfigureApp is true for static apps", () => {
    expect(
      shouldOfferConnectionConfigure(
        {
          id: "asana",
          displayName: "Asana",
          status: "needs_setup",
          canConfigureApp: true,
        },
        "asana",
      ),
    ).toBe(true);
    expect(
      shouldOfferConnectionConfigure(
        {
          id: "asana",
          displayName: "Asana",
          status: "needs_setup",
          canConfigureApp: false,
        },
        "asana",
      ),
    ).toBe(false);
    expect(
      shouldOfferConnectionConfigure(
        {
          id: "slack",
          displayName: "Slack",
          status: "needs_sign_in",
          canConfigureApp: true,
        },
        "slack",
      ),
    ).toBe(true);
    expect(
      shouldOfferConnectionConfigure(
        {
          id: "gmail",
          displayName: "Gmail",
          status: "connected",
          canConfigureApp: true,
        },
        "gmail",
      ),
    ).toBe(true);
    expect(
      shouldOfferConnectionConfigure(
        {
          id: "clickup",
          displayName: "ClickUp",
          status: "connected",
          canConfigureApp: false,
        },
        "clickup",
      ),
    ).toBe(false);
    expect(shouldOfferConnectionConfigure(undefined, "slack")).toBe(false);
  });

  it("labels configure as Set up or App settings", () => {
    expect(
      connectionConfigureLabel({
        id: "slack",
        displayName: "Slack",
        status: "needs_setup",
      }),
    ).toBe("Set up");
    expect(
      connectionConfigureLabel({
        id: "slack",
        displayName: "Slack",
        status: "connected",
      }),
    ).toBe("App settings");
  });
});

describe("connectionAdminSetupHint", () => {
  it("hints members when setup is needed and they cannot configure", () => {
    expect(
      connectionAdminSetupHint({
        id: "slack",
        displayName: "Slack",
        status: "needs_setup",
        canConfigureApp: false,
      }),
    ).toMatch(/workspace admin/i);
    expect(
      connectionAdminSetupHint({
        id: "slack",
        displayName: "Slack",
        status: "needs_setup",
        canConfigureApp: true,
      }),
    ).toBeNull();
    expect(
      connectionAdminSetupHint({
        id: "slack",
        displayName: "Slack",
        status: "needs_sign_in",
        canConfigureApp: false,
      }),
    ).toBeNull();
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

describe("IntegrationsConnectionActions", () => {
  it("offers Set up icon and Connect button for static apps when allowed", () => {
    const onConfigure = vi.fn();
    const onConnect = vi.fn();
    render(
      <IntegrationsConnectionActions
        connectionId="asana"
        isConnecting={false}
        isDisconnecting={false}
        onConfigure={onConfigure}
        onConnect={onConnect}
        onDisconnect={vi.fn()}
        status={{
          id: "asana",
          displayName: "Asana",
          status: "needs_setup",
          canConfigureApp: true,
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Set up" }));
    expect(onConfigure).toHaveBeenCalledTimes(1);

    cleanup();
    render(
      <IntegrationsConnectionActions
        connectionId="slack"
        isConnecting={false}
        isDisconnecting={false}
        onConfigure={vi.fn()}
        onConnect={onConnect}
        onDisconnect={vi.fn()}
        status={{
          id: "slack",
          displayName: "Slack",
          status: "needs_sign_in",
          canConfigureApp: true,
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "App settings" })).toBeTruthy();
  });

  it("hides configure for members who cannot manage app credentials", () => {
    const { container } = render(
      <IntegrationsConnectionActions
        connectionId="slack"
        isConnecting={false}
        isDisconnecting={false}
        onConfigure={vi.fn()}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
        status={{
          id: "slack",
          displayName: "Slack",
          status: "needs_setup",
          canConfigureApp: false,
        }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Set up" })).toBeNull();
    expect(screen.queryByRole("button", { name: "App settings" })).toBeNull();
    expect(container.querySelectorAll("button").length).toBe(0);
  });

  it("hides configure for DCR apps", () => {
    const { container } = render(
      <IntegrationsConnectionActions
        connectionId="clickup"
        isConnecting={false}
        isDisconnecting={false}
        onConfigure={vi.fn()}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
        status={{ id: "clickup", displayName: "ClickUp", status: "connected" }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Set up" })).toBeNull();
    expect(screen.queryByRole("button", { name: "App settings" })).toBeNull();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeTruthy();
    expect(container.querySelectorAll("button").length).toBe(1);
  });
});
