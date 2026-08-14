"use client";

import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import { BrainMark } from "@/components/brain-mark";
import { ClickUpIcon, GmailIcon, SlackIcon } from "@/components/icons";
import { type HomeChatDemoToolApp } from "@/lib/features/catalog";
import { cn } from "@/lib/utils";
import {
  buildHomeChatDemoBeats,
  homeChatDemoPosterMessages,
  type HomeChatDemoMessage,
  type HomeChatDemoPhase,
} from "@/lib/features/home-chat-demo";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const TOOL_ICONS: Record<HomeChatDemoToolApp, ComponentType<{ readonly className?: string }>> = {
  ClickUp: ClickUpIcon,
  Slack: SlackIcon,
  Gmail: GmailIcon,
};

function ToolGlyph({ app }: { readonly app: HomeChatDemoToolApp }) {
  const Icon = TOOL_ICONS[app];
  return <Icon className="size-3.5" />;
}

function DemoMessage({ message }: { readonly message: HomeChatDemoMessage }) {
  if (message.kind === "user") {
    return (
      <div className="features-chat-demo-message bg-muted text-foreground ml-auto max-w-[88%] rounded-2xl rounded-br-md px-3 py-2 text-[13px] leading-relaxed">
        {message.text}
      </div>
    );
  }
  if (message.kind === "tool") {
    return (
      <div className="features-chat-demo-message border-border/70 bg-background flex max-w-[92%] items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[11px]">
        <ToolGlyph app={message.app} />
        <span className="text-foreground/85">
          {message.app} · {message.action}
        </span>
        <span className="ml-auto text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          {message.status === "running" ? "Running" : "Done"}
        </span>
      </div>
    );
  }
  return (
    <div className="features-chat-demo-message flex max-w-[94%] gap-2">
      <span className="border-border/70 bg-background mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border">
        <BrainMark className="size-3.5" />
      </span>
      <div className="border-border/70 bg-background text-foreground/90 rounded-2xl rounded-bl-md border px-3 py-2 text-[13px] leading-relaxed">
        {message.text}
        {message.streaming ? (
          <span className="features-mock-cursor bg-primary ml-0.5 inline-block h-3 w-1.5 align-middle" />
        ) : null}
      </div>
    </div>
  );
}

export function HomeChatDemo() {
  const poster = homeChatDemoPosterMessages();
  const [messages, setMessages] = useState<readonly HomeChatDemoMessage[]>(poster);
  const [composer, setComposer] = useState("");
  const [phase, setPhase] = useState<HomeChatDemoPhase>("done");
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inViewRef = useRef(false);

  inViewRef.current = inView;

  useEffect(() => {
    const node = rootRef.current;
    if (!node) {
      return undefined;
    }
    if (typeof IntersectionObserver !== "function") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry?.isIntersecting === true);
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      return undefined;
    }
    const beats = buildHomeChatDemoBeats();
    let cancelled = false;
    let timeoutId = 0;
    let beatIndex = 0;
    let heldPoster = false;

    const playNext = () => {
      if (cancelled) {
        return;
      }
      if (!inViewRef.current) {
        timeoutId = window.setTimeout(playNext, 40);
        return;
      }
      if (!heldPoster) {
        heldPoster = true;
        timeoutId = window.setTimeout(playNext, 1400);
        return;
      }
      const beat = beats[beatIndex];
      if (!beat) {
        return;
      }
      setMessages(beat.messages);
      setComposer(beat.composer);
      setPhase(beat.phase);
      beatIndex = (beatIndex + 1) % beats.length;
      timeoutId = window.setTimeout(playNext, beat.delayMs);
    };

    timeoutId = window.setTimeout(playNext, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="features-mock-stage features-chat-demo-stage" ref={rootRef}>
      <p className="sr-only">
        Example conversation: sprint blockers in ClickUp, a Slack nudge that waits for approval,
        then unread Gmail.
      </p>
      <div
        aria-hidden="true"
        className="features-chat-demo-player border-border/80 bg-card overflow-hidden rounded-2xl border"
      >
        <div className="border-border/60 bg-muted/30 flex items-center gap-2 border-b px-3.5 py-2.5">
          <span className="bg-muted-foreground/25 size-2 rounded-full" />
          <span className="bg-muted-foreground/25 size-2 rounded-full" />
          <span className="bg-muted-foreground/25 size-2 rounded-full" />
          <span className="text-muted-foreground ml-2 truncate text-[11px]">Brain</span>
        </div>
        <div className="flex h-88 flex-col sm:h-96">
          <div className="min-h-0 flex-1 overflow-y-auto" ref={scrollerRef}>
            <div className="flex min-h-full flex-col justify-end gap-3 p-4">
              {messages.map((message) => (
                <DemoMessage key={message.id} message={message} />
              ))}
            </div>
          </div>
          <div className="border-border/60 border-t p-3">
            <div className="border-border/80 bg-muted/50 flex items-center gap-2 rounded-xl border px-3 py-2">
              <span className="text-muted-foreground min-h-[1.1rem] flex-1 text-[12px]">
                {composer || "Ask Brain anything…"}
                {phase === "typing" ? (
                  <span className="features-mock-cursor bg-primary ml-0.5 inline-block h-3 w-1.5 align-middle" />
                ) : null}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-[10px] font-bold",
                  phase === "typing" && composer.length > 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/25 text-muted-foreground",
                )}
              >
                ↑
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
