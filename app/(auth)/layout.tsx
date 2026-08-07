import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthStage } from "@/components/auth/auth-shell";

/** Auth flows are host-local and should not be indexed. */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return <AuthStage>{children}</AuthStage>;
}
