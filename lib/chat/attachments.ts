import type { UserContent } from "ai";

export const MAX_CHAT_ATTACHMENTS = 5;
export const MAX_CHAT_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ALLOWED_MEDIA_TYPE_PREFIXES = ["image/"] as const;
const ALLOWED_MEDIA_TYPES = new Set(["application/pdf", "text/plain", "text/markdown", "text/csv"]);

export type PendingAttachment = {
  readonly id: string;
  readonly filename: string;
  readonly mediaType: string;
  readonly dataUrl: string;
  readonly size: number;
};

export function isAllowedAttachmentMediaType(mediaType: string): boolean {
  const normalized = mediaType.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (ALLOWED_MEDIA_TYPES.has(normalized)) {
    return true;
  }
  return ALLOWED_MEDIA_TYPE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function createAttachmentId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", () => {
      reject(new Error(`Couldn't read ${file.name || "file"}.`));
    });
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Couldn't read ${file.name || "file"}.`));
        return;
      }
      resolve(reader.result);
    });
    reader.readAsDataURL(file);
  });
}

export async function fileToPendingAttachment(file: File): Promise<PendingAttachment> {
  if (!isAllowedAttachmentMediaType(file.type)) {
    throw new Error(`${file.name || "File"} isn't supported. Use an image, PDF, or text file.`);
  }
  if (file.size <= 0) {
    throw new Error(`${file.name || "File"} is empty.`);
  }
  if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
    throw new Error(
      `${file.name || "File"} is too large. Keep each file under ${Math.floor(MAX_CHAT_ATTACHMENT_BYTES / (1024 * 1024))} MB.`,
    );
  }

  const dataUrl = await readFileAsDataUrl(file);
  return {
    id: createAttachmentId(),
    filename: file.name.trim() || "attachment",
    mediaType: file.type || "application/octet-stream",
    dataUrl,
    size: file.size,
  };
}

export async function filesToPendingAttachments(
  files: readonly File[],
  existingCount: number,
): Promise<{
  readonly attachments: readonly PendingAttachment[];
  readonly errors: readonly string[];
}> {
  const errors: string[] = [];
  const attachments: PendingAttachment[] = [];
  const remaining = MAX_CHAT_ATTACHMENTS - existingCount;

  if (remaining <= 0) {
    return {
      attachments: [],
      errors: [`You can attach up to ${MAX_CHAT_ATTACHMENTS} files per message.`],
    };
  }

  const selected = files.slice(0, remaining);
  if (files.length > remaining) {
    errors.push(`Only ${remaining} more file${remaining === 1 ? "" : "s"} can be attached.`);
  }

  const settled = await Promise.all(
    selected.map(async (file) => {
      try {
        return { attachment: await fileToPendingAttachment(file) };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Couldn't add a file.",
        };
      }
    }),
  );

  for (const item of settled) {
    if ("attachment" in item && item.attachment) {
      attachments.push(item.attachment);
    } else if ("error" in item && item.error) {
      errors.push(item.error);
    }
  }

  return { attachments, errors };
}

export function buildUserContentMessage(
  text: string,
  attachments: readonly PendingAttachment[],
): string | UserContent {
  const trimmed = text.trim();
  if (attachments.length === 0) {
    return trimmed;
  }

  const parts: UserContent = [];
  if (trimmed.length > 0) {
    parts.push({ type: "text", text: trimmed });
  }
  for (const file of attachments) {
    parts.push({
      type: "file",
      data: file.dataUrl,
      mediaType: file.mediaType,
      filename: file.filename,
    });
  }
  return parts;
}

export function canSubmitChatTurn(
  text: string,
  attachments: readonly PendingAttachment[],
): boolean {
  return text.trim().length > 0 || attachments.length > 0;
}
