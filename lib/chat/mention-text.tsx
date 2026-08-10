"use client";

import type { ReactNode } from "react";
import { MessageMentionBadge } from "@/components/chat/message-mention-badge";

const MENTION_SPLIT = /(@(?:project|playbook|schedule)\s+[^\s@]+|@[A-Za-z][\w.+-]*)/g;

const MENTION_EXACT = /^(?:@(?:project|playbook|schedule)\s+[^\s@]+|@[A-Za-z][\w.+-]*)$/;

/** Render plain text with @mention tokens as inline badges (Cursor-style). */
export function renderTextWithMentionBadges(text: string): ReactNode {
  if (!text) {
    return null;
  }
  const parts = text.split(MENTION_SPLIT);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const part of parts) {
    if (!part) {
      continue;
    }
    const key = `${cursor}:${part}`;
    cursor += part.length;
    if (MENTION_EXACT.test(part)) {
      nodes.push(<MessageMentionBadge key={key} token={part} />);
      continue;
    }
    nodes.push(<span key={key}>{part}</span>);
  }
  return nodes;
}
