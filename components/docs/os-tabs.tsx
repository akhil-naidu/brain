"use client";

import type { ComponentProps } from "react";
import { Tab as FumaTab, Tabs as FumaTabs } from "fumadocs-ui/components/tabs";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: ComponentProps<typeof FumaTabs>) {
  return (
    <FumaTabs
      data-brain-os-tabs=""
      {...props}
      className={cn("brain-os-tabs", className)}
    />
  );
}

export function Tab({ className, ...props }: ComponentProps<typeof FumaTab>) {
  return <FumaTab {...props} className={cn("brain-os-tab", className)} />;
}
