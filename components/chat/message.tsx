"use client";

import type { EveMessage } from "eve/react";
import { PencilIcon } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

import { AgentMessageParts } from "@/components/chat/message-parts/message-parts";
import { Button } from "@/components/ui/button";
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
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(originalText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          "relative min-w-0",
          isUser
            ? "border-border/40 bg-muted/70 text-foreground max-w-[85%] rounded-[18px] border px-3 py-1.5 text-[15px] leading-6 shadow-sm"
            : "text-foreground w-full max-w-none text-sm leading-relaxed",
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
          <>
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
            {canEdit && onEditResend ? (
              <div className="absolute right-1 -bottom-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
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
              </div>
            ) : null}
          </>
        )}
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

function areAgentMessagePropsEqual(
  previous: Readonly<AgentMessageProps>,
  next: Readonly<AgentMessageProps>,
): boolean {
  if (previous.message !== next.message || previous.isStreaming !== next.isStreaming) {
    return false;
  }
  if (previous.canEdit !== next.canEdit || previous.onEditResend !== next.onEditResend) {
    return false;
  }
  if (haveRelevantFailuresChanged(previous, next)) {
    return false;
  }
  if (!hasPendingInput(next.message)) {
    return true;
  }
  return (
    previous.canRespond === next.canRespond && previous.onInputResponses === next.onInputResponses
  );
}

const MemoizedAgentMessageView = memo(AgentMessageView, areAgentMessagePropsEqual);

export function AgentMessage(props: AgentMessageProps) {
  return <MemoizedAgentMessageView {...props} />;
}
