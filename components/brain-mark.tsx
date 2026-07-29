import { cn } from "@/lib/utils";

export function BrainMark({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-5", className)}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 3 L21 4 L25 7 L27 12 L27 17 L25 22 L21 26 L16 29 L11 26 L7 22 L5 17 L5 12 L7 7 L11 4 Z"
        stroke="currentColor"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="1.5"
      />
      <path d="M16 3 L16 29" stroke="currentColor" strokeLinecap="square" strokeWidth="1.5" />
      <path
        d="M8 11 L14 11 M18 11 L24 11 M7 16 L14 16 M18 16 L25 16 M9 21 L14 21 M18 21 L23 21"
        stroke="currentColor"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="1.25"
      />
      <path
        d="M11 4 L14 8 L16 8 L18 8 L21 4 M14 8 L14 11 M18 8 L18 11"
        stroke="currentColor"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="1.25"
      />
    </svg>
  );
}
