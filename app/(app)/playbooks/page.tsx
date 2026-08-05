import type { Metadata } from "next";
import { PlaybooksPage } from "@/app/_components/playbooks-page";

export const metadata: Metadata = {
  title: "Playbooks",
  description: "Manage saved Brain playbooks.",
};

export default function Page() {
  return <PlaybooksPage />;
}
