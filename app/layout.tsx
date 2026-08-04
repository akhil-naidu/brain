import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const INITIAL_THEME_SCRIPT =
  'document.documentElement.classList.add(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");document.documentElement.style.colorScheme=document.documentElement.classList.contains("dark")?"dark":"light";';

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
      <head>
        <script>{INITIAL_THEME_SCRIPT}</script>
      </head>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
