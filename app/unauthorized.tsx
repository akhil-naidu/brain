import type { Metadata } from "next";
import { StatusPage } from "@/components/system/status-page";

export const metadata: Metadata = {
  title: "Sign in required",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Unauthorized() {
  return (
    <StatusPage
      actions={[
        { href: "/sign-in", label: "Sign in" },
        { href: "/", label: "Go home", variant: "outline" },
      ]}
      code="401"
      description="Sign in to continue on this host."
      title="Sign in required"
    />
  );
}
