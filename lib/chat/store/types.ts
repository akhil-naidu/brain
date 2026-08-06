import type { HandleMessageStreamEvent, SessionState } from "eve/client";

export type ChatVisibility = "personal" | "shared";

export type ChatSummary = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly visibility: ChatVisibility;
  readonly userId: string;
};

export type ChatRecord = ChatSummary & {
  readonly workspaceId: string;
  readonly eveSession: SessionState | null;
  readonly events: readonly HandleMessageStreamEvent[];
};

export type CreateChatInput = {
  readonly id?: string;
  readonly title?: string;
  readonly workspaceId: string;
  readonly visibility?: ChatVisibility;
};

export type UpdateChatInput = {
  readonly title?: string;
  readonly visibility?: ChatVisibility;
  readonly eveSession?: SessionState | null;
  readonly appendEvents?: readonly HandleMessageStreamEvent[];
  /** When set, replaces the full event log (used for turn snapshots). */
  readonly events?: readonly HandleMessageStreamEvent[];
};

export type DeleteChatOptions = {
  /** Workspace owner/admin may delete any shared chat in the workspace. */
  readonly moderateShared?: boolean;
};

export interface ChatStore {
  createChat(userId: string, input: CreateChatInput): ChatRecord;
  listChats(userId: string, workspaceId: string): readonly ChatSummary[];
  getChat(userId: string, workspaceId: string, id: string): ChatRecord | null;
  updateChat(
    userId: string,
    workspaceId: string,
    id: string,
    input: UpdateChatInput,
  ): ChatRecord | null;
  deleteChat(userId: string, workspaceId: string, id: string, options?: DeleteChatOptions): boolean;
  /** One-time migration helper: move chats from one owner id to another. */
  reassignOwner(fromUserId: string, toUserId: string): number;
  /** Assign workspace_id for all chats owned by user that still lack one. */
  assignWorkspaceToUserChats(userId: string, workspaceId: string): number;
  close(): void;
}
