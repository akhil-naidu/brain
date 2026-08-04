import type { HandleMessageStreamEvent, SessionState } from "eve/client";

export type ChatSummary = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ChatRecord = ChatSummary & {
  readonly eveSession: SessionState | null;
  readonly events: readonly HandleMessageStreamEvent[];
};

export type CreateChatInput = {
  readonly id?: string;
  readonly title?: string;
};

export type UpdateChatInput = {
  readonly title?: string;
  readonly eveSession?: SessionState | null;
  readonly appendEvents?: readonly HandleMessageStreamEvent[];
  /** When set, replaces the full event log (used for turn snapshots). */
  readonly events?: readonly HandleMessageStreamEvent[];
};

export interface ChatStore {
  createChat(input?: CreateChatInput): ChatRecord;
  listChats(): readonly ChatSummary[];
  getChat(id: string): ChatRecord | null;
  updateChat(id: string, input: UpdateChatInput): ChatRecord | null;
  deleteChat(id: string): boolean;
  close(): void;
}
