"use client";

import { AlertCircleIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorToast({
  message,
  onDismiss,
}: {
  readonly message: string;
  readonly onDismiss: () => void;
}) {
  return (
    <div
      aria-live="assertive"
      className="fixed top-3 right-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-sm items-start gap-3 rounded-md border border-destructive/30 bg-background/95 p-3 text-sm shadow-lg backdrop-blur sm:top-4 sm:right-4"
      role="alert"
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Request failed</p>
        <p className="mt-0.5 text-muted-foreground">{message}</p>
      </div>
      <Button
        aria-label="Dismiss error"
        className="-mt-1 -mr-1 text-muted-foreground hover:text-foreground"
        onClick={onDismiss}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <XIcon className="size-3.5" />
      </Button>
    </div>
  );
}
