import type { Metadata } from "next";
import { FeaturesShowcase } from "@/components/features/features-showcase";

export const metadata: Metadata = {
  title: {
    absolute: "Brain",
  },
  description:
    "Self-hosted work assistant: browser chat, MCP connections, model picker, and local history.",
};

export default function Page() {
  return <FeaturesShowcase />;
}
