import type { MetadataRoute } from "next";
import { source } from "@/lib/docs/source";
import { absoluteUrl, PUBLIC_INDEXABLE_PATHS } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const marketing: MetadataRoute.Sitemap = PUBLIC_INDEXABLE_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
  const docs: MetadataRoute.Sitemap = source.getPages().map((page) => ({
    url: absoluteUrl(page.url),
    lastModified,
    changeFrequency: "monthly",
    priority: page.url === "/docs" ? 0.8 : 0.55,
  }));
  return [...marketing, ...docs];
}
