import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Invite",
  description: "Accept a Brain workspace invite on this host.",
};

export default function InviteLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
