import type { MetadataRoute } from "next";
import { absoluteUrl, PUBLIC_INDEXABLE_PATHS } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_INDEXABLE_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
