import type { Metadata } from "next";
import { StatusPage } from "@/components/system/status-page";

export const metadata: Metadata = {
  title: "Page not found",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <StatusPage
      actions={[
        { href: "/", label: "Go home" },
        { href: "/docs", label: "Open docs", variant: "outline" },
      ]}
      code="404"
      description="That page isn’t on this host. Check the URL, or head back to Brain."
      title="Page not found"
    />
  );
}
