export const SCHEDULES_CHANGED_EVENT = "brain:schedules-changed";

export function notifySchedulesChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(SCHEDULES_CHANGED_EVENT));
}
