"use client";

import { AlertCircleIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorToast({
  message,
  onDismiss,
  onRetry,
}: {
  readonly message: string;
  readonly onDismiss: () => void;
  readonly onRetry?: () => void;
}) {
  return (
    <div
      aria-live="assertive"
      className="border-destructive/30 bg-background/95 fixed top-3 right-3 z-50 flex w-[calc(100vw-1.5rem)] max-w-sm items-start gap-3 rounded-md border p-3 text-sm shadow-lg backdrop-blur sm:top-4 sm:right-4"
      role="alert"
    >
      <AlertCircleIcon className="text-destructive mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Request failed</p>
        <p className="text-muted-foreground mt-0.5">{message}</p>
        {onRetry ? (
          <div className="mt-2">
            <Button onClick={onRetry} size="xs" type="button" variant="outline">
              Retry
            </Button>
          </div>
        ) : null}
      </div>
      <Button
        aria-label="Dismiss error"
        className="text-muted-foreground hover:text-foreground -mt-1 -mr-1"
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
