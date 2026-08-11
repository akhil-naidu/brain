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

vi.mock("next/navigation", () => ({
  usePathname: () => "/chat",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/_components/chat-shell-context", () => ({
  useChatShell: () => ({
    catalogModels: [
      {
        id: "deepseek/deepseek-v4-pro",
        label: "DeepSeek V4 Pro",
        description: "Default",
        contextWindowTokens: 1_000_000,
        source: "command-code",
      },
    ],
    catalogReady: true,
    enabledConnections: {
      asana: true,
      atlassian: true,
      clickup: true,
      dflow: true,
      github: true,
      gmail: true,
      linear: true,
      mongodb: true,
      notion: true,
      sentry: true,
      slack: true,
      snowflake: true,
      toolbox: true,
      zernio: true,
    },
    refreshModelCatalog: vi.fn(),
    chatMode: "agent",
    selectedModelId: "deepseek/deepseek-v4-pro",
    setChatMode: vi.fn(),
    setConnectionEnabled: vi.fn(),
    setSelectedModelId: vi.fn(),
    workspaceId: "ws-1",
  }),
}));

vi.mock("@/components/chat/chat-mode-picker", () => ({
  ChatModePicker: () => null,
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
  fetchSetupStatus: async () => ({
    commandCodeApiKeyConfigured: true,
    customModelsAvailable: false,
  }),
}));

vi.mock("@/lib/chat/chat-projects-api", () => ({
  listChatProjects: vi.fn(async () => []),
}));

vi.mock("@/lib/chat/scheduled-playbooks-api", () => ({
  listScheduledPlaybooks: vi.fn(async () => []),
}));

vi.mock("@/lib/chat/chats-api", () => ({
  createChat: vi.fn(async () => ({
    createdAt: new Date().toISOString(),
    events: [],
    eveSession: null,
    id: "chat-1",
    archivedAt: null,
    pinnedAt: null,
    projectId: null,
    revision: 0,
    title: "Summarize ClickUp",
    updatedAt: new Date().toISOString(),
    userId: "user-a",
    visibility: "personal" as const,
    workspaceId: "ws-1",
  })),
  getChat: vi.fn(async (id: string) => ({
    createdAt: new Date().toISOString(),
    events: [],
    eveSession: null,
    id,
    archivedAt: null,
    pinnedAt: null,
    projectId: null,
    revision: 0,
    title: "Summarize ClickUp",
    updatedAt: new Date().toISOString(),
    userId: "user-a",
    visibility: "personal" as const,
    workspaceId: "ws-1",
  })),
  isChatApiConflictError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "code" in error && error.code === "conflict"),
  updateChat: vi.fn(async (id: string) => ({
    createdAt: new Date().toISOString(),
    events: [],
    eveSession: null,
    id,
    archivedAt: null,
    pinnedAt: null,
    projectId: null,
    revision: 1,
    title: "Summarize ClickUp",
    updatedAt: new Date().toISOString(),
    userId: "user-a",
    visibility: "personal" as const,
    workspaceId: "ws-1",
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
  AgentMessage: ({
    emptyOutcome,
    message,
    onEditResend,
    onRegenerate,
  }: {
    readonly emptyOutcome?: "failed" | "stopped" | null;
    readonly message: {
      readonly id: string;
      readonly parts: ReadonlyArray<{ readonly text?: string; readonly type: string }>;
      readonly role: string;
    };
    readonly onEditResend?: (text: string) => void;
    readonly onRegenerate?: () => void;
  }) => {
    const text = message.parts.find((part) => part.type === "text")?.text ?? "";
    return (
      <article data-testid={`message-${message.id}`}>
        {text ? <p>{text}</p> : null}
        {emptyOutcome === "failed" ? <p>Couldn't generate a response</p> : null}
        {emptyOutcome === "stopped" ? <p>Response stopped</p> : null}
        {onRegenerate ? (
          <button onClick={() => onRegenerate()} type="button">
            Regenerate response
          </button>
        ) : null}
        {onEditResend ? (
          <button onClick={() => onEditResend(`${text} (edited)`)} type="button">
            Edit send
          </button>
        ) : null}
      </article>
    );
  },
}));

vi.mock("@/lib/chat/subagent-child-failures", () => ({
  useSubagentChildFailures: () => new Map(),
}));

import { EphemeralAgentChat } from "@/app/_components/ephemeral-agent-chat";
import { listChatProjects } from "@/lib/chat/chat-projects-api";
import { updateChat } from "@/lib/chat/chats-api";

afterEach(() => {
  cleanup();
  agent.data = { messages: [] };
  agent.error = undefined;
  agent.events = [];
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
  vi.mocked(listChatProjects).mockReset();
  vi.mocked(listChatProjects).mockResolvedValue([]);
});

function renderChat(draft = "", projectId: string | null = null) {
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
      projectId={projectId}
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

function updateChatPersistHasUserMessage(input: unknown): boolean {
  if (input === null || typeof input !== "object" || !("events" in input)) {
    return false;
  }
  const events = Reflect.get(input, "events");
  if (!Array.isArray(events)) {
    return false;
  }
  return events.some((event) => {
    if (event === null || typeof event !== "object" || !("type" in event)) {
      return false;
    }
    return Reflect.get(event, "type") === "message.received";
  });
}

describe("EphemeralAgentChat", () => {
  it("shows project context on an empty project chat", async () => {
    vi.mocked(listChatProjects).mockResolvedValue([
      {
        id: "proj-1",
        name: "Research",
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
        userId: "user-a",
        workspaceId: "ws-1",
      },
    ]);

    renderChat("", "proj-1");

    expect(await screen.findByRole("link", { name: "Research" })).toBeDefined();
    expect(
      screen.getByText(/New chat in Research\. Ask across your connected work apps/),
    ).toBeDefined();
  });

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

  it("regenerates without flashing the empty new-chat welcome", async () => {
    agent.status = "ready";
    agent.data = {
      messages: [
        {
          id: "t1:user",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Summarize ClickUp", state: "done" }],
          role: "user",
        },
        {
          id: "t1:assistant",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Here is a summary.", state: "done" }],
          role: "assistant",
        },
      ],
    };

    renderChat();

    expect(screen.getByText("Here is a summary.")).toBeDefined();
    expect(
      screen.queryByText(/Ask across your connected work apps — tasks, mail, Slack/),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));

    expect(screen.getByText("Summarize ClickUp")).toBeDefined();
    expect(screen.queryByText("Here is a summary.")).toBeNull();
    expect(
      screen.queryByText(/Ask across your connected work apps — tasks, mail, Slack/),
    ).toBeNull();
    expect(screen.queryByRole("heading", { name: "Brain" })).toBeNull();

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Summarize ClickUp",
        }),
      );
    });
  });

  it("keeps the user prompt when regenerating an empty failed assistant reply", async () => {
    agent.status = "ready";
    agent.events = [
      {
        data: { code: "provider_error", message: "boom", sequence: 1, turnId: "t1" },
        type: "turn.failed",
      },
    ];
    agent.data = {
      messages: [
        {
          id: "t1:user",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Draft a brief", state: "done" }],
          role: "user",
        },
        {
          id: "t1:assistant",
          metadata: { status: "complete", turnId: "t1" },
          parts: [],
          role: "assistant",
        },
      ],
    };

    renderChat();

    expect(screen.getByText("Couldn't generate a response")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));

    expect(screen.getByText("Draft a brief")).toBeDefined();
    expect(screen.queryByText("Couldn't generate a response")).toBeNull();
    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Draft a brief",
        }),
      );
    });
  });

  it("keeps earlier turns when regenerating the latest reply", async () => {
    agent.status = "ready";
    agent.data = {
      messages: [
        {
          id: "t1:user",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "First prompt", state: "done" }],
          role: "user",
        },
        {
          id: "t1:assistant",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "First reply", state: "done" }],
          role: "assistant",
        },
        {
          id: "t2:user",
          metadata: { status: "complete", turnId: "t2" },
          parts: [{ type: "text", text: "Second prompt", state: "done" }],
          role: "user",
        },
        {
          id: "t2:assistant",
          metadata: { status: "complete", turnId: "t2" },
          parts: [{ type: "text", text: "Second reply", state: "done" }],
          role: "assistant",
        },
      ],
    };

    renderChat();

    fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));

    expect(screen.getByText("First prompt")).toBeDefined();
    expect(screen.getByText("First reply")).toBeDefined();
    expect(screen.getByText("Second prompt")).toBeDefined();
    expect(screen.queryByText("Second reply")).toBeNull();
    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Second prompt",
        }),
      );
    });
  });

  it("restores the prior assistant reply when regenerate send fails", async () => {
    agent.status = "ready";
    agent.send.mockRejectedValueOnce(new Error("Provider unavailable"));
    agent.data = {
      messages: [
        {
          id: "t1:user",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Summarize ClickUp", state: "done" }],
          role: "user",
        },
        {
          id: "t1:assistant",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Here is a summary.", state: "done" }],
          role: "assistant",
        },
      ],
    };

    renderChat();

    fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));

    await waitFor(() => {
      expect(screen.getByText("Here is a summary.")).toBeDefined();
    });
    expect(screen.getByText("Summarize ClickUp")).toBeDefined();
    expect(screen.getByText("Provider unavailable")).toBeDefined();
  });

  it("restores the failed placeholder and keeps history when regenerate turn fails", async () => {
    vi.mocked(updateChat).mockClear();
    agent.status = "ready";
    agent.events = [
      {
        data: { code: "provider_error", message: "boom", sequence: 1, turnId: "t1" },
        type: "turn.failed",
      },
    ];
    agent.data = {
      messages: [
        {
          id: "t1:user",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "hi", state: "done" }],
          role: "user",
        },
        {
          id: "t1:assistant",
          metadata: { status: "complete", turnId: "t1" },
          parts: [],
          role: "assistant",
        },
      ],
    };

    render(
      <EphemeralAgentChat chatId="chat-1" draft="" onDraftChange={vi.fn()} projectId={null} />,
    );

    expect(screen.getByText("Couldn't generate a response")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));
    expect(screen.queryByText("Couldn't generate a response")).toBeNull();
    expect(screen.getByText("hi")).toBeDefined();

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalled();
    });

    const snapshotEvents: HandleMessageStreamEvent[] = [
      {
        data: { sequence: 1, turnId: "t1" },
        type: "turn.started",
      },
      {
        data: { message: "hi", sequence: 2, turnId: "t1" },
        type: "message.received",
      },
      {
        data: { code: "provider_error", message: "first fail", sequence: 3, turnId: "t1" },
        type: "turn.failed",
      },
      {
        data: { sequence: 4, turnId: "t2" },
        type: "turn.started",
      },
      {
        data: { code: "provider_error", message: "second fail", sequence: 5, turnId: "t2" },
        type: "turn.failed",
      },
    ];

    act(() => {
      agent.status = "error";
      agent.error = { message: "second fail" };
      callbacks.onFinish?.({
        data: { messages: [] },
        error: undefined,
        events: snapshotEvents,
        session: { sessionId: "sess-1", streamIndex: 5 },
        status: "error",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Couldn't generate a response")).toBeDefined();
    });
    expect(screen.getByText("hi")).toBeDefined();

    await waitFor(() => {
      expect(updateChat).toHaveBeenCalled();
    });
    const persistCalls = vi.mocked(updateChat).mock.calls.filter((call) => {
      const input = call[1];
      return (
        input !== null &&
        typeof input === "object" &&
        "events" in input &&
        Array.isArray(Reflect.get(input, "events"))
      );
    });
    expect(persistCalls.length).toBeGreaterThan(0);
    for (const call of persistCalls) {
      expect(updateChatPersistHasUserMessage(call[1])).toBe(true);
    }
  });

  it("restores the original prompt when edit send fails", async () => {
    agent.status = "ready";
    agent.send.mockRejectedValueOnce(new Error("Provider unavailable"));
    agent.data = {
      messages: [
        {
          id: "t1:user",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Original prompt", state: "done" }],
          role: "user",
        },
        {
          id: "t1:assistant",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Original reply", state: "done" }],
          role: "assistant",
        },
      ],
    };

    renderChat();

    fireEvent.click(screen.getByRole("button", { name: "Edit send" }));

    await waitFor(() => {
      expect(screen.getByText("Original prompt")).toBeDefined();
    });
    expect(screen.getByText("Original reply")).toBeDefined();
    expect(screen.getByText("Provider unavailable")).toBeDefined();
  });

  it("restores the original turn and keeps history when edit replacement fails", async () => {
    vi.mocked(updateChat).mockClear();
    agent.status = "ready";
    agent.data = {
      messages: [
        {
          id: "t1:user",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Original prompt", state: "done" }],
          role: "user",
        },
        {
          id: "t1:assistant",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Original reply", state: "done" }],
          role: "assistant",
        },
      ],
    };

    render(
      <EphemeralAgentChat chatId="chat-1" draft="" onDraftChange={vi.fn()} projectId={null} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit send" }));
    expect(screen.queryByText("Original prompt")).toBeNull();

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Original prompt (edited)",
        }),
      );
    });

    const snapshotEvents: HandleMessageStreamEvent[] = [
      {
        data: { sequence: 1, turnId: "t1" },
        type: "turn.started",
      },
      {
        data: { message: "Original prompt", sequence: 2, turnId: "t1" },
        type: "message.received",
      },
      {
        data: { sequence: 3, turnId: "t2" },
        type: "turn.started",
      },
      {
        data: { code: "provider_error", message: "edit fail", sequence: 4, turnId: "t2" },
        type: "turn.failed",
      },
    ];

    act(() => {
      agent.status = "error";
      agent.error = { message: "edit fail" };
      callbacks.onFinish?.({
        data: { messages: [] },
        error: undefined,
        events: snapshotEvents,
        session: { sessionId: "sess-1", streamIndex: 4 },
        status: "error",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Original prompt")).toBeDefined();
    });
    expect(screen.getByText("Original reply")).toBeDefined();

    await waitFor(() => {
      expect(updateChat).toHaveBeenCalled();
    });
    const persistCalls = vi.mocked(updateChat).mock.calls.filter((call) => {
      const input = call[1];
      return (
        input !== null &&
        typeof input === "object" &&
        "events" in input &&
        Array.isArray(Reflect.get(input, "events"))
      );
    });
    expect(persistCalls.length).toBeGreaterThan(0);
    for (const call of persistCalls) {
      expect(updateChatPersistHasUserMessage(call[1])).toBe(true);
    }
  });

  it("hides the resent duplicate user bubble after regenerate", async () => {
    agent.status = "ready";
    agent.data = {
      messages: [
        {
          id: "t1:user",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Summarize ClickUp", state: "done" }],
          role: "user",
        },
        {
          id: "t1:assistant",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Old summary", state: "done" }],
          role: "assistant",
        },
      ],
    };

    const { rerender } = render(
      <EphemeralAgentChat chatId={null} draft="" onDraftChange={vi.fn()} projectId={null} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Regenerate response" }));

    await waitFor(() => {
      expect(agent.send).toHaveBeenCalled();
    });

    agent.data = {
      messages: [
        {
          id: "t1:user",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Summarize ClickUp", state: "done" }],
          role: "user",
        },
        {
          id: "t1:assistant",
          metadata: { status: "complete", turnId: "t1" },
          parts: [{ type: "text", text: "Old summary", state: "done" }],
          role: "assistant",
        },
        {
          id: "t2:user",
          metadata: { status: "complete", turnId: "t2" },
          parts: [{ type: "text", text: "Summarize ClickUp", state: "done" }],
          role: "user",
        },
        {
          id: "t2:assistant",
          metadata: { status: "complete", turnId: "t2" },
          parts: [{ type: "text", text: "New summary", state: "done" }],
          role: "assistant",
        },
      ],
    };

    rerender(
      <EphemeralAgentChat chatId={null} draft="" onDraftChange={vi.fn()} projectId={null} />,
    );

    await waitFor(() => {
      expect(screen.getByText("New summary")).toBeDefined();
    });
    expect(screen.getAllByText("Summarize ClickUp")).toHaveLength(1);
    expect(screen.queryByText("Old summary")).toBeNull();
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
