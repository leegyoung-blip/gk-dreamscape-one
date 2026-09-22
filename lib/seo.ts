import type { Metadata } from "next";

export const SITE_URL = "https://dreamscape-one.com";
export const SITE_NAME = "Dreamscape One";

export const DEFAULT_SITE_DESCRIPTION =
  "A learning world where children think, learn, earn, build, and grow through curriculum mastery, financial literacy, business, and real-world decision-making.";

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function socialImageUrl({
  title,
  eyebrow = "Dreamscape One",
  accent = "#8ee8ff",
}: {
  title: string;
  eyebrow?: string;
  accent?: string;
}) {
  const url = new URL("/api/og", SITE_URL);
  url.searchParams.set("title", title);
  url.searchParams.set("eyebrow", eyebrow);
  url.searchParams.set("accent", accent);
  return url.toString();
}

export function buildPageMetadata({
  title,
  description,
  path,
  accent = "#8ee8ff",
  eyebrow = "Dreamscape One",
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  accent?: string;
  eyebrow?: string;
  type?: "website" | "article";
}): Metadata {
  const canonical = absoluteUrl(path);
  const image = socialImageUrl({ title, eyebrow, accent });

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "en_SG",
      type,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${title} | ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function buildGuideMetadata({
  title,
  description,
  path,
  accent,
}: {
  title: string;
  description: string;
  path: string;
  accent: string;
}): Metadata {
  return buildPageMetadata({
    title,
    description,
    path,
    accent,
    eyebrow: "Dreamscape Guide",
    type: "article",
  });
}
