"use client";

import { Client, type HandleMessageStreamEvent, isTurnFailureEvent } from "eve/client";
import { useEveAgent } from "eve/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatShell } from "@/app/_components/chat-shell-context";
import {
  ChatConversation,
  ChatConversationContent,
  ChatScrollButton,
} from "@/components/chat/conversation";
import { ChatComposer } from "@/components/chat/composer";
import { ErrorToast } from "@/components/chat/error-toast";
import { IntegrationsMenu } from "@/components/chat/integrations-menu";
import {
  AgentMessage,
  type AgentInputResponse,
} from "@/components/chat/message";
import { BrainMark } from "@/components/brain-mark";
import { createConnectionClientContext } from "@/lib/chat/connection-context";
import { useSubagentChildFailures } from "@/lib/chat/subagent-child-failures";

type CancellationState = "idle" | "requested" | "cancelling";

type Cancellation = {
  requested: boolean;
  sentTurnId?: string;
  turnId?: string;
};

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function EphemeralAgentChat({
  draft,
  onDraftChange,
  onUserMessage,
}: {
  readonly draft: string;
  readonly onDraftChange: (value: string) => void;
  readonly onUserMessage?: (text: string) => void;
}) {
  const { enabledConnections, setConnectionEnabled } = useChatShell();
  const [session] = useState(() =>
    new Client({ host: "", preserveCompletedSessions: true }).session(),
  );
  const cancellationRef = useRef<Cancellation>({ requested: false });
  const [cancellationState, setCancellationState] = useState<CancellationState>("idle");
  const [clientError, setClientError] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const cancelTurn = useCallback(
    (turnId: string) => {
      const cancellation = cancellationRef.current;
      if (!cancellation.requested || cancellation.sentTurnId === turnId) {
        return;
      }

      cancellation.sentTurnId = turnId;
      setCancellationState("cancelling");

      void session.cancel({ turnId }).catch((error: unknown) => {
        if (cancellationRef.current !== cancellation) {
          return;
        }

        cancellation.requested = false;
        cancellation.sentTurnId = undefined;
        setClientError(toErrorMessage(error, "Unable to cancel the response."));
        setDismissedError(null);
        setCancellationState("idle");
      });
    },
    [session],
  );

  const handleEvent = useCallback(
    (event: HandleMessageStreamEvent) => {
      if (event.type === "turn.started") {
        const cancellation = cancellationRef.current;
        cancellation.turnId = event.data.turnId;
        cancelTurn(event.data.turnId);
        return;
      }

      if (
        event.type === "turn.completed" ||
        event.type === "turn.failed" ||
        event.type === "turn.cancelled" ||
        event.type === "session.failed"
      ) {
        cancellationRef.current = { requested: false };
        setCancellationState("idle");
      }
    },
    [cancelTurn],
  );

  const agent = useEveAgent({ onEvent: handleEvent, session });
  const childFailuresByCallId = useSubagentChildFailures(agent.events);

  const messages = agent.data.messages;
  const lastMessage = messages.at(-1);
  const pendingAuthorization = useMemo(
    () =>
      messages
        .flatMap((message) => message.parts)
        .find((part) => part.type === "authorization" && part.state === "required"),
    [messages],
  );
  const waitingForAuthorization = Boolean(pendingAuthorization);
  const isStreaming = agent.status === "submitted" || agent.status === "streaming";
  const isBusy = isStreaming || waitingForAuthorization;
  const displayError = clientError ?? agent.error?.message ?? null;
  const visibleError =
    displayError && displayError !== dismissedError ? displayError : null;

  const hasVisibleAssistantWork = useMemo(() => {
    if (!lastMessage || lastMessage.role !== "assistant") {
      return false;
    }
    return lastMessage.parts.some(
      (part) =>
        (part.type === "text" && part.text.trim().length > 0) ||
        part.type === "dynamic-tool" ||
        part.type === "authorization" ||
        (part.type === "reasoning" && part.text.trim().length > 0),
    );
  }, [lastMessage]);

  const showThinking = isStreaming && !hasVisibleAssistantWork;

  const latestTurnFailureMessage = useMemo(() => {
    for (let index = agent.events.length - 1; index >= 0; index -= 1) {
      const event = agent.events[index]!;
      if (isTurnFailureEvent(event)) {
        return event.data.message;
      }
    }
    return null;
  }, [agent.events]);

  useEffect(() => {
    if (!latestTurnFailureMessage) {
      return;
    }
    setClientError((previous) =>
      previous === latestTurnFailureMessage ? previous : latestTurnFailureMessage,
    );
    setDismissedError((previous) => (previous === null ? previous : null));
  }, [latestTurnFailureMessage]);

  useEffect(() => {
    if (agent.status === "error" && agent.error?.message) {
      setDismissedError((previous) => (previous === null ? previous : null));
    }
  }, [agent.error?.message, agent.status]);

  const prepareTurn = useCallback(() => {
    cancellationRef.current = { requested: false };
    setCancellationState("idle");
    setClientError(null);
    setDismissedError(null);
  }, []);

  const requestCancellation = useCallback(() => {
    if (!isBusy || cancellationState !== "idle") {
      return;
    }

    const cancellation = cancellationRef.current;
    cancellation.requested = true;
    setClientError(null);
    setDismissedError(null);
    setCancellationState("requested");

    if (cancellation.turnId !== undefined) {
      cancelTurn(cancellation.turnId);
    }
  }, [cancelTurn, cancellationState, isBusy]);

  const handleInputResponses = useCallback(
    async (responses: readonly AgentInputResponse[]) => {
      try {
        prepareTurn();
        await agent.send({
          inputResponses: [...responses],
          clientContext: createConnectionClientContext(enabledConnections),
        });
      } catch (error) {
        setClientError(toErrorMessage(error, "Failed to send response."));
      }
    },
    [agent, enabledConnections, prepareTurn],
  );

  const handleSubmit = useCallback(
    async (text: string) => {
      const previousDraft = text;
      onDraftChange("");
      onUserMessage?.(text);
      prepareTurn();

      try {
        await agent.send({
          message: text,
          clientContext: createConnectionClientContext(enabledConnections),
        });
      } catch (error) {
        onDraftChange(previousDraft);
        setClientError(toErrorMessage(error, "Failed to send message."));
      }
    },
    [agent, enabledConnections, onDraftChange, onUserMessage, prepareTurn],
  );

  const failedUserText = useMemo(() => {
    if (lastMessage?.role !== "user" || lastMessage.metadata?.status !== "failed") {
      return null;
    }
    const textPart = lastMessage.parts.find((part) => part.type === "text");
    return textPart && textPart.type === "text" ? textPart.text : null;
  }, [lastMessage]);

  // Restore draft if the store surfaces an error after clearing it.
  useEffect(() => {
    if (agent.status !== "error" || draft.length > 0 || !failedUserText) {
      return;
    }
    onDraftChange(failedUserText);
  }, [agent.status, draft.length, failedUserText, onDraftChange]);

  const authDisabledReason = pendingAuthorization
    ? `Connect ${pendingAuthorization.displayName} to continue this turn.`
    : undefined;

  const canRespondToMessage = (messageId: string) => {
    if (messageId !== lastMessage?.id) {
      return false;
    }
    if (waitingForAuthorization) {
      return false;
    }
    // Allow HITL replies even while a prior tool is still settling.
    const hasPendingInput = lastMessage.parts.some(
      (part) =>
        part.type === "dynamic-tool" &&
        part.toolMetadata?.eve?.inputRequest &&
        !part.toolMetadata.eve.inputResponse,
    );
    if (hasPendingInput) {
      return true;
    }
    return !isBusy;
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background text-foreground">
      {visibleError ? (
        <ErrorToast
          message={visibleError}
          onDismiss={() => setDismissedError(visibleError)}
        />
      ) : null}
      <ChatConversation className="min-h-0 flex-1">
        <ChatConversationContent className="mx-auto w-full max-w-3xl gap-4 px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-24">
              <div className="text-center">
                <BrainMark className="mx-auto size-10 text-[2.5rem]" />
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">Brain</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ask anything to get started.
                </p>
              </div>
            </div>
          ) : null}
          {messages.map((message) => (
            <AgentMessage
              canRespond={canRespondToMessage(message.id)}
              childFailuresByCallId={childFailuresByCallId}
              isStreaming={
                isStreaming && message.role === "assistant" && message.id === lastMessage?.id
              }
              key={message.id}
              message={message}
              onInputResponses={handleInputResponses}
            />
          ))}
          {showThinking ? (
            <article aria-live="polite" className="px-3" role="status">
              <div className="text-[15px] font-medium leading-6 text-muted-foreground">
                <span className="shimmer-text">Thinking...</span>
              </div>
            </article>
          ) : null}
        </ChatConversationContent>
        <ChatScrollButton />
      </ChatConversation>
      <div className="border-t border-border/60 bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <ChatComposer
            disabledReason={authDisabledReason}
            footerStart={
              <IntegrationsMenu
                enabledConnections={enabledConnections}
                onConnectionEnabledChange={setConnectionEnabled}
              />
            }
            isBusy={isBusy}
            onChange={onDraftChange}
            onStop={requestCancellation}
            onSubmit={handleSubmit}
            placeholder="Ask Brain anything..."
            value={draft}
          />
        </div>
      </div>
    </div>
  );
}
