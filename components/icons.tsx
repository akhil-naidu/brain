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

/** Snowflake mark (simplified). */
export function SnowflakeIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M12 2.25v19.5M4.5 6.75l15 10.5M4.5 17.25l15-10.5M7.5 3.75l9 16.5M16.5 3.75l-9 16.5"
        stroke="#29B5E8"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="12" fill="#29B5E8" r="1.75" />
    </svg>
  );
}

/** Notion mark (simplified). */
export function NotionIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 2.35c-.42-.326-.98-.7-2.055-.607L3.01 2.914c-.514.047-.6.327-.514.607l1.963.687zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-14.106.793c-.56.046-.818.327-.818 1.027zm13.748.607c.093.42 0 .84-.42.888l-.7.14v10.264c-.607.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.953l1.45.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.62c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933l3.223-.186z" />
    </svg>
  );
}

/** Linear mark (simplified). */
export function LinearIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="#5E6AD2" viewBox="0 0 24 24">
      <path d="M3 14.5 12.5 3a1.5 1.5 0 0 1 2.5 1.1V9a1 1 0 0 0 1 1h4.4A1.5 1.5 0 0 1 21 12.5L11.5 21A1.5 1.5 0 0 1 9 19.9V15a1 1 0 0 0-1-1H3.6A1.5 1.5 0 0 1 3 14.5z" />
    </svg>
  );
}

/** Atlassian mark (simplified). */
export function AtlassianIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M7.62 18.52 1.5 8.2c-.34-.57-.04-1.3.63-1.45 1.9-.42 5.5-.84 8.37 1.6L7.62 18.52zm8.76 0 2.88-4.88c.4-.67-.05-1.53-.82-1.53H9.7c-.42 0-.8.23-.99.6L7.62 18.52h8.76zm.87-13.77c2.87-2.44 6.47-2.02 8.37-1.6.67.15.97.88.63 1.45l-6.12 10.32-4.88-8.17c-.19-.37-.57-.6-.99-.6h-1.5c1.2-1.15 2.78-1.92 4.49-1.4z"
        fill="#2684FF"
      />
    </svg>
  );
}

/** Zernio mark (simplified). */
export function ZernioIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <rect fill="#111827" height="20" rx="5" width="20" x="2" y="2" />
      <path
        d="M7.5 7.5h9l-9 9h9"
        stroke="#F8FAFC"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Sentry mark (simplified). */
export function SentryIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="#362D59" viewBox="0 0 24 24">
      <path d="M13.91 2.5a1.4 1.4 0 0 0-2.42 0L2.2 18.2A1.4 1.4 0 0 0 3.41 20.3h4.2a7.3 7.3 0 0 1 9.78-9.78V4.9A1.4 1.4 0 0 0 13.91 2.5zm1.48 10.2a5.9 5.9 0 0 0-5.89 5.9h3.1a2.8 2.8 0 0 1 2.79-2.8v-3.1zm1.4 4.5a1.4 1.4 0 0 0-1.4 1.4v2.2h2.2a1.4 1.4 0 0 0 1.4-1.4 2.2 2.2 0 0 0-2.2-2.2z" />
    </svg>
  );
}

/** MongoDB leaf (simplified). */
export function MongoDbIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M12 2c1.2 3.2 2.8 5.4 3.6 8.2.7 2.4.5 4.7-.6 6.7-.8 1.5-2 2.6-3 3.6v1.5h-1v-1.5c-1-.9-2.2-2-3-3.5-1.1-2-.8-4.4-.1-6.8C8.7 7.4 10.4 5.2 12 2z"
        fill="#00684A"
      />
      <path d="M12 14.5v5" stroke="#13AA52" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

/** MCP Toolbox mark (simplified). */
export function ToolboxIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M4 9.5h16v9.25A1.75 1.75 0 0 1 18.25 20.5H5.75A1.75 1.75 0 0 1 4 18.75V9.5z"
        fill="#4285F4"
      />
      <path
        d="M8 9.5V7.25A2.25 2.25 0 0 1 10.25 5h3.5A2.25 2.25 0 0 1 16 7.25V9.5"
        stroke="#1967D2"
        strokeWidth="1.75"
      />
      <path d="M4 12.5h16" stroke="#E8F0FE" strokeWidth="1.5" />
    </svg>
  );
}

/** Rybbit frog-green mark (simplified). */
export function RybbitIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="13" fill="#3D8B40" r="8" />
      <circle cx="9" cy="11.5" fill="#F4F9F4" r="1.6" />
      <circle cx="15" cy="11.5" fill="#F4F9F4" r="1.6" />
      <path
        d="M9 16c1 .9 2 1.3 3 1.3s2-.4 3-1.3"
        stroke="#F4F9F4"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/** Bytebot desktop mark (simplified). */
export function BytebotIcon({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <rect fill="#1F2937" height="12" rx="1.5" width="16" x="4" y="4.5" />
      <rect fill="#38BDF8" height="7" width="12" x="6" y="6.5" />
      <path d="M8 19.5h8" stroke="#1F2937" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  );
}
