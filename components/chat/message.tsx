"use client";

import type { EveMessage } from "eve/react";
import { memo } from "react";

import { AgentMessageParts } from "@/components/chat/message-parts/message-parts";
import type { SubagentChildFailure } from "@/lib/chat/subagent-child-failures";
import { cn } from "@/lib/utils";

export type AgentInputResponse = {
  readonly optionId?: string;
  readonly requestId: string;
  readonly text?: string;
};

type AgentMessageProps = {
  readonly canRespond: boolean;
  readonly childFailuresByCallId?: ReadonlyMap<string, readonly SubagentChildFailure[]>;
  readonly isStreaming: boolean;
  readonly message: EveMessage;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
};

function AgentMessageView({
  canRespond,
  childFailuresByCallId,
  isStreaming,
  message,
  onInputResponses,
}: AgentMessageProps) {
  const lastTextIndex = message.parts.reduce(
    (last, part, index) => (part.type === "text" ? index : last),
    -1,
  );
  const isUser = message.role === "user";
  const sendFailed = message.metadata?.status === "failed";

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
          "min-w-0",
          isUser
            ? "border-border/40 bg-muted/70 text-foreground max-w-[85%] rounded-[18px] border px-3 py-1.5 text-[15px] leading-6 shadow-sm"
            : "text-foreground w-full max-w-none text-sm leading-relaxed",
          sendFailed ? "border-destructive/40" : undefined,
        )}
      >
        {sendFailed ? (
          <p className="text-destructive mb-1 text-xs">Message failed to send</p>
        ) : null}
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
