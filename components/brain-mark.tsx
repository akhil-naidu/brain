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
          x1="6"
          x2="26"
          y1="6"
          y2="28"
        >
          <stop stopColor="#FF8FA8" />
          <stop offset="1" stopColor="#F06292" />
        </linearGradient>
      </defs>
      <path
        d="M7.5 16.5C7.2 12.2 10.2 7.8 15.2 7.2C20.8 6.6 25.2 10.2 25.6 15.4C25.8 18.2 24.6 20.6 22.6 22C23.8 23.2 24.2 24.8 23.4 26.2C22.4 27.8 20.2 28.2 18.6 27.2C17.2 28.4 15 28.2 14 26.8C12.6 27.6 10.8 26.8 10.4 25.2C9.2 25.6 7.8 24.8 7.6 23.2C7.2 21.2 7.8 18.8 7.5 16.5Z"
        fill="url(#brainEmojiFill)"
      />
      <path
        d="M8.2 19.8C6.4 20.6 5.6 22.4 6.2 24C6.9 25.8 9 26.4 10.6 25.4C10.2 23.6 9.4 21.6 8.2 19.8Z"
        fill="url(#brainEmojiFill)"
      />
      <path
        d="M11.2 10.4C13.2 9.6 15.6 9.8 17.4 11M10.4 13.2C12.8 12.2 15.8 12.6 18.2 14.2M10.8 16.2C13.4 15.2 16.6 15.8 19.2 17.6M12.2 19.4C14.6 18.6 17.2 19.2 19.4 20.8M14.2 22.6C16.2 22 18 22.6 19.6 24M20.8 12.4C22 13.6 22.6 15.4 22.4 17.2"
        fill="none"
        opacity="0.42"
        stroke="#E91E63"
        strokeLinecap="round"
        strokeWidth="1.15"
      />
    </svg>
  );
}
