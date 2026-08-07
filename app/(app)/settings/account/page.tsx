import type { Metadata } from "next";
import { AccountSettingsPage } from "@/app/_components/account-settings-page";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Brain profile, password, and sessions.",
};

export default function Page() {
  return <AccountSettingsPage />;
}
