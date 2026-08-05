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
import { BRAIN_MARK_SRC } from "@/components/brain-mark";
import { HOME_TOUR_SCENES } from "@/lib/features/catalog";
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
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
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
          Brain
        </Link>
        <Link
          className="border-border/80 bg-card/70 text-foreground hover:bg-muted/80 rounded-full border px-3.5 py-1.5 text-sm backdrop-blur transition"
          href="/chat"
        >
          Open chat
        </Link>
      </header>

      <main className="relative z-10">
        <section className="mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-5xl flex-col justify-center px-5 pt-6 pb-20 sm:px-8">
          <div className="features-hero-mark mb-8">
            <Image
              alt=""
              aria-hidden="true"
              className="features-hero-glow size-28 object-contain sm:size-36"
              height={256}
              priority
              src={BRAIN_MARK_SRC}
              unoptimized
              width={256}
            />
          </div>
          <h1 className="features-fade-up font-[family-name:var(--font-features-display)] text-4xl font-semibold tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
            Brain
          </h1>
          <p className="features-fade-up features-delay-1 text-foreground/90 mt-3 max-w-2xl font-[family-name:var(--font-features-display)] text-2xl font-medium tracking-tight text-balance sm:text-3xl">
            Your self-hosted work assistant in the browser.
          </p>
          <p className="features-fade-up features-delay-2 text-muted-foreground mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
            Chat, connect your work apps, pick a model, and keep history on your machine.
          </p>
          <div className="features-fade-up features-delay-3 mt-8 flex flex-wrap items-center gap-3">
            <Link
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 py-2.5 text-sm font-semibold transition"
              href="/chat"
            >
              Open chat
            </Link>
            <a
              className="border-border text-foreground/80 hover:border-foreground/30 hover:text-foreground rounded-full border px-5 py-2.5 text-sm transition"
              href="#chat"
            >
              See how it works
            </a>
          </div>
        </section>

        <section
          aria-label="Connected apps"
          className="border-border/70 bg-muted/35 border-y py-10 backdrop-blur-sm"
          id="apps"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 sm:px-8">
            <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
              Works with
            </p>
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {CONNECTION_MARKS.map(({ Icon, id, label }) => (
                <li className="text-foreground/85 flex items-center gap-2.5 text-sm" key={id}>
                  <span className="border-border/80 bg-card flex size-9 items-center justify-center rounded-lg border">
                    <Icon className="size-5" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
          {HOME_TOUR_SCENES.map((scene, sceneIndex) => {
            const reverse = sceneIndex % 2 === 1;
            return (
              <section
                className={cn(
                  "features-section py-14 sm:py-16",
                  sceneIndex > 0 && "border-border/70 border-t",
                )}
                id={scene.id}
                key={scene.id}
              >
                <div
                  className={cn(
                    "grid items-center gap-10 lg:grid-cols-2 lg:gap-14",
                    reverse && "lg:[&>*:first-child]:order-2",
                  )}
                >
                  <div className="max-w-xl">
                    <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                      {String(sceneIndex + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-3 font-[family-name:var(--font-features-display)] text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                      {scene.title}
                    </h2>
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

        <section className="border-border/70 bg-muted/40 border-t px-5 py-16 sm:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="font-[family-name:var(--font-features-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready when you are.
              </h2>
              <p className="text-muted-foreground mt-3">
                Open chat, connect an app, and ask Brain about your work.
              </p>
            </div>
            <Link
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 py-2.5 text-sm font-semibold transition"
              href="/chat"
            >
              Open chat
            </Link>
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground relative z-10 mx-auto w-full max-w-5xl px-5 py-8 text-xs sm:px-8">
        Brain · self-hosted work assistant · local/trusted use
      </footer>
    </div>
  );
}
