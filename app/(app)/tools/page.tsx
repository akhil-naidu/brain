import type { Metadata } from "next";
import { ToolsPage } from "@/app/_components/tools-page";

export const metadata: Metadata = {
  title: "Tools",
  description: "Connect MCP apps and manage which tools Brain can use in chat.",
};

export default function Page() {
  return <ToolsPage />;
}
