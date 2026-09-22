import Link from "next/link";

export default function GuideCTA({
  eyebrow = "Continue with Dreamscape",
  title,
  text,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  accent = "#8ee8ff",
}: {
  eyebrow?: string;
  title: string;
  text: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  accent?: string;
}) {
  return (
    <section
      style={{
        marginTop: "64px",
        padding: "clamp(28px, 5vw, 54px)",
        borderRadius: "30px",
        border: `1px solid ${accent}35`,
        background: `radial-gradient(circle at 8% 0%, ${accent}16, transparent 38%), linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.018))`,
        boxShadow: "0 28px 72px rgba(0,0,0,0.28)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: accent,
          fontSize: "10px",
          fontWeight: 900,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </p>
      <h2
        style={{
          margin: "14px 0 0",
          color: "white",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "clamp(30px, 5vw, 48px)",
          fontWeight: 400,
          lineHeight: 1.08,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: "16px 0 0",
          maxWidth: "760px",
          color: "rgba(255,255,255,0.66)",
          fontSize: "16px",
          lineHeight: 1.7,
        }}
      >
        {text}
      </p>

      <div
        style={{
          marginTop: "26px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <Link
          href={primaryHref}
          style={{
            minHeight: "48px",
            padding: "0 20px",
            borderRadius: "999px",
            background: `linear-gradient(90deg, ${accent}, #c58cff)`,
            color: "#100622",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
          }}
        >
          {primaryLabel} →
        </Link>

        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            style={{
              minHeight: "48px",
              padding: "0 20px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.035)",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
            }}
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
