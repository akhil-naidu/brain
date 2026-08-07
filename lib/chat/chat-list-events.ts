export const CHATS_CHANGED_EVENT = "brain:chats-changed";

export function notifyChatsChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(CHATS_CHANGED_EVENT));
}
