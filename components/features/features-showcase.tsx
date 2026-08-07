import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Space_Grotesk } from "next/font/google";
import {
  AsanaIcon,
  ClickUpIcon,
  DflowIcon,
  GitHubIcon,
  GmailIcon,
  SlackIcon,
} from "@/components/icons";
import {
  ChatTourMock,
  ConnectionsTourMock,
  ModelsTourMock,
  RuntimeTourMock,
} from "@/components/features/tour-mocks";
import { BetaBadge } from "@/components/brand/beta-badge";
import { BRAIN_MARK_SRC } from "@/components/brain-mark";
import { HOME_CAPABILITIES, HOME_TOUR_SCENES } from "@/lib/features/catalog";
import { SITE_VERSION } from "@/lib/seo/site";
import { cn } from "@/lib/utils";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-features-display",
});

const CONNECTION_MARKS = [
  { id: "clickup", label: "ClickUp", Icon: ClickUpIcon },
  { id: "slack", label: "Slack", Icon: SlackIcon },
  { id: "asana", label: "Asana", Icon: AsanaIcon },
  { id: "gmail", label: "Gmail", Icon: GmailIcon },
  { id: "dflow", label: "dFlow", Icon: DflowIcon },
  { id: "github", label: "GitHub", Icon: GitHubIcon },
] as const;

const SCENE_MOCKS: Record<(typeof HOME_TOUR_SCENES)[number]["id"], ReactNode> = {
  chat: <ChatTourMock />,
  connections: <ConnectionsTourMock />,
  models: <ModelsTourMock />,
  runtime: <RuntimeTourMock />,
};

export function FeaturesShowcase() {
  return (
    <div
      className={cn(
        display.variable,
        "bg-background text-foreground relative min-h-dvh overflow-x-hidden",
      )}
    >
      <div aria-hidden className="brain-home-atmosphere">
        <div className="brain-ambient-shade" />
        <div className="brain-home-grid" />
        <div className="brain-home-hero-plane" />
      </div>

      <header className="border-border/40 bg-background/70 supports-[backdrop-filter]:bg-background/55 relative z-20 border-b backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            className="flex items-center gap-2.5 font-[family-name:var(--font-features-display)] text-lg font-semibold tracking-tight"
            href="/"
          >
            <Image
              alt=""
              aria-hidden="true"
              className="size-8 object-contain"
              height={64}
              src={BRAIN_MARK_SRC}
              unoptimized
              width={64}
            />
            <span className="inline-flex items-center gap-2">
              Brain
              <BetaBadge />
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a
              className="text-muted-foreground hover:text-foreground hidden rounded-full px-3 py-1.5 text-sm transition sm:inline-flex"
              href="#how"
            >
              How it works
            </a>
            <Link
              className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-sm transition"
              href="/sign-in"
            >
              Sign in
            </Link>
            <Link
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-3.5 py-1.5 text-sm font-semibold transition"
              href="/chat"
            >
              Open chat
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="relative mx-auto flex min-h-[calc(100dvh-4.25rem)] w-full max-w-5xl flex-col justify-center px-5 pt-10 pb-16 sm:px-8 sm:pt-14 sm:pb-20">
          <div className="features-hero-mark mb-7 sm:mb-9">
            <Image
              alt=""
              aria-hidden="true"
              className="features-hero-glow size-24 object-contain sm:size-32"
              height={256}
              priority
              src={BRAIN_MARK_SRC}
              unoptimized
              width={256}
            />
          </div>
          <h1 className="features-fade-up font-[family-name:var(--font-features-display)] text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-7xl sm:leading-[0.95]">
            Brain
            <span className="ml-3 inline-flex align-middle sm:ml-4">
              <BetaBadge className="translate-y-0.5 sm:translate-y-1" size="md" />
            </span>
          </h1>
          <p className="features-fade-up features-delay-1 text-foreground/90 mt-5 max-w-2xl font-[family-name:var(--font-features-display)] text-xl font-medium tracking-tight text-balance sm:text-2xl">
            Your self-hosted work assistant in the browser.
          </p>
          <p className="features-fade-up features-delay-2 text-muted-foreground mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
            Chat with models you control, connect MCP apps, and keep history on your host — not
            locked to someone else’s cloud.
          </p>
          <div className="features-fade-up features-delay-3 mt-9 flex flex-wrap items-center gap-3">
            <Link
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 py-2.5 text-sm font-semibold transition"
              href="/chat"
            >
              Open chat
            </Link>
            <a
              className="border-border/80 bg-background/50 text-foreground/85 hover:border-foreground/25 hover:text-foreground rounded-full border px-5 py-2.5 text-sm backdrop-blur transition"
              href="#how"
            >
              See how it works
            </a>
          </div>
        </section>

        <section
          aria-label="Connected apps"
          className="border-border/60 bg-background/40 relative border-y py-12 backdrop-blur-sm"
          id="apps"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                Works with
              </p>
              <p className="text-foreground/90 mt-2 font-[family-name:var(--font-features-display)] text-lg font-medium tracking-tight">
                Official MCP connections — set up once, then Connect from chat or Tools.
              </p>
            </div>
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {CONNECTION_MARKS.map(({ Icon, id, label }) => (
                <li className="text-foreground/85 flex items-center gap-2.5 text-sm" key={id}>
                  <span className="border-border/70 bg-background/70 flex size-10 items-center justify-center rounded-xl border backdrop-blur-sm">
                    <Icon className="size-5" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="relative mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-20" id="how">
          <div className="mb-12 max-w-2xl sm:mb-16">
            <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
              How it works
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-features-display)] text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              From empty host to useful chat.
            </h2>
            <p className="text-muted-foreground mt-3 text-base leading-relaxed sm:text-lg">
              Sign in, connect the apps you use, pick a model, and ask about the work in front of
              you — with approvals when something risky would run.
            </p>
          </div>

          {HOME_TOUR_SCENES.map((scene, sceneIndex) => {
            const reverse = sceneIndex % 2 === 1;
            return (
              <section
                className={cn(
                  "features-section py-12 sm:py-16",
                  sceneIndex > 0 && "border-border/60 border-t",
                )}
                id={scene.id}
                key={scene.id}
              >
                <div
                  className={cn(
                    "grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
                    reverse && "lg:[&>*:first-child]:order-2",
                  )}
                >
                  <div className="max-w-xl">
                    <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                      {String(sceneIndex + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 font-[family-name:var(--font-features-display)] text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                      {scene.title}
                    </h3>
                    <p className="text-muted-foreground mt-3 text-base leading-relaxed">
                      {scene.summary}
                    </p>
                    <ul className="mt-6 space-y-2.5">
                      {scene.points.map((point) => (
                        <li
                          className="text-foreground/80 flex gap-2.5 text-sm leading-relaxed"
                          key={point}
                        >
                          <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="features-mock-stage min-w-0">{SCENE_MOCKS[scene.id]}</div>
                </div>
              </section>
            );
          })}
        </div>

        <section
          aria-labelledby="home-also-heading"
          className="border-border/60 bg-muted/30 relative border-y py-16 backdrop-blur-sm"
          id="also"
        >
          <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                On this host
              </p>
              <h2
                className="mt-3 font-[family-name:var(--font-features-display)] text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
                id="home-also-heading"
              >
                More than a chat window.
              </h2>
              <p className="text-muted-foreground mt-3 text-base leading-relaxed">
                Brain also covers the everyday surfaces of a team assistant — spaces, tools,
                routines, and host policy.
              </p>
            </div>
            <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {HOME_CAPABILITIES.map((item, index) => (
                <li className="features-section border-border/50 border-t pt-5" key={item.id}>
                  <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-foreground mt-2 font-[family-name:var(--font-features-display)] text-lg font-semibold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="relative px-5 py-20 sm:px-8">
          <div aria-hidden className="brain-ambient-shade opacity-80" />
          <div className="relative mx-auto flex w-full max-w-5xl flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="font-[family-name:var(--font-features-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready when you are.
              </h2>
              <p className="text-muted-foreground mt-3 text-base leading-relaxed">
                Create the operator account on first boot, sign in, connect an app, and ask Brain
                about your work.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 py-2.5 text-sm font-semibold transition"
                href="/chat"
              >
                Open chat
              </Link>
              <Link
                className="border-border/80 bg-background/60 text-foreground/85 hover:text-foreground rounded-full border px-5 py-2.5 text-sm backdrop-blur transition"
                href="/sign-in"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-border/50 text-muted-foreground relative z-10 border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 py-8 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Brain · Beta · v{SITE_VERSION} · self-hosted work assistant</p>
          <p className="sm:text-right">Chats, MCP tools, and policy stay on your host.</p>
        </div>
      </footer>
    </div>
  );
}
