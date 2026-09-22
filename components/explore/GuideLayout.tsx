import type { ReactNode } from "react";
import ExploreHeader from "@/components/explore/ExploreHeader";
import ExploreFooter from "@/components/explore/ExploreFooter";
import RelatedGuides from "@/components/explore/RelatedGuides";
import GuideStructuredData from "@/components/seo/GuideStructuredData";

export default function GuideLayout({
  eyebrow = "Dreamscape Guide",
  title,
  description,
  accent = "#8ee8ff",
  canonicalPath,
  children,
  relatedSlugs = [],
}: {
  eyebrow?: string;
  title: string;
  description: string;
  accent?: string;
  canonicalPath: string;
  children: ReactNode;
  relatedSlugs?: string[];
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% -8%, rgba(83,215,255,0.13), transparent 26%), radial-gradient(circle at 84% 24%, rgba(197,140,255,0.08), transparent 24%), #020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <GuideStructuredData
        title={title}
        description={description}
        path={canonicalPath}
        accent={accent}
      />
      <ExploreHeader />

      <article
        style={{
          width: "100%",
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "clamp(64px, 9vw, 118px) clamp(20px, 5vw, 56px) 100px",
        }}
      >
        <header
          style={{
            maxWidth: "940px",
            paddingBottom: "42px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: accent,
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </p>

          <h1
            style={{
              margin: "18px 0 0",
              color: "white",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: "clamp(46px, 8vw, 78px)",
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>

          <p
            style={{
              margin: "24px 0 0",
              maxWidth: "860px",
              color: "rgba(255,255,255,0.7)",
              fontSize: "clamp(17px, 2vw, 21px)",
              fontWeight: 300,
              lineHeight: 1.72,
            }}
          >
            {description}
          </p>
        </header>

        <div
          className="dreamscape-guide-body"
          style={{
            maxWidth: "860px",
            marginTop: "46px",
            color: "rgba(255,255,255,0.78)",
            fontSize: "17px",
            lineHeight: 1.82,
          }}
        >
          {children}
        </div>

        <RelatedGuides slugs={relatedSlugs} />
      </article>

      <ExploreFooter />

      <style>{`
        .dreamscape-guide-body h2 {
          margin: 58px 0 0;
          color: white;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(30px, 4vw, 42px);
          font-weight: 400;
          line-height: 1.12;
        }

        .dreamscape-guide-body h3 {
          margin: 36px 0 0;
          color: white;
          font-size: 22px;
          line-height: 1.3;
        }

        .dreamscape-guide-body p {
          margin: 20px 0 0;
        }

        .dreamscape-guide-body ul {
          margin: 22px 0 0;
          padding-left: 22px;
        }

        .dreamscape-guide-body li + li {
          margin-top: 10px;
        }

        .dreamscape-guide-body strong {
          color: white;
        }

        .dreamscape-guide-callout {
          margin-top: 30px;
          padding: 24px;
          border-radius: 20px;
          border: 1px solid rgba(142,232,255,0.2);
          background: rgba(83,215,255,0.055);
        }
      `}</style>
    </main>
  );
}
