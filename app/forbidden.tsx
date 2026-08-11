import type { Metadata } from "next";
import { StatusPage } from "@/components/system/status-page";

export const metadata: Metadata = {
  title: "Forbidden",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Forbidden() {
  return (
    <StatusPage
      actions={[
        { href: "/", label: "Go home" },
        { href: "/chat", label: "Open chat", variant: "outline" },
      ]}
      code="403"
      description="You don’t have access to this resource on this host."
      title="Forbidden"
    />
  );
}
