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
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="brainEmojiFill"
          x1="8"
          x2="24"
          y1="6"
          y2="28"
        >
          <stop stopColor="#FF8FA8" />
          <stop offset="1" stopColor="#F06292" />
        </linearGradient>
      </defs>
      <path
        d="M15.6 7.2C13.8 5.1 10.2 5.3 8.6 7.4C7.2 9.2 7.4 11.6 8.6 13.2C7.1 14.2 6.2 16 6.4 17.9C6.7 20.6 8.8 22.5 11.4 22.7C12.2 24.6 14 25.8 15.9 25.6L15.6 7.2Z"
        fill="url(#brainEmojiFill)"
      />
      <path
        d="M16.4 7.2C18.2 5.1 21.8 5.3 23.4 7.4C24.8 9.2 24.6 11.6 23.4 13.2C24.9 14.2 25.8 16 25.6 17.9C25.3 20.6 23.2 22.5 20.6 22.7C19.8 24.6 18 25.8 16.1 25.6L16.4 7.2Z"
        fill="url(#brainEmojiFill)"
      />
      <path
        d="M16 7.4V25.2"
        opacity="0.55"
        stroke="#E91E63"
        strokeLinecap="round"
        strokeWidth="1.1"
      />
      <path
        d="M9.2 9.4C10.6 9.1 12 9.8 12.8 10.8M8.4 12.6C9.8 12.2 11.4 12.8 12.4 14M9 16.2C10.4 15.8 12 16.5 12.8 17.8M10.2 19.6C11.4 19.3 12.8 20 13.4 21.2M22.8 9.4C21.4 9.1 20 9.8 19.2 10.8M23.6 12.6C22.2 12.2 20.6 12.8 19.6 14M23 16.2C21.6 15.8 20 16.5 19.2 17.8M21.8 19.6C20.6 19.3 19.2 20 18.6 21.2"
        fill="none"
        opacity="0.45"
        stroke="#E91E63"
        strokeLinecap="round"
        strokeWidth="1.15"
      />
    </svg>
  );
}
