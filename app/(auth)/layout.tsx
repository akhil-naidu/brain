import type { ReactNode } from "react";
import { AuthStage } from "@/components/auth/auth-shell";

export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return <AuthStage>{children}</AuthStage>;
}
