"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type ShopPopupKind = "tokens" | "blindBox" | "merchandise";
type ScreenMode = "desktop" | "compact" | "mobile";

type ShopZone = {
  number: string;
  icon: string;
  title: string;
  eyebrow: string;
  description: string;
  popup: ShopPopupKind;
  image: string;
  desktopStyle: CSSProperties;
};

type TokenPackage = {
  name: string;
  tokens: number;
  price: number;
  badge?: string;
  description: string;
  image: string;
  checkoutUrl: string;
};

type ComingSoonProduct = {
  name: string;
  subtitle: string;
  description: string;
  image: string;
  badge?: string;
};

/*
  Replace these two empty strings with the final Shopify product URLs.
  The purchase buttons automatically activate once a URL is added.
*/
const DREAM_TOKEN_1000_URL = "";
const DREAM_TOKEN_5000_URL = "";

function placeholderImage(
  title: string,
  subtitle: string,
  startColour: string,
  endColour: string
) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${startColour}"/>
          <stop offset="100%" stop-color="${endColour}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="38%" r="60%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#000000" flood-opacity="0.28"/>
        </filter>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)"/>
      <rect width="1200" height="900" fill="url(#glow)"/>
      <circle cx="600" cy="380" r="215" fill="#ffffff" fill-opacity="0.1" stroke="#ffffff" stroke-opacity="0.34" stroke-width="4" filter="url(#shadow)"/>
      <path d="M600 235 L647 333 L755 348 L677 423 L696 529 L600 479 L504 529 L523 423 L445 348 L553 333 Z" fill="#ffffff" fill-opacity="0.78"/>
      <text x="600" y="690" text-anchor="middle" fill="#ffffff" font-size="66" font-weight="800" font-family="Arial, Helvetica, sans-serif">${title}</text>
      <text x="600" y="752" text-anchor="middle" fill="#ffffff" fill-opacity="0.72" font-size="30" font-family="Arial, Helvetica, sans-serif">${subtitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const tokenPackages: TokenPackage[] = [
  {
    name: "Starter Token Pack",
    tokens: 1000,
    price: 5.9,
    description:
      "A simple boost for Dream Shop purchases, game entries, upgrades, and future Milo features.",
    image: placeholderImage(
      "1,000 DT",
      "Starter Token Pack",
      "#145a76",
      "#081a34"
    ),
    checkoutUrl: DREAM_TOKEN_1000_URL,
  },
  {
    name: "Mega Token Pack",
    tokens: 5000,
    price: 19.9,
    badge: "Best Value",
    description:
      "A larger Dreamscape Token bundle for users who want more room to collect, customise, and play.",
    image: placeholderImage(
      "5,000 DT",
      "Mega Token Pack",
      "#6f3dc1",
      "#18112f"
    ),
    checkoutUrl: DREAM_TOKEN_5000_URL,
  },
];

const blindBoxProducts: ComingSoonProduct[] = [
  {
    name: "Delivery Legend",
    subtitle: "Local Legends Series 01",
    description:
      "A fast-moving city courier character carrying a Dreamscape parcel pack.",
    image: placeholderImage(
      "Delivery Legend",
      "Blind Box Preview",
      "#c46b36",
      "#382015"
    ),
  },
  {
    name: "Hawker Legend",
    subtitle: "Local Legends Series 01",
    description:
      "A playful food-culture character inspired by Singapore’s lively hawker centres.",
    image: placeholderImage(
      "Hawker Legend",
      "Blind Box Preview",
      "#b33d4b",
      "#30121a"
    ),
  },
  {
    name: "Barista Legend",
    subtitle: "Local Legends Series 01",
    description:
      "A café-inspired character designed around cosy neighbourhood coffee culture.",
    image: placeholderImage(
      "Barista Legend",
      "Blind Box Preview",
      "#8b5e3c",
      "#22170f"
    ),
  },
];

const merchandiseProducts: ComingSoonProduct[] = [
  {
    name: "Dreamscape T-Shirt",
    subtitle: "Apparel",
    description:
      "A clean Dreamscape graphic tee designed for everyday wear.",
    image: placeholderImage(
      "T-Shirt",
      "Dreamscape Merchandise",
      "#126b78",
      "#071f2a"
    ),
  },
  {
    name: "Dreamscape Tote Bag",
    subtitle: "Carry Collection",
    description:
      "A lightweight tote for books, daily essentials, and Dreamscape finds.",
    image: placeholderImage(
      "Tote Bag",
      "Dreamscape Merchandise",
      "#a86c2c",
      "#2c1b0d"
    ),
  },
  {
    name: "Dreamscape Sticker Pack",
    subtitle: "Sticker Collection",
    description:
      "A mixed sticker set featuring Dreamscape symbols, worlds, and characters.",
    image: placeholderImage(
      "Sticker Pack",
      "Dreamscape Merchandise",
      "#6f43b5",
      "#211035"
    ),
  },
];

const shopZones: ShopZone[] = [
  {
    number: "01",
    icon: "✦",
    title: "Dream Tokens",
    eyebrow: "Digital Currency",
    description:
      "Top up Dreamscape Tokens for future shop items, games, upgrades, and customisation.",
    popup: "tokens",
    image: placeholderImage(
      "Dream Tokens",
      "1,000 DT and 5,000 DT Packs",
      "#12627d",
      "#07172e"
    ),
    desktopStyle: {
      top: "270px",
      left: "6vw",
      width: "350px",
    },
  },
  {
    number: "02",
    icon: "◆",
    title: "Local Legends",
    eyebrow: "Blind Box Series",
    description:
      "Meet a playful collection of characters inspired by familiar local personalities.",
    popup: "blindBox",
    image: placeholderImage(
      "Local Legends",
      "Blind Box Series 01",
      "#b5543c",
      "#2f1420"
    ),
    desktopStyle: {
      top: "215px",
      left: "50%",
      width: "390px",
      transform: "translateX(-50%)",
    },
  },
  {
    number: "03",
    icon: "★",
    title: "Merchandise",
    eyebrow: "Dreamscape Collection",
    description:
      "Fun Dreamscape apparel and accessories designed for everyday use.",
    popup: "merchandise",
    image: placeholderImage(
      "Merchandise",
      "T-Shirts, Totes and Stickers",
      "#6651a8",
      "#15132d"
    ),
    desktopStyle: {
      top: "315px",
      right: "6vw",
      width: "350px",
    },
  },
];

function useScreenMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function updateMode() {
      const width = window.innerWidth;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1320) {
        setScreenMode("compact");
      } else {
        setScreenMode("desktop");
      }
    }

    updateMode();
    window.addEventListener("resize", updateMode);
    return () => window.removeEventListener("resize", updateMode);
  }, []);

  return screenMode;
}

function ResponsiveStyles() {
  return (
    <style>{`
      * {
        box-sizing: border-box;
      }

      .dream-shop-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(126,232,255,0.42) rgba(255,255,255,0.08);
      }

      .dream-shop-scrollbar::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .dream-shop-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(126,232,255,0.42);
        border-radius: 999px;
      }

      .dream-shop-scrollbar::-webkit-scrollbar-track {
        background: rgba(255,255,255,0.06);
      }
    `}</style>
  );
}

function ShopZoneCard({
  zone,
  screenMode,
  onOpen,
}: {
  zone: ShopZone;
  screenMode: ScreenMode;
  onOpen: (popup: ShopPopupKind) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  return (
    <button
      type="button"
      onClick={() => onOpen(zone.popup)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: isDesktop ? "absolute" : "relative",
        width: isDesktop ? undefined : "100%",
        minHeight: isMobile ? "220px" : "250px",
        padding: 0,
        overflow: "hidden",
        borderRadius: isMobile ? "24px" : "30px",
        border: hovered
          ? "1px solid rgba(152,240,255,0.72)"
          : "1px solid rgba(126,232,255,0.24)",
        background: "rgba(3,12,29,0.68)",
        boxShadow: hovered
          ? "0 30px 80px rgba(0,0,0,0.46), 0 0 40px rgba(83,215,255,0.18)"
          : "0 24px 64px rgba(0,0,0,0.36)",
        color: "white",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        ...zone.desktopStyle,
        transform: isDesktop
          ? `${zone.desktopStyle.transform || ""} ${
              hovered ? "translateY(-8px) scale(1.015)" : ""
            }`.trim()
          : hovered
          ? "translateY(-6px)"
          : "none",
        transition:
          "transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease",
      }}
    >
      <img
        src={zone.image}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: hovered ? 0.64 : 0.46,
          transform: hovered ? "scale(1.055)" : "scale(1)",
          transition: "opacity 240ms ease, transform 320ms ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(3,10,25,0.08), rgba(3,10,25,0.92) 78%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: isMobile ? "220px" : "250px",
          padding: isMobile ? "22px" : "26px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
          }}
        >
          <span
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "16px",
              border: "1px solid rgba(126,232,255,0.38)",
              background: "rgba(3,12,29,0.68)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9bf4ff",
              fontSize: "21px",
              boxShadow: "0 0 24px rgba(83,215,255,0.12)",
            }}
          >
            {zone.icon}
          </span>

          <span
            style={{
              color: "rgba(255,255,255,0.56)",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.16em",
            }}
          >
            {zone.number}
          </span>
        </div>

        <div>
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {zone.eyebrow}
          </p>

          <h2
            style={{
              margin: "10px 0 0",
              fontSize: isMobile ? "30px" : "34px",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {zone.title}
          </h2>

          <p
            style={{
              margin: "12px 0 0",
              color: "rgba(255,255,255,0.68)",
              fontSize: "14px",
              lineHeight: 1.55,
            }}
          >
            {zone.description}
          </p>

          <div
            style={{
              marginTop: "18px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "white",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Explore Collection
            <span style={{ color: "#8ee8ff", fontSize: "18px" }}>→</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        minHeight: "32px",
        padding: "0 13px",
        borderRadius: "999px",
        border: "1px solid rgba(255,209,138,0.28)",
        background: "rgba(255,186,94,0.12)",
        color: "#ffd18a",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 900,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function TokenPackCard({
  tokenPackage,
  isMobile,
}: {
  tokenPackage: TokenPackage;
  isMobile: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const purchaseEnabled = Boolean(tokenPackage.checkoutUrl);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "26px",
        border: tokenPackage.badge
          ? "1px solid rgba(174,130,255,0.5)"
          : "1px solid rgba(126,232,255,0.22)",
        background: "rgba(255,255,255,0.06)",
        boxShadow: hovered
          ? "0 30px 70px rgba(0,0,0,0.36)"
          : "0 20px 52px rgba(0,0,0,0.24)",
        transform: hovered ? "translateY(-6px)" : "none",
        transition: "transform 220ms ease, box-shadow 220ms ease",
      }}
    >
      <div
        style={{
          position: "relative",
          height: isMobile ? "210px" : "260px",
          overflow: "hidden",
        }}
      >
        <img
          src={tokenPackage.image}
          alt={tokenPackage.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: hovered ? "scale(1.04)" : "scale(1)",
            transition: "transform 280ms ease",
          }}
        />

        {tokenPackage.badge && (
          <div style={{ position: "absolute", top: "18px", left: "18px" }}>
            <StatusPill>{tokenPackage.badge}</StatusPill>
          </div>
        )}
      </div>

      <div style={{ padding: isMobile ? "22px" : "26px" }}>
        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Dreamscape Token Pack
        </p>

        <h3
          style={{
            margin: "10px 0 0",
            fontSize: isMobile ? "29px" : "34px",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {tokenPackage.tokens.toLocaleString()} DT
        </h3>

        <p
          style={{
            margin: "12px 0 0",
            color: "rgba(255,255,255,0.62)",
            fontSize: "14px",
            lineHeight: 1.55,
          }}
        >
          {tokenPackage.description}
        </p>

        <div
          style={{
            marginTop: "22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: "16px",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                color: "rgba(255,255,255,0.44)",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Price
            </span>
            <strong
              style={{
                display: "block",
                marginTop: "5px",
                color: "white",
                fontSize: "38px",
                lineHeight: 1,
              }}
            >
              ${tokenPackage.price.toFixed(2)}
            </strong>
          </div>

          <span
            style={{
              color: "rgba(255,255,255,0.46)",
              fontSize: "12px",
              textAlign: "right",
              lineHeight: 1.4,
            }}
          >
            For use inside
            <br />
            Dreamscape One
          </span>
        </div>

        {purchaseEnabled ? (
          <a
            href={tokenPackage.checkoutUrl}
            style={{
              marginTop: "22px",
              width: "100%",
              height: "52px",
              borderRadius: "15px",
              border: "1px solid rgba(126,232,255,0.4)",
              background:
                "linear-gradient(135deg, rgba(25,137,180,0.94), rgba(89,66,184,0.94))",
              color: "white",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: "13px",
            }}
          >
            Buy {tokenPackage.tokens.toLocaleString()} DT
          </a>
        ) : (
          <button
            type="button"
            disabled
            style={{
              marginTop: "22px",
              width: "100%",
              height: "52px",
              borderRadius: "15px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.46)",
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontSize: "13px",
              cursor: "not-allowed",
            }}
          >
            Purchase Link Coming Soon
          </button>
        )}
      </div>
    </article>
  );
}

function ComingSoonCard({
  product,
  isMobile,
}: {
  product: ComingSoonProduct;
  isMobile: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        overflow: "hidden",
        borderRadius: "24px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.055)",
        boxShadow: hovered
          ? "0 26px 60px rgba(0,0,0,0.32)"
          : "0 18px 42px rgba(0,0,0,0.22)",
        transform: hovered ? "translateY(-5px)" : "none",
        transition: "transform 220ms ease, box-shadow 220ms ease",
      }}
    >
      <div
        style={{
          position: "relative",
          height: isMobile ? "200px" : "230px",
          overflow: "hidden",
        }}
      >
        <img
          src={product.image}
          alt={product.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: hovered ? "scale(1.045)" : "scale(1)",
            transition: "transform 280ms ease",
          }}
        />

        <div style={{ position: "absolute", top: "16px", left: "16px" }}>
          <StatusPill>Coming Soon</StatusPill>
        </div>
      </div>

      <div style={{ padding: "22px" }}>
        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {product.subtitle}
        </p>

        <h3
          style={{
            margin: "10px 0 0",
            fontSize: "25px",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          {product.name}
        </h3>

        <p
          style={{
            margin: "11px 0 0",
            color: "rgba(255,255,255,0.58)",
            fontSize: "14px",
            lineHeight: 1.55,
          }}
        >
          {product.description}
        </p>

        <button
          type="button"
          disabled
          style={{
            marginTop: "20px",
            width: "100%",
            height: "48px",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.11)",
            background: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.42)",
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontSize: "12px",
            cursor: "not-allowed",
          }}
        >
          Coming Soon
        </button>
      </div>
    </article>
  );
}

function ShopPopup({
  activePopup,
  onClose,
}: {
  activePopup: ShopPopupKind | null;
  onClose: () => void;
}) {
  const screenMode = useScreenMode();
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  useEffect(() => {
    if (!activePopup) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activePopup, onClose]);

  if (!activePopup) return null;

  const popupInfo = {
    tokens: {
      eyebrow: "Dreamscape Currency",
      title: "Dream Tokens",
      description:
        "Choose a Dreamscape Token bundle for future items, customisation, upgrades, games, and Dream Shop experiences.",
    },
    blindBox: {
      eyebrow: "Local Legends Series 01",
      title: "Local Legends Blind Box",
      description:
        "A playful collectible series inspired by familiar local characters, jobs, and everyday city culture.",
    },
    merchandise: {
      eyebrow: "Dreamscape Collection",
      title: "Dreamscape Merchandise",
      description:
        "A fun collection of Dreamscape apparel, carry items, and decorative accessories.",
    },
  }[activePopup];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        padding: isMobile ? "10px" : "28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.62)",
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)",
      }}
      onClick={onClose}
    >
      <section
        className="dream-shop-scrollbar"
        style={{
          position: "relative",
          width: isMobile ? "calc(100vw - 20px)" : "min(1320px, 94vw)",
          maxHeight: isMobile ? "calc(100dvh - 20px)" : "90dvh",
          overflowY: "auto",
          overflowX: "hidden",
          borderRadius: isMobile ? "22px" : "34px",
          border: "1px solid rgba(126,232,255,0.22)",
          background:
            "linear-gradient(145deg, rgba(4,16,35,0.98), rgba(8,9,27,0.98))",
          boxShadow:
            "0 42px 140px rgba(0,0,0,0.66), inset 0 0 70px rgba(83,215,255,0.04)",
          color: "white",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 12% 10%, rgba(83,215,255,0.16), transparent 30%), radial-gradient(circle at 88% 16%, rgba(149,93,255,0.16), transparent 28%)",
          }}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close popup"
          style={{
            position: "sticky",
            top: isMobile ? "10px" : "18px",
            left: "calc(100% - 60px)",
            zIndex: 20,
            width: isMobile ? "40px" : "44px",
            height: isMobile ? "40px" : "44px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.09)",
            color: "white",
            fontSize: "24px",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          ×
        </button>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            padding: isMobile ? "6px 18px 30px" : "4px 54px 54px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            {popupInfo.eyebrow}
          </p>

          <h2
            style={{
              margin: "14px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "40px" : "clamp(54px, 6vw, 78px)",
              lineHeight: 0.96,
              fontWeight: 400,
              letterSpacing: "-0.04em",
            }}
          >
            {popupInfo.title}
          </h2>

          <p
            style={{
              maxWidth: "820px",
              margin: "20px 0 0",
              color: "rgba(255,255,255,0.62)",
              fontSize: isMobile ? "15px" : "17px",
              lineHeight: 1.7,
            }}
          >
            {popupInfo.description}
          </p>

          {activePopup === "tokens" && (
            <>
              <div
                style={{
                  marginTop: "34px",
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: "22px",
                }}
              >
                {tokenPackages.map((tokenPackage) => (
                  <TokenPackCard
                    key={tokenPackage.tokens}
                    tokenPackage={tokenPackage}
                    isMobile={isMobile}
                  />
                ))}
              </div>

              <div
                style={{
                  marginTop: "24px",
                  borderRadius: "18px",
                  border: "1px solid rgba(126,232,255,0.14)",
                  background: "rgba(83,215,255,0.055)",
                  padding: "17px 19px",
                  color: "rgba(255,255,255,0.52)",
                  fontSize: "12px",
                  lineHeight: 1.6,
                }}
              >
                Dreamscape Tokens are digital in-platform credits. They are not
                cash, cannot be withdrawn, and are intended for use within
                Dreamscape One features.
              </div>
            </>
          )}

          {activePopup === "blindBox" && (
            <>
              <div
                style={{
                  marginTop: "34px",
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1.1fr 0.9fr",
                  gap: "24px",
                  alignItems: "stretch",
                }}
              >
                <article
                  style={{
                    overflow: "hidden",
                    borderRadius: "28px",
                    border: "1px solid rgba(255,209,138,0.2)",
                    background: "rgba(255,255,255,0.055)",
                    minHeight: isMobile ? "380px" : "520px",
                    position: "relative",
                  }}
                >
                  <img
                    src={placeholderImage(
                      "Local Legends",
                      "Blind Box Series 01",
                      "#b8573d",
                      "#241125"
                    )}
                    alt="Local Legends blind box placeholder"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(3,10,25,0.1), rgba(3,10,25,0.9) 82%)",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: isMobile ? "22px" : "30px",
                      right: isMobile ? "22px" : "30px",
                      bottom: isMobile ? "22px" : "30px",
                    }}
                  >
                    <StatusPill>Coming Soon</StatusPill>

                    <h3
                      style={{
                        margin: "14px 0 0",
                        fontSize: isMobile ? "34px" : "46px",
                        lineHeight: 0.98,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      One box.
                      <br />
                      One mystery legend.
                    </h3>

                    <p
                      style={{
                        maxWidth: "560px",
                        margin: "14px 0 0",
                        color: "rgba(255,255,255,0.64)",
                        fontSize: "14px",
                        lineHeight: 1.6,
                      }}
                    >
                      Series 01 will introduce a small collection of local
                      characters. Final figures, packaging, rarity, and pricing
                      will be announced later.
                    </p>
                  </div>
                </article>

                <aside
                  style={{
                    borderRadius: "28px",
                    border: "1px solid rgba(126,232,255,0.16)",
                    background: "rgba(255,255,255,0.045)",
                    padding: isMobile ? "22px" : "26px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#8ee8ff",
                      fontSize: "11px",
                      fontWeight: 900,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    Collection Direction
                  </p>

                  <h3
                    style={{
                      margin: "12px 0 0",
                      fontSize: isMobile ? "29px" : "36px",
                      lineHeight: 1,
                    }}
                  >
                    Playful, local, and collectible.
                  </h3>

                  <div
                    style={{
                      marginTop: "22px",
                      display: "grid",
                      gap: "13px",
                    }}
                  >
                    {[
                      "Mystery character in every box",
                      "Small launch collection",
                      "Local culture-inspired designs",
                      "Final product may differ from previews",
                    ].map((item) => (
                      <div
                        key={item}
                        style={{
                          minHeight: "48px",
                          borderRadius: "14px",
                          border: "1px solid rgba(255,255,255,0.09)",
                          background: "rgba(255,255,255,0.045)",
                          padding: "13px 15px",
                          display: "grid",
                          gridTemplateColumns: "22px 1fr",
                          gap: "10px",
                          alignItems: "center",
                          color: "rgba(255,255,255,0.68)",
                          fontSize: "13px",
                          lineHeight: 1.45,
                        }}
                      >
                        <span style={{ color: "#ffd18a" }}>✦</span>
                        {item}
                      </div>
                    ))}
                  </div>
                </aside>
              </div>

              <div
                style={{
                  marginTop: "24px",
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: "18px",
                }}
              >
                {blindBoxProducts.map((product) => (
                  <ComingSoonCard
                    key={product.name}
                    product={product}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </>
          )}

          {activePopup === "merchandise" && (
            <div
              style={{
                marginTop: "34px",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(3, minmax(0, 1fr))",
                gap: "20px",
              }}
            >
              {merchandiseProducts.map((product) => (
                <ComingSoonCard
                  key={product.name}
                  product={product}
                  isMobile={isMobile}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function DreamShopPage() {
  const screenMode = useScreenMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const [activePopup, setActivePopup] = useState<ShopPopupKind | null>(null);

  const navButtonStyle: CSSProperties = {
    minHeight: isMobile ? "40px" : "44px",
    padding: isMobile ? "0 14px" : "0 20px",
    borderRadius: "999px",
    border: "1px solid rgba(126,232,255,0.24)",
    background: "rgba(3,12,29,0.66)",
    color: "white",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    fontSize: isMobile ? "12px" : "13px",
    fontWeight: 800,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
    whiteSpace: "nowrap",
  };

  return (
    <main
      className="dream-shop-scrollbar"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100dvh",
        overflowX: "hidden",
        overflowY: isDesktop ? "hidden" : "auto",
        background: "#020813",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <ResponsiveStyles />

      {/* Replace this source with your final loopable Dream Shop video. */}
      <video
        src="/milo-world/dream-shop/dream-shop-bg-loop.mp4"
        poster="/milo-world/dream-shop/dream-shop-bg.png"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(2,8,19,0.34), rgba(2,8,19,0.12) 38%, rgba(2,8,19,0.78)), radial-gradient(circle at 50% 30%, rgba(83,215,255,0.08), transparent 42%)",
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          boxShadow: "inset 0 0 190px rgba(0,0,0,0.7)",
        }}
      />

      <header
        style={{
          position: isDesktop ? "fixed" : "relative",
          top: isDesktop ? "18px" : "auto",
          left: isDesktop ? "24px" : "auto",
          right: isDesktop ? "24px" : "auto",
          zIndex: 30,
          padding: isDesktop ? 0 : isMobile ? "12px" : "18px 20px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Link href="/milo-world" style={navButtonStyle}>
          <span>←</span>
          {isMobile ? "Milo’s World" : "Back to Milo’s World"}
        </Link>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/profile" style={navButtonStyle}>
            {isMobile ? "Account" : "My Account"}
          </Link>

          <Link href="/cart" style={navButtonStyle}>
            🛒 Cart
          </Link>
        </div>
      </header>

      <section
        style={{
          position: isDesktop ? "absolute" : "relative",
          inset: isDesktop ? 0 : "auto",
          zIndex: 10,
          width: "100%",
          minHeight: isDesktop ? "100dvh" : "auto",
          padding: isDesktop ? 0 : isMobile ? "34px 14px 80px" : "54px 24px 90px",
        }}
      >
        <div
          style={{
            position: isDesktop ? "absolute" : "relative",
            top: isDesktop ? "92px" : "auto",
            left: isDesktop ? "50%" : "auto",
            transform: isDesktop ? "translateX(-50%)" : "none",
            width: isDesktop ? "min(900px, calc(100% - 48px))" : "100%",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
            }}
          >
            Milo’s Design District
          </p>

          <h1
            style={{
              margin: "14px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "clamp(48px, 15vw, 66px)" : "clamp(68px, 8vw, 108px)",
              lineHeight: 0.88,
              fontWeight: 400,
              letterSpacing: "-0.055em",
              textShadow: "0 24px 70px rgba(0,0,0,0.46)",
            }}
          >
            Dream Shop
          </h1>

          <p
            style={{
              maxWidth: "700px",
              margin: "22px auto 0",
              color: "rgba(255,255,255,0.7)",
              fontSize: isMobile ? "15px" : "17px",
              lineHeight: 1.65,
              textShadow: "0 10px 36px rgba(0,0,0,0.44)",
            }}
          >
            Discover Dreamscape Tokens, collectible characters, and fun
            merchandise from across the Dreamscape worlds.
          </p>
        </div>

        <div
          style={{
            position: isDesktop ? "absolute" : "relative",
            inset: isDesktop ? 0 : "auto",
            marginTop: isDesktop ? 0 : isMobile ? "34px" : "46px",
            width: isDesktop ? "100%" : "min(980px, 100%)",
            marginLeft: isDesktop ? 0 : "auto",
            marginRight: isDesktop ? 0 : "auto",
            display: isDesktop ? "block" : "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: isMobile ? "16px" : "20px",
          }}
        >
          {shopZones.map((zone) => (
            <ShopZoneCard
              key={zone.popup}
              zone={zone}
              screenMode={screenMode}
              onOpen={setActivePopup}
            />
          ))}
        </div>
      </section>

      <ShopPopup
        activePopup={activePopup}
        onClose={() => setActivePopup(null)}
      />
    </main>
  );
}
