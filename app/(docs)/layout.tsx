import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";

/**
 * Docs-only providers. Theme is disabled so Brain's root ThemeProvider remains
 * the single source of truth for light/dark.
 */
export default function DocsRootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <RootProvider search={{ enabled: false }} theme={{ enabled: false }}>
      {children}
    </RootProvider>
  );
}
