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

function isCurrentChatStore(store: ChatStore | undefined): store is ChatStore {
  // Recreate after HMR when the cached singleton predates newer store methods.
  return Boolean(
    store &&
    typeof store.listProjects === "function" &&
    typeof store.createProject === "function" &&
    typeof store.updateProject === "function" &&
    typeof store.deleteProject === "function",
  );
}

export function getChatStore(): ChatStore {
  if (!isCurrentChatStore(globalForStore.brainChatStore)) {
    globalForStore.brainChatStore = createPostgresChatStore();
  }
  return globalForStore.brainChatStore;
}
