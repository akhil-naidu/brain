import type { ComponentType, ReactNode } from "react";
import {
  AsanaIcon,
  ClickUpIcon,
  DflowIcon,
  GitHubIcon,
  GmailIcon,
  SlackIcon,
  SnowflakeIcon,
  ZernioIcon,
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
        "features-mock border-border/80 bg-card overflow-hidden rounded-2xl border shadow-sm",
        className,
      )}
    >
      <div className="border-border/60 flex items-center gap-2 border-b px-3.5 py-2.5">
        <span className="bg-muted-foreground/25 size-2 rounded-full" />
        <span className="bg-muted-foreground/25 size-2 rounded-full" />
        <span className="bg-muted-foreground/25 size-2 rounded-full" />
        <span className="text-muted-foreground ml-2 truncate text-[11px]">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function ChatTourMock() {
  return (
    <MockChrome title="Brain · chat">
      <div className="grid min-h-[17rem] grid-cols-[7.5rem_1fr] sm:min-h-[19rem] sm:grid-cols-[9rem_1fr]">
        <aside className="border-border/60 bg-muted/40 border-r p-3">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
            Chats
          </p>
          <ul className="mt-3 space-y-2">
            {["Sprint board", "Inbox triage", "Deploy check"].map((title, index) => (
              <li
                className={cn(
                  "rounded-md px-2 py-1.5 text-[11px] leading-snug",
                  index === 0 ? "bg-muted text-foreground" : "text-muted-foreground",
                )}
                key={title}
              >
                {title}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground/80 mt-6 text-[10px]">⌘⇧O new · ⌘K search</p>
        </aside>
        <div className="flex flex-col">
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="bg-muted text-foreground ml-auto max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 text-[12px] leading-relaxed">
              What’s blocked on the sprint board?
            </div>
            <div className="border-border/70 bg-background text-foreground/85 max-w-[90%] rounded-2xl rounded-bl-md border px-3 py-2 text-[12px] leading-relaxed">
              Three tasks are waiting on design. I can open the ClickUp list or draft a Slack nudge.
              <span className="features-mock-cursor bg-primary ml-0.5 inline-block h-3 w-1.5 align-middle" />
            </div>
          </div>
          <div className="border-border/60 border-t p-3">
            <div className="border-border/80 bg-muted/50 flex items-center gap-2 rounded-xl border px-3 py-2">
              <span className="text-muted-foreground flex-1 text-[12px]">Ask Brain anything…</span>
              <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-[10px] font-bold">
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
  {
    id: "snowflake",
    label: "Snowflake",
    status: "Set up needed",
    action: "Set up",
    Icon: SnowflakeIcon,
  },
  { id: "zernio", label: "Zernio", status: "Sign in", action: "Connect", Icon: ZernioIcon },
];

export function ConnectionsTourMock() {
  return (
    <MockChrome className="max-w-sm sm:ml-auto" title="Connections">
      <ul className="border-border/50 divide-y p-2">
        {CONNECTION_ROWS.map(({ Icon, action, id, label, status, tone }) => (
          <li className="flex items-center gap-2.5 px-2 py-2.5" key={id}>
            <span className="border-border/80 bg-muted/50 flex size-8 items-center justify-center rounded-md border">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-foreground block text-[13px]">{label}</span>
              <span
                className={cn(
                  "mt-0.5 block text-[11px]",
                  tone === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground",
                )}
              >
                {status}
              </span>
            </span>
            {action ? (
              <span className="border-border text-foreground/80 rounded-md border px-1.5 py-0.5 text-[10px] font-medium">
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
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground",
              )}
              key={chip}
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="border-border/80 bg-muted/40 rounded-xl border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-[10px] tracking-wide uppercase">Model</p>
              <p className="text-foreground mt-1 text-[13px] font-medium">DeepSeek V4 Pro</p>
            </div>
            <span className="border-border bg-card text-muted-foreground rounded-full border px-2.5 py-1 text-[11px]">
              Change
            </span>
          </div>
          <ul className="border-border/60 mt-3 space-y-1.5 border-t pt-3">
            {[
              { name: "DeepSeek V4 Pro", note: "Strong · current" },
              { name: "Faster chat", note: "Quick replies" },
              { name: "Balanced", note: "Everyday work" },
            ].map((model, index) => (
              <li
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1.5 text-[12px]",
                  index === 0 ? "bg-muted text-foreground" : "text-muted-foreground",
                )}
                key={model.name}
              >
                <span>{model.name}</span>
                <span className="text-muted-foreground text-[11px]">{model.note}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-border/80 bg-muted/50 flex items-center gap-2 rounded-xl border px-3 py-2.5">
          <span className="text-muted-foreground flex-1 text-[12px]">
            Ask about this week’s tasks…
          </span>
          <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-[10px] font-bold">
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
        <div className="border-border/60 space-y-3 border-b p-4 sm:border-r sm:border-b-0">
          <p className="text-muted-foreground text-[10px] tracking-wide uppercase">Where it runs</p>
          <p className="text-foreground font-[family-name:var(--font-features-display)] text-lg font-medium">
            Your machine or server
          </p>
          <ul className="text-muted-foreground space-y-2 text-[12px]">
            <li className="flex gap-2">
              <span className="bg-primary mt-1 size-1.5 shrink-0 rounded-full" />
              Chat history in local storage
            </li>
            <li className="flex gap-2">
              <span className="bg-primary mt-1 size-1.5 shrink-0 rounded-full" />
              App sign-in saved on this host
            </li>
            <li className="flex gap-2">
              <span className="bg-primary mt-1 size-1.5 shrink-0 rounded-full" />
              Open the browser — no agent terminal
            </li>
          </ul>
        </div>
        <div className="flex flex-col justify-center gap-2 p-4">
          <div className="border-border/80 bg-muted/40 rounded-lg border px-3 py-2">
            <p className="text-muted-foreground text-[10px]">Models</p>
            <p className="text-foreground/90 text-[12px]">Direct provider</p>
          </div>
          <div className="border-border/80 bg-muted/40 rounded-lg border px-3 py-2">
            <p className="text-muted-foreground text-[10px]">Connections</p>
            <p className="text-foreground/90 text-[12px]">Self-hosted sign-in</p>
          </div>
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2">
            <p className="text-[10px] text-emerald-700 dark:text-emerald-300/80">Access</p>
            <p className="text-[12px] text-emerald-800 dark:text-emerald-100/90">Local / trusted</p>
          </div>
        </div>
      </div>
    </MockChrome>
  );
}
