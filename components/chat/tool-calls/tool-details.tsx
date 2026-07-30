"use client";

import type { EveDynamicToolPart } from "eve/react";
import { useId, useMemo, useRef, useState } from "react";

import type { AgentInputResponse } from "@/components/chat/message";
import { formatPayload } from "@/components/chat/tool-calls/payload-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SubagentChildFailure } from "@/lib/chat/subagent-child-failures";
import { cn } from "@/lib/utils";

export function ToolDetails({
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
  const input = useMemo(
    () => (part.input === undefined ? undefined : formatPayload(part.input)),
    [part.input],
  );
  const outputValue =
    part.state === "output-error"
      ? part.errorText || "Tool failed"
      : part.state === "output-available"
        ? part.output
        : undefined;
  const output = useMemo(
    () => (outputValue === undefined ? undefined : formatPayload(outputValue)),
    [outputValue],
  );
  const denialReason =
    part.state === "output-denied"
      ? part.approval.reason?.trim() || "Tool execution denied"
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <InputRequestActions
        canRespond={canRespond}
        onInputResponses={onInputResponses}
        part={part}
      />
      <ToolPayload label="input" value={input} />
      <ToolPayload
        label={part.state === "output-error" ? "error" : "result"}
        tone={part.state === "output-error" ? "destructive" : "default"}
        value={output}
      />
      <ToolPayload
        label="denied"
        tone="destructive"
        value={denialReason ? formatPayload(denialReason) : undefined}
      />
      {childFailures?.length ? <ChildFailureList failures={childFailures} /> : null}
    </div>
  );
}

export function ChildFailureList({
  failures,
}: {
  readonly failures: readonly SubagentChildFailure[];
}) {
  return (
    <ul className="text-destructive mt-1 flex flex-col gap-1 text-xs">
      {failures.map((failure) => (
        <li key={`${failure.toolName}:${failure.message}`}>
          Child tool failed: {failure.toolName} — {failure.message}
        </li>
      ))}
    </ul>
  );
}

function ToolPayload({
  label,
  tone = "default",
  value,
}: {
  readonly label: string;
  readonly tone?: "default" | "destructive";
  readonly value: string | undefined;
}) {
  if (value === undefined || value.trim().length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <pre
        className={cn(
          "bg-muted/30 text-muted-foreground max-h-56 overflow-auto rounded p-2 font-mono text-[11px] leading-5",
          tone === "destructive" ? "bg-destructive/10 text-destructive" : undefined,
        )}
      >
        {value}
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const submissionRef = useRef(false);
  const inputId = useId();
  const promptId = useId();
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
      <div className="border-border bg-background rounded-md border px-3 py-2 text-sm">
        <span className="text-muted-foreground">Responded: </span>
        <span className="font-medium">
          {selectedOption?.label ?? inputResponse.text ?? inputResponse.optionId}
        </span>
      </div>
    );
  }

  const submitResponse = async (response: AgentInputResponse): Promise<void> => {
    if (submissionRef.current || !canRespond) {
      return;
    }

    submissionRef.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      await onInputResponses([response]);
      if (response.text !== undefined) {
        setFreeformText("");
      }
    } catch (error) {
      setSubmissionError(
        error instanceof Error && error.message
          ? error.message
          : "The response could not be sent. Try again.",
      );
    } finally {
      submissionRef.current = false;
      setIsSubmitting(false);
    }
  };

  const sendTextResponse = (): void => {
    const text = freeformText.trim();
    if (text) {
      void submitResponse({ requestId: inputRequest.requestId, text });
    }
  };
  const disabled = !canRespond || isSubmitting;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
      <p className="text-muted-foreground text-sm" id={promptId}>
        {inputRequest.prompt}
      </p>
      {inputRequest.options?.length ? (
        <div className="flex flex-wrap gap-2">
          {inputRequest.options.map((option) => (
            <Button
              disabled={disabled}
              key={option.id}
              onClick={() => {
                void submitResponse({
                  optionId: option.id,
                  requestId: inputRequest.requestId,
                });
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
        <div className="flex flex-col gap-2">
          <label className="sr-only" htmlFor={inputId}>
            Response to {inputRequest.prompt}
          </label>
          <div className="flex gap-2">
            <Input
              aria-describedby={submissionError ? `${promptId} ${inputId}-error` : promptId}
              disabled={disabled}
              id={inputId}
              onChange={(event) => setFreeformText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing && !event.shiftKey) {
                  event.preventDefault();
                  sendTextResponse();
                }
              }}
              placeholder="Type a response"
              value={freeformText}
            />
            <Button
              disabled={disabled || freeformText.trim().length === 0}
              onClick={sendTextResponse}
              type="button"
            >
              {isSubmitting ? "Sending…" : "Reply"}
            </Button>
          </div>
        </div>
      ) : null}
      {submissionError ? (
        <p className="text-destructive text-xs" id={`${inputId}-error`} role="alert">
          {submissionError}
        </p>
      ) : null}
    </div>
  );
}
