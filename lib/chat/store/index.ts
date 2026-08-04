import { createSqliteChatStore } from "@/lib/chat/store/sqlite-chat-store";
import { resolveChatsDbPath } from "@/lib/chat/store/path";
import type { ChatStore } from "@/lib/chat/store/types";

export type {
  ChatRecord,
  ChatStore,
  ChatSummary,
  CreateChatInput,
  UpdateChatInput,
} from "@/lib/chat/store/types";
export { resolveChatsDbPath, DEFAULT_CHATS_DB_PATH } from "@/lib/chat/store/path";
export { createSqliteChatStore } from "@/lib/chat/store/sqlite-chat-store";

const globalForStore = globalThis as typeof globalThis & {
  brainChatStore?: ChatStore;
  brainChatStorePath?: string;
};

export function getChatStore(): ChatStore {
  const dbPath = resolveChatsDbPath();
  if (!globalForStore.brainChatStore || globalForStore.brainChatStorePath !== dbPath) {
    globalForStore.brainChatStore?.close();
    globalForStore.brainChatStore = createSqliteChatStore(dbPath);
    globalForStore.brainChatStorePath = dbPath;
  }
  return globalForStore.brainChatStore;
}
