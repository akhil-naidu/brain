import type { ReactNode } from "react";
import { Space_Grotesk } from "next/font/google";
import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { docsBaseOptions } from "@/lib/docs/layout.shared";
import { source } from "@/lib/docs/source";
import { cn } from "@/lib/utils";

const docsDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-docs-display",
});

export default function Layout({ children }: { readonly children: ReactNode }) {
  const base = docsBaseOptions();

  return (
    <div className={cn(docsDisplay.variable, "brain-docs")}>
      <DocsLayout
        {...base}
        nav={{
          ...base.nav,
          mode: "top",
        }}
        tree={source.getPageTree()}
        tabMode="navbar"
        sidebar={{
          defaultOpenLevel: 1,
        }}
      >
        {children}
      </DocsLayout>
    </div>
  );
}
