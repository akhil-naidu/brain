"use client";

import { ChevronDownIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Markdown } from "@/components/chat/markdown";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function ReasoningPart({
  isStreaming,
  text,
}: {
  readonly isStreaming: boolean;
  readonly text: string;
}) {
  const [open, setOpen] = useState(isStreaming);

  useEffect(() => {
    if (isStreaming) {
      setOpen(true);
    }
  }, [isStreaming]);

  return (
    <Collapsible className="my-3 w-full" onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors">
        <span className={isStreaming ? "shimmer-text" : undefined}>
          {isStreaming ? "Thinking..." : "Reasoning"}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn("size-4 transition-transform", open ? "rotate-180" : "")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border text-muted-foreground mt-3 border-l pl-4">
        <Markdown>{text}</Markdown>
      </CollapsibleContent>
    </Collapsible>
  );
}
