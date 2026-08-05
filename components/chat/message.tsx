"use client";

import type { EveMessage } from "eve/react";
import { CheckIcon, CopyIcon, PencilIcon } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

import { AgentMessageParts } from "@/components/chat/message-parts/message-parts";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard, messageToMarkdown } from "@/lib/chat/export-markdown";
import type { SubagentChildFailure } from "@/lib/chat/subagent-child-failures";
import { cn } from "@/lib/utils";

export type AgentInputResponse = {
  readonly optionId?: string;
  readonly requestId: string;
  readonly text?: string;
};

type AgentMessageProps = {
  readonly canEdit?: boolean;
  readonly canRespond: boolean;
  readonly childFailuresByCallId?: ReadonlyMap<string, readonly SubagentChildFailure[]>;
  readonly isStreaming: boolean;
  readonly message: EveMessage;
  readonly onEditResend?: (text: string) => void | Promise<void>;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
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
  isStreaming,
  message,
  onEditResend,
  onInputResponses,
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
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
    };
  }, []);

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

  // Wait until the assistant turn finishes so copy isn't offered mid-stream.
  const showActions =
    !editing && !isStreaming && (canCopy || (canEdit && onEditResend));

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
              <Button
                aria-label={
                  copyState === "copied"
                    ? "Copied"
                    : copyState === "error"
                      ? "Copy failed"
                      : "Copy message"
                }
                className={cn(
                  "bg-background border-border/60 size-7 border shadow-sm",
                  copyState === "error"
                    ? "text-destructive"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={handleCopy}
                size="icon-xs"
                title={
                  copyState === "copied"
                    ? "Copied"
                    : copyState === "error"
                      ? "Copy failed"
                      : "Copy message"
                }
                type="button"
                variant="ghost"
              >
                {copyState === "copied" ? (
                  <CheckIcon className="size-3.5" />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
              </Button>
            ) : null}
            {canEdit && onEditResend ? (
              <Button
                aria-label="Edit message"
                className="bg-background text-muted-foreground hover:text-foreground border-border/60 size-7 border shadow-sm"
                onClick={beginEdit}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <PencilIcon className="size-3.5" />
              </Button>
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
