import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { docsBaseOptions } from "@/lib/docs/layout.shared";
import { source } from "@/lib/docs/source";

export default function Layout({ children }: { readonly children: ReactNode }) {
  return (
    <DocsLayout {...docsBaseOptions()} tree={source.getPageTree()}>
      {children}
    </DocsLayout>
  );
}
