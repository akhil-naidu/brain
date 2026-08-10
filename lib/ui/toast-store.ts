export type AppToastVariant = "info" | "success" | "error";

export type AppToastInput = {
  readonly title: string;
  readonly message?: string;
  readonly variant?: AppToastVariant;
  /** Auto-dismiss in ms. `0` keeps the toast until dismissed. Default 4500. */
  readonly durationMs?: number;
};

export type AppToast = AppToastInput & {
  readonly id: string;
  readonly variant: AppToastVariant;
  readonly durationMs: number;
};

type Listener = (toasts: readonly AppToast[]) => void;

const DEFAULT_DURATION_MS = 4500;
const listeners = new Set<Listener>();
let toasts: AppToast[] = [];
let sequence = 0;

function emit() {
  const snapshot = toasts;
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): readonly AppToast[] {
  return toasts;
}

export function showToast(input: AppToastInput): string {
  sequence += 1;
  const id = `toast-${sequence}`;
  const toast: AppToast = {
    id,
    title: input.title,
    message: input.message,
    variant: input.variant ?? "info",
    durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
  };
  toasts = [...toasts, toast];
  emit();
  return id;
}

export function dismissToast(id: string): void {
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length === toasts.length) {
    return;
  }
  toasts = next;
  emit();
}

export function clearToasts(): void {
  if (toasts.length === 0) {
    return;
  }
  toasts = [];
  emit();
}
