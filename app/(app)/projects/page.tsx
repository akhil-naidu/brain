import type { Metadata } from "next";
import { ProjectsPage } from "@/app/_components/projects-page";

export const metadata: Metadata = {
  title: "Projects",
  description: "Organize chats into projects in the active Brain workspace.",
};

export default function Page() {
  return <ProjectsPage />;
}
