"use client";

import { useEffect, useState } from "react";

import { Markdown } from "@/components/chat/markdown";

const STREAM_TEXT_TICK_MS = 60;
const STREAM_TEXT_CACHE_LIMIT = 40;
const streamingTextCache = new Map<string, string>();

export function UserTextPart({ text }: { readonly text: string }) {
  return <div className="break-words whitespace-pre-wrap">{text}</div>;
}

export function AssistantTextPart({
  showCaret,
  streamKey,
  text,
}: {
  readonly showCaret: boolean;
  readonly streamKey: string;
  readonly text: string;
}) {
  const smoothedText = useStreamingText(text, showCaret, streamKey);
  const isRevealActive = smoothedText.length > 0 && (showCaret || smoothedText !== text);

  return (
    <Markdown
      animated={isRevealActive ? { duration: 0, stagger: 0 } : undefined}
      caret={showCaret && smoothedText.length > 0 ? "block" : undefined}
      isAnimating={isRevealActive}
    >
      {smoothedText}
    </Markdown>
  );
}

function useStreamingText(text: string, isStreaming: boolean, streamKey: string): string {
  const [visibleText, setVisibleText] = useState(() =>
    getInitialStreamingText(text, isStreaming, streamKey),
  );

  useEffect(() => {
    if (!text.startsWith(visibleText) || (!isStreaming && visibleText === "")) {
      rememberStreamingText(streamKey, text);
      setVisibleText(text);
      return undefined;
    }
    if (visibleText === text) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const next = nextStreamingText(visibleText, text, !isStreaming);
      rememberStreamingText(streamKey, next);
      setVisibleText(next);
    }, STREAM_TEXT_TICK_MS);

    return () => window.clearTimeout(timer);
  }, [isStreaming, streamKey, text, visibleText]);

  useEffect(() => {
    if (!isStreaming && visibleText === text) {
      streamingTextCache.delete(streamKey);
    }
  }, [isStreaming, streamKey, text, visibleText]);

  return visibleText;
}

function getInitialStreamingText(text: string, isStreaming: boolean, streamKey: string): string {
  const cachedText = streamingTextCache.get(streamKey);
  if (cachedText && text.startsWith(cachedText)) {
    return cachedText;
  }
  return isStreaming ? "" : text;
}

function rememberStreamingText(streamKey: string, text: string): void {
  if (!text) {
    return;
  }

  streamingTextCache.delete(streamKey);
  streamingTextCache.set(streamKey, text);
  if (streamingTextCache.size <= STREAM_TEXT_CACHE_LIMIT) {
    return;
  }

  const oldestKey = streamingTextCache.keys().next().value;
  if (oldestKey !== undefined) {
    streamingTextCache.delete(oldestKey);
  }
}

function nextStreamingText(current: string, target: string, catchUp: boolean): string {
  if (current === target) {
    return current;
  }
  if (!target.startsWith(current)) {
    return target;
  }

  const remaining = target.length - current.length;
  const step = catchUp
    ? remaining > 160
      ? 18
      : remaining > 80
        ? 12
        : remaining > 32
          ? 7
          : remaining > 12
            ? 4
            : 2
    : remaining > 160
      ? 6
      : remaining > 80
        ? 5
        : remaining > 32
          ? 3
          : remaining > 12
            ? 2
            : 1;

  return target.slice(0, current.length + Math.min(remaining, step));
}
