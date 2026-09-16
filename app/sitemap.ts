import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://horrorscope.art";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/onboarding", "/reading", "/pass", "/privacy", "/terms"];
  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
  }));
}
