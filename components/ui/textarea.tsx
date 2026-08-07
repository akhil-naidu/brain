import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border/80 bg-muted/25 placeholder:text-muted-foreground hover:bg-muted/40 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-muted/20 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-24 w-full rounded-lg border px-3 py-2 text-base shadow-none transition-[color,box-shadow,background-color] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
