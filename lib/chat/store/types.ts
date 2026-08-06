import type { HandleMessageStreamEvent, SessionState } from "eve/client";

export type ChatSummary = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ChatRecord = ChatSummary & {
  readonly userId: string;
  readonly workspaceId: string;
  readonly eveSession: SessionState | null;
  readonly events: readonly HandleMessageStreamEvent[];
};

export type CreateChatInput = {
  readonly id?: string;
  readonly title?: string;
  readonly workspaceId: string;
};

export type UpdateChatInput = {
  readonly title?: string;
  readonly eveSession?: SessionState | null;
  readonly appendEvents?: readonly HandleMessageStreamEvent[];
  /** When set, replaces the full event log (used for turn snapshots). */
  readonly events?: readonly HandleMessageStreamEvent[];
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
  deleteChat(userId: string, workspaceId: string, id: string): boolean;
  /** One-time migration helper: move chats from one owner id to another. */
  reassignOwner(fromUserId: string, toUserId: string): number;
  /** Assign workspace_id for all chats owned by user that still lack one. */
  assignWorkspaceToUserChats(userId: string, workspaceId: string): number;
  close(): void;
}
