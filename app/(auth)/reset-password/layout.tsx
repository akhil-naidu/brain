import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Brain account on this host.",
};

export default function ResetPasswordLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
