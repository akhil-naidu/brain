import { createSqliteChatStore } from "@/lib/chat/store/sqlite-chat-store";
import { resolveChatsDbPath } from "@/lib/chat/store/path";
import type { ChatStore } from "@/lib/chat/store/types";

export type {
  ChatRecord,
  ChatStore,
  ChatSummary,
  CreateChatInput,
  TurnLockAction,
  UpdateChatInput,
} from "@/lib/chat/store/types";
export {
  ChatConcurrencyError,
  isChatConcurrencyError,
  SHARED_TURN_LOCK_TTL_MS,
} from "@/lib/chat/store/concurrency";
export { resolveChatsDbPath, DEFAULT_CHATS_DB_PATH } from "@/lib/chat/store/path";
export { createSqliteChatStore } from "@/lib/chat/store/sqlite-chat-store";

const globalForStore = globalThis as typeof globalThis & {
  brainChatStore?: ChatStore;
  brainChatStorePath?: string;
};

export function getChatStore(): ChatStore {
  const dbPath = resolveChatsDbPath();
  const existing = globalForStore.brainChatStore;
  const stale =
    existing !== undefined &&
    (globalForStore.brainChatStorePath !== dbPath || typeof existing.reassignOwner !== "function");
  if (!existing || stale) {
    existing?.close();
    const store = createSqliteChatStore(dbPath);
    globalForStore.brainChatStore = store;
    globalForStore.brainChatStorePath = dbPath;
    return store;
  }
  return existing;
}
