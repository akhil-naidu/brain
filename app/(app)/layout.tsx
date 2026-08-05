import type { ReactNode } from "react";
import { BrainAppShell } from "@/app/_components/brain-app-shell";

export default function AppLayout({ children }: { readonly children: ReactNode }) {
  return <BrainAppShell>{children}</BrainAppShell>;
}
