import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/og"],
      disallow: [
        "/admin/",
        "/api/",
        "/auth/",
        "/cart",
        "/login",
        "/profile",
        "/dreamscape/subscribe",
        "/learning-missions/",
        "/inventor",
        "/nova-world",
        "/milo-world",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
