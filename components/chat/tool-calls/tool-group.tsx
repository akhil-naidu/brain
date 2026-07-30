"use client";

import type { EveDynamicToolPart } from "eve/react";
import {
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  Loader2Icon,
  MinusIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import type { AgentInputResponse } from "@/components/chat/message";
import {
  describeToolAction,
  formatToolName,
  resolveToolName,
  summarizeToolGroup,
} from "@/components/chat/tool-calls/tool-description";
import { ChildFailureList, ToolDetails } from "@/components/chat/tool-calls/tool-details";
import {
  getSettledToolStatus,
  getToolGroupStatus,
  getToolStatus,
  hasToolDetails,
  needsInputResponse,
  toolStatusLabel,
  type ToolStatus,
} from "@/components/chat/tool-calls/tool-state";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SubagentChildFailure } from "@/lib/chat/subagent-child-failures";
import { cn } from "@/lib/utils";

function assertNever(value: never): never {
  throw new Error(`Unsupported tool status: ${String(value)}`);
}

export function ToolGroup({
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
  const firstPart = parts.at(0);
  const shouldOpen = parts.some((part) => {
    const status = getSettledToolStatus(
      getToolStatus(part, childFailuresByCallId?.get(part.toolCallId)),
      isSettled,
    );
    return needsInputResponse(part) || isProblemStatus(status);
  });
  const [open, setOpen] = useState(shouldOpen);
  const status = getSettledToolStatus(
    getToolGroupStatus(parts, childFailuresByCallId),
    isSettled && !parts.some(needsInputResponse),
  );
  const label = summarizeToolGroup(parts, status, childFailuresByCallId);
  const canExpand = parts.some((part) =>
    hasToolDetails(part, childFailuresByCallId?.get(part.toolCallId)),
  );

  useEffect(() => {
    if (shouldOpen) {
      setOpen(true);
    }
  }, [shouldOpen]);

  if (!firstPart) {
    return null;
  }

  const summary = <ToolSummary canExpand={canExpand} label={label} open={open} status={status} />;
  if (!canExpand) {
    return <div className="my-2 px-3">{summary}</div>;
  }

  return (
    <Collapsible className="my-2 px-3" onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger asChild>
        <button className="block max-w-full" type="button">
          {summary}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border/40 ml-2 border-l pt-0.5 pb-1 pl-3">
        {parts.length === 1 ? (
          <ToolDetails
            canRespond={canRespond}
            childFailures={childFailuresByCallId?.get(firstPart.toolCallId)}
            onInputResponses={onInputResponses}
            part={firstPart}
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
    </Collapsible>
  );
}

function ToolSummary({
  canExpand,
  label,
  open,
  status,
}: {
  readonly canExpand: boolean;
  readonly label: string;
  readonly open: boolean;
  readonly status: ToolStatus;
}) {
  return (
    <span
      className={cn(
        "group text-muted-foreground flex max-w-full items-center gap-2 py-0.5 text-left text-sm leading-6 transition-colors",
        canExpand ? "hover:text-foreground cursor-pointer" : undefined,
        isProblemStatus(status) ? "text-destructive" : undefined,
      )}
    >
      <ToolStatusIcon status={status} />
      <span className="truncate">{label}</span>
      <span className="text-muted-foreground/80 text-[11px]">{toolStatusLabel(status)}</span>
      {canExpand ? (
        <ChevronRightIcon
          aria-hidden="true"
          className={cn(
            "size-3 shrink-0 self-center transition-all",
            open ? "rotate-90 opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        />
      ) : null}
    </span>
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
  const status = getSettledToolStatus(
    getToolStatus(part, childFailures),
    isSettled && !needsInputResponse(part),
  );
  const shouldOpen = needsInputResponse(part) || isProblemStatus(status);
  const [open, setOpen] = useState(shouldOpen);
  const canExpand = hasToolDetails(part, childFailures);

  useEffect(() => {
    if (shouldOpen) {
      setOpen(true);
    }
  }, [shouldOpen]);

  const row = <ToolCallRow canExpand={canExpand} open={open} part={part} status={status} />;
  if (!canExpand) {
    return (
      <div className="py-0.5">
        {row}
        {childFailures?.length ? <ChildFailureList failures={childFailures} /> : null}
      </div>
    );
  }

  return (
    <Collapsible className="py-0.5" onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger asChild>
        <button className="block w-full" type="button">
          {row}
        </button>
      </CollapsibleTrigger>
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

function ToolCallRow({
  canExpand,
  open,
  part,
  status,
}: {
  readonly canExpand: boolean;
  readonly open: boolean;
  readonly part: EveDynamicToolPart;
  readonly status: ToolStatus;
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground flex w-full items-center gap-2 py-0.5 text-left text-sm leading-6 transition-colors",
        canExpand ? "hover:text-foreground cursor-pointer" : undefined,
        isProblemStatus(status) ? "text-destructive" : undefined,
      )}
    >
      <ToolStatusIcon status={status} />
      <span className="bg-muted/60 text-muted-foreground shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
        {formatToolName(resolveToolName(part))}
      </span>
      <span className="text-foreground/80 truncate">{describeToolAction(part, status)}</span>
      <span className="sr-only">{toolStatusLabel(status)}</span>
      {canExpand ? (
        <ChevronRightIcon
          aria-hidden="true"
          className={cn(
            "ml-auto size-3 shrink-0 self-center transition-transform",
            open ? "rotate-90" : "",
          )}
        />
      ) : null}
    </span>
  );
}

function isProblemStatus(status: ToolStatus): boolean {
  return status === "error" || status === "denied" || status === "incomplete";
}

function ToolStatusIcon({ status }: { readonly status: ToolStatus }): ReactNode {
  const iconClassName = "size-3 shrink-0";
  let icon: ReactNode;

  switch (status) {
    case "running":
      icon = <Loader2Icon aria-hidden="true" className={cn(iconClassName, "animate-spin")} />;
      break;
    case "completed":
      icon = <CheckIcon aria-hidden="true" className={cn(iconClassName, "text-emerald-500")} />;
      break;
    case "error":
      icon = <XIcon aria-hidden="true" className={cn(iconClassName, "text-destructive")} />;
      break;
    case "denied":
      icon = (
        <CircleAlertIcon aria-hidden="true" className={cn(iconClassName, "text-destructive")} />
      );
      break;
    case "incomplete":
      icon = <MinusIcon aria-hidden="true" className={cn(iconClassName, "text-amber-500")} />;
      break;
    default:
      return assertNever(status);
  }

  return (
    <span className="flex size-4 shrink-0 items-center justify-center self-center">{icon}</span>
  );
}
