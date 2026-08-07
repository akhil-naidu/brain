import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Instance",
  description: "Host-wide license and policies for this Brain deployment.",
};

export default function InstanceSettingsLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
