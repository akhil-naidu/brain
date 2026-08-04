import type { Metadata } from "next";
import { BrainChatShell } from "@/app/_components/brain-chat-shell";

export const metadata: Metadata = {
  title: "Chat",
  description: "Brain agent chat",
};

export default function ChatPage() {
  return <BrainChatShell />;
}
