import type { Metadata } from "next";
import { ChatWorkspace } from "@/app/_components/chat-workspace";

export const metadata: Metadata = {
  title: "Chat",
  description: "Chat with Brain on this host.",
};

export default function ChatPage() {
  return <ChatWorkspace />;
}
