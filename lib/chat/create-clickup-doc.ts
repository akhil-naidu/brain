export type CreateClickUpDocScope = "message" | "thread";

export function buildCreateClickUpDocPrompt(input: {
  readonly title?: string | null;
  readonly markdown: string;
  readonly scope: CreateClickUpDocScope;
}): string {
  const body = input.markdown.trim();
  const titleHint = input.title?.trim();
  const scopeLabel = input.scope === "thread" ? "conversation" : "assistant reply";
  const titleLine = titleHint
    ? `Choose a clear document title (suggestion: ${titleHint}).`
    : "Choose a clear document title from the content.";

  return [
    "Create a ClickUp Doc (not a task) from the following Brain chat content.",
    "Use the ClickUp MCP connection and document tools.",
    "Put the Markdown below into the document body.",
    titleLine,
    "When done, reply with the document URL or identifier.",
    "",
    `Source: ${scopeLabel}`,
    "",
    "---",
    "",
    body,
  ].join("\n");
}
