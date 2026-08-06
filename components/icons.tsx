import Image from "next/image";

import { cn } from "@/lib/utils";

export function ClickUpIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M12.04 6.15 5.472 11.81 2.436 8.29 12.055 0l9.543 8.296-3.05 3.509z"
        fill="#7B68EE"
      />
      <path
        d="M2 18.439 5.69 15.611C7.651 18.171 9.734 19.35 12.053 19.35c2.307 0 4.33-1.166 6.203-3.704L22 18.405C19.298 22.065 15.941 24 12.053 24 8.178 24 4.788 22.078 2 18.439z"
        fill="#FF02F0"
      />
    </svg>
  );
}

export function SlackIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        fill="#E01E5A"
      />
      <path
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        fill="#36C5F0"
      />
      <path
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
        fill="#2EB67D"
      />
      <path
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        fill="#ECB22E"
      />
    </svg>
  );
}

export function AsanaIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="5.348" fill="#F06A6A" r="5.22" />
      <circle cx="5.22" cy="17.873" fill="#F06A6A" r="5.22" />
      <circle cx="18.78" cy="17.873" fill="#F06A6A" r="5.22" />
    </svg>
  );
}

export function GmailIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="52 42 88 66">
      <path d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" fill="#4285F4" />
      <path d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" fill="#34A853" />
      <path d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2" fill="#FBBC04" />
      <path d="M72 74V48l24 18 24-18v26L96 92" fill="#EA4335" />
      <path d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2" fill="#C5221F" />
    </svg>
  );
}

/** Official dFlow mark (transparent PNG). */
const DFLOW_MARK_SRC = "/images/dflow-no-bg.png?v=1";

export function DflowIcon({ className }: { readonly className?: string }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("size-[18px] object-contain", className)}
      height={64}
      src={DFLOW_MARK_SRC}
      unoptimized
      width={64}
    />
  );
}

export function GitHubIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.113.793-.26.793-.577 0-.285-.01-1.04-.016-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.76-1.605-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.807 5.624-5.48 5.92.43.372.813 1.102.813 2.222 0 1.606-.014 2.902-.014 3.296 0 .32.192.694.8.576C20.565 21.796 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
    </svg>
  );
}

/** Snowflake brand mark (simplified). */
export function SnowflakeIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M12 2.5v19M4.5 7.25l15 9.5M4.5 16.75l15-9.5"
        stroke="#29B5E8"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
      <path
        d="M12 2.5 9.2 5.3M12 2.5l2.8 2.8M12 21.5l-2.8-2.8M12 21.5l2.8-2.8M4.5 7.25l3.4.35M4.5 7.25l.9 3.3M19.5 16.75l-3.4-.35M19.5 16.75l-.9-3.3M4.5 16.75l3.4-.35M4.5 16.75l.9-3.3M19.5 7.25l-3.4.35M19.5 7.25l-.9 3.3"
        stroke="#29B5E8"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
