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
        "text-foreground relative min-h-dvh overflow-x-hidden bg-[oklch(0.16_0.03_240)] text-[oklch(0.96_0.01_230)]",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_10%_-10%,oklch(0.45_0.1_230_/0.55),transparent_55%),radial-gradient(90%_70%_at_90%_10%,oklch(0.38_0.08_200_/0.45),transparent_50%),linear-gradient(180deg,oklch(0.18_0.035_240),oklch(0.12_0.02_240)_45%,oklch(0.14_0.025_220))]"
      />
      <div
        aria-hidden="true"
        className="features-grid pointer-events-none absolute inset-0 opacity-[0.18]"
      />

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
            src="/brain-mark.png?v=3"
            unoptimized
            width={64}
          />
          Brain
        </Link>
        <Link
          className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/90 backdrop-blur transition hover:bg-white/10"
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
              className="size-28 object-contain drop-shadow-[0_20px_60px_oklch(0.5_0.12_230_/0.45)] sm:size-36"
              height={256}
              priority
              src="/brain-mark.png?v=3"
              unoptimized
              width={256}
            />
          </div>
          <h1 className="features-fade-up font-[family-name:var(--font-features-display)] text-4xl font-semibold tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
            Brain
          </h1>
          <p className="features-fade-up features-delay-1 mt-3 max-w-2xl font-[family-name:var(--font-features-display)] text-2xl font-medium tracking-tight text-balance text-white/90 sm:text-3xl">
            Your self-hosted work assistant in the browser.
          </p>
          <p className="features-fade-up features-delay-2 mt-4 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            Chat, connect your work apps, pick a model, and keep history on your machine.
          </p>
          <div className="features-fade-up features-delay-3 mt-8 flex flex-wrap items-center gap-3">
            <Link
              className="rounded-full bg-[oklch(0.72_0.09_230)] px-5 py-2.5 text-sm font-semibold text-[oklch(0.16_0.03_240)] transition hover:bg-[oklch(0.78_0.08_230)]"
              href="/chat"
            >
              Open chat
            </Link>
            <a
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/30 hover:text-white"
              href="#chat"
            >
              See how it works
            </a>
          </div>
        </section>

        <section
          aria-label="Connected apps"
          className="border-y border-white/10 bg-black/20 py-10 backdrop-blur-sm"
          id="apps"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-5 sm:px-8">
            <p className="text-xs font-medium tracking-[0.18em] text-white/45 uppercase">
              Works with
            </p>
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {CONNECTION_MARKS.map(({ Icon, id, label }) => (
                <li className="flex items-center gap-2.5 text-sm text-white/80" key={id}>
                  <span className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
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
                  sceneIndex > 0 && "border-t border-white/10",
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
                    <p className="text-xs font-medium tracking-[0.18em] text-white/40 uppercase">
                      {String(sceneIndex + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-3 font-[family-name:var(--font-features-display)] text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                      {scene.title}
                    </h2>
                    <p className="mt-3 text-base leading-relaxed text-white/60">{scene.summary}</p>
                    <ul className="mt-6 space-y-2.5">
                      {scene.points.map((point) => (
                        <li
                          className="flex gap-2.5 text-sm leading-relaxed text-white/70"
                          key={point}
                        >
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[oklch(0.72_0.09_230)]" />
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

        <section className="border-t border-white/10 bg-black/25 px-5 py-16 sm:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="font-[family-name:var(--font-features-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready when you are.
              </h2>
              <p className="mt-3 text-white/60">
                Open chat, connect an app, and ask Brain about your work.
              </p>
            </div>
            <Link
              className="rounded-full bg-[oklch(0.72_0.09_230)] px-5 py-2.5 text-sm font-semibold text-[oklch(0.16_0.03_240)] transition hover:bg-[oklch(0.78_0.08_230)]"
              href="/chat"
            >
              Open chat
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-5xl px-5 py-8 text-xs text-white/35 sm:px-8">
        Brain · self-hosted work assistant · local/trusted use
      </footer>
    </div>
  );
}
