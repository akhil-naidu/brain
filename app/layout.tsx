import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme/bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Brain",
    template: "%s · Brain",
  },
  description: "Self-hosted work assistant with browser chat and MCP connections.",
  applicationName: "Brain",
  icons: {
    icon: [{ url: "/icon.png?v=3", type: "image/png" }],
    shortcut: ["/icon.png?v=3"],
  },
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <Script id="brain-theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
