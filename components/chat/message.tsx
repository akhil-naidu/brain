"use client";

import type { EveMessage } from "eve/react";
import {
  CheckIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { AgentMessageParts } from "@/components/chat/message-parts/message-parts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconTooltip } from "@/components/ui/tooltip";
import { copyTextToClipboard, messageToMarkdown } from "@/lib/chat/export-markdown";
import { formatMessageTimestamp } from "@/lib/chat/message-timestamp";
import { canUseSpeechSynthesis, speakText } from "@/lib/chat/read-aloud";
import type { SubagentChildFailure } from "@/lib/chat/subagent-child-failures";
import { cn } from "@/lib/utils";

export type AgentInputResponse = {
  readonly optionId?: string;
  readonly requestId: string;
  readonly text?: string;
};

const actionButtonClass =
  "bg-background text-muted-foreground hover:text-foreground border-border/60 size-7 border shadow-sm";

type AgentMessageProps = {
  readonly canEdit?: boolean;
  readonly canRespond: boolean;
  readonly childFailuresByCallId?: ReadonlyMap<string, readonly SubagentChildFailure[]>;
  readonly completedAt?: string | null;
  readonly isStreaming: boolean;
  readonly message: EveMessage;
  readonly onEditResend?: (text: string) => void | Promise<void>;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly onRegenerate?: () => void | Promise<void>;
};

function userTextFromMessage(message: EveMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function AgentMessageView({
  canEdit = false,
  canRespond,
  childFailuresByCallId,
  completedAt = null,
  isStreaming,
  message,
  onEditResend,
  onInputResponses,
  onRegenerate,
}: AgentMessageProps) {
  const lastTextIndex = message.parts.reduce(
    (last, part, index) => (part.type === "text" ? index : last),
    -1,
  );
  const isUser = message.role === "user";
  const sendFailed = message.metadata?.status === "failed";
  const originalText = userTextFromMessage(message);
  const copyMarkdown = messageToMarkdown(message);
  const canCopy = copyMarkdown.length > 0;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(originalText);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStopRef = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const speechSupported = !isUser && canUseSpeechSynthesis();
  const spokenText = originalText.trim();

  useEffect(() => {
    return () => {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
      speechStopRef.current?.();
      speechStopRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Stop playback when this message's text changes or streaming resumes.
    speechStopRef.current?.();
    speechStopRef.current = null;
    setIsSpeaking(false);
  }, [spokenText, isStreaming]);

  useEffect(() => {
    if (!canEdit && editing) {
      setEditing(false);
      setEditValue(originalText);
    }
  }, [canEdit, editing, originalText]);

  useEffect(() => {
    if (!editing) {
      return;
    }
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, [editing]);

  const beginEdit = () => {
    setEditValue(originalText);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditValue(originalText);
  };

  const submitEdit = () => {
    const next = editValue.trim();
    if (!next || !onEditResend) {
      return;
    }
    setEditing(false);
    void onEditResend(next);
  };

  const handleCopy = () => {
    if (!canCopy) {
      return;
    }
    void (async () => {
      try {
        await copyTextToClipboard(copyMarkdown);
        setCopyState("copied");
      } catch {
        setCopyState("error");
      }
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = setTimeout(() => {
        setCopyState("idle");
        copyResetRef.current = null;
      }, 1500);
    })();
  };

  const stopSpeech = () => {
    speechStopRef.current?.();
    speechStopRef.current = null;
    setIsSpeaking(false);
  };

  const handleReadAloud = () => {
    if (!speechSupported || spokenText.length === 0) {
      return;
    }
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    const handle = speakText(spokenText, {
      onEnd: () => {
        speechStopRef.current = null;
        setIsSpeaking(false);
      },
      onError: () => {
        speechStopRef.current = null;
        setIsSpeaking(false);
      },
    });
    if (!handle) {
      return;
    }
    speechStopRef.current = handle.stop;
    setIsSpeaking(true);
  };

  const canRegenerate = !isUser && Boolean(onRegenerate);
  const canReadAloud = speechSupported && spokenText.length > 0;
  const timestampLabel = useMemo(
    () => (completedAt ? formatMessageTimestamp(completedAt) : null),
    [completedAt],
  );
  const showMoreMenu = !isUser && (canCopy || Boolean(timestampLabel));

  // Wait until the assistant turn finishes so actions aren't offered mid-stream.
  const showActions =
    !editing &&
    !isStreaming &&
    (canCopy || (canEdit && onEditResend) || canRegenerate || canReadAloud || showMoreMenu);

  return (
    <article
      className={cn(
        "group flex w-full min-w-0",
        isUser ? "justify-end" : "justify-start",
        message.metadata?.optimistic ? "opacity-90" : undefined,
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col",
          isUser ? "max-w-[85%] items-end" : "w-full max-w-none items-start",
        )}
      >
        <div
          className={cn(
            "min-w-0",
            isUser
              ? "border-border/40 bg-muted/70 text-foreground w-full rounded-[18px] border px-3 py-1.5 text-[15px] leading-6 shadow-sm"
              : "text-foreground w-full text-sm leading-relaxed",
            sendFailed ? "border-destructive/40" : undefined,
          )}
        >
          {sendFailed ? (
            <p className="text-destructive mb-1 text-xs">Message failed to send</p>
          ) : null}
          {editing ? (
            <div className="flex flex-col gap-2 py-1">
              <textarea
                aria-label="Edit message"
                className="border-border bg-background text-foreground focus-visible:ring-ring/50 min-h-20 w-full resize-y rounded-md border px-2 py-1.5 text-[15px] leading-6 outline-none focus-visible:ring-2"
                onChange={(event) => setEditValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelEdit();
                  } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    submitEdit();
                  }
                }}
                ref={textareaRef}
                value={editValue}
              />
              <div className="flex justify-end gap-1.5">
                <Button onClick={cancelEdit} size="xs" type="button" variant="ghost">
                  Cancel
                </Button>
                <Button
                  disabled={editValue.trim().length === 0}
                  onClick={submitEdit}
                  size="xs"
                  type="button"
                >
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <AgentMessageParts
              canRespond={canRespond}
              childFailuresByCallId={childFailuresByCallId}
              isUser={isUser}
              lastTextIndex={lastTextIndex}
              messageId={message.id}
              onInputResponses={onInputResponses}
              parts={message.parts}
              showCaret={isStreaming && message.role === "assistant"}
            />
          )}
        </div>
        {showActions ? (
          <div
            className={cn(
              "mt-1.5 flex gap-1 opacity-100 transition-opacity",
              // User bubbles: reveal on hover/focus. Assistant replies: always show under the message.
              isUser
                ? "md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                : undefined,
            )}
          >
            {canCopy ? (
              <IconTooltip
                label={
                  copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy"
                }
                side="bottom"
              >
                <Button
                  aria-label={
                    copyState === "copied"
                      ? "Copied"
                      : copyState === "error"
                        ? "Copy failed"
                        : "Copy message"
                  }
                  className={cn(
                    actionButtonClass,
                    copyState === "error" ? "text-destructive hover:text-destructive" : undefined,
                  )}
                  onClick={handleCopy}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  {copyState === "copied" ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                </Button>
              </IconTooltip>
            ) : null}
            {canRegenerate ? (
              <IconTooltip label="Regenerate" side="bottom">
                <Button
                  aria-label="Regenerate response"
                  className={actionButtonClass}
                  onClick={() => {
                    void onRegenerate?.();
                  }}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <RefreshCwIcon className="size-3.5" />
                </Button>
              </IconTooltip>
            ) : null}
            {canReadAloud ? (
              <IconTooltip label={isSpeaking ? "Stop" : "Read aloud"} side="bottom">
                <Button
                  aria-label={isSpeaking ? "Stop reading aloud" : "Read aloud"}
                  className={actionButtonClass}
                  onClick={handleReadAloud}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  {isSpeaking ? (
                    <VolumeXIcon className="size-3.5" />
                  ) : (
                    <Volume2Icon className="size-3.5" />
                  )}
                </Button>
              </IconTooltip>
            ) : null}
            {canEdit && onEditResend ? (
              <IconTooltip label="Edit" side="bottom">
                <Button
                  aria-label="Edit message"
                  className={actionButtonClass}
                  onClick={beginEdit}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <PencilIcon className="size-3.5" />
                </Button>
              </IconTooltip>
            ) : null}
            {showMoreMenu ? (
              <DropdownMenu>
                <IconTooltip label="More" side="bottom">
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label="More message actions"
                      className={actionButtonClass}
                      size="icon-xs"
                      type="button"
                      variant="ghost"
                    >
                      <MoreHorizontalIcon className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                </IconTooltip>
                <DropdownMenuContent align="start" className="min-w-44">
                  {timestampLabel ? (
                    <>
                      <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                        {timestampLabel}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  {canCopy ? (
                    <DropdownMenuItem
                      className="cursor-pointer gap-2"
                      onSelect={() => {
                        handleCopy();
                      }}
                    >
                      <CopyIcon className="size-3.5" />
                      Copy as Markdown
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function hasPendingInput(message: EveMessage): boolean {
  return message.parts.some(
    (part) =>
      part.type === "dynamic-tool" &&
      Boolean(part.toolMetadata?.eve?.inputRequest && !part.toolMetadata.eve.inputResponse),
  );
}

function haveRelevantFailuresChanged(
  previous: AgentMessageProps,
  next: AgentMessageProps,
): boolean {
  if (previous.childFailuresByCallId === next.childFailuresByCallId) {
    return false;
  }

  return previous.message.parts.some(
    (part) =>
      part.type === "dynamic-tool" &&
      previous.childFailuresByCallId?.get(part.toolCallId) !==
        next.childFailuresByCallId?.get(part.toolCallId),
  );
}

/** True when the projected message body is the same render input (eve keeps settled refs). */
function isSameMessageProjection(previous: EveMessage, next: EveMessage): boolean {
  return (
    previous === next ||
    (previous.id === next.id &&
      previous.role === next.role &&
      previous.parts === next.parts &&
      previous.metadata === next.metadata)
  );
}

export function areAgentMessagePropsEqual(
  previous: Readonly<AgentMessageProps>,
  next: Readonly<AgentMessageProps>,
): boolean {
  if (previous.isStreaming !== next.isStreaming) {
    return false;
  }
  if (!isSameMessageProjection(previous.message, next.message)) {
    return false;
  }
  if (previous.canEdit !== next.canEdit || previous.onEditResend !== next.onEditResend) {
    return false;
  }
  if (previous.onRegenerate !== next.onRegenerate) {
    return false;
  }
  if (previous.completedAt !== next.completedAt) {
    return false;
  }
  if (haveRelevantFailuresChanged(previous, next)) {
    return false;
  }
  // Settled rows ignore callback identity churn from the parent chat shell.
  if (!hasPendingInput(next.message)) {
    return true;
  }
  return (
    previous.canRespond === next.canRespond && previous.onInputResponses === next.onInputResponses
  );
}

export const AgentMessage = memo(AgentMessageView, areAgentMessagePropsEqual);
