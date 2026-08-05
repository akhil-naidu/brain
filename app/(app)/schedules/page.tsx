import type { Metadata } from "next";
import { SchedulesPage } from "@/app/_components/schedules-page";

export const metadata: Metadata = {
  title: "Schedules",
  description: "Manage Brain morning brief and playbook timers.",
};

export default function Page() {
  return <SchedulesPage />;
}
