"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Field({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

export function FieldLabel({
  children,
  htmlFor,
  className,
}: {
  readonly children: ReactNode;
  readonly htmlFor?: string;
  readonly className?: string;
}) {
  return (
    <label
      className={cn("text-foreground text-sm font-medium tracking-tight", className)}
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}

export function FieldDescription({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <p className={cn("text-muted-foreground text-xs leading-relaxed", className)}>{children}</p>
  );
}

export function FieldSelect({
  value,
  onValueChange,
  placeholder,
  disabled,
  size = "default",
  className,
  triggerClassName,
  options,
  id,
  "aria-label": ariaLabel,
}: {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly size?: "sm" | "default";
  readonly className?: string;
  readonly triggerClassName?: string;
  readonly id?: string;
  readonly "aria-label"?: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
    readonly disabled?: boolean;
  }[];
}) {
  return (
    <Select
      disabled={disabled}
      onValueChange={onValueChange}
      value={value === "" ? undefined : value}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "border-border/80 bg-muted/25 hover:bg-muted/40 focus-visible:bg-background w-full min-w-0 rounded-lg shadow-none",
          triggerClassName,
        )}
        id={id}
        size={size}
      >
        <SelectValue placeholder={placeholder ?? "Select…"} />
      </SelectTrigger>
      <SelectContent
        align="start"
        className={cn("min-w-[var(--radix-select-trigger-width)]", className)}
        position="popper"
      >
        {options.map((option) => (
          <SelectItem disabled={option.disabled} key={option.value} value={option.value}>
            <SelectItemText>{option.label}</SelectItemText>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
