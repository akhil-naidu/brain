import { createPostgresChatStore } from "@/lib/chat/store/postgres-chat-store";
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
export { createPostgresChatStore } from "@/lib/chat/store/postgres-chat-store";

const globalForStore = globalThis as typeof globalThis & {
  brainChatStore?: ChatStore;
};

export function getChatStore(): ChatStore {
  if (!globalForStore.brainChatStore) {
    globalForStore.brainChatStore = createPostgresChatStore();
  }
  return globalForStore.brainChatStore;
}
