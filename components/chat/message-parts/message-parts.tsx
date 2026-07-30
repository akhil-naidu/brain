import type { EveDynamicToolPart, EveMessagePart } from "eve/react";
import type { ReactNode } from "react";

import type { AgentInputResponse } from "@/components/chat/message";
import { AuthorizationPart } from "@/components/chat/message-parts/authorization-part";
import { FilePart } from "@/components/chat/message-parts/file-part";
import { ReasoningPart } from "@/components/chat/message-parts/reasoning-part";
import { AssistantTextPart, UserTextPart } from "@/components/chat/message-parts/text-part";
import { ToolGroup } from "@/components/chat/tool-calls/tool-group";
import { getToolGroupKey } from "@/components/chat/tool-calls/tool-state";
import type { SubagentChildFailure } from "@/lib/chat/subagent-child-failures";

export function AgentMessageParts({
  canRespond,
  childFailuresByCallId,
  isUser,
  lastTextIndex,
  messageId,
  onInputResponses,
  parts,
  showCaret,
}: {
  readonly canRespond: boolean;
  readonly childFailuresByCallId?: ReadonlyMap<string, readonly SubagentChildFailure[]>;
  readonly isUser: boolean;
  readonly lastTextIndex: number;
  readonly messageId: string;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly parts: readonly EveMessagePart[];
  readonly showCaret: boolean;
}) {
  const elements: ReactNode[] = [];
  let pendingTools: EveDynamicToolPart[] = [];
  const messageSettled = !showCaret;

  const flushTools = (): void => {
    if (pendingTools.length === 0) {
      return;
    }

    const group = pendingTools;
    elements.push(
      <ToolGroup
        canRespond={canRespond}
        childFailuresByCallId={childFailuresByCallId}
        isSettled={messageSettled}
        key={getToolGroupKey(group)}
        onInputResponses={onInputResponses}
        parts={group}
      />,
    );
    pendingTools = [];
  };

  for (const [index, part] of parts.entries()) {
    if (part.type === "dynamic-tool") {
      pendingTools.push(part);
      continue;
    }

    flushTools();
    const key = getPartKey(part, index);
    elements.push(
      <AgentMessagePart
        isUser={isUser}
        key={key}
        part={part}
        showCaret={showCaret && index === lastTextIndex}
        streamKey={`${messageId}:${key}`}
      />,
    );
  }
  flushTools();

  return elements;
}

function AgentMessagePart({
  isUser,
  part,
  showCaret,
  streamKey,
}: {
  readonly isUser: boolean;
  readonly part: EveMessagePart;
  readonly showCaret: boolean;
  readonly streamKey: string;
}): ReactNode {
  switch (part.type) {
    case "step-start":
      return null;
    case "text":
      return isUser ? (
        <UserTextPart text={part.text} />
      ) : (
        <AssistantTextPart showCaret={showCaret} streamKey={streamKey} text={part.text} />
      );
    case "reasoning":
      return <ReasoningPart isStreaming={part.state === "streaming"} text={part.text} />;
    case "authorization":
      return <AuthorizationPart part={part} />;
    case "file":
      return <FilePart part={part} />;
    case "dynamic-tool":
      return <p className="text-destructive text-xs">Unsupported ungrouped tool call.</p>;
    default:
      return unsupportedPart(part);
  }
}

function unsupportedPart(part: never): ReactNode {
  return <p className="text-destructive text-xs">Unsupported message part: {String(part)}</p>;
}

function getPartKey(part: Exclude<EveMessagePart, EveDynamicToolPart>, index: number): string {
  switch (part.type) {
    case "authorization":
      return `authorization:${part.turnId}:${part.stepIndex}:${part.name}`;
    case "file":
      return `file:${part.stepIndex ?? index}:${part.filename ?? part.mediaType}`;
    case "reasoning":
      return `reasoning:${part.stepIndex ?? index}`;
    case "step-start":
      return `step-start:${index}`;
    case "text":
      return `text:${part.stepIndex ?? index}:${index}`;
    default:
      return unsupportedPartKey(part);
  }
}

function unsupportedPartKey(part: never): string {
  throw new Error(`Unsupported message part: ${String(part)}`);
}
