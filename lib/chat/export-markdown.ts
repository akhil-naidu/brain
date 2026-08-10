import type { EveMessage, EveMessagePart } from "eve/react";

function partLines(part: EveMessagePart): string[] {
  switch (part.type) {
    case "text": {
      const text = part.text.trim();
      return text.length > 0 ? [text] : [];
    }
    case "reasoning": {
      const text = part.text.trim();
      return text.length > 0 ? [`> ${text.replaceAll("\n", "\n> ")}`] : [];
    }
    case "dynamic-tool": {
      const name = part.toolName.trim() || "tool";
      return [`_Tool: ${name}_`];
    }
    case "authorization": {
      return [`_Authorization: ${part.displayName}_`];
    }
    case "file": {
      const name = part.filename?.trim() || part.mediaType;
      return [`_File: ${name}_`];
    }
    case "step-start":
      return [];
  }

  return [];
}

function messageBody(message: EveMessage): string {
  return message.parts.flatMap(partLines).join("\n\n").trim();
}

/** Markdown body for a single message (no role heading). */
export function messageToMarkdown(message: EveMessage): string {
  return messageBody(message);
}

export function messagesToMarkdown(messages: readonly EveMessage[], title?: string | null): string {
  const sections: string[] = [];
  const heading = title?.trim();
  if (heading) {
    sections.push(`# ${heading}`);
  }

  for (const message of messages) {
    const body = messageBody(message);
    if (!body) {
      continue;
    }
    const role = message.role === "user" ? "User" : "Assistant";
    sections.push(`## ${role}\n\n${body}`);
  }

  return sections.join("\n\n").trim();
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    throw new Error("Clipboard is not available in this browser.");
  }
  await navigator.clipboard.writeText(text);
}

/** Sanitize a chat title (or other label) into a safe download basename. */
export function sanitizeDownloadFilenameBase(input: string, fallback = "brain-chat"): string {
  const cleaned = input
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\-_.\s]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function markdownDownloadFilename(
  title?: string | null,
  fallback: "brain-chat" | "brain-message" = "brain-chat",
): string {
  const base = sanitizeDownloadFilenameBase(title?.trim() ?? "", fallback);
  return base.toLowerCase().endsWith(".md") ? base : `${base}.md`;
}

/** Trigger a browser download for a text file (Markdown export). */
export function downloadTextFile(filename: string, text: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Download is not available in this environment.");
  }
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
