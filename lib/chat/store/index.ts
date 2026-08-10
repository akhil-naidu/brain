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

/** Bump when store method behavior changes so HMR does not keep a stale singleton. */
export const CHAT_STORE_REVISION = 3;

const globalForStore = globalThis as typeof globalThis & {
  brainChatStore?: ChatStore;
  brainChatStoreRevision?: number;
};

function isCurrentChatStore(store: ChatStore | undefined): store is ChatStore {
  // Recreate after HMR when the cached singleton predates newer store methods.
  return Boolean(
    store &&
    typeof store.listProjects === "function" &&
    typeof store.createProject === "function" &&
    typeof store.updateProject === "function" &&
    typeof store.deleteProject === "function" &&
    globalForStore.brainChatStoreRevision === CHAT_STORE_REVISION,
  );
}

export function getChatStore(): ChatStore {
  if (!isCurrentChatStore(globalForStore.brainChatStore)) {
    globalForStore.brainChatStore = createPostgresChatStore();
    globalForStore.brainChatStoreRevision = CHAT_STORE_REVISION;
  }
  return globalForStore.brainChatStore;
}
