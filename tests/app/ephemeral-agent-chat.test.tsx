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

const callbacks = vi.hoisted(
  (): {
    onEvent?: (event: HandleMessageStreamEvent) => void;
  } => ({}),
);

vi.mock("eve/react", () => ({
  useEveAgent: (options?: UseEveAgentOptions<{ messages: [] }>) => {
    callbacks.onEvent = options?.onEvent;
    return agent;
  },
}));

vi.mock("@/app/_components/chat-shell-context", () => ({
  useChatShell: () => ({
    enabledConnections: { asana: true, clickup: true, gmail: true, slack: true },
    selectedModelId: "deepseek/deepseek-v4-pro",
    setConnectionEnabled: vi.fn(),
    setSelectedModelId: vi.fn(),
  }),
}));

vi.mock("@/components/chat/model-picker", () => ({
  ModelPicker: () => null,
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
    onSubmit,
  }: {
    readonly onSubmit: (message: string) => Promise<void> | void;
  }) => (
    <button onClick={() => void onSubmit("😀".repeat(8001))} type="button">
      Submit oversized message
    </button>
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
});

function renderChat(draft = "") {
  const onDraftChange = vi.fn();
  render(<EphemeralAgentChat chatId={null} draft={draft} onDraftChange={onDraftChange} />);
  return { onDraftChange };
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
});
