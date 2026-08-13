// app/sitemap.ts
import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zey-search.vercel.app";

// This is a single search-page SPA — there are no separate indexable routes
// per query, so the homepage is the only real entry. If per-topic or
// per-query landing pages get added later, push more entries into this array.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
