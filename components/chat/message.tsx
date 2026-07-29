"use client";

import type { EveDynamicToolPart, EveMessage, EveMessagePart } from "eve/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MinusIcon,
  PlugIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Markdown } from "@/components/chat/markdown";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type { SubagentChildFailure } from "@/lib/chat/subagent-child-failures";
import { cn } from "@/lib/utils";

const STREAM_TEXT_TICK_MS = 60;
const STREAM_TEXT_CACHE_LIMIT = 40;
const streamingTextCache = new Map<string, string>();

export type AgentInputResponse = {
  readonly optionId?: string;
  readonly requestId: string;
  readonly text?: string;
};

export function AgentMessage({
  canRespond,
  childFailuresByCallId,
  isStreaming,
  message,
  onInputResponses,
}: {
  readonly canRespond: boolean;
  readonly childFailuresByCallId?: ReadonlyMap<string, readonly SubagentChildFailure[]>;
  readonly isStreaming: boolean;
  readonly message: EveMessage;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
}) {
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
            ? "max-w-[85%] rounded-[18px] border border-border/40 bg-muted/70 px-3 py-1.5 text-[15px] leading-6 text-foreground shadow-sm"
            : "w-full max-w-none text-sm leading-relaxed text-foreground",
          sendFailed ? "border-destructive/40" : undefined,
        )}
      >
        {sendFailed ? (
          <p className="mb-1 text-xs text-destructive">Message failed to send</p>
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

function AgentMessageParts({
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

  const flushTools = (isSettled: boolean) => {
    if (pendingTools.length === 0) {
      return;
    }

    const partsForGroup = pendingTools;

    elements.push(
      <ToolGroup
        canRespond={canRespond}
        childFailuresByCallId={childFailuresByCallId}
        isSettled={isSettled}
        key={`tools:${partsForGroup.map((part) => part.toolCallId).join(":")}`}
        onInputResponses={onInputResponses}
        parts={partsForGroup}
      />,
    );
    pendingTools = [];
  };

  parts.forEach((part, index) => {
    if (part.type === "dynamic-tool") {
      pendingTools.push(part);
      return;
    }

    // Do not settle tools just because text/reasoning followed them mid-turn.
    flushTools(false);
    const key = partKey(part, index);

    elements.push(
      <AgentMessagePart
        canRespond={canRespond}
        isUser={isUser}
        key={key}
        onInputResponses={onInputResponses}
        part={part}
        showCaret={showCaret && index === lastTextIndex}
        streamKey={`${messageId}:${key}`}
      />,
    );
  });

  flushTools(!showCaret);

  return elements;
}

function AgentMessagePart({
  canRespond,
  isUser,
  onInputResponses,
  part,
  showCaret,
  streamKey,
}: {
  readonly canRespond: boolean;
  readonly isUser: boolean;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: EveMessagePart;
  readonly showCaret: boolean;
  readonly streamKey: string;
}) {
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
    case "dynamic-tool":
    case "file":
      return null;
  }
}

function AuthorizationPart({
  part,
}: {
  readonly part: Extract<EveMessagePart, { readonly type: "authorization" }>;
}) {
  if (part.state === "completed") {
    return (
      <p className="text-sm text-muted-foreground">
        {part.outcome === "authorized"
          ? `${part.displayName} connected.`
          : `${part.displayName} authorization ${part.outcome}.`}
      </p>
    );
  }

  const url = part.authorization?.url;
  const userCode = part.authorization?.userCode;

  return (
    <div
      aria-live="polite"
      className="w-full max-w-md rounded-lg border border-border/70 bg-muted/20 p-3 text-sm shadow-sm"
    >
      <div className="flex gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
          <PlugIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Connect {part.displayName}</p>
          <p className="mt-1 text-muted-foreground">{part.description}</p>
          {userCode ? (
            <p className="mt-2 font-mono text-xs text-foreground">{userCode}</p>
          ) : null}
          {url ? (
            <div className="mt-2.5">
              <Button asChild size="xs" type="button">
                <a href={url} rel="noreferrer" target="_blank">
                  Connect
                  <ExternalLinkIcon className="size-3" />
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UserTextPart({ text }: { readonly text: string }) {
  return <div className="whitespace-pre-wrap break-words">{text}</div>;
}

function AssistantTextPart({
  showCaret,
  streamKey,
  text,
}: {
  readonly showCaret: boolean;
  readonly streamKey: string;
  readonly text: string;
}) {
  const smoothedText = useStreamingText(text, showCaret, streamKey);
  const isRevealActive = smoothedText.length > 0 && (showCaret || smoothedText !== text);
  const showVisibleCaret = showCaret && smoothedText.length > 0;

  return (
    <Markdown
      animated={isRevealActive ? { duration: 0, stagger: 0 } : undefined}
      caret={showVisibleCaret ? "block" : undefined}
      isAnimating={isRevealActive}
    >
      {smoothedText}
    </Markdown>
  );
}

function useStreamingText(text: string, isStreaming: boolean, streamKey: string) {
  const [visibleText, setVisibleText] = useState(() =>
    getInitialStreamingText(text, isStreaming, streamKey),
  );
  const visibleTextRef = useRef(visibleText);

  useEffect(() => {
    visibleTextRef.current = visibleText;
  }, [visibleText]);

  useEffect(() => {
    const current = visibleTextRef.current;

    if (!isStreaming && (current === text || !text.startsWith(current))) {
      if (current !== text) {
        visibleTextRef.current = text;
        rememberStreamingText(streamKey, text);
        setVisibleText(text);
      }

      return;
    }

    const catchUp = !isStreaming;
    let interval: number | undefined;

    const advance = () => {
      const next = nextStreamingText(visibleTextRef.current, text, catchUp);

      if (next !== visibleTextRef.current) {
        visibleTextRef.current = next;
        rememberStreamingText(streamKey, next);
        setVisibleText(next);
      }

      if (catchUp && next === text && interval !== undefined) {
        window.clearInterval(interval);
        interval = undefined;
      }
    };

    advance();

    if (catchUp && visibleTextRef.current === text) {
      return;
    }

    interval = window.setInterval(advance, STREAM_TEXT_TICK_MS);

    return () => {
      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
  }, [isStreaming, streamKey, text]);

  useEffect(() => {
    if (!isStreaming && visibleText === text) {
      streamingTextCache.delete(streamKey);
    }
  }, [isStreaming, streamKey, text, visibleText]);

  return visibleText;
}

function getInitialStreamingText(text: string, isStreaming: boolean, streamKey: string) {
  const cachedText = streamingTextCache.get(streamKey);

  if (cachedText && text.startsWith(cachedText)) {
    return cachedText;
  }

  return isStreaming ? "" : text;
}

function rememberStreamingText(streamKey: string, text: string) {
  if (!text) {
    return;
  }

  streamingTextCache.delete(streamKey);
  streamingTextCache.set(streamKey, text);

  if (streamingTextCache.size <= STREAM_TEXT_CACHE_LIMIT) {
    return;
  }

  const oldestKey = streamingTextCache.keys().next().value;

  if (oldestKey) {
    streamingTextCache.delete(oldestKey);
  }
}

function nextStreamingText(current: string, target: string, catchUp = false) {
  if (current === target) {
    return current;
  }

  if (!target.startsWith(current)) {
    return target;
  }

  const remaining = target.length - current.length;
  const step = catchUp
    ? remaining > 160
      ? 18
      : remaining > 80
        ? 12
        : remaining > 32
          ? 7
          : remaining > 12
            ? 4
            : 2
    : remaining > 160
      ? 6
      : remaining > 80
        ? 5
        : remaining > 32
          ? 3
          : remaining > 12
            ? 2
            : 1;

  return target.slice(0, current.length + Math.min(remaining, step));
}

function ReasoningPart({
  isStreaming,
  text,
}: {
  readonly isStreaming: boolean;
  readonly text: string;
}) {
  const [open, setOpen] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setOpen(true);
    }
  }, [isStreaming]);

  return (
    <Collapsible className="my-3 w-full" onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <span className={isStreaming ? "shimmer-text" : undefined}>
          {isStreaming ? "Thinking..." : "Reasoning"}
        </span>
        <ChevronDownIcon className={cn("size-4 transition-transform", open ? "rotate-180" : "")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 border-l border-border pl-4 text-muted-foreground">
        <Markdown>{text}</Markdown>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ToolGroup({
  canRespond,
  childFailuresByCallId,
  isSettled,
  onInputResponses,
  parts,
}: {
  readonly canRespond: boolean;
  readonly childFailuresByCallId?: ReadonlyMap<string, readonly SubagentChildFailure[]>;
  readonly isSettled: boolean;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly parts: readonly EveDynamicToolPart[];
}) {
  const shouldOpen =
    parts.some(needsInputResponse) ||
    parts.some((part) => {
      const status = getSettledToolStatus(getToolStatus(part, childFailuresByCallId), isSettled);
      return status === "error" || status === "denied" || status === "incomplete";
    });
  const [open, setOpen] = useState(shouldOpen);
  const status = getSettledToolStatus(
    getToolGroupStatus(parts, childFailuresByCallId),
    isSettled && !parts.some(needsInputResponse),
  );
  const label = summarizeToolGroup(parts, status, childFailuresByCallId);
  const canExpand =
    parts.length > 1
      ? parts.some((part) => hasToolDetails(part, childFailuresByCallId))
      : hasToolDetails(parts[0]!, childFailuresByCallId);

  useEffect(() => {
    if (shouldOpen) {
      setOpen(true);
    }
  }, [shouldOpen]);

  return (
    <Collapsible
      className="my-2 px-3"
      onOpenChange={canExpand ? setOpen : undefined}
      open={canExpand ? open : false}
    >
      <CollapsibleTrigger
        className={cn(
          "group flex max-w-full items-center gap-2 py-0.5 text-left text-sm leading-6 text-muted-foreground transition-colors",
          canExpand ? "cursor-pointer hover:text-foreground" : "cursor-default",
          status === "error" || status === "denied" || status === "incomplete"
            ? "text-destructive"
            : undefined,
        )}
        disabled={!canExpand}
      >
        <ToolStatusIcon status={status} />
        <span className="truncate">{label}</span>
        <span className="text-[11px] text-muted-foreground/80">{toolStatusLabel(status)}</span>
        {canExpand ? (
          <ChevronRightIcon
            className={cn(
              "size-3 shrink-0 self-center transition-all",
              open ? "rotate-90 opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          />
        ) : null}
      </CollapsibleTrigger>
      {canExpand ? (
        <CollapsibleContent className="ml-2 border-l border-border/40 pl-3 pt-0.5 pb-1">
          {parts.length === 1 ? (
            <ToolDetails
              canRespond={canRespond}
              childFailures={childFailuresByCallId?.get(parts[0]!.toolCallId)}
              onInputResponses={onInputResponses}
              part={parts[0]!}
            />
          ) : (
            parts.map((part) => (
              <ToolCallItem
                canRespond={canRespond}
                childFailures={childFailuresByCallId?.get(part.toolCallId)}
                isSettled={isSettled}
                key={part.toolCallId}
                onInputResponses={onInputResponses}
                part={part}
              />
            ))
          )}
        </CollapsibleContent>
      ) : null}
      {!canExpand && childFailuresByCallId?.get(parts[0]?.toolCallId ?? "")?.length ? (
        <ChildFailureList failures={childFailuresByCallId.get(parts[0]!.toolCallId)!} />
      ) : null}
    </Collapsible>
  );
}

function ToolCallItem({
  canRespond,
  childFailures,
  isSettled,
  onInputResponses,
  part,
}: {
  readonly canRespond: boolean;
  readonly childFailures?: readonly SubagentChildFailure[];
  readonly isSettled: boolean;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: EveDynamicToolPart;
}) {
  const shouldOpen =
    needsInputResponse(part) ||
    ["error", "denied", "incomplete"].includes(
      getSettledToolStatus(getToolStatus(part, childFailures), isSettled),
    );
  const [open, setOpen] = useState(shouldOpen);
  const status = getSettledToolStatus(getToolStatus(part, childFailures), isSettled && !needsInputResponse(part));
  const canExpand = hasToolDetails(part, childFailures);

  useEffect(() => {
    if (shouldOpen) {
      setOpen(true);
    }
  }, [shouldOpen]);

  const button = (
    <button
      className={cn(
        "flex w-full items-center gap-2 py-0.5 text-left text-sm leading-6 text-muted-foreground transition-colors",
        canExpand ? "cursor-pointer hover:text-foreground" : "cursor-default",
        status === "error" || status === "denied" || status === "incomplete"
          ? "text-destructive"
          : undefined,
      )}
      type="button"
    >
      <ToolStatusIcon status={status} />
      <ToolNameLabel part={part} />
      <span className="truncate text-foreground/80">{describeToolAction(part, status)}</span>
      <span className="sr-only">{toolStatusLabel(status)}</span>
      {canExpand ? (
        <ChevronRightIcon
          className={cn("ml-auto size-3 shrink-0 self-center transition-transform", open ? "rotate-90" : "")}
        />
      ) : null}
    </button>
  );

  if (!canExpand) {
    return (
      <div className="py-0.5">
        {button}
        {childFailures?.length ? <ChildFailureList failures={childFailures} /> : null}
      </div>
    );
  }

  return (
    <Collapsible className="py-0.5" onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger asChild>{button}</CollapsibleTrigger>
      <CollapsibleContent className="mt-1 ml-5">
        <ToolDetails
          canRespond={canRespond}
          childFailures={childFailures}
          onInputResponses={onInputResponses}
          part={part}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function ToolDetails({
  canRespond,
  childFailures,
  onInputResponses,
  part,
}: {
  readonly canRespond: boolean;
  readonly childFailures?: readonly SubagentChildFailure[];
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: EveDynamicToolPart;
}) {
  const hasOutput = part.state === "output-available" || part.state === "output-error";
  const denialReason =
    part.state === "output-denied" ? part.approval?.reason?.trim() || "Tool execution denied" : null;

  return (
    <div className="space-y-1.5">
      <InputRequestActions
        canRespond={canRespond}
        onInputResponses={onInputResponses}
        part={part}
      />
      <ToolPayload label="input" value={part.input} />
      {hasOutput ? (
        <ToolPayload
          label={part.state === "output-error" ? "error" : "result"}
          tone={part.state === "output-error" ? "destructive" : "default"}
          value={part.state === "output-error" ? part.errorText || "Tool failed" : part.output}
        />
      ) : null}
      {denialReason ? (
        <ToolPayload label="denied" tone="destructive" value={denialReason} />
      ) : null}
      {childFailures?.length ? <ChildFailureList failures={childFailures} /> : null}
    </div>
  );
}

function ChildFailureList({ failures }: { readonly failures: readonly SubagentChildFailure[] }) {
  return (
    <ul className="mt-1 space-y-1 text-xs text-destructive">
      {failures.map((failure) => (
        <li key={`${failure.toolName}:${failure.message}`}>
          Child tool failed: {failure.toolName} — {failure.message}
        </li>
      ))}
    </ul>
  );
}

function ToolStatusIcon({ status }: { readonly status: ToolStatus }) {
  const className = "size-3 shrink-0";

  if (status === "running") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center self-center">
        <Loader2Icon className={cn(className, "animate-spin")} />
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center self-center">
        <XIcon className={cn(className, "text-destructive")} />
      </span>
    );
  }

  if (status === "denied") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center self-center">
        <CircleAlertIcon className={cn(className, "text-destructive")} />
      </span>
    );
  }

  if (status === "incomplete") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center self-center">
        <MinusIcon className={cn(className, "text-amber-500")} />
      </span>
    );
  }

  return (
    <span className="flex size-4 shrink-0 items-center justify-center self-center">
      <CheckIcon className={cn(className, "text-emerald-500")} />
    </span>
  );
}

function ToolNameLabel({ part }: { readonly part: EveDynamicToolPart }) {
  return (
    <span className="shrink-0 rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      {formatToolName(resolveToolName(part))}
    </span>
  );
}

function ToolPayload({
  label,
  tone = "default",
  value,
}: {
  readonly label: string;
  readonly tone?: "default" | "destructive";
  readonly value: unknown;
}) {
  if (value === undefined) {
    return null;
  }

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <pre
        className={cn(
          "max-h-56 overflow-auto rounded bg-muted/30 p-2 font-mono text-[11px] leading-5 text-muted-foreground",
          tone === "destructive" ? "bg-destructive/10 text-destructive" : undefined,
        )}
      >
        {formatPayload(value)}
      </pre>
    </div>
  );
}

function InputRequestActions({
  canRespond,
  onInputResponses,
  part,
}: {
  readonly canRespond: boolean;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: EveDynamicToolPart;
}) {
  const [freeformText, setFreeformText] = useState("");
  const inputRequest = part.toolMetadata?.eve?.inputRequest;

  if (!inputRequest) {
    return null;
  }

  const inputResponse = part.toolMetadata?.eve?.inputResponse;
  const selectedOption = inputRequest.options?.find(
    (option) => option.id === inputResponse?.optionId,
  );

  if (inputResponse) {
    return (
      <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
        <span className="text-muted-foreground">Responded: </span>
        <span className="font-medium">
          {selectedOption?.label ?? inputResponse.text ?? inputResponse.optionId}
        </span>
      </div>
    );
  }

  const sendTextResponse = () => {
    const text = freeformText.trim();
    if (!text) {
      return;
    }
    void onInputResponses([{ requestId: inputRequest.requestId, text }]);
    setFreeformText("");
  };

  return (
    <div className="space-y-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
      <p className="text-sm text-muted-foreground">{inputRequest.prompt}</p>
      {inputRequest.options?.length ? (
        <div className="flex flex-wrap gap-2">
          {inputRequest.options.map((option) => (
            <Button
              disabled={!canRespond}
              key={option.id}
              onClick={() => {
                void onInputResponses([
                  {
                    optionId: option.id,
                    requestId: inputRequest.requestId,
                  },
                ]);
              }}
              size="sm"
              type="button"
              variant={option.style === "danger" ? "destructive" : "default"}
            >
              {option.label}
            </Button>
          ))}
        </div>
      ) : null}
      {inputRequest.allowFreeform || inputRequest.display === "text" ? (
        <div className="flex gap-2">
          <Input
            disabled={!canRespond}
            onChange={(event) => setFreeformText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendTextResponse();
              }
            }}
            placeholder="Type a response"
            value={freeformText}
          />
          <Button
            disabled={!canRespond || freeformText.trim().length === 0}
            onClick={sendTextResponse}
            type="button"
          >
            Reply
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type ToolStatus = "completed" | "denied" | "error" | "incomplete" | "running";

function resolveChildFailures(
  part: EveDynamicToolPart,
  childFailures?: readonly SubagentChildFailure[] | ReadonlyMap<string, readonly SubagentChildFailure[]>,
): readonly SubagentChildFailure[] | undefined {
  if (!childFailures) {
    return undefined;
  }
  if (childFailures instanceof Map) {
    return childFailures.get(part.toolCallId);
  }
  // ReadonlyMap from useState may not be a Map instance — detect by shape.
  if (
    !Array.isArray(childFailures) &&
    typeof (childFailures as ReadonlyMap<string, readonly SubagentChildFailure[]>).get ===
      "function"
  ) {
    return (childFailures as ReadonlyMap<string, readonly SubagentChildFailure[]>).get(
      part.toolCallId,
    );
  }
  return childFailures as readonly SubagentChildFailure[];
}

function needsInputResponse(part: EveDynamicToolPart) {
  return Boolean(part.toolMetadata?.eve?.inputRequest && !part.toolMetadata.eve.inputResponse);
}

function hasToolDetails(
  part: EveDynamicToolPart,
  childFailures?: readonly SubagentChildFailure[] | ReadonlyMap<string, readonly SubagentChildFailure[]>,
) {
  const failures = resolveChildFailures(part, childFailures);

  if (part.state === "output-error" || part.state === "output-denied") {
    return true;
  }

  if (failures && failures.length > 0) {
    return true;
  }

  if (isConnectionSearchTool(part)) {
    return Boolean(part.toolMetadata?.eve?.inputRequest);
  }

  const hasInput = part.input !== undefined && formatPayload(part.input).trim().length > 0;
  const hasOutput =
    part.state === "output-available" && formatPayload(part.output).trim().length > 0;

  return hasInput || hasOutput || Boolean(part.toolMetadata?.eve?.inputRequest);
}

function isConnectionSearchTool(part: EveDynamicToolPart) {
  const normalized = normalizeToolName(resolveToolName(part));

  return normalized.includes("connection") && normalized.includes("search");
}

function isSubagentCall(part: EveDynamicToolPart) {
  return part.toolMetadata?.eve?.kind === "subagent-call";
}

function getToolStatus(
  part: EveDynamicToolPart,
  childFailures?: readonly SubagentChildFailure[] | ReadonlyMap<string, readonly SubagentChildFailure[]>,
): ToolStatus {
  const failures = resolveChildFailures(part, childFailures);

  switch (part.state) {
    case "input-streaming":
    case "input-available":
    case "approval-requested":
    case "approval-responded":
      return failures && failures.length > 0 ? "error" : "running";
    case "output-available":
      return failures && failures.length > 0 ? "error" : "completed";
    case "output-denied":
      return "denied";
    case "output-error":
      return "error";
  }
}

function getSettledToolStatus(status: ToolStatus, isSettled: boolean): ToolStatus {
  // Never green-check unfinished work when the stream settles.
  return isSettled && status === "running" ? "incomplete" : status;
}

function getToolGroupStatus(
  parts: readonly EveDynamicToolPart[],
  childFailuresByCallId?: ReadonlyMap<string, readonly SubagentChildFailure[]>,
): ToolStatus {
  const statuses = parts.map((part) => getToolStatus(part, childFailuresByCallId));

  if (statuses.includes("error")) {
    return "error";
  }

  if (statuses.includes("denied")) {
    return "denied";
  }

  if (statuses.includes("incomplete")) {
    return "incomplete";
  }

  if (statuses.includes("running")) {
    return "running";
  }

  return "completed";
}

function toolStatusLabel(status: ToolStatus) {
  switch (status) {
    case "completed":
      return "Complete";
    case "denied":
      return "Denied";
    case "error":
      return "Error";
    case "incomplete":
      return "Incomplete";
    case "running":
      return "Running";
  }
}

function summarizeToolGroup(
  parts: readonly EveDynamicToolPart[],
  status: ToolStatus,
  childFailuresByCallId?: ReadonlyMap<string, readonly SubagentChildFailure[]>,
) {
  if (parts.length === 1) {
    return describeToolAction(parts[0]!, status);
  }

  const counts = new Map<string, number>();
  let failedCount = 0;

  for (const part of parts) {
    const category = toolCategory(resolveToolName(part));
    counts.set(category, (counts.get(category) ?? 0) + 1);
    const partStatus = getToolStatus(part, childFailuresByCallId);
    if (partStatus === "error" || partStatus === "denied" || partStatus === "incomplete") {
      failedCount += 1;
    }
  }

  const labels: string[] = [];
  const order: [string, string, string, string][] = [
    ["searched", "Searched", "thing", "things"],
    ["read", "Read", "item", "items"],
    ["wrote", "Wrote", "item", "items"],
    ["ran", "Ran", "action", "actions"],
  ];

  for (const [key, verb, singular, plural] of order) {
    const count = counts.get(key);

    if (count) {
      labels.push(`${verb} ${count} ${count === 1 ? singular : plural}`);
    }
  }

  const base = labels.join(", ") || `Used ${parts.length} tools`;
  if (failedCount > 0) {
    return `${base} (${failedCount} failed)`;
  }
  if (status === "running") {
    return `${base}…`;
  }
  return base;
}

function toolCategory(name: string) {
  const normalized = normalizeToolName(name);

  if (normalized.includes("search") || normalized.includes("grep")) {
    return "searched";
  }

  if (normalized.includes("read") || normalized.includes("fetch")) {
    return "read";
  }

  if (normalized.includes("write") || normalized.includes("edit")) {
    return "wrote";
  }

  return "ran";
}

function describeToolAction(part: EveDynamicToolPart, status = getToolStatus(part)) {
  const name = resolveToolName(part);
  const normalized = normalizeToolName(name);
  const input = asRecord(part.input);
  const query = readString(input, ["query", "q", "search", "pattern", "prompt", "text"]);
  const path = readString(input, ["path", "filePath", "filename"]);
  const command = readString(input, ["command", "cmd"]);
  const url = readString(input, ["url", "href"]);
  const connection = readString(input, ["connection", "connectionName", "connector", "source"]);
  const errorSuffix =
    part.state === "output-error" && part.errorText.trim()
      ? ` — ${truncateInline(part.errorText, 96)}`
      : part.state === "output-denied"
        ? ` — ${truncateInline(part.approval?.reason?.trim() || "denied", 96)}`
        : "";

  if (isSubagentCall(part)) {
    const display = formatDisplayName(part.toolMetadata?.eve?.name ?? name);
    switch (status) {
      case "running":
        return `Working: ${display}`;
      case "error":
        return `Failed: ${display}${errorSuffix}`;
      case "denied":
        return `Denied: ${display}${errorSuffix}`;
      case "incomplete":
        return `Incomplete: ${display}`;
      default:
        return `Ran ${display}`;
    }
  }

  const withStatus = (running: string, done: string, failed: string) => {
    switch (status) {
      case "running":
        return running;
      case "error":
        return `${failed}${errorSuffix}`;
      case "denied":
        return `Denied: ${done}${errorSuffix}`;
      case "incomplete":
        return `Incomplete: ${done}`;
      default:
        return done;
    }
  };

  if (normalized.includes("connection") && normalized.includes("search")) {
    const connectionName = resolveConnectionName(name, connection);
    const target = connectionName
      ? formatDisplayName(connectionName)
      : query && query !== "*"
        ? truncateInline(query, 72)
        : "connections";
    return withStatus(`Searching ${target}`, `Searched ${target}`, `Failed searching ${target}`);
  }

  if (normalized.includes("search") || normalized.includes("grep")) {
    const target = query ? truncateInline(query, 72) : formatToolName(name);
    return withStatus(`Searching ${target}`, `Searched ${target}`, `Failed searching ${target}`);
  }

  if (normalized.includes("read")) {
    const target = path ? shortenPath(path) : formatToolName(name);
    return withStatus(`Reading ${target}`, `Read ${target}`, `Failed reading ${target}`);
  }

  if (normalized.includes("write") || normalized.includes("edit")) {
    const target = path ? shortenPath(path) : formatToolName(name);
    return withStatus(`Changing ${target}`, `Changed ${target}`, `Failed changing ${target}`);
  }

  if (normalized.includes("fetch")) {
    const target = url ? truncateInline(url, 72) : formatToolName(name);
    return withStatus(`Fetching ${target}`, `Fetched ${target}`, `Failed fetching ${target}`);
  }

  if (command) {
    const target = truncateInline(command, 72);
    return withStatus(`Running ${target}`, target, `Failed: ${target}`);
  }

  if (path) {
    const target = shortenPath(path);
    return withStatus(`Using ${target}`, target, `Failed: ${target}`);
  }

  if (query) {
    const target = truncateInline(query, 72);
    return withStatus(`Using ${target}`, target, `Failed: ${target}`);
  }

  const target = formatToolName(name);
  return withStatus(`Using ${target}`, `Used ${target}`, `Failed: ${target}`);
}

function resolveToolName(part: EveDynamicToolPart) {
  const metadataName = part.toolMetadata?.eve?.name;
  return metadataName && metadataName !== "unknown" ? metadataName : part.toolName;
}

function formatToolName(name: string) {
  return normalizeToolName(name)
    .replace(/^connection search$/, "connection search")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToolName(name: string) {
  return name
    .replace(/__/g, " ")
    .replace(/[_-]/g, " ")
    .trim()
    .toLowerCase();
}

function formatDisplayName(value: string) {
  const cleaned = value
    .replace(/^mcp\./, "")
    .replace(/\.com(?:\/.*)?$/, "")
    .replace(/[_-]/g, " ");

  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveConnectionName(toolName: string, inputConnection?: string | null) {
  if (inputConnection && inputConnection !== "*") {
    return inputConnection;
  }

  const tokens = normalizeToolName(toolName).split(/\s+/).filter(Boolean);

  if (tokens[0] !== "connection" || tokens.length <= 2) {
    return null;
  }

  const connectionTokens = tokens
    .slice(1)
    .filter((token) => token !== "search" && token !== "tool" && token !== "tools");

  if (connectionTokens.length === 0) {
    return null;
  }

  return [...new Set(connectionTokens)].join(" ");
}

function shortenPath(filepath: string) {
  const parts = filepath.split("/").filter(Boolean);

  if (parts.length <= 2) {
    return filepath;
  }

  return `.../${parts.slice(-2).join("/")}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(source: Record<string, unknown> | null, keys: readonly string[]) {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function formatPayload(value: unknown): string {
  if (typeof value === "string") {
    return truncateText(value, 4000);
  }

  try {
    return truncateText(JSON.stringify(value, null, 2), 4000);
  } catch {
    return truncateText(String(value), 4000);
  }
}

function truncateInline(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}\n...`;
}

function partKey(part: EveMessagePart, index: number): string {
  switch (part.type) {
    case "dynamic-tool":
      return part.toolCallId;
    case "authorization":
      return `authorization:${part.turnId}:${part.stepIndex}:${part.name}`;
    default:
      return `${part.type}:${index}`;
  }
}
