import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Setup",
  description: "Create the first operator account on this Brain host.",
};

export default function SetupLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
