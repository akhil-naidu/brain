import type { EveMessagePart } from "eve/react";
import { FileIcon } from "lucide-react";

import { getSafeExternalUrl } from "@/components/chat/message-parts/authorization-part";

type FileMessagePart = Extract<EveMessagePart, { readonly type: "file" }>;

function formatFileSize(size: number | undefined): string | null {
  if (size === undefined) {
    return null;
  }
  if (size < 1_024) {
    return `${size} B`;
  }
  if (size < 1_048_576) {
    return `${(size / 1_024).toFixed(1)} KB`;
  }
  return `${(size / 1_048_576).toFixed(1)} MB`;
}

export function FilePart({ part }: { readonly part: FileMessagePart }) {
  const safeUrl = getSafeExternalUrl(part.url);
  const details = [part.mediaType, formatFileSize(part.size)].filter(Boolean).join(" · ");
  const content = (
    <>
      <FileIcon aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate font-medium">{part.filename || "Attachment"}</span>
        <span className="text-muted-foreground block text-xs">{details}</span>
      </span>
    </>
  );

  return safeUrl ? (
    <a
      className="border-border/70 bg-muted/20 hover:bg-muted/40 my-2 flex max-w-sm items-center gap-2 rounded-md border p-2 transition-colors"
      href={safeUrl}
      rel="noopener noreferrer"
      target="_blank"
    >
      {content}
    </a>
  ) : (
    <div className="border-border/70 bg-muted/20 my-2 flex max-w-sm items-center gap-2 rounded-md border p-2">
      {content}
      <span className="text-muted-foreground ml-auto text-xs">Unavailable</span>
    </div>
  );
}
