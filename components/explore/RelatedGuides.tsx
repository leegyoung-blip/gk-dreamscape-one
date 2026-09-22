import GuideCard from "@/components/explore/GuideCard";
import { getGuidesBySlugs } from "@/lib/dreamscape-guides";

export default function RelatedGuides({
  slugs,
}: {
  slugs: string[];
}) {
  const guides = getGuidesBySlugs(slugs);

  if (!guides.length) return null;

  return (
    <section style={{ marginTop: "70px" }}>
      <p
        style={{
          margin: 0,
          color: "#8ee8ff",
          fontSize: "10px",
          fontWeight: 900,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        Continue Exploring
      </p>
      <h2
        style={{
          margin: "12px 0 0",
          color: "white",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "clamp(30px, 4vw, 44px)",
          fontWeight: 400,
        }}
      >
        Related Dreamscape guides
      </h2>

      <div
        style={{
          marginTop: "26px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "18px",
        }}
      >
        {guides.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </section>
  );
}
