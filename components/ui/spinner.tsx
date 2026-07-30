import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <output aria-label="Loading">
      <Loader2Icon aria-hidden="true" className={cn("size-4 animate-spin", className)} {...props} />
    </output>
  );
}

export { Spinner };
