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
        d="M16 5.5C11.2 5.5 7.5 8.6 7.5 13.2C7.5 15.1 8.2 16.8 9.3 18.1C8.4 19.1 7.8 20.4 7.8 21.9C7.8 24.8 10.4 27 13.5 27C14.6 27 15.5 26.7 16 26.2C16.5 26.7 17.4 27 18.5 27C21.6 27 24.2 24.8 24.2 21.9C24.2 20.4 23.6 19.1 22.7 18.1C23.8 16.8 24.5 15.1 24.5 13.2C24.5 8.6 20.8 5.5 16 5.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path
        d="M16 5.5V26.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
      <circle cx="12.2" cy="14.5" fill="currentColor" r="1.15" />
      <circle cx="19.8" cy="14.5" fill="currentColor" r="1.15" />
      <circle cx="16" cy="19.2" fill="currentColor" r="1.15" />
    </svg>
  );
}
