import Link from "next/link";

export default function ExploreFooter() {
  const linkStyle = {
    color: "rgba(255,255,255,0.62)",
    textDecoration: "none",
    fontSize: "14px",
    lineHeight: 1.5,
  } as const;

  const headingStyle = {
    margin: 0,
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
  };

  return (
    <footer
      style={{
        padding: "54px clamp(20px, 6vw, 88px) 38px",
        borderTop: "1px solid rgba(142,232,255,0.14)",
        background:
          "linear-gradient(180deg, rgba(2,8,19,0.96), rgba(1,4,10,1))",
        color: "white",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1380px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))",
          gap: "34px",
        }}
      >
        <div>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "white",
              textDecoration: "none",
            }}
          >
            <img
              src="/home/dreamscape-logo.png"
              alt="Dreamscape One"
              style={{
                width: "44px",
                height: "44px",
                objectFit: "contain",
                borderRadius: "999px",
              }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Dreamscape One
              </p>
              <p
                style={{
                  margin: "5px 0 0",
                  color: "rgba(255,255,255,0.42)",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Learn · Think · Earn · Build
              </p>
            </div>
          </Link>
          <p
            style={{
              margin: "18px 0 0",
              maxWidth: "420px",
              color: "rgba(255,255,255,0.56)",
              fontSize: "14px",
              lineHeight: 1.7,
            }}
          >
            A connected learning world designed to help children build strong
            foundations, think independently and grow into real-world decisions.
          </p>
        </div>

        <div>
          <p style={{ ...headingStyle, color: "#8ee8ff" }}>Explore</p>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "11px" }}>
            <Link href="/" style={linkStyle}>Dreamscape Home</Link>
            <Link href="/inventor" style={linkStyle}>Nova’s World</Link>
            <Link href="/milo-world" style={linkStyle}>Milo’s World</Link>
            <Link href="/pricing" style={linkStyle}>Pricing</Link>
          </div>
        </div>

        <div>
          <p style={{ ...headingStyle, color: "#c58cff" }}>Dreamscape Guides</p>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "11px" }}>
            <Link href="/explore" style={linkStyle}>Explore Dreamscape</Link>
            <Link href="/how-it-works" style={linkStyle}>How Dreamscape Works</Link>
            <Link href="/explore/parents-guide" style={linkStyle}>Parent’s Guide</Link>
            <Link href="/explore/nova-plus" style={linkStyle}>NOVA+ for Parents</Link>
            <Link href="/explore/learning-missions" style={linkStyle}>Learning Missions</Link>
          </div>
        </div>

        <div>
          <p style={{ ...headingStyle, color: "#ffbd73" }}>Company & Legal</p>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "11px" }}>
            <Link href="/education-licence" style={linkStyle}>For Tuition Centres</Link>
            <Link href="/affiliate" style={linkStyle}>Partner With Us</Link>
            <Link href="/affiliate" style={linkStyle}>Affiliate Programme</Link>
            <Link href="/terms" style={linkStyle}>Terms & Conditions</Link>
          </div>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "1380px",
          margin: "38px auto 0",
          paddingTop: "22px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.38)",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        © {new Date().getFullYear()} Dreamscape One.
      </div>
    </footer>
  );
}
