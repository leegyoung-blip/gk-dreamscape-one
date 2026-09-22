export default function GuideMedia({
  src,
  alt,
  caption,
  accent = "#8ee8ff",
  objectFit = "cover",
}: {
  src: string;
  alt: string;
  caption?: string;
  accent?: string;
  objectFit?: "cover" | "contain";
}) {
  return (
    <figure
      style={{
        margin: "34px 0 0",
        borderRadius: "24px",
        overflow: "hidden",
        border: `1px solid ${accent}34`,
        background: "rgba(255,255,255,0.025)",
        boxShadow: "0 24px 66px rgba(0,0,0,0.26)",
      }}
    >
      <div
        style={{
          minHeight: "280px",
          background: "#050b16",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            maxHeight: objectFit === "contain" ? "620px" : "520px",
            objectFit,
            objectPosition: "center",
            display: "block",
          }}
        />
      </div>

      {caption && (
        <figcaption
          style={{
            padding: "14px 18px 16px",
            color: "rgba(255,255,255,0.48)",
            fontSize: "12px",
            lineHeight: 1.55,
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
