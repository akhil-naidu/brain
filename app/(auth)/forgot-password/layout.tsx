import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a Brain password reset link for this host.",
};

export default function ForgotPasswordLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
