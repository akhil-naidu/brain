import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function docsBaseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Brain Docs",
      url: "/docs",
    },
    links: [
      {
        text: "App",
        url: "/chat",
        active: "none",
      },
      {
        text: "Home",
        url: "/",
        active: "none",
      },
    ],
    githubUrl: "https://github.com/akhil-naidu/brain",
  };
}
