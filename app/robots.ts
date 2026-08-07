import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site";

/**
 * Public marketing home may be crawled. Auth, app chrome, and APIs stay private —
 * important for self-hosted Brain instances that should not leak host structure.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/chat",
          "/chats",
          "/settings",
          "/workspaces",
          "/tools",
          "/playbooks",
          "/schedules",
          "/invite",
          "/setup",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/features",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl().host,
  };
}
