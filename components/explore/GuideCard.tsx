import Link from "next/link";
import type { DreamscapeGuide } from "@/lib/dreamscape-guides";

export default function GuideCard({
  guide,
  large = false,
}: {
  guide: DreamscapeGuide;
  large?: boolean;
}) {
  const content = (
    <article
      style={{
        position: "relative",
        minHeight: large ? "330px" : "270px",
        height: "100%",
        padding: large ? "34px" : "28px",
        borderRadius: large ? "30px" : "24px",
        border: `1px solid ${guide.accent}36`,
        background: `radial-gradient(circle at 12% 0%, ${guide.accent}14, transparent 36%), linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.018))`,
        boxShadow: "0 24px 62px rgba(0,0,0,0.26)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: large ? "180px" : "130px",
          height: large ? "180px" : "130px",
          borderRadius: "999px",
          right: large ? "-44px" : "-34px",
          top: large ? "-58px" : "-42px",
          border: `1px solid ${guide.accent}1f`,
          boxShadow: `0 0 70px ${guide.accent}14`,
        }}
      />

      <p
        style={{
          position: "relative",
          zIndex: 2,
          margin: 0,
          color: guide.accent,
          fontSize: "10px",
          fontWeight: 900,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        Dreamscape Guide
      </p>

      <h3
        style={{
          position: "relative",
          zIndex: 2,
          margin: large ? "18px 0 0" : "15px 0 0",
          maxWidth: large ? "760px" : "520px",
          color: "white",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: large ? "clamp(32px, 4vw, 48px)" : "29px",
          fontWeight: 400,
          lineHeight: 1.08,
        }}
      >
        {guide.title}
      </h3>

      <p
        style={{
          position: "relative",
          zIndex: 2,
          margin: "16px 0 0",
          maxWidth: large ? "760px" : "540px",
          color: "rgba(255,255,255,0.67)",
          fontSize: large ? "16px" : "14px",
          fontWeight: 300,
          lineHeight: 1.66,
        }}
      >
        {guide.description}
      </p>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginTop: "auto",
          paddingTop: large ? "30px" : "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
        }}
      >
        <span
          style={{
            color: guide.published
              ? "rgba(255,255,255,0.9)"
              : "rgba(255,255,255,0.42)",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {guide.published ? "Read Guide" : "Coming Next"}
        </span>

        <span
          aria-hidden="true"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "999px",
            border: `1px solid ${guide.accent}4a`,
            background: `${guide.accent}0d`,
            color: guide.published ? guide.accent : "rgba(255,255,255,0.3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
          }}
        >
          {guide.published ? "→" : "•"}
        </span>
      </div>
    </article>
  );

  if (!guide.published) {
    return <div aria-label={`${guide.title}, coming next`}>{content}</div>;
  }

  return (
    <Link
      href={guide.href}
      style={{
        display: "block",
        height: "100%",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      {content}
    </Link>
  );
}
