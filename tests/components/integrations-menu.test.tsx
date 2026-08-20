import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationsMenu } from "@/components/chat/integrations-menu";
import {
  canEnableConnection,
  connectionAdminSetupHint,
  connectionConfigureLabel,
  integrationStatusText,
  shouldOfferConnectionConfigure,
  shouldOfferConnectionConnect,
  shouldOfferLabeledConnectionSetup,
  shouldOfferConnectionDisconnect,
} from "@/lib/chat/connection-ui";

const fetchConnectionStatuses = vi.hoisted(() =>
  vi.fn(async () => [
    { id: "clickup", displayName: "ClickUp", status: "connected" as const },
    { id: "slack", displayName: "Slack", status: "needs_sign_in" as const },
    { id: "asana", displayName: "Asana", status: "needs_setup" as const, detail: "Set ASANA" },
    { id: "gmail", displayName: "Gmail", status: "needs_sign_in" as const },
    { id: "notion", displayName: "Notion", status: "needs_sign_in" as const },
    { id: "linear", displayName: "Linear", status: "needs_sign_in" as const },
    { id: "atlassian", displayName: "Atlassian", status: "needs_sign_in" as const },
    { id: "zernio", displayName: "Zernio", status: "needs_sign_in" as const },
    { id: "sentry", displayName: "Sentry", status: "needs_sign_in" as const },
    { id: "dflow", displayName: "dFlow", status: "needs_sign_in" as const },
    { id: "github", displayName: "GitHub", status: "needs_setup" as const, detail: "Set GITHUB" },
    {
      id: "snowflake",
      displayName: "Snowflake",
      status: "needs_setup" as const,
      detail: "Set SNOWFLAKE_MCP_SERVER_URL",
    },
    {
      id: "mongodb",
      displayName: "MongoDB",
      status: "needs_setup" as const,
      detail: "Set up MongoDB to continue",
    },
    {
      id: "toolbox",
      displayName: "MCP Toolbox",
      status: "needs_setup" as const,
      detail: "Set up MCP Toolbox to continue",
    },
    {
      id: "rybbit",
      displayName: "Rybbit",
      status: "needs_setup" as const,
      detail: "Set up Rybbit to continue",
    },
    {
      id: "bytebot",
      displayName: "Bytebot",
      status: "needs_setup" as const,
      detail: "Set up Bytebot to continue",
    },
  ]),
);

const fetchMcpToolsCatalog = vi.hoisted(() =>
  vi.fn(async () => ({
    connections: [
      {
        connectionId: "clickup",
        connectionName: "ClickUp",
        tools: [
          { name: "clickup_search", description: "Search" },
          { name: "clickup_create_task", description: "Create" },
        ],
        error: null,
      },
    ],
  })),
);

const push = vi.hoisted(() => vi.fn());
const showToast = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/ui/toast-store", () => ({
  showToast,
}));

vi.mock("@/lib/chat/connections-status-api", async () => {
  const actual = await vi.importActual("@/lib/chat/connections-status-api");
  return {
    ...actual,
    fetchConnectionStatuses,
  };
});

vi.mock("@/lib/chat/connections-tools-api", async () => {
  const actual = await vi.importActual("@/lib/chat/connections-tools-api");
  return {
    ...actual,
    fetchMcpToolsCatalog,
  };
});

afterEach(() => {
  cleanup();
  fetchConnectionStatuses.mockClear();
  fetchMcpToolsCatalog.mockClear();
  push.mockClear();
  showToast.mockClear();
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
    ).toBe("Connect");
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

  it("hides Disconnect for PAT/env connections like Snowflake", () => {
    expect(
      shouldOfferConnectionDisconnect(
        {
          id: "snowflake",
          displayName: "Snowflake",
          status: "connected",
        },
        "snowflake",
      ),
    ).toBe(false);
  });

  it("hides Disconnect for HTTP MCP URL connections", () => {
    expect(
      shouldOfferConnectionDisconnect(
        {
          id: "mongodb",
          displayName: "MongoDB",
          status: "connected",
        },
        "mongodb",
      ),
    ).toBe(false);
    expect(
      shouldOfferConnectionDisconnect(
        {
          id: "toolbox",
          displayName: "MCP Toolbox",
          status: "connected",
        },
        "toolbox",
      ),
    ).toBe(false);
  });
});

describe("shouldOfferConnectionConfigure for HTTP MCP URL", () => {
  it("offers Set up when canConfigureApp is true", () => {
    expect(
      shouldOfferConnectionConfigure(
        {
          id: "mongodb",
          displayName: "MongoDB",
          status: "needs_setup",
          canConfigureApp: true,
        },
        "mongodb",
      ),
    ).toBe(true);
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
    expect(
      shouldOfferConnectionConfigure(
        {
          id: "snowflake",
          displayName: "Snowflake",
          status: "needs_setup",
          canConfigureApp: true,
        },
        "snowflake",
      ),
    ).toBe(true);
    expect(shouldOfferConnectionConfigure(undefined, "slack")).toBe(false);
  });

  it("offers a labeled Set up button only when credentials are missing", () => {
    expect(
      shouldOfferLabeledConnectionSetup(
        {
          id: "slack",
          displayName: "Slack",
          status: "needs_setup",
          canConfigureApp: true,
        },
        "slack",
      ),
    ).toBe(true);
    expect(
      shouldOfferLabeledConnectionSetup(
        {
          id: "slack",
          displayName: "Slack",
          status: "needs_sign_in",
          canConfigureApp: true,
        },
        "slack",
      ),
    ).toBe(false);
    expect(
      shouldOfferConnectionConnect({ id: "slack", displayName: "Slack", status: "needs_setup" }),
    ).toBe(false);
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
    expect(
      connectionAdminSetupHint(
        {
          id: "snowflake",
          displayName: "Snowflake",
          status: "needs_setup",
          canConfigureApp: false,
        },
        "snowflake",
      ),
    ).toMatch(/workspace admin/i);
  });
});

describe("IntegrationsMenu status", () => {
  it("loads connection status and tools when the menu trigger is pressed", async () => {
    render(
      <IntegrationsMenu
        enabledConnections={{
          asana: true,
          atlassian: false,
          clickup: true,
          dflow: true,
          github: false,
          gmail: true,
          linear: false,
          mongodb: false,
          notion: true,
          sentry: false,
          slack: true,
          snowflake: false,
          toolbox: false,
          rybbit: false,
          bytebot: false,
          zernio: false,
        }}
        onConnectionEnabledChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Tools" });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(fetchConnectionStatuses).toHaveBeenCalledTimes(1);
      expect(fetchMcpToolsCatalog).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /ClickUp tools/i })).toBeTruthy();
    });
    expect(screen.queryByText("clickup_search")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /ClickUp tools/i }));

    await waitFor(() => {
      expect(screen.getByText("ClickUp tools")).toBeTruthy();
      expect(screen.getByText("clickup_search")).toBeTruthy();
      expect(screen.getByText("clickup_create_task")).toBeTruthy();
    });
  });

  it("sends users to Tools when enabling an unconfigured app", async () => {
    render(
      <IntegrationsMenu
        enabledConnections={{
          asana: false,
          atlassian: false,
          clickup: false,
          dflow: false,
          github: false,
          gmail: false,
          linear: false,
          mongodb: false,
          notion: false,
          sentry: false,
          slack: false,
          snowflake: false,
          toolbox: false,
          rybbit: false,
          bytebot: false,
          zernio: false,
        }}
        onConnectionEnabledChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Tools" });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getAllByRole("switch", { name: /Enable GitHub/i }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("switch", { name: /Enable GitHub/i })[0]!);

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Set up required",
        variant: "info",
      }),
    );
    expect(push).toHaveBeenCalledWith("/tools?focus=github");
    expect(screen.queryByText(/Tools page first/i)).toBeNull();
  });
});
