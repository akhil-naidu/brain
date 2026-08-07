import type { ReactNode } from "react";
import Link from "next/link";
import { BrainMark } from "@/components/brain-mark";

export default function AuthLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="bg-background text-foreground relative flex min-h-dvh flex-col">
      <div aria-hidden className="brain-ambient-shade" />
      <header className="border-border/70 relative z-10 flex items-center gap-2 border-b px-4 py-3">
        <Link className="flex items-center gap-2 text-sm font-medium" href="/">
          <BrainMark className="size-6" />
          Brain
        </Link>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
