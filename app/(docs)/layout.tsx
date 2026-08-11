import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";

/**
 * Docs-only providers. Theme is disabled so Brain's root ThemeProvider /
 * bootstrap script remain the single source of truth for `.light` / `.dark`.
 * Search uses the default Orama dialog against `/api/search`.
 */
export default function DocsRootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <RootProvider search={{ enabled: true }} theme={{ enabled: false }}>
      {children}
    </RootProvider>
  );
}
