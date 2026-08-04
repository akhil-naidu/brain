import type { HandleMessageStreamEvent } from "eve/client";
import type { UseEveAgentOptions } from "eve/react";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const agent = vi.hoisted(() => ({
  data: { messages: [] },
  error: undefined,
  events: [],
  reset: vi.fn(),
  send: vi.fn(),
  session: { streamIndex: 0 },
  status: "ready",
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
  }: {
    readonly message: string;
    readonly onDismiss: () => void;
  }) => (
    <output>
      {message}
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

afterEach(cleanup);

function renderChat() {
  const onDraftChange = vi.fn();
  render(<EphemeralAgentChat chatId={null} draft="" onDraftChange={onDraftChange} />);
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
});
