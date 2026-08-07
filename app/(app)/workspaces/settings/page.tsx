import type { Metadata } from "next";
import { WorkspaceSettingsPage } from "@/app/_components/workspace-settings-page";

export const metadata: Metadata = {
  title: "Workspace settings",
  description: "Manage who can access this workspace and how they sign in.",
};

export default function Page() {
  return <WorkspaceSettingsPage />;
}
