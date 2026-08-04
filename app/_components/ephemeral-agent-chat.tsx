"use client";

import {
  Client,
  type HandleMessageStreamEvent,
  type SessionState,
  isTurnFailureEvent,
} from "eve/client";
import { useEveAgent } from "eve/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatShell } from "@/app/_components/chat-shell-context";
import {
  ChatConversation,
  ChatConversationContent,
  ChatScrollButton,
} from "@/components/chat/conversation";
import { ChatComposer } from "@/components/chat/composer";
import { ErrorToast } from "@/components/chat/error-toast";
import { IntegrationsMenu } from "@/components/chat/integrations-menu";
import { AgentMessage, type AgentInputResponse } from "@/components/chat/message";
import { BrainMark } from "@/components/brain-mark";
import { ModelPicker } from "@/components/chat/model-picker";
import { createChat, updateChat } from "@/lib/chat/chats-api";
import { getChatMessageLengthError } from "@/lib/chat/limits";
import type { ChatRecord, ChatSummary } from "@/lib/chat/store/types";
import { useSubagentChildFailures } from "@/lib/chat/subagent-child-failures";
import { createFallbackTitle } from "@/lib/chat/title";
import { createTurnClientContext } from "@/lib/chat/turn-client-context";

type CancellationState = "idle" | "requested" | "cancelling";

type Cancellation = {
  requested: boolean;
  sentTurnId?: string;
  turnId?: string;
};

type ErrorNotice = {
  readonly id: string;
  readonly message: string;
};

export type DisposeEphemeralChat = () => Promise<boolean>;

const EMPTY_EVENTS: readonly HandleMessageStreamEvent[] = [];

const MemoizedAgentMessage = memo(AgentMessage);

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function failureEventId(event: HandleMessageStreamEvent) {
  if (!isTurnFailureEvent(event)) {
    return null;
  }

  if (event.type === "session.failed") {
    return `${event.type}:${event.data.sessionId}:${event.meta?.at ?? event.data.code}`;
  }

  return `${event.type}:${event.data.turnId}:${event.data.sequence}`;
}

export function EphemeralAgentChat({
  chatId,
  draft,
  initialEvents,
  initialSession,
  onChatCreated,
  onChatUpdated,
  onDisposeReady,
  onDraftChange,
  onUserMessage,
}: {
  readonly chatId: string | null;
  readonly draft: string;
  readonly initialEvents?: readonly HandleMessageStreamEvent[];
  readonly initialSession?: SessionState | null;
  readonly onChatCreated?: (chat: ChatRecord) => void;
  readonly onChatUpdated?: (chat: ChatSummary) => void;
  readonly onDisposeReady?: (dispose: DisposeEphemeralChat | null) => void;
  readonly onDraftChange: (value: string) => void;
  readonly onUserMessage?: (text: string) => void;
}) {
  const { enabledConnections, selectedModelId, setConnectionEnabled, setSelectedModelId } =
    useChatShell();
  const seedEvents = initialEvents ?? EMPTY_EVENTS;
  const [session] = useState(() =>
    new Client({ host: "", preserveCompletedSessions: true }).session(initialSession ?? undefined),
  );
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;
  const cancellationRef = useRef<Cancellation>({ requested: false });
  const agentStopRef = useRef<() => void>(() => undefined);
  const disposalBoundaryRef = useRef(false);
  const disposalResolveRef = useRef<((disposed: boolean) => void) | null>(null);
  const errorSequenceRef = useRef(0);
  const seenFailureIdsRef = useRef(new Set<string>());
  const [cancellationState, setCancellationState] = useState<CancellationState>("idle");
  const [clientError, setClientError] = useState<ErrorNotice | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const showClientError = useCallback((message: string) => {
    errorSequenceRef.current += 1;
    setClientError({ id: `client:${errorSequenceRef.current}`, message });
    setDismissedError(null);
  }, []);

  const ensureChat = useCallback(
    async (titleSource: string) => {
      if (chatIdRef.current) {
        return chatIdRef.current;
      }

      const chat = await createChat({ title: createFallbackTitle(titleSource) });
      chatIdRef.current = chat.id;
      onChatCreated?.(chat);
      return chat.id;
    },
    [onChatCreated],
  );

  const persistChatUpdate = useCallback(
    async (input: {
      readonly eveSession?: SessionState | null;
      readonly appendEvents?: readonly HandleMessageStreamEvent[];
      readonly events?: readonly HandleMessageStreamEvent[];
    }) => {
      const id = chatIdRef.current;
      if (!id) {
        return;
      }

      try {
        const chat = await updateChat(id, input);
        onChatUpdated?.(chat);
      } catch {
        showClientError("Unable to save chat history.");
      }
    },
    [onChatUpdated, showClientError],
  );

  const persistSession = useCallback(
    (nextSession: SessionState) => {
      void persistChatUpdate({ eveSession: nextSession });
    },
    [persistChatUpdate],
  );

  const finishDisposal = useCallback(
    async (resolve: (disposed: boolean) => void) => {
      try {
        await session.reset();
        agentStopRef.current();
        resolve(true);
      } catch (error) {
        showClientError(toErrorMessage(error, "Unable to start a new chat."));
        resolve(false);
      }
    },
    [session, showClientError],
  );

  const cancelTurn = useCallback(
    (turnId: string) => {
      const cancellation = cancellationRef.current;
      if (!cancellation.requested) {
        return;
      }
      if (cancellation.sentTurnId === turnId) {
        return;
      }
      if (!session.state.sessionId) {
        return;
      }

      cancellation.sentTurnId = turnId;
      setCancellationState("cancelling");

      void session.cancel({ turnId }).catch((error: unknown) => {
        if (cancellationRef.current !== cancellation) {
          return;
        }

        cancellation.sentTurnId = undefined;
        showClientError(toErrorMessage(error, "Unable to cancel the response."));
        setCancellationState("requested");
        disposalResolveRef.current?.(false);
        disposalResolveRef.current = null;
      });
    },
    [session, showClientError],
  );

  const handleEvent = useCallback(
    (event: HandleMessageStreamEvent) => {
      void persistChatUpdate({ appendEvents: [event] });

      const failureId = failureEventId(event);
      if (failureId && isTurnFailureEvent(event) && !seenFailureIdsRef.current.has(failureId)) {
        seenFailureIdsRef.current.add(failureId);
        setClientError({ id: failureId, message: event.data.message });
        setDismissedError(null);
      }

      if (event.type === "turn.started") {
        disposalBoundaryRef.current = false;
        const cancellation = cancellationRef.current;
        cancellation.turnId = event.data.turnId;
        cancelTurn(event.data.turnId);
        return;
      }

      if (
        event.type === "session.completed" ||
        event.type === "session.failed" ||
        event.type === "session.waiting"
      ) {
        disposalBoundaryRef.current = true;
        cancellationRef.current = { requested: false };
        setCancellationState((current) => (current === "idle" ? current : "idle"));
      }
    },
    [cancelTurn, persistChatUpdate],
  );

  const handleFinish = useCallback(
    (snapshot: {
      readonly events: readonly HandleMessageStreamEvent[];
      readonly session: SessionState;
    }) => {
      void persistChatUpdate({
        eveSession: snapshot.session,
        events: snapshot.events,
      });

      if (!disposalBoundaryRef.current) {
        return;
      }

      const resolve = disposalResolveRef.current;
      if (resolve) {
        disposalResolveRef.current = null;
        void finishDisposal(resolve);
      }
    },
    [finishDisposal, persistChatUpdate],
  );

  const agent = useEveAgent({
    initialEvents: seedEvents,
    onEvent: handleEvent,
    onFinish: handleFinish,
    onSessionChange: persistSession,
    session,
  });
  agentStopRef.current = agent.stop;
  const childFailuresByCallId = useSubagentChildFailures(agent.events);
  const send = agent.send;

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
  const agentError = agent.error?.message
    ? { id: `agent:${agent.error.message}`, message: agent.error.message }
    : null;
  const displayError = clientError ?? agentError;
  const visibleError = displayError && displayError.id !== dismissedError ? displayError : null;

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

  useEffect(() => {
    if (agent.status === "error" && agent.error?.message) {
      setDismissedError((previous) => (previous === null ? previous : null));
    }
  }, [agent.error?.message, agent.status]);

  useEffect(() => {
    if (!isBusy) {
      setCancellationState((current) => (current === "idle" ? current : "idle"));
      cancellationRef.current = { requested: false };
    }
  }, [isBusy]);

  const prepareTurn = useCallback(() => {
    disposalBoundaryRef.current = false;
    cancellationRef.current = { requested: false };
    setCancellationState("idle");
    setClientError(null);
    setDismissedError(null);
  }, []);

  const requestCancellation = useCallback(() => {
    if (!isBusy) {
      return;
    }

    const cancellation = cancellationRef.current;
    cancellation.requested = true;
    setClientError(null);
    setDismissedError(null);
    setCancellationState((current) => (current === "cancelling" ? current : "requested"));

    if (cancellation.turnId !== undefined) {
      cancellation.sentTurnId = undefined;
      cancelTurn(cancellation.turnId);
    }
  }, [cancelTurn, isBusy]);

  const dispose = useCallback<DisposeEphemeralChat>(async () => {
    if (!isBusy) {
      return await new Promise<boolean>((resolve) => {
        void finishDisposal(resolve);
      });
    }

    return await new Promise<boolean>((resolve) => {
      disposalResolveRef.current = resolve;
      requestCancellation();
    });
  }, [finishDisposal, isBusy, requestCancellation]);

  useEffect(() => {
    onDisposeReady?.(dispose);
  }, [dispose, onDisposeReady]);

  useEffect(() => {
    return () => {
      onDisposeReady?.(null);
      disposalResolveRef.current?.(false);
      disposalResolveRef.current = null;
      agentStopRef.current();
    };
  }, [onDisposeReady]);

  const turnClientContext = useMemo(
    () =>
      createTurnClientContext({
        enabledConnections,
        modelId: selectedModelId,
      }),
    [enabledConnections, selectedModelId],
  );

  const handleInputResponses = useCallback(
    async (responses: readonly AgentInputResponse[]) => {
      try {
        await ensureChat("Follow-up");
        prepareTurn();
        await send({
          inputResponses: [...responses],
          clientContext: turnClientContext,
        });
      } catch (error) {
        showClientError(toErrorMessage(error, "Failed to send response."));
      }
    },
    [ensureChat, prepareTurn, send, showClientError, turnClientContext],
  );

  const handleSubmit = useCallback(
    async (text: string) => {
      const lengthError = getChatMessageLengthError(text);
      if (lengthError) {
        showClientError(lengthError);
        return;
      }

      const previousDraft = text;
      onDraftChange("");
      onUserMessage?.(text);
      prepareTurn();

      try {
        await ensureChat(text);
        await send({
          message: text,
          clientContext: turnClientContext,
        });
      } catch (error) {
        onDraftChange(previousDraft);
        showClientError(toErrorMessage(error, "Failed to send message."));
      }
    },
    [
      ensureChat,
      onDraftChange,
      onUserMessage,
      prepareTurn,
      send,
      showClientError,
      turnClientContext,
    ],
  );

  const failedUserText = useMemo(() => {
    if (lastMessage?.role !== "user" || lastMessage.metadata?.status !== "failed") {
      return null;
    }
    const textPart = lastMessage.parts.find((part) => part.type === "text");
    return textPart && textPart.type === "text" ? textPart.text : null;
  }, [lastMessage]);

  useEffect(() => {
    if (agent.status !== "error" || draft.length > 0 || !failedUserText) {
      return;
    }
    onDraftChange(failedUserText);
  }, [agent.status, draft.length, failedUserText, onDraftChange]);

  const authDisabledReason = pendingAuthorization
    ? `Connect ${pendingAuthorization.displayName} to continue this turn.`
    : undefined;

  const canRespondToMessage = useCallback(
    (messageId: string) => {
      if (messageId !== lastMessage?.id) {
        return false;
      }
      if (waitingForAuthorization) {
        return false;
      }
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
    },
    [isBusy, lastMessage, waitingForAuthorization],
  );

  const dismissError = useCallback(() => {
    if (visibleError) {
      setDismissedError(visibleError.id);
    }
  }, [visibleError]);

  return (
    <div className="bg-background text-foreground flex h-full min-h-0 flex-1 flex-col">
      {visibleError ? <ErrorToast message={visibleError.message} onDismiss={dismissError} /> : null}
      <ChatConversation className="min-h-0 flex-1">
        <ChatConversationContent className="mx-auto w-full max-w-3xl gap-4 px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-24">
              <div className="text-center">
                <BrainMark className="mx-auto size-10" />
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">Brain</h1>
                <p className="text-muted-foreground mt-2 text-sm">Ask anything to get started.</p>
              </div>
            </div>
          ) : null}
          {messages.map((message) => (
            <MemoizedAgentMessage
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
            <output aria-live="polite" className="block px-3">
              <div className="text-muted-foreground text-[15px] leading-6 font-medium">
                <span className="shimmer-text">Thinking...</span>
              </div>
            </output>
          ) : null}
        </ChatConversationContent>
        <ChatScrollButton />
      </ChatConversation>
      <div className="border-border/60 bg-background/95 border-t p-3 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <ChatComposer
            disabledReason={
              authDisabledReason ??
              (cancellationState === "cancelling" || cancellationState === "requested"
                ? "Stopping…"
                : undefined)
            }
            footerStart={
              <div className="flex min-w-0 items-center gap-1">
                <IntegrationsMenu
                  enabledConnections={enabledConnections}
                  onConnectionEnabledChange={setConnectionEnabled}
                />
                <ModelPicker
                  disabled={isBusy}
                  onModelIdChange={setSelectedModelId}
                  selectedModelId={selectedModelId}
                />
              </div>
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
