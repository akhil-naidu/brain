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
