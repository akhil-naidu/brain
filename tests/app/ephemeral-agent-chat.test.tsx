import type * as EveClient from "eve/client";
import type { HandleMessageStreamEvent } from "eve/client";
import type { UseEveAgentOptions } from "eve/react";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const agent = vi.hoisted(() => ({
  data: { messages: [] as Array<Record<string, unknown>> },
  error: undefined as { message: string } | undefined,
  events: [] as unknown[],
  reset: vi.fn(),
  send: vi.fn(),
  session: { streamIndex: 0 },
  status: "ready" as string,
  stop: vi.fn(),
}));

const sessionMock = vi.hoisted(() => {
  const state: { sessionId: string | undefined } = { sessionId: "sess-1" };
  return {
    cancel: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
    state,
  };
});

const callbacks = vi.hoisted(
  (): {
    onEvent?: (event: HandleMessageStreamEvent) => void;
    onFinish?: NonNullable<UseEveAgentOptions<{ messages: [] }>["onFinish"]>;
  } => ({}),
);

vi.mock("eve/client", async (importOriginal) => {
  const actual = await importOriginal<typeof EveClient>();
  return {
    ...actual,
    Client: class {
      session() {
        return sessionMock;
      }
    },
  };
});

vi.mock("eve/react", () => ({
  useEveAgent: (options?: UseEveAgentOptions<{ messages: [] }>) => {
    callbacks.onEvent = options?.onEvent;
    callbacks.onFinish = options?.onFinish;
    return agent;
  },
}));

vi.mock("@/app/_components/chat-shell-context", () => ({
  useChatShell: () => ({
    enabledConnections: {
      asana: true,
      clickup: true,
      dflow: true,
      github: true,
      gmail: true,
      slack: true,
      snowflake: false,
    },
    selectedModelId: "deepseek/deepseek-v4-pro",
    setConnectionEnabled: vi.fn(),
    setSelectedModelId: vi.fn(),
  }),
}));

vi.mock("@/components/chat/model-picker", () => ({
  ModelPicker: () => null,
}));

vi.mock("@/components/chat/scheduled-brief-panel", () => ({
  ScheduledBriefPanel: () => null,
}));

vi.mock("@/components/chat/scheduled-playbooks-panel", () => ({
  ScheduledPlaybooksPanel: () => null,
}));

vi.mock("@/lib/chat/setup-api", () => ({
  fetchSetupStatus: async () => ({ commandCodeApiKeyConfigured: true }),
}));

vi.mock("@/lib/chat/chats-api", () => ({
  createChat: vi.fn(async () => ({
    createdAt: new Date().toISOString(),
    events: [],
    eveSession: null,
    id: "chat-1",
    title: "Summarize ClickUp",
    updatedAt: new Date().toISOString(),
  })),
  updateChat: vi.fn(async (id: string) => ({
    createdAt: new Date().toISOString(),
    id,
    title: "Summarize ClickUp",
    updatedAt: new Date().toISOString(),
  })),
}));

vi.mock("@/components/brain-mark", () => ({
  BrainMark: () => null,
}));

vi.mock("@/components/chat/composer", () => ({
  ChatComposer: ({
    disabledReason,
    onStop,
    onSubmit,
  }: {
    readonly disabledReason?: string;
    readonly onStop: () => void;
    readonly onSubmit: (message: string) => Promise<void> | void;
  }) => (
    <div>
      <button onClick={() => void onSubmit("😀".repeat(8001))} type="button">
        Submit oversized message
      </button>
      <button onClick={onStop} type="button">
        Stop response
      </button>
      {disabledReason ? <span>{disabledReason}</span> : null}
    </div>
  ),
}));

vi.mock("@/components/chat/conversation", () => ({
  ChatConversation: ({ children }: { readonly children: ReactNode }) => <div>{children}</div>,
  ChatConversationContent: ({ children }: { readonly children: ReactNode }) => (
    <div>{children}</div>
  ),
  ChatScrollButton: () => null,
}));

vi.mock("@/components/chat/error-toast", () => ({
  ErrorToast: ({
    message,
    onDismiss,
    onRetry,
  }: {
    readonly message: string;
    readonly onDismiss: () => void;
    readonly onRetry?: () => void;
  }) => (
    <output>
      {message}
      {onRetry ? (
        <button onClick={onRetry} type="button">
          Retry
        </button>
      ) : null}
      <button onClick={onDismiss} type="button">
        Dismiss
      </button>
    </output>
  ),
}));

vi.mock("@/components/chat/integrations-menu", () => ({
  IntegrationsMenu: () => null,
}));

vi.mock("@/components/chat/message", () => ({
  AgentMessage: () => null,
}));

vi.mock("@/lib/chat/subagent-child-failures", () => ({
  useSubagentChildFailures: () => new Map(),
}));

import { EphemeralAgentChat } from "@/app/_components/ephemeral-agent-chat";

afterEach(() => {
  cleanup();
  agent.data = { messages: [] };
  agent.error = undefined;
  agent.status = "ready";
  agent.send.mockReset();
  agent.send.mockResolvedValue(undefined);
  agent.stop.mockReset();
  sessionMock.cancel.mockReset();
  sessionMock.cancel.mockResolvedValue(undefined);
  sessionMock.reset.mockReset();
  sessionMock.reset.mockResolvedValue(undefined);
  sessionMock.state.sessionId = "sess-1";
  callbacks.onEvent = undefined;
  callbacks.onFinish = undefined;
});

function renderChat(draft = "") {
  const onDraftChange = vi.fn();
  let dispose: (() => Promise<boolean>) | null = null;
  render(
    <EphemeralAgentChat
      chatId={null}
      draft={draft}
      onDisposeReady={(next) => {
        dispose = next;
      }}
      onDraftChange={onDraftChange}
    />,
  );
  return {
    onDraftChange,
    dispose: () => {
      if (!dispose) {
        throw new Error("dispose was not registered");
      }
      return dispose();
    },
  };
}

describe("EphemeralAgentChat", () => {
  it("rejects oversized messages at the send boundary", async () => {
    const { onDraftChange } = renderChat();

    fireEvent.click(screen.getByRole("button", { name: "Submit oversized message" }));

    await waitFor(() => {
      expect(screen.getByText("Messages must be 8,000 characters or fewer.")).toBeDefined();
    });
    expect(agent.send).not.toHaveBeenCalled();
    expect(onDraftChange).not.toHaveBeenCalled();
  });

  it("shows repeated failure messages from distinct events", () => {
    renderChat();

    const firstFailure: HandleMessageStreamEvent = {
      data: {
        code: "provider_error",
        message: "Provider unavailable",
        sequence: 1,
        turnId: "turn-1",
      },
      type: "turn.failed",
    };
    const secondFailure: HandleMessageStreamEvent = {
      data: {
        code: "provider_error",
        message: "Provider unavailable",
        sequence: 2,
        turnId: "turn-2",
      },
      type: "turn.failed",
    };

    act(() => callbacks.onEvent?.(firstFailure));
    expect(screen.getByText("Provider unavailable")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Provider unavailable")).toBeNull();

    act(() => callbacks.onEvent?.(secondFailure));
    expect(screen.getByText("Provider unavailable")).toBeDefined();
  });

  it("retries the last user prompt from the error toast", async () => {
    agent.status = "error";
    agent.error = { message: "Provider unavailable" };
    agent.data = {
      messages: [
        {
          id: "user-1",
          parts: [{ type: "text", text: "Summarize ClickUp" }],
          role: "user",
        },
      ],
    };

    renderChat();

    expect(screen.getByText("Provider unavailable")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Summarize ClickUp",
        }),
      );
    });
  });

  it("keeps Stop pending without detaching the stream early", async () => {
    agent.status = "streaming";
    renderChat();

    const turnStarted: HandleMessageStreamEvent = {
      data: { sequence: 1, turnId: "turn-stop" },
      type: "turn.started",
    };

    act(() => {
      callbacks.onEvent?.(turnStarted);
    });

    fireEvent.click(screen.getByRole("button", { name: "Stop response" }));

    await waitFor(() => {
      expect(sessionMock.cancel).toHaveBeenCalledWith({ turnId: "turn-stop" });
    });
    expect(screen.getByText("Stopping…")).toBeDefined();
    expect(agent.stop).not.toHaveBeenCalled();
  });

  it("disposes immediately when not streaming", async () => {
    agent.status = "ready";
    const { dispose } = renderChat();

    await expect(dispose()).resolves.toBe(true);
    expect(sessionMock.reset).toHaveBeenCalled();
    expect(agent.stop).toHaveBeenCalled();
    expect(sessionMock.cancel).not.toHaveBeenCalled();
  });

  it("waits for the cancellation boundary before disposing a streaming chat", async () => {
    agent.status = "streaming";
    const { dispose } = renderChat();

    const turnStarted: HandleMessageStreamEvent = {
      data: { sequence: 1, turnId: "turn-dispose" },
      type: "turn.started",
    };
    const sessionWaiting: HandleMessageStreamEvent = {
      data: {
        continuationToken: "token",
        wait: "next-user-message",
      },
      type: "session.waiting",
    };

    act(() => {
      callbacks.onEvent?.(turnStarted);
    });

    const disposePromise = dispose();

    await waitFor(() => {
      expect(sessionMock.cancel).toHaveBeenCalledWith({ turnId: "turn-dispose" });
    });
    expect(sessionMock.reset).not.toHaveBeenCalled();

    act(() => {
      callbacks.onEvent?.(sessionWaiting);
      callbacks.onFinish?.({
        data: { messages: [] },
        error: undefined,
        events: [],
        session: { sessionId: "sess-1", streamIndex: 0 },
        status: "ready",
      });
    });

    await expect(disposePromise).resolves.toBe(true);
    expect(sessionMock.reset).toHaveBeenCalled();
    expect(agent.stop).toHaveBeenCalled();
  });
});
