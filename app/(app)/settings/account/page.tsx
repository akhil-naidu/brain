import type { Metadata } from "next";
import { AccountSessionsPage } from "@/app/_components/account-sessions-page";

export const metadata: Metadata = {
  title: "Sessions",
  description: "Manage signed-in devices and revoke Brain sessions.",
};

export default function Page() {
  return <AccountSessionsPage />;
}
