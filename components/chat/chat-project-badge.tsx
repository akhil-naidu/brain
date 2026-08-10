"use client";

import { FolderIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function ChatProjectBadge({
  className,
  href = "/projects",
  name,
  size = "sm",
}: {
  readonly className?: string;
  readonly href?: string;
  readonly name: string;
  readonly size?: "sm" | "md";
}) {
  return (
    <Link
      className={cn(
        "text-muted-foreground bg-muted/60 hover:bg-muted hover:text-foreground inline-flex min-w-0 shrink-0 items-center gap-1 rounded-md font-medium transition-colors",
        size === "sm" && "max-w-[10rem] px-1.5 py-0.5 text-[10px] tracking-wide uppercase",
        size === "md" &&
          "border-border/70 max-w-[16rem] gap-1.5 rounded-full border px-3 py-1 text-xs",
        className,
      )}
      href={href}
      title={`In project ${name}`}
    >
      <FolderIcon className={cn("shrink-0", size === "sm" ? "size-2.5" : "size-3.5")} />
      <span className={cn("truncate", size === "sm" && "tracking-normal normal-case")}>{name}</span>
    </Link>
  );
}
