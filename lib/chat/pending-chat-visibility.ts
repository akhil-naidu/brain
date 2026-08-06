import type { ChatVisibility } from "@/lib/chat/store/types";

let pendingVisibility: ChatVisibility = "personal";

export function stashPendingChatVisibility(visibility: ChatVisibility): void {
  pendingVisibility = visibility;
}

/** Returns and resets the visibility for the next newly created chat. */
export function takePendingChatVisibility(): ChatVisibility {
  const value = pendingVisibility;
  pendingVisibility = "personal";
  return value;
}
