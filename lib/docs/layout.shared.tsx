import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BrainDocsTitle } from "@/components/docs/brain-docs-title";
import { BrainDocsThemeSwitch } from "@/components/docs/brain-docs-theme-switch";

export function docsBaseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: BrainDocsTitle,
      url: "/docs",
    },
    links: [
      {
        type: "button",
        text: "Open chat",
        url: "/chat",
        active: "none",
        on: "nav",
      },
      {
        text: "Architecture",
        url: "/docs/self-hosting/architecture",
        active: "none",
        on: "nav",
      },
      {
        text: "Home",
        url: "/",
        active: "none",
        on: "nav",
      },
    ],
    githubUrl: "https://github.com/akhil-naidu/brain",
    searchToggle: {
      enabled: true,
    },
    themeSwitch: {
      enabled: true,
      mode: "light-dark",
    },
    slots: {
      themeSwitch: BrainDocsThemeSwitch,
    },
  };
}
