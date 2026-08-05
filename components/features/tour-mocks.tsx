import type { ComponentType, ReactNode } from "react";
import {
  AsanaIcon,
  ClickUpIcon,
  DflowIcon,
  GitHubIcon,
  GmailIcon,
  SlackIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

function MockChrome({
  children,
  className,
  title,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly title: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "features-mock overflow-hidden rounded-2xl border border-white/12 bg-[oklch(0.17_0.025_240)] shadow-[0_30px_80px_-40px_oklch(0.2_0.06_230)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/8 px-3.5 py-2.5">
        <span className="size-2 rounded-full bg-white/20" />
        <span className="size-2 rounded-full bg-white/20" />
        <span className="size-2 rounded-full bg-white/20" />
        <span className="ml-2 truncate text-[11px] text-white/40">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function ChatTourMock() {
  return (
    <MockChrome title="Brain · chat">
      <div className="grid min-h-[17rem] grid-cols-[7.5rem_1fr] sm:min-h-[19rem] sm:grid-cols-[9rem_1fr]">
        <aside className="border-r border-white/8 bg-black/25 p-3">
          <p className="text-[10px] font-medium tracking-wide text-white/35 uppercase">Chats</p>
          <ul className="mt-3 space-y-2">
            {["Sprint board", "Inbox triage", "Deploy check"].map((title, index) => (
              <li
                className={cn(
                  "rounded-md px-2 py-1.5 text-[11px] leading-snug",
                  index === 0 ? "bg-white/10 text-white/90" : "text-white/45",
                )}
                key={title}
              >
                {title}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[10px] text-white/30">⌘⇧O new · ⌘K search</p>
        </aside>
        <div className="flex flex-col">
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[oklch(0.45_0.08_230_/0.55)] px-3 py-2 text-[12px] leading-relaxed text-white/90">
              What’s blocked on the sprint board?
            </div>
            <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] leading-relaxed text-white/75">
              Three tasks are waiting on design. I can open the ClickUp list or draft a Slack nudge.
              <span className="features-mock-cursor ml-0.5 inline-block h-3 w-1.5 bg-[oklch(0.78_0.08_230)] align-middle" />
            </div>
          </div>
          <div className="border-t border-white/8 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <span className="flex-1 text-[12px] text-white/35">Ask Brain anything…</span>
              <span className="flex size-6 items-center justify-center rounded-full bg-[oklch(0.72_0.09_230)] text-[10px] font-bold text-[oklch(0.16_0.03_240)]">
                ↑
              </span>
            </div>
          </div>
        </div>
      </div>
    </MockChrome>
  );
}

type ConnectionRow = {
  readonly id: string;
  readonly label: string;
  readonly status: string;
  readonly action?: string;
  readonly tone?: "ok";
  readonly Icon: ComponentType<{ readonly className?: string }>;
};

const CONNECTION_ROWS: readonly ConnectionRow[] = [
  { id: "clickup", label: "ClickUp", status: "Connected", tone: "ok", Icon: ClickUpIcon },
  { id: "slack", label: "Slack", status: "Set up needed", action: "Set up", Icon: SlackIcon },
  { id: "gmail", label: "Gmail", status: "Sign in", action: "Connect", Icon: GmailIcon },
  { id: "asana", label: "Asana", status: "Connected", tone: "ok", Icon: AsanaIcon },
  { id: "dflow", label: "dFlow", status: "Sign in", action: "Connect", Icon: DflowIcon },
  { id: "github", label: "GitHub", status: "Set up needed", action: "Set up", Icon: GitHubIcon },
];

export function ConnectionsTourMock() {
  return (
    <MockChrome className="max-w-sm sm:ml-auto" title="Connections">
      <ul className="divide-y divide-white/8 p-2">
        {CONNECTION_ROWS.map(({ Icon, action, id, label, status, tone }) => (
          <li className="flex items-center gap-2.5 px-2 py-2.5" key={id}>
            <span className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/5">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-white/90">{label}</span>
              <span
                className={cn(
                  "mt-0.5 block text-[11px]",
                  tone === "ok" ? "text-emerald-400/90" : "text-white/45",
                )}
              >
                {status}
              </span>
            </span>
            {action ? (
              <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
                {action}
              </span>
            ) : (
              <span className="relative inline-flex h-4 w-7 items-center rounded-full bg-emerald-500">
                <span className="size-3 translate-x-[15px] rounded-full bg-white shadow-sm" />
              </span>
            )}
          </li>
        ))}
      </ul>
    </MockChrome>
  );
}

export function ModelsTourMock() {
  return (
    <MockChrome title="Composer">
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {["Summarize inbox", "Check deploys", "Draft reply"].map((chip, index) => (
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px]",
                index === 0
                  ? "border-[oklch(0.72_0.09_230_/0.45)] bg-[oklch(0.72_0.09_230_/0.12)] text-white/85"
                  : "border-white/10 text-white/45",
              )}
              key={chip}
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-wide text-white/35 uppercase">Model</p>
              <p className="mt-1 text-[13px] font-medium text-white/90">DeepSeek V4 Pro</p>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
              Change
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 border-t border-white/8 pt-3">
            {[
              { name: "DeepSeek V4 Pro", note: "Strong · current" },
              { name: "Faster chat", note: "Quick replies" },
              { name: "Balanced", note: "Everyday work" },
            ].map((model, index) => (
              <li
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1.5 text-[12px]",
                  index === 0 ? "bg-white/8 text-white/90" : "text-white/50",
                )}
                key={model.name}
              >
                <span>{model.name}</span>
                <span className="text-[11px] text-white/35">{model.note}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
          <span className="flex-1 text-[12px] text-white/35">Ask about this week’s tasks…</span>
          <span className="flex size-6 items-center justify-center rounded-full bg-[oklch(0.72_0.09_230)] text-[10px] font-bold text-[oklch(0.16_0.03_240)]">
            ↑
          </span>
        </div>
      </div>
    </MockChrome>
  );
}

export function RuntimeTourMock() {
  return (
    <MockChrome title="This host">
      <div className="grid gap-0 sm:grid-cols-2">
        <div className="space-y-3 border-b border-white/8 p-4 sm:border-r sm:border-b-0">
          <p className="text-[10px] tracking-wide text-white/35 uppercase">Where it runs</p>
          <p className="font-[family-name:var(--font-features-display)] text-lg font-medium text-white/90">
            Your machine or server
          </p>
          <ul className="space-y-2 text-[12px] text-white/55">
            <li className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[oklch(0.72_0.09_230)]" />
              Chat history in local storage
            </li>
            <li className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[oklch(0.72_0.09_230)]" />
              App sign-in saved on this host
            </li>
            <li className="flex gap-2">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[oklch(0.72_0.09_230)]" />
              Open the browser — no agent terminal
            </li>
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-2 p-4">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] text-white/35">Models</p>
            <p className="text-[12px] text-white/80">Direct provider</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] text-white/35">Connections</p>
            <p className="text-[12px] text-white/80">Self-hosted sign-in</p>
          </div>
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
            <p className="text-[10px] text-emerald-300/70">Access</p>
            <p className="text-[12px] text-emerald-100/90">Local / trusted</p>
          </div>
        </div>
      </div>
    </MockChrome>
  );
}
