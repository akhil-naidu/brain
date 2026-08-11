"use client";

import Script from "next/script";
import { StatusPage } from "@/components/system/status-page";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme/bootstrap";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <Script id="brain-theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
        <ThemeProvider>
          <StatusPage
            actions={[
              { label: "Try again", onClick: reset },
              { href: "/", label: "Go home", variant: "outline" },
            ]}
            code="500"
            description={
              <>
                Brain hit an unexpected error.
                {error.digest ? (
                  <>
                    {" "}
                    <span className="text-muted-foreground/80 font-mono text-xs">
                      Ref {error.digest}
                    </span>
                  </>
                ) : null}
              </>
            }
            title="Something went wrong"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
