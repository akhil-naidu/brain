import { describe, expect, it } from "vitest";
import {
  buildUserContentMessage,
  canSubmitChatTurn,
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
  it("allows common work file types", () => {
    expect(isAllowedAttachmentMediaType("image/png")).toBe(true);
    expect(isAllowedAttachmentMediaType("application/pdf")).toBe(true);
    expect(isAllowedAttachmentMediaType("text/plain")).toBe(true);
    expect(isAllowedAttachmentMediaType("application/zip")).toBe(false);
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
