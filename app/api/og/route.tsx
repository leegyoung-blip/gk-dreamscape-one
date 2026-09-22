import { ImageResponse } from "next/og";

export const runtime = "edge";

const DEFAULT_TITLE = "Dreamscape One";
const DEFAULT_EYEBROW = "Dreamscape One";
const DEFAULT_ACCENT = "#8ee8ff";

function safeAccent(value: string | null) {
  if (value && /^#[0-9a-fA-F]{6}$/.test(value)) return value;
  return DEFAULT_ACCENT;
}

function safeText(value: string | null, fallback: string, maxLength: number) {
  const cleaned = value?.trim().replace(/\s+/g, " ");
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const title = safeText(searchParams.get("title"), DEFAULT_TITLE, 105);
  const eyebrow = safeText(
    searchParams.get("eyebrow"),
    DEFAULT_EYEBROW,
    40,
  );
  const accent = safeAccent(searchParams.get("accent"));
  const logoUrl = new URL("/home/dreamscape-logo.png", request.url).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #020813 0%, #06152a 48%, #160b2c 100%)",
          color: "white",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "620px",
            height: "620px",
            borderRadius: "999px",
            top: "-360px",
            right: "-110px",
            background: accent,
            opacity: 0.18,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "500px",
            height: "500px",
            borderRadius: "999px",
            left: "-280px",
            bottom: "-280px",
            background: "#c58cff",
            opacity: 0.12,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "64px",
            top: "58px",
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <img
            src={logoUrl}
            alt=""
            width="64"
            height="64"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "999px",
              objectFit: "contain",
              boxShadow: `0 0 34px ${accent}55`,
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: "23px",
                fontWeight: 800,
                letterSpacing: "0.18em",
              }}
            >
              DREAMSCAPE ONE
            </span>
            <span
              style={{
                marginTop: "5px",
                color: "rgba(255,255,255,0.54)",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              LEARN · THINK · EARN · BUILD
            </span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: "68px",
            right: "86px",
            top: "194px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              color: accent,
              fontSize: "17px",
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>

          <div
            style={{
              marginTop: "22px",
              maxWidth: "990px",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: title.length > 66 ? "54px" : "66px",
              fontWeight: 400,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: "68px",
            right: "68px",
            bottom: "50px",
            paddingTop: "22px",
            borderTop: "1px solid rgba(255,255,255,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "rgba(255,255,255,0.58)",
            fontSize: "17px",
          }}
        >
          <span>dreamscape-one.com</span>
          <span style={{ color: accent }}>Explore the world behind the learning →</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control":
          "public, immutable, no-transform, max-age=31536000",
      },
    },
  );
}
