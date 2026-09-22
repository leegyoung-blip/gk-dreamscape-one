import JsonLd from "@/components/seo/JsonLd";
import { DREAMSCAPE_GUIDES } from "@/lib/dreamscape-guides";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

export default function ExploreStructuredData() {
  const collectionUrl = absoluteUrl("/explore");

  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${collectionUrl}#collection`,
    name: "Explore Dreamscape One",
    url: collectionUrl,
    description:
      "Parent-first guides explaining Dreamscape One, Nova, Milo, NOVA+, Learning Missions, rewards, financial literacy and real-world decision-making.",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: DREAMSCAPE_GUIDES.filter((guide) => guide.published).map(
        (guide, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: guide.title,
          url: absoluteUrl(guide.href),
        }),
      ),
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
        item: collectionUrl,
      },
    ],
  };

  return (
    <>
      <JsonLd data={collection} />
      <JsonLd data={breadcrumbs} />
    </>
  );
}
