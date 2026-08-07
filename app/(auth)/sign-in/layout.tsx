import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Brain on this host.",
};

export default function SignInLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
