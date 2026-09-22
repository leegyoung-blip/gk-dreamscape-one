import type { MetadataRoute } from "next";
import { DREAMSCAPE_GUIDES } from "@/lib/dreamscape-guides";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const guideEntries: MetadataRoute.Sitemap = DREAMSCAPE_GUIDES.filter(
    (guide) => guide.published && guide.href !== "/how-it-works",
  ).map((guide) => ({
    url: absoluteUrl(guide.href),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/explore"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/how-it-works"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    ...guideEntries,
    {
      url: absoluteUrl("/pricing"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/education-licence"),
      changeFrequency: "monthly",
      priority: 0.55,
    },
    {
      url: absoluteUrl("/affiliate"),
      changeFrequency: "monthly",
      priority: 0.45,
    },
    {
      url: absoluteUrl("/terms"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
