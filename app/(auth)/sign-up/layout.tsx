import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Brain account on this host when open signup is allowed.",
};

export default function SignUpLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
