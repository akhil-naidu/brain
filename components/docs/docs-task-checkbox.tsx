"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function checklistStorageKey(pathname: string, label: string): string {
  return `brain-docs-check:${pathname}:${label}`;
}

function labelForCheckbox(element: HTMLInputElement): string {
  const parent = element.parentElement;
  if (!parent) {
    return "";
  }
  return parent.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

export function DocsTaskCheckbox({
  checked: checkedProp,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState(checkedProp === true);
  const [ariaLabel, setAriaLabel] = useState<string | undefined>();

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    const label = labelForCheckbox(input);
    if (!label) {
      return;
    }
    setAriaLabel(label);
    setChecked(window.localStorage.getItem(checklistStorageKey(pathname, label)) === "1");
  }, [pathname]);

  return (
    <input
      {...props}
      aria-label={ariaLabel}
      checked={checked}
      className={cn("accent-primary mt-0.5 size-3.5 shrink-0 cursor-pointer", className)}
      disabled={false}
      readOnly={false}
      onChange={(event) => {
        const next = event.target.checked;
        setChecked(next);
        const label = labelForCheckbox(event.target);
        if (!label) {
          return;
        }
        window.localStorage.setItem(checklistStorageKey(pathname, label), next ? "1" : "0");
      }}
      ref={inputRef}
      type="checkbox"
    />
  );
}
