import JsonLd from "@/components/seo/JsonLd";
import {
  DEFAULT_SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";

export default function SiteStructuredData() {
  const organisation = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/home/dreamscape-logo.png"),
    },
    description: DEFAULT_SITE_DESCRIPTION,
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    inLanguage: "en-SG",
  };

  return (
    <>
      <JsonLd data={organisation} />
      <JsonLd data={website} />
    </>
  );
}
