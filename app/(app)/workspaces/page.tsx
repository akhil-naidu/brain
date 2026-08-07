import type { Metadata } from "next";
import { WorkspacesPage } from "@/app/_components/workspaces-page";

export const metadata: Metadata = {
  title: "Workspaces",
  description: "Manage and switch Brain workspaces.",
};

export default function Page() {
  return <WorkspacesPage />;
}
