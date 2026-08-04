import type { Metadata } from "next";
import { FeaturesShowcase } from "@/components/features/features-showcase";

export const metadata: Metadata = {
  title: "Features · Brain",
  description:
    "Explore Brain’s browser chat, MCP connections, model picker, shortcuts, and self-hosted runtime.",
};

export default function FeaturesPage() {
  return <FeaturesShowcase />;
}
