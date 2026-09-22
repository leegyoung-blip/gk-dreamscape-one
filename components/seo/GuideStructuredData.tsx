import JsonLd from "@/components/seo/JsonLd";
import { SITE_NAME, SITE_URL, absoluteUrl, socialImageUrl } from "@/lib/seo";

export default function GuideStructuredData({
  title,
  description,
  path,
  accent = "#8ee8ff",
}: {
  title: string;
  description: string;
  path: string;
  accent?: string;
}) {
  const url = absoluteUrl(path);

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: title,
    description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    image: socialImageUrl({
      title,
      eyebrow: "Dreamscape Guide",
      accent,
    }),
    author: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/home/dreamscape-logo.png"),
      },
    },
    isPartOf: {
      "@type": "CollectionPage",
      "@id": `${absoluteUrl("/explore")}#collection`,
      name: "Explore Dreamscape One",
      url: absoluteUrl("/explore"),
    },
    inLanguage: "en-SG",
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Dreamscape One",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Explore Dreamscape",
        item: absoluteUrl("/explore"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: url,
      },
    ],
  };

  return (
    <>
      <JsonLd data={article} />
      <JsonLd data={breadcrumbs} />
    </>
  );
}
