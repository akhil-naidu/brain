"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon, CheckCircle2Icon, InfoIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissToast,
  subscribeToasts,
  type AppToast,
  type AppToastVariant,
} from "@/lib/ui/toast-store";
import { cn } from "@/lib/utils";

const VARIANT_ICON: Record<AppToastVariant, typeof InfoIcon> = {
  info: InfoIcon,
  success: CheckCircle2Icon,
  error: AlertCircleIcon,
};

const VARIANT_ICON_CLASS: Record<AppToastVariant, string> = {
  info: "text-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-destructive",
};

const VARIANT_BORDER_CLASS: Record<AppToastVariant, string> = {
  info: "border-border/80",
  success: "border-emerald-500/30",
  error: "border-destructive/30",
};

function ToastCard({ toast }: { readonly toast: AppToast }) {
  const Icon = VARIANT_ICON[toast.variant];

  useEffect(() => {
    if (toast.durationMs <= 0) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      dismissToast(toast.id);
    }, toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [toast.durationMs, toast.id]);

  return (
    <div
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      className={cn(
        "bg-background/95 flex w-[calc(100vw-1.5rem)] max-w-sm items-start gap-3 rounded-md border p-3 text-sm shadow-lg backdrop-blur",
        VARIANT_BORDER_CLASS[toast.variant],
      )}
      role={toast.variant === "error" ? "alert" : "status"}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", VARIANT_ICON_CLASS[toast.variant])} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{toast.title}</p>
        {toast.message ? <p className="text-muted-foreground mt-0.5">{toast.message}</p> : null}
      </div>
      <Button
        aria-label="Dismiss notification"
        className="text-muted-foreground hover:text-foreground -mt-1 -mr-1"
        onClick={() => {
          dismissToast(toast.id);
        }}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <XIcon className="size-3.5" />
      </Button>
    </div>
  );
}

export function AppToaster() {
  const [items, setItems] = useState<readonly AppToast[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed top-3 right-3 z-50 flex flex-col gap-2 sm:top-4 sm:right-4">
      {items.map((toast) => (
        <div className="pointer-events-auto" key={toast.id}>
          <ToastCard toast={toast} />
        </div>
      ))}
    </div>
  );
}
