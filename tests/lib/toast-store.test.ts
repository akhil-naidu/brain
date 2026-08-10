import { afterEach, describe, expect, it } from "vitest";
import {
  clearToasts,
  dismissToast,
  getToasts,
  showToast,
  subscribeToasts,
} from "@/lib/ui/toast-store";

afterEach(() => {
  clearToasts();
});

describe("toast-store", () => {
  it("appends toasts and notifies subscribers", () => {
    const seen: number[] = [];
    const unsubscribe = subscribeToasts((toasts) => {
      seen.push(toasts.length);
    });

    const id = showToast({ title: "Saved", variant: "success", message: "GitHub is ready." });
    expect(getToasts()).toHaveLength(1);
    expect(getToasts()[0]).toMatchObject({
      id,
      title: "Saved",
      variant: "success",
      message: "GitHub is ready.",
    });
    dismissToast(id);
    expect(getToasts()).toHaveLength(0);
    expect(seen.at(-1)).toBe(0);
    unsubscribe();
  });
});
