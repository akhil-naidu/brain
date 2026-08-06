import type { ReactNode } from "react";
import Link from "next/link";
import { BrainMark } from "@/components/brain-mark";

export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="border-border/70 flex items-center gap-2 border-b px-4 py-3">
        <Link className="flex items-center gap-2 text-sm font-medium" href="/">
          <BrainMark className="size-6" />
          Brain
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">{children}</main>
    </div>
  );
}
