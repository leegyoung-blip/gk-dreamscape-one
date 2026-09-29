"use client";

export default function DesktopLearningNotice({
  kind = "learning",
}: {
  kind?: "learning" | "lesson" | "simulation";
}) {
  const label = kind === "simulation" ? "simulations" : kind === "lesson" ? "lessons" : "lessons and simulations";

  return (
    <section
      style={{
        minHeight: "420px",
        width: "100%",
        borderRadius: "22px",
        border: "1px solid rgba(126,232,255,.18)",
        background: "linear-gradient(145deg,rgba(5,20,39,.94),rgba(4,10,24,.97))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "28px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "560px" }}>
        <div
          aria-hidden="true"
          style={{
            width: "58px",
            height: "58px",
            margin: "0 auto",
            borderRadius: "18px",
            border: "1px solid rgba(126,232,255,.28)",
            background: "rgba(83,215,255,.08)",
            display: "grid",
            placeItems: "center",
            color: "#9defff",
            fontSize: "28px",
            fontWeight: 900,
          }}
        >
          ◫
        </div>
        <h2
          style={{
            margin: "16px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "30px",
            fontWeight: 500,
          }}
        >
          Not available on mobile
        </h2>
        <p
          style={{
            margin: "10px auto 0",
            color: "rgba(255,255,255,.68)",
            fontSize: "17px",
            lineHeight: 1.55,
          }}
        >
          Milo Finance {label} are designed for larger interactive screens. Open this area on a tablet or computer to continue.
        </p>
      </div>
    </section>
  );
}
