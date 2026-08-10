import type { UserContent } from "ai";

export const MAX_CHAT_ATTACHMENTS = 5;
export const MAX_CHAT_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ALLOWED_MEDIA_TYPE_PREFIXES = ["image/", "text/"] as const;
const ALLOWED_MEDIA_TYPES = new Set([
  "application/pdf",
  "application/json",
  "application/ld+json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  "application/x-javascript",
  "application/x-typescript",
  "application/x-sh",
  "application/x-yaml",
  "application/yaml",
  "application/toml",
  "application/sql",
  "application/graphql",
  "application/x-httpd-php",
]);

/** Filename extensions accepted when MIME is missing or generic. */
const ALLOWED_EXTENSIONS = new Set([
  // Documents / data
  "pdf",
  "txt",
  "md",
  "markdown",
  "mdx",
  "rst",
  "csv",
  "tsv",
  "json",
  "jsonc",
  "jsonl",
  "yaml",
  "yml",
  "toml",
  "xml",
  "html",
  "htm",
  "css",
  "scss",
  "less",
  "svg",
  // Code
  "js",
  "jsx",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "mts",
  "cts",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "kts",
  "swift",
  "c",
  "h",
  "cc",
  "cpp",
  "cxx",
  "hpp",
  "hxx",
  "cs",
  "php",
  "sql",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "r",
  "lua",
  "pl",
  "pm",
  "scala",
  "groovy",
  "dart",
  "vue",
  "svelte",
  "astro",
  // Config / misc text
  "ini",
  "cfg",
  "conf",
  "env",
  "log",
  "diff",
  "patch",
  "graphql",
  "gql",
  "tf",
  "hcl",
  "proto",
  "dockerfile",
  "makefile",
  "gitignore",
  "dockerignore",
  "editorconfig",
]);

const EXTENSION_MEDIA_TYPES: Readonly<Record<string, string>> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  mdx: "text/markdown",
  rst: "text/plain",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  json: "application/json",
  jsonc: "application/json",
  jsonl: "application/jsonl",
  yaml: "application/yaml",
  yml: "application/yaml",
  toml: "application/toml",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  scss: "text/x-scss",
  less: "text/x-less",
  svg: "image/svg+xml",
  js: "application/javascript",
  jsx: "text/jsx",
  mjs: "application/javascript",
  cjs: "application/javascript",
  ts: "application/typescript",
  tsx: "text/tsx",
  mts: "application/typescript",
  cts: "application/typescript",
  py: "text/x-python",
  rb: "text/x-ruby",
  go: "text/x-go",
  rs: "text/x-rust",
  java: "text/x-java-source",
  kt: "text/x-kotlin",
  kts: "text/x-kotlin",
  swift: "text/x-swift",
  c: "text/x-c",
  h: "text/x-c",
  cc: "text/x-c++",
  cpp: "text/x-c++",
  cxx: "text/x-c++",
  hpp: "text/x-c++",
  hxx: "text/x-c++",
  cs: "text/x-csharp",
  php: "application/x-httpd-php",
  sql: "application/sql",
  sh: "application/x-sh",
  bash: "application/x-sh",
  zsh: "application/x-sh",
  fish: "application/x-sh",
  ps1: "text/plain",
  r: "text/x-r",
  lua: "text/x-lua",
  pl: "text/x-perl",
  pm: "text/x-perl",
  scala: "text/x-scala",
  groovy: "text/x-groovy",
  dart: "text/x-dart",
  vue: "text/plain",
  svelte: "text/plain",
  astro: "text/plain",
  ini: "text/plain",
  cfg: "text/plain",
  conf: "text/plain",
  env: "text/plain",
  log: "text/plain",
  diff: "text/x-diff",
  patch: "text/x-diff",
  graphql: "application/graphql",
  gql: "application/graphql",
  tf: "text/plain",
  hcl: "text/plain",
  proto: "text/plain",
  dockerfile: "text/plain",
  makefile: "text/plain",
  gitignore: "text/plain",
  dockerignore: "text/plain",
  editorconfig: "text/plain",
};

/** Value for `<input type="file" accept=…>` — keep in sync with allowlists above. */
export const CHAT_ATTACHMENT_ACCEPT = [
  "image/*",
  "text/*",
  "application/pdf",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/yaml",
  ...[...ALLOWED_EXTENSIONS].map((ext) => `.${ext}`),
].join(",");

export type PendingAttachment = {
  readonly id: string;
  readonly filename: string;
  readonly mediaType: string;
  readonly dataUrl: string;
  readonly size: number;
};

export function attachmentExtension(filename: string): string | null {
  const trimmed = filename.trim();
  const base = trimmed.includes("/") ? (trimmed.split("/").pop() ?? trimmed) : trimmed;
  const lower = base.toLowerCase();

  // Extensionless / dotted config filenames treated as whole-name "extensions".
  if (ALLOWED_EXTENSIONS.has(lower.replace(/^\./, ""))) {
    const bare = lower.replace(/^\./, "");
    if (!bare.includes(".")) {
      return bare;
    }
  }

  const match = /\.([a-z0-9]{1,16})$/i.exec(base);
  return match?.[1]?.toLowerCase() ?? null;
}

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

export function isAllowedAttachmentFile(file: Pick<File, "name" | "type">): boolean {
  if (isAllowedAttachmentMediaType(file.type)) {
    return true;
  }
  const extension = attachmentExtension(file.name);
  if (!extension) {
    return false;
  }
  // Empty / generic MIME: fall back to the extension allowlist.
  const normalized = file.type.trim().toLowerCase();
  if (!normalized || normalized === "application/octet-stream") {
    return ALLOWED_EXTENSIONS.has(extension);
  }
  return false;
}

function resolveAttachmentMediaType(file: Pick<File, "name" | "type">): string {
  const normalized = file.type.trim().toLowerCase();
  if (normalized && normalized !== "application/octet-stream") {
    return normalized;
  }
  const extension = attachmentExtension(file.name);
  if (extension && EXTENSION_MEDIA_TYPES[extension]) {
    return EXTENSION_MEDIA_TYPES[extension];
  }
  return normalized || "application/octet-stream";
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
  if (!isAllowedAttachmentFile(file)) {
    throw new Error(
      `${file.name || "File"} isn't supported. Use an image, PDF, or a common text/code file.`,
    );
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
    mediaType: resolveAttachmentMediaType(file),
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
