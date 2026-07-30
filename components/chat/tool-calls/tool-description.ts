import type { EveDynamicToolPart } from "eve/react";

import type { SubagentChildFailure } from "@/lib/chat/subagent-child-failures";
import { getToolStatus, type ToolStatus } from "@/components/chat/tool-calls/tool-state";

function assertNever(value: never): never {
  throw new Error(`Unsupported tool status: ${String(value)}`);
}

export function resolveToolName(part: EveDynamicToolPart): string {
  const metadataName = part.toolMetadata?.eve?.name;
  return metadataName && metadataName !== "unknown" ? metadataName : part.toolName;
}

function normalizeToolName(name: string): string {
  return name.replace(/__/g, " ").replace(/[_-]/g, " ").trim().toLowerCase();
}

export function formatToolName(name: string): string {
  return normalizeToolName(name).replace(/\s+/g, " ").trim();
}

function formatDisplayName(value: string): string {
  return value
    .replace(/^mcp\./, "")
    .replace(/\.com(?:\/.*)?$/, "")
    .replace(/[_-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncateInline(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}

function shortenPath(filepath: string): string {
  const parts = filepath.split("/").filter(Boolean);
  return parts.length <= 2 ? filepath : `…/${parts.slice(-2).join("/")}`;
}

function readString(value: unknown, keys: ReadonlySet<string>): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (keys.has(key) && typeof entry === "string" && entry.trim()) {
      return entry.trim();
    }
  }
  return null;
}

function withStatus(
  status: ToolStatus,
  running: string,
  completed: string,
  failed: string,
  errorSuffix: string,
): string {
  switch (status) {
    case "running":
      return running;
    case "completed":
      return completed;
    case "error":
      return `${failed}${errorSuffix}`;
    case "denied":
      return `Denied: ${completed}${errorSuffix}`;
    case "incomplete":
      return `Incomplete: ${completed}`;
    default:
      return assertNever(status);
  }
}

export function describeToolAction(
  part: EveDynamicToolPart,
  status: ToolStatus = getToolStatus(part),
): string {
  const name = resolveToolName(part);
  const normalized = normalizeToolName(name);
  const query = readString(
    part.input,
    new Set(["query", "q", "search", "pattern", "prompt", "text"]),
  );
  const path = readString(part.input, new Set(["path", "filePath", "filename"]));
  const command = readString(part.input, new Set(["command", "cmd"]));
  const url = readString(part.input, new Set(["url", "href"]));
  const errorSuffix =
    part.state === "output-error" && part.errorText.trim()
      ? ` — ${truncateInline(part.errorText, 96)}`
      : part.state === "output-denied"
        ? ` — ${truncateInline(part.approval.reason?.trim() || "denied", 96)}`
        : "";

  if (part.toolMetadata?.eve?.kind === "subagent-call") {
    const display = formatDisplayName(part.toolMetadata.eve.name || name);
    switch (status) {
      case "running":
        return `Working: ${display}`;
      case "completed":
        return `Ran ${display}`;
      case "error":
        return `Failed: ${display}${errorSuffix}`;
      case "denied":
        return `Denied: ${display}${errorSuffix}`;
      case "incomplete":
        return `Incomplete: ${display}`;
      default:
        return assertNever(status);
    }
  }

  if (normalized.includes("search") || normalized.includes("grep")) {
    const target = query ? truncateInline(query, 72) : formatToolName(name);
    return withStatus(
      status,
      `Searching ${target}`,
      `Searched ${target}`,
      `Failed searching ${target}`,
      errorSuffix,
    );
  }
  if (normalized.includes("read")) {
    const target = path ? shortenPath(path) : formatToolName(name);
    return withStatus(
      status,
      `Reading ${target}`,
      `Read ${target}`,
      `Failed reading ${target}`,
      errorSuffix,
    );
  }
  if (normalized.includes("write") || normalized.includes("edit")) {
    const target = path ? shortenPath(path) : formatToolName(name);
    return withStatus(
      status,
      `Changing ${target}`,
      `Changed ${target}`,
      `Failed changing ${target}`,
      errorSuffix,
    );
  }
  if (normalized.includes("fetch")) {
    const target = url ? truncateInline(url, 72) : formatToolName(name);
    return withStatus(
      status,
      `Fetching ${target}`,
      `Fetched ${target}`,
      `Failed fetching ${target}`,
      errorSuffix,
    );
  }

  const target = command
    ? truncateInline(command, 72)
    : path
      ? shortenPath(path)
      : query
        ? truncateInline(query, 72)
        : formatToolName(name);
  return withStatus(status, `Using ${target}`, `Used ${target}`, `Failed: ${target}`, errorSuffix);
}

function toolCategory(name: string): "ran" | "read" | "searched" | "wrote" {
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

export function summarizeToolGroup(
  parts: readonly EveDynamicToolPart[],
  status: ToolStatus,
  childFailuresByCallId?: ReadonlyMap<string, readonly SubagentChildFailure[]>,
): string {
  const firstPart = parts.at(0);
  if (parts.length === 1 && firstPart) {
    return describeToolAction(firstPart, status);
  }

  const counts = new Map<ReturnType<typeof toolCategory>, number>();
  let failedCount = 0;
  for (const part of parts) {
    const category = toolCategory(resolveToolName(part));
    counts.set(category, (counts.get(category) ?? 0) + 1);
    const partStatus = getToolStatus(part, childFailuresByCallId?.get(part.toolCallId));
    if (partStatus === "error" || partStatus === "denied" || partStatus === "incomplete") {
      failedCount += 1;
    }
  }

  const labels: string[] = [];
  const order = [
    ["searched", "Searched", "thing", "things"],
    ["read", "Read", "item", "items"],
    ["wrote", "Wrote", "item", "items"],
    ["ran", "Ran", "action", "actions"],
  ] as const;
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
  return status === "running" ? `${base}…` : base;
}
