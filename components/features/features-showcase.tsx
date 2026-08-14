import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { Space_Grotesk } from "next/font/google";
import {
  AsanaIcon,
  AtlassianIcon,
  ClickUpIcon,
  DflowIcon,
  GitHubIcon,
  GmailIcon,
  LinearIcon,
  MongoDbIcon,
  NotionIcon,
  SentryIcon,
  SlackIcon,
  SnowflakeIcon,
  ToolboxIcon,
  ZernioIcon,
} from "@/components/icons";
import {
  ChatTourMock,
  ConnectionsTourMock,
  ModelsTourMock,
  RuntimeTourMock,
} from "@/components/features/tour-mocks";
import { ArchitectureDiagramFrame } from "@/components/architecture-diagram";
import { BetaBadge } from "@/components/brand/beta-badge";
import { BRAIN_MARK_SRC } from "@/components/brain-mark";
import {
  HOME_ARCHITECTURE_PLANES,
  HOME_CAPABILITIES,
  HOME_CONNECTION_APPS,
  HOME_FOOTER_GROUPS,
  HOME_TOUR_SCENES,
} from "@/lib/features/catalog";
import {
  SITE_COPYRIGHT_HOLDER,
  SITE_COPYRIGHT_YEAR,
  SITE_LICENSE_HREF,
  SITE_LICENSE_NAME,
  SITE_VERSION,
} from "@/lib/seo/site";
import { cn } from "@/lib/utils";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-features-display",
});

const CONNECTION_ICONS: Record<
  (typeof HOME_CONNECTION_APPS)[number]["id"],
  ComponentType<{ readonly className?: string }>
> = {
  clickup: ClickUpIcon,
  slack: SlackIcon,
  asana: AsanaIcon,
  gmail: GmailIcon,
  notion: NotionIcon,
  linear: LinearIcon,
  atlassian: AtlassianIcon,
  zernio: ZernioIcon,
  sentry: SentryIcon,
  dflow: DflowIcon,
  github: GitHubIcon,
  snowflake: SnowflakeIcon,
  mongodb: MongoDbIcon,
  toolbox: ToolboxIcon,
};

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
            <a
              className="text-muted-foreground hover:text-foreground hidden rounded-full px-3 py-1.5 text-sm transition sm:inline-flex"
              href="#architecture"
            >
              Architecture
            </a>
            <Link
              className="text-muted-foreground hover:text-foreground hidden rounded-full px-3 py-1.5 text-sm transition sm:inline-flex"
              href="/docs"
            >
              Docs
            </Link>
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
              loading="eager"
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
            A private client for your team: chat on your host, call live work apps through MCP, and
            pick Command Code or your own model — including Azure AI Foundry. Not a public AI
            website, and not a RAG copy of Slack.
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
                Official MCP connections — live tools, not a copied index. Set up once, then Connect
                from chat or Tools.
              </p>
            </div>
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {HOME_CONNECTION_APPS.map(({ id, label }) => {
                const Icon = CONNECTION_ICONS[id];
                return (
                  <li className="text-foreground/85 flex items-center gap-2.5 text-sm" key={id}>
                    <span className="border-border/70 bg-background/70 flex size-10 items-center justify-center rounded-xl border backdrop-blur-sm">
                      <Icon className="size-5" />
                    </span>
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="home-architecture-heading"
          className="relative mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 sm:py-20"
          id="architecture"
        >
          <div className="max-w-2xl">
            <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
              Architecture
            </p>
            <h2
              className="mt-3 font-[family-name:var(--font-features-display)] text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
              id="home-architecture-heading"
            >
              Private client. Live tools. Your models.
            </h2>
            <p className="text-muted-foreground mt-3 text-base leading-relaxed sm:text-lg">
              The browser talks only to Brain. Brain stores its own product data, calls the model
              endpoint you choose, and reads or writes work systems through MCP — with approval on
              writes.
            </p>
          </div>
          <ArchitectureDiagramFrame className="features-section mt-10" />
          <ul className="mt-10 grid gap-8 sm:grid-cols-3">
            {HOME_ARCHITECTURE_PLANES.map((plane, index) => (
              <li className="features-section" key={plane.id}>
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="text-foreground mt-2 font-[family-name:var(--font-features-display)] text-lg font-semibold tracking-tight">
                  {plane.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{plane.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8">
            <Link
              className="text-foreground/85 hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
              href="/docs/self-hosting/architecture"
            >
              Read the architecture →
            </Link>
          </p>
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
              you. Brain reads live systems — it does not copy them into a search index — and asks
              for approval when something risky would run.
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
                routines, approvals, and host policy.
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
                about your work. Docs cover architecture, self-hosting, and environment setup.
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
                href="/docs"
              >
                Open docs
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-border/50 text-muted-foreground relative z-10 border-t">
        <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="max-w-xs">
              <Link
                className="text-foreground inline-flex items-center gap-2.5 font-[family-name:var(--font-features-display)] text-sm font-semibold tracking-tight"
                href="/"
              >
                <Image
                  alt=""
                  aria-hidden="true"
                  className="size-7 object-contain"
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
              <p className="mt-3 text-sm leading-relaxed">
                Private client. Live tools. Models you choose — including Azure AI Foundry.
              </p>
            </div>
            {HOME_FOOTER_GROUPS.map((group) => (
              <div key={group.id}>
                <p className="text-foreground/80 text-[11px] font-medium tracking-[0.16em] uppercase">
                  {group.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {group.links.map((item) => (
                    <li key={`${group.id}:${item.href}`}>
                      {item.external ? (
                        <a
                          className="hover:text-foreground text-sm transition"
                          href={item.href}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {item.label}
                        </a>
                      ) : item.href.startsWith("#") ? (
                        <a className="hover:text-foreground text-sm transition" href={item.href}>
                          {item.label}
                        </a>
                      ) : (
                        <Link className="hover:text-foreground text-sm transition" href={item.href}>
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-border/50 mt-10 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {SITE_COPYRIGHT_YEAR} {SITE_COPYRIGHT_HOLDER}
              {" · "}
              <a
                className="hover:text-foreground underline-offset-2 transition hover:underline"
                href={SITE_LICENSE_HREF}
                rel="noreferrer"
                target="_blank"
              >
                {SITE_LICENSE_NAME}
              </a>
              {" · Beta · v"}
              {SITE_VERSION}
            </p>
            <p>History, MCP tokens, and policy stay on your Postgres.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
