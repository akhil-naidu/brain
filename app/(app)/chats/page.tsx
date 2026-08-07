import type { Metadata } from "next";
import { ChatsPage } from "@/app/_components/chats-page";

export const metadata: Metadata = {
  title: "All chats",
  description: "Manage chats in the active Brain workspace.",
};

export default function Page() {
  return <ChatsPage />;
}
