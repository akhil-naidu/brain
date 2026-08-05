import type { Metadata } from "next";
import { ChatWorkspace } from "@/app/_components/chat-workspace";

export const metadata: Metadata = {
  title: "Chat",
  description: "Brain agent chat",
};

export default function ChatPage() {
  return <ChatWorkspace />;
}
