"use client";

import {
  Client,
  type HandleMessageStreamEvent,
  type SessionState,
  isTurnFailureEvent,
} from "eve/client";
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
import { AgentMessage, type AgentInputResponse } from "@/components/chat/message";
import { BrainMark } from "@/components/brain-mark";
import { ModelPicker } from "@/components/chat/model-picker";
import { PlaybooksMenu } from "@/components/chat/playbooks-menu";
import { PlaybooksPanel } from "@/components/chat/playbooks-panel";
import { usePlaybooks } from "@/components/chat/use-playbooks";
import { ScheduledBriefPanel } from "@/components/chat/scheduled-brief-panel";
import { WelcomePrompts } from "@/components/chat/welcome-prompts";
import {
  buildUserContentMessage,
  canSubmitChatTurn,
  filesToPendingAttachments,
  type PendingAttachment,
} from "@/lib/chat/attachments";
import { createChat, updateChat } from "@/lib/chat/chats-api";
import { WELCOME_PROMPTS } from "@/lib/chat/welcome-prompts";
import { getChatMessageLengthError } from "@/lib/chat/limits";
import {
  formatProviderErrorMessage,
  MISSING_COMMAND_CODE_API_KEY_COMPOSER_REASON,
  MISSING_COMMAND_CODE_API_KEY_MESSAGE,
  MISSING_COMMAND_CODE_API_KEY_TITLE,
} from "@/lib/chat/provider-setup";
import { fetchSetupStatus } from "@/lib/chat/setup-api";
import type { ChatRecord, ChatSummary } from "@/lib/chat/store/types";
import { useSubagentChildFailures } from "@/lib/chat/subagent-child-failures";
import { createFallbackTitle } from "@/lib/chat/title";
import { copyTextToClipboard, messagesToMarkdown } from "@/lib/chat/export-markdown";
import { canOfferRetry, getLastUserMessage, getRetryableUserPrompt } from "@/lib/chat/retry-prompt";
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

export type ChatThreadActions = {
  readonly canCopy: boolean;
  readonly copyAsMarkdown: (title?: string | null) => Promise<void>;
};

/** Navigation-only: detach if cooperative cancel has not settled. Stop never uses this. */
const DISPOSE_CANCEL_TIMEOUT_MS = 8_000;

const EMPTY_EVENTS: readonly HandleMessageStreamEvent[] = [];

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
  onOpenChat,
  onThreadActionsReady,
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
  readonly onOpenChat?: (chatId: string) => void;
  readonly onThreadActionsReady?: (actions: ChatThreadActions | null) => void;
  readonly onUserMessage?: (text: string) => void;
}) {
  const { enabledConnections, selectedModelId, setConnectionEnabled, setSelectedModelId } =
    useChatShell();
  const { playbooks, savePlaybook, deletePlaybook } = usePlaybooks();
  const [attachments, setAttachments] = useState<readonly PendingAttachment[]>([]);
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
  const disposalTimeoutRef = useRef<number | null>(null);
  const errorSequenceRef = useRef(0);
  const seenFailureIdsRef = useRef(new Set<string>());
  const [cancellationState, setCancellationState] = useState<CancellationState>("idle");
  const [clientError, setClientError] = useState<ErrorNotice | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);

  const clearDisposalTimeout = useCallback(() => {
    if (disposalTimeoutRef.current !== null) {
      window.clearTimeout(disposalTimeoutRef.current);
      disposalTimeoutRef.current = null;
    }
  }, []);

  const [commandCodeConfigured, setCommandCodeConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await fetchSetupStatus();
        if (!cancelled) {
          setCommandCodeConfigured(status.commandCodeApiKeyConfigured);
        }
      } catch {
        if (!cancelled) {
          // If setup status is unavailable, don't block chat; fall back to error rewriting.
          setCommandCodeConfigured(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showClientError = useCallback((message: string) => {
    errorSequenceRef.current += 1;
    setClientError({
      id: `client:${errorSequenceRef.current}`,
      message: formatProviderErrorMessage(message),
    });
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
      clearDisposalTimeout();
      cancellationRef.current = { requested: false };
      setCancellationState("idle");
      try {
        await session.reset();
        agentStopRef.current();
        resolve(true);
      } catch (error) {
        showClientError(toErrorMessage(error, "Unable to start a new chat."));
        resolve(false);
      }
    },
    [clearDisposalTimeout, session, showClientError],
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

        const disposeResolve = disposalResolveRef.current;
        if (disposeResolve) {
          // New chat / navigation: detach so the user is not stuck if cancel fails.
          disposalResolveRef.current = null;
          void finishDisposal(disposeResolve);
          return;
        }

        showClientError(toErrorMessage(error, "Unable to cancel the response."));
        setCancellationState("requested");
      });
    },
    [finishDisposal, session, showClientError],
  );

  const handleEvent = useCallback(
    (event: HandleMessageStreamEvent) => {
      void persistChatUpdate({ appendEvents: [event] });

      const failureId = failureEventId(event);
      if (failureId && isTurnFailureEvent(event) && !seenFailureIdsRef.current.has(failureId)) {
        seenFailureIdsRef.current.add(failureId);
        setClientError({
          id: failureId,
          message: formatProviderErrorMessage(event.data.message),
        });
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

  useEffect(() => {
    if (!onThreadActionsReady) {
      return undefined;
    }

    onThreadActionsReady({
      canCopy: messages.some((message) =>
        message.parts.some(
          (part) =>
            (part.type === "text" && part.text.trim().length > 0) ||
            (part.type === "reasoning" && part.text.trim().length > 0) ||
            part.type === "dynamic-tool" ||
            part.type === "authorization" ||
            part.type === "file",
        ),
      ),
      copyAsMarkdown: async (title) => {
        const markdown = messagesToMarkdown(messages, title);
        if (!markdown) {
          throw new Error("Nothing to copy yet.");
        }
        await copyTextToClipboard(markdown);
      },
    });

    return () => {
      onThreadActionsReady(null);
    };
  }, [messages, onThreadActionsReady]);

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
    ? {
        id: `agent:${agent.error.message}`,
        message: formatProviderErrorMessage(agent.error.message),
      }
    : null;
  const displayError = clientError ?? agentError;
  const visibleError = displayError && displayError.id !== dismissedError ? displayError : null;
  const missingApiKey = commandCodeConfigured === false;

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
    // Idle or authorization-only busy: no stream boundary to wait for.
    if (!isStreaming) {
      const turnId = cancellationRef.current.turnId;
      if (isBusy && turnId && session.state.sessionId) {
        void session.cancel({ turnId }).catch(() => undefined);
      }
      return await new Promise<boolean>((resolve) => {
        void finishDisposal(resolve);
      });
    }

    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (disposed: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        clearDisposalTimeout();
        resolve(disposed);
      };

      disposalResolveRef.current = settle;
      requestCancellation();
      disposalTimeoutRef.current = window.setTimeout(() => {
        if (settled) {
          return;
        }
        // Cooperative cancel lagged (e.g. deep subagents). Detach for navigation only.
        disposalResolveRef.current = null;
        void finishDisposal(settle);
      }, DISPOSE_CANCEL_TIMEOUT_MS);
    });
  }, [clearDisposalTimeout, finishDisposal, isBusy, isStreaming, requestCancellation, session]);

  useEffect(() => {
    onDisposeReady?.(dispose);
  }, [dispose, onDisposeReady]);

  useEffect(() => {
    return () => {
      onDisposeReady?.(null);
      clearDisposalTimeout();
      disposalResolveRef.current?.(false);
      disposalResolveRef.current = null;
      agentStopRef.current();
    };
  }, [clearDisposalTimeout, onDisposeReady]);

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
  const handleInputResponsesRef = useRef(handleInputResponses);
  handleInputResponsesRef.current = handleInputResponses;
  const onInputResponses = useCallback((responses: readonly AgentInputResponse[]) => {
    return handleInputResponsesRef.current(responses);
  }, []);

  const handleAddFiles = useCallback(
    (files: readonly File[]) => {
      void (async () => {
        const result = await filesToPendingAttachments(files, attachments.length);
        if (result.attachments.length > 0) {
          setAttachments((previous) => [...previous, ...result.attachments]);
        }
        if (result.errors[0]) {
          showClientError(result.errors[0]);
        }
      })();
    },
    [attachments.length, showClientError],
  );

  const handleSubmit = useCallback(
    async (text: string) => {
      if (missingApiKey) {
        showClientError(MISSING_COMMAND_CODE_API_KEY_MESSAGE);
        return;
      }

      if (!canSubmitChatTurn(text, attachments)) {
        return;
      }

      const lengthError = getChatMessageLengthError(text);
      if (lengthError) {
        showClientError(lengthError);
        return;
      }

      const previousDraft = text;
      const previousAttachments = attachments;
      const titleSource = text.trim() || previousAttachments[0]?.filename || "Attachment";
      onDraftChange("");
      setAttachments([]);
      onUserMessage?.(text.trim() || titleSource);
      prepareTurn();

      try {
        await ensureChat(titleSource);
        await send({
          message: buildUserContentMessage(text, previousAttachments),
          clientContext: turnClientContext,
        });
      } catch (error) {
        onDraftChange(previousDraft);
        setAttachments(previousAttachments);
        showClientError(toErrorMessage(error, "Failed to send message."));
      }
    },
    [
      attachments,
      ensureChat,
      missingApiKey,
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

  const retryableText = useMemo(() => getRetryableUserPrompt(messages), [messages]);
  const showRetry = canOfferRetry({
    agentStatus: agent.status,
    hasVisibleError: Boolean(visibleError),
    isBusy,
    lastMessage,
    missingApiKey,
    retryableText,
  });

  const handleRetry = useCallback(() => {
    if (!showRetry || retryableText === null) {
      return;
    }
    void handleSubmit(retryableText);
  }, [handleSubmit, retryableText, showRetry]);

  const lastUserMessage = useMemo(() => getLastUserMessage(messages), [messages]);
  const editableUserMessageId =
    !isBusy && !missingApiKey && lastUserMessage ? lastUserMessage.id : null;

  const handleEditResend = useCallback(
    (text: string) => {
      if (!editableUserMessageId) {
        return;
      }
      void handleSubmit(text);
    },
    [editableUserMessageId, handleSubmit],
  );
  const handleEditResendRef = useRef(handleEditResend);
  handleEditResendRef.current = handleEditResend;
  const onEditResend = useCallback((text: string) => {
    handleEditResendRef.current(text);
  }, []);

  const authDisabledReason = pendingAuthorization
    ? `Connect ${pendingAuthorization.displayName} to continue this turn.`
    : undefined;

  const lastMessageCanRespond = useMemo(() => {
    if (!lastMessage) {
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
  }, [isBusy, lastMessage, waitingForAuthorization]);

  const dismissError = useCallback(() => {
    if (visibleError) {
      setDismissedError(visibleError.id);
    }
  }, [visibleError]);

  return (
    <div className="bg-background text-foreground flex h-full min-h-0 flex-1 flex-col">
      {visibleError ? (
        <ErrorToast
          message={visibleError.message}
          onDismiss={dismissError}
          onRetry={showRetry ? handleRetry : undefined}
        />
      ) : null}
      <ChatConversation className="min-h-0 flex-1">
        <ChatConversationContent
          className={
            messages.length === 0
              ? "mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-5 px-4 py-10 sm:px-6"
              : "mx-auto w-full max-w-3xl gap-5 px-4 py-5 sm:px-6"
          }
        >
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full text-center">
                <BrainMark className="mx-auto size-11" />
                <h1 className="mt-5 text-[1.75rem] font-semibold tracking-tight">Brain</h1>
                {missingApiKey ? (
                  <div className="mx-auto mt-4 max-w-md text-center">
                    <p className="text-foreground text-sm font-medium">
                      {MISSING_COMMAND_CODE_API_KEY_TITLE}
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      {MISSING_COMMAND_CODE_API_KEY_MESSAGE}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Ask anything to get started.
                    </p>
                    <WelcomePrompts
                      onSelect={(prompt) => {
                        void handleSubmit(prompt);
                      }}
                      prompts={WELCOME_PROMPTS}
                    />
                    <PlaybooksPanel
                      onDelete={deletePlaybook}
                      onRun={(prompt) => {
                        void handleSubmit(prompt);
                      }}
                      onSave={savePlaybook}
                      playbooks={playbooks}
                    />
                    {onOpenChat ? (
                      <ScheduledBriefPanel disabled={missingApiKey} onOpenChat={onOpenChat} />
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : null}
          {messages.map((message) => {
            const isLast = message.id === lastMessage?.id;
            return (
              <AgentMessage
                canEdit={message.id === editableUserMessageId}
                canRespond={isLast ? lastMessageCanRespond : false}
                childFailuresByCallId={isLast ? childFailuresByCallId : undefined}
                isStreaming={isStreaming && message.role === "assistant" && isLast}
                key={message.id}
                message={message}
                onEditResend={message.id === editableUserMessageId ? onEditResend : undefined}
                onInputResponses={onInputResponses}
              />
            );
          })}
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
      <div className="bg-background relative px-3 pt-1 pb-3 sm:px-4 sm:pb-4">
        <div
          aria-hidden
          className="from-background pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t to-transparent"
        />
        <div className="mx-auto w-full max-w-3xl">
          <ChatComposer
            attachments={attachments}
            disabled={missingApiKey}
            disabledReason={
              missingApiKey
                ? MISSING_COMMAND_CODE_API_KEY_COMPOSER_REASON
                : (authDisabledReason ??
                  (cancellationState === "cancelling" || cancellationState === "requested"
                    ? "Stopping…"
                    : undefined))
            }
            footerStart={
              <div className="flex min-w-0 items-center gap-1">
                <IntegrationsMenu
                  enabledConnections={enabledConnections}
                  onConnectionEnabledChange={setConnectionEnabled}
                />
                <PlaybooksMenu
                  disabled={isBusy || missingApiKey}
                  onDelete={deletePlaybook}
                  onRun={(prompt) => {
                    void handleSubmit(prompt);
                  }}
                  onSave={savePlaybook}
                  playbooks={playbooks}
                />
                <ModelPicker
                  disabled={isBusy || missingApiKey}
                  onModelIdChange={setSelectedModelId}
                  selectedModelId={selectedModelId}
                />
              </div>
            }
            isBusy={isBusy}
            onAddFiles={handleAddFiles}
            onChange={onDraftChange}
            onRemoveAttachment={(id) => {
              setAttachments((previous) => previous.filter((item) => item.id !== id));
            }}
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
