import type { ReactNode } from "react";

export default function LearningBlockShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <section style={{ padding: "24px 2px 8px" }}>
      {eyebrow && (
        <div style={{ color: "rgba(255,255,255,0.40)", fontSize: "9px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>{eyebrow}</div>
      )}
      {title && (
        <h3 style={{ margin: eyebrow ? "8px 0 0" : 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "34px", lineHeight: 1.08, fontWeight: 500, letterSpacing: "-0.025em" }}>{title}</h3>
      )}
      <div style={{ marginTop: title || eyebrow ? "15px" : 0 }}>{children}</div>
    </section>
  );
}
