import { describe, expect, it } from "vitest";
import {
  attachmentExtension,
  buildUserContentMessage,
  canSubmitChatTurn,
  fileToPendingAttachment,
  isAllowedAttachmentFile,
  isAllowedAttachmentMediaType,
  type PendingAttachment,
} from "@/lib/chat/attachments";

const sample: PendingAttachment = {
  id: "a1",
  filename: "note.txt",
  mediaType: "text/plain",
  dataUrl: "data:text/plain;base64,aGVsbG8=",
  size: 5,
};

describe("attachments helpers", () => {
  it("allows common work file types by media type", () => {
    expect(isAllowedAttachmentMediaType("image/png")).toBe(true);
    expect(isAllowedAttachmentMediaType("application/pdf")).toBe(true);
    expect(isAllowedAttachmentMediaType("text/plain")).toBe(true);
    expect(isAllowedAttachmentMediaType("text/x-python")).toBe(true);
    expect(isAllowedAttachmentMediaType("application/json")).toBe(true);
    expect(isAllowedAttachmentMediaType("application/yaml")).toBe(true);
    expect(isAllowedAttachmentMediaType("application/zip")).toBe(false);
  });

  it("allows code and config files by extension when MIME is missing", () => {
    expect(isAllowedAttachmentFile({ name: "app.ts", type: "" })).toBe(true);
    expect(isAllowedAttachmentFile({ name: "data.json", type: "" })).toBe(true);
    expect(isAllowedAttachmentFile({ name: "config.yaml", type: "" })).toBe(true);
    expect(isAllowedAttachmentFile({ name: "notes.mdx", type: "" })).toBe(true);
    expect(isAllowedAttachmentFile({ name: "Dockerfile", type: "" })).toBe(true);
    expect(isAllowedAttachmentFile({ name: ".gitignore", type: "" })).toBe(true);
    expect(isAllowedAttachmentFile({ name: "archive.zip", type: "" })).toBe(false);
    expect(isAllowedAttachmentFile({ name: "photo.exe", type: "" })).toBe(false);
  });

  it("does not trust extensions when MIME is a concrete disallowed type", () => {
    expect(isAllowedAttachmentFile({ name: "notes.txt", type: "application/zip" })).toBe(false);
  });

  it("parses short and longer extensions", () => {
    expect(attachmentExtension("a.ts")).toBe("ts");
    expect(attachmentExtension("doc.markdown")).toBe("markdown");
    expect(attachmentExtension("Dockerfile")).toBe("dockerfile");
  });

  it("resolves a media type for extension-only files", async () => {
    const file = new File(["const x = 1"], "app.ts", { type: "" });
    const pending = await fileToPendingAttachment(file);
    expect(pending.mediaType).toBe("application/typescript");
    expect(pending.filename).toBe("app.ts");
  });

  it("builds text-only or multipart messages", () => {
    expect(buildUserContentMessage("Hello", [])).toBe("Hello");
    expect(buildUserContentMessage("Look", [sample])).toEqual([
      { type: "text", text: "Look" },
      {
        type: "file",
        data: sample.dataUrl,
        mediaType: sample.mediaType,
        filename: sample.filename,
      },
    ]);
    expect(buildUserContentMessage("  ", [sample])).toEqual([
      {
        type: "file",
        data: sample.dataUrl,
        mediaType: sample.mediaType,
        filename: sample.filename,
      },
    ]);
  });

  it("allows submit with text or attachments", () => {
    expect(canSubmitChatTurn("", [])).toBe(false);
    expect(canSubmitChatTurn("hi", [])).toBe(true);
    expect(canSubmitChatTurn("", [sample])).toBe(true);
  });
});
