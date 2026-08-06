"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

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
  imageFit?: "cover" | "contain";
  imagePosition?: string;
  desktopStyle: CSSProperties;
};

type TokenPackage = {
  name: string;
  tokens: number;
  price: number;
  badge?: string;
  description: string;
  image: string;
  variantId: string;
};

type ComingSoonProduct = {
  name: string;
  subtitle: string;
  description: string;
  image: string;
  imageFit?: "cover" | "contain";
  badge?: string;
};

/*
  Shopify setup:
  1. Create one Shopify product for each token pack.
  2. Paste the numeric DEFAULT VARIANT ID for each product below.
  3. Keep the store URL without a trailing slash.

  Even products with no visible options still have one default variant ID.
*/
const SHOPIFY_STORE_URL = "https://gurukidspro.com";
const DREAM_TOKEN_1000_VARIANT_ID = "52635551629595";
const DREAM_TOKEN_5000_VARIANT_ID = "52635551858971";

// Temporary purchase gate.
// Keep this false until Shopify token purchases are ready to reopen.
const DREAM_TOKEN_PURCHASES_ENABLED = false;

function buildShopifyTokenUrl({
  variantId,
  tokens,
  userId,
  userEmail,
}: {
  variantId: string;
  tokens: number;
  userId: string;
  userEmail: string;
}) {
  if (!variantId) return "";

  const params = new URLSearchParams();

  // Keep enough order metadata for your Shopify webhook to credit the
  // correct Dreamscape account after Shopify confirms payment.
  params.set("attributes[dreamscape_user_id]", userId);
  params.set("attributes[dreamscape_token_pack]", String(tokens));
  params.set("attributes[source]", "dreamscape-one");
  params.set("ref", "dreamscape-one");

  if (userEmail) {
    params.set("checkout[email]", userEmail);
  }

  // Shopify cart permalink: adds the selected pack and opens checkout.
  return `${SHOPIFY_STORE_URL}/cart/${variantId}:1?${params.toString()}`;
}

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
    variantId: DREAM_TOKEN_1000_VARIANT_ID,
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
    variantId: DREAM_TOKEN_5000_VARIANT_ID,
  },
];

const blindBoxProducts: ComingSoonProduct[] = [
  {
    name: "Delivery Spark",
    subtitle: "Local Legends Series 01",
    description: "A courier-inspired Spark with a parcel pack.",
    image: "/milo-world/blind-box/delivery-spark.png",
    imageFit: "contain",
  },
  {
    name: "Hawker Spark",
    subtitle: "Local Legends Series 01",
    description: "A hawker-helper Spark with a simple food tray theme.",
    image: "/milo-world/blind-box/hawker-spark.png",
    imageFit: "contain",
  },
  {
    name: "Barista Spark",
    subtitle: "Local Legends Series 01",
    description: "A café-inspired Spark with an apron and coffee cup.",
    image: "/milo-world/blind-box/barista-spark.png",
    imageFit: "contain",
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
    image: "/milo-world/dream-shop/dream-tokens-bg.png",
    imageFit: "cover",
    imagePosition: "center",
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
    image: "/milo-world/blind-box/delivery-spark.png",
    imageFit: "contain",
    imagePosition: "center 38%",
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
    image: "/milo-world/dream-shop/merchandise-bg.png",
    imageFit: "cover",
    imagePosition: "center",
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

      const height = window.innerHeight;
      const isNarrowLandscape = width / Math.max(height, 1) < 1.55;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1500 || isNarrowLandscape) {
        // Only use the floating map layout on a genuinely wide screen.
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
        minHeight: isMobile ? "220px" : isDesktop ? "250px" : "228px",
        padding: 0,
        overflow: "hidden",
        borderRadius: isMobile ? "24px" : "30px",
        border: hovered
          ? "1px solid rgba(152,240,255,0.72)"
          : "1px solid rgba(126,232,255,0.24)",
        background:
          "linear-gradient(145deg, rgba(13,34,59,0.52), rgba(3,10,25,0.34))",
        boxShadow: hovered
          ? "0 30px 80px rgba(0,0,0,0.46), 0 0 40px rgba(83,215,255,0.18)"
          : "0 24px 64px rgba(0,0,0,0.36)",
        color: "white",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        ...(isDesktop ? zone.desktopStyle : {}),
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
          objectFit: zone.imageFit ?? "cover",
          objectPosition: zone.imagePosition ?? "center",
          opacity: hovered ? 0.48 : 0.3,
          transform: hovered ? "scale(1.055)" : "scale(1)",
          transition: "opacity 240ms ease, transform 320ms ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(3,10,25,0.03), rgba(3,10,25,0.68) 76%, rgba(3,10,25,0.8))",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: isMobile ? "220px" : isDesktop ? "250px" : "228px",
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
              background: "rgba(3,12,29,0.44)",
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
  userId,
  userEmail,
  onPurchaseBlocked,
}: {
  tokenPackage: TokenPackage;
  isMobile: boolean;
  userId: string;
  userEmail: string;
  onPurchaseBlocked: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const variantConfigured = Boolean(tokenPackage.variantId.trim());
  const accountReady = Boolean(userId);
  const purchasePrerequisitesMet = variantConfigured && accountReady;

  // Shopify URLs are only created when purchases are deliberately reopened.
  const shopifyCheckoutUrl =
    DREAM_TOKEN_PURCHASES_ENABLED && purchasePrerequisitesMet
      ? buildShopifyTokenUrl({
          variantId: tokenPackage.variantId,
          tokens: tokenPackage.tokens,
          userId,
          userEmail,
        })
      : "";

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "24px",
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
          height: isMobile ? "168px" : "178px",
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
          <div style={{ position: "absolute", top: "14px", left: "14px" }}>
            <StatusPill>{tokenPackage.badge}</StatusPill>
          </div>
        )}
      </div>

      <div
        style={{
          padding: isMobile ? "18px" : "19px",
          display: "flex",
          flexDirection: "column",
          minHeight: isMobile ? "auto" : "268px",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#8ee8ff",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Dreamscape Token Pack
        </p>

        <div
          style={{
            marginTop: "9px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: "12px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: isMobile ? "26px" : "29px",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {tokenPackage.tokens.toLocaleString()} DT
          </h3>

          <strong
            style={{
              color: "white",
              fontSize: isMobile ? "25px" : "28px",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            ${tokenPackage.price.toFixed(2)}
          </strong>
        </div>

        <p
          style={{
            margin: "10px 0 0",
            color: "rgba(255,255,255,0.62)",
            fontSize: "12px",
            lineHeight: 1.45,
          }}
        >
          {tokenPackage.description}
        </p>

        <div
          style={{
            marginTop: "auto",
            paddingTop: "16px",
          }}
        >
          {purchasePrerequisitesMet ? (
            DREAM_TOKEN_PURCHASES_ENABLED ? (
              <a
                href={shopifyCheckoutUrl}
                aria-label={`Buy ${tokenPackage.tokens.toLocaleString()} Dreamscape Tokens on Shopify`}
                style={{
                  width: "100%",
                  height: "50px",
                  borderRadius: "14px",
                  border: "1px solid rgba(126,232,255,0.42)",
                  background:
                    "linear-gradient(135deg, rgba(83,215,255,0.24), rgba(120,99,255,0.24))",
                  color: "white",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "9px",
                  padding: "0 16px",
                  fontWeight: 900,
                  fontSize: isMobile ? "11px" : "12px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
                }}
              >
                Buy Now on Shopify
                <span aria-hidden="true" style={{ fontSize: "17px" }}>
                  →
                </span>
              </a>
            ) : (
              <button
                type="button"
                onClick={onPurchaseBlocked}
                aria-label={`Purchase ${tokenPackage.tokens.toLocaleString()} Dreamscape Tokens`}
                style={{
                  width: "100%",
                  height: "50px",
                  borderRadius: "14px",
                  border: "1px solid rgba(126,232,255,0.42)",
                  background:
                    "linear-gradient(135deg, rgba(83,215,255,0.24), rgba(120,99,255,0.24))",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "9px",
                  padding: "0 16px",
                  fontWeight: 900,
                  fontSize: isMobile ? "11px" : "12px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
                  cursor: "pointer",
                }}
              >
                Buy Dream Tokens
                <span aria-hidden="true" style={{ fontSize: "15px" }}>
                  🔒
                </span>
              </button>
            )
          ) : (
            <button
              type="button"
              disabled
              style={{
                width: "100%",
                height: "50px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.42)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                fontWeight: 900,
                fontSize: isMobile ? "10px" : "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "not-allowed",
              }}
            >
              {variantConfigured ? "Log in first" : "Add variant ID"}
            </button>
          )}
        </div>

        {!variantConfigured && (
          <p
            style={{
              margin: "10px 0 0",
              color: "rgba(255,209,138,0.66)",
              fontSize: "10px",
              lineHeight: 1.4,
              textAlign: "center",
            }}
          >
            Add this product’s Shopify variant ID at the top of the file.
          </p>
        )}

        {variantConfigured && !accountReady && (
          <p
            style={{
              margin: "10px 0 0",
              color: "rgba(142,232,255,0.7)",
              fontSize: "10px",
              lineHeight: 1.4,
              textAlign: "center",
            }}
          >
            Log in first so the purchased tokens can be credited to your account.
          </p>
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
            objectFit: product.imageFit ?? "cover",
            objectPosition: "center",
            padding: product.imageFit === "contain" ? (isMobile ? "16px" : "20px") : 0,
            background:
              product.imageFit === "contain"
                ? "radial-gradient(circle at 50% 42%, rgba(126,232,255,0.13), rgba(255,255,255,0.035) 50%, rgba(4,12,28,0.34))"
                : "transparent",
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

function TokenPurchaseGate({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="token-purchase-gate-title"
      aria-describedby="token-purchase-gate-description"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        padding: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(9px)",
        WebkitBackdropFilter: "blur(9px)",
      }}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: "min(520px, 100%)",
          overflow: "hidden",
          borderRadius: "28px",
          border: "1px solid rgba(126,232,255,0.28)",
          background:
            "linear-gradient(145deg, rgba(6,24,48,0.99), rgba(10,8,29,0.99))",
          boxShadow:
            "0 36px 120px rgba(0,0,0,0.68), inset 0 0 60px rgba(83,215,255,0.05)",
          color: "white",
          padding: "34px 28px 28px",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "64px",
            height: "64px",
            margin: "0 auto",
            borderRadius: "20px",
            border: "1px solid rgba(126,232,255,0.34)",
            background: "rgba(83,215,255,0.11)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            boxShadow: "0 0 36px rgba(83,215,255,0.12)",
          }}
        >
          🔒
        </div>

        <p
          style={{
            margin: "20px 0 0",
            color: "#8ee8ff",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Temporary Purchase Gate
        </p>

        <h3
          id="token-purchase-gate-title"
          style={{
            margin: "10px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "clamp(34px, 8vw, 46px)",
            lineHeight: 1,
            fontWeight: 400,
            letterSpacing: "-0.04em",
          }}
        >
          Dream Token purchases are not available yet.
        </h3>

        <p
          id="token-purchase-gate-description"
          style={{
            margin: "16px auto 0",
            maxWidth: "420px",
            color: "rgba(255,255,255,0.66)",
            fontSize: "14px",
            lineHeight: 1.65,
          }}
        >
          We are completing the payment and account-crediting setup. Shopify
          checkout has been temporarily disabled, and no payment has been
          taken.
        </p>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          style={{
            marginTop: "24px",
            width: "100%",
            height: "50px",
            borderRadius: "14px",
            border: "1px solid rgba(126,232,255,0.42)",
            background:
              "linear-gradient(135deg, rgba(83,215,255,0.24), rgba(120,99,255,0.24))",
            color: "white",
            fontWeight: 900,
            fontSize: "12px",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Back to Dream Shop
        </button>
      </section>
    </div>
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
  const [shopperUserId, setShopperUserId] = useState("");
  const [shopperEmail, setShopperEmail] = useState("");
  const [purchaseGateOpen, setPurchaseGateOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadShopper() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setShopperUserId(user?.id ?? "");
      setShopperEmail(user?.email ?? "");
    }

    loadShopper();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setShopperUserId(session?.user?.id ?? "");
      setShopperEmail(session?.user?.email ?? "");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!activePopup) {
      setPurchaseGateOpen(false);
    }
  }, [activePopup]);

  useEffect(() => {
    if (!purchaseGateOpen) return;

    function handlePurchaseGateEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPurchaseGateOpen(false);
      }
    }

    window.addEventListener("keydown", handlePurchaseGateEscape);
    return () =>
      window.removeEventListener("keydown", handlePurchaseGateEscape);
  }, [purchaseGateOpen]);

  useEffect(() => {
    if (!activePopup || purchaseGateOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activePopup, onClose, purchaseGateOpen]);

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
            position: "absolute",
            top: isMobile ? "12px" : "18px",
            right: isMobile ? "12px" : "18px",
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
            padding: isMobile ? "58px 18px 30px" : "38px 44px 38px",
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
              fontSize: isMobile ? "40px" : "clamp(50px, 5vw, 68px)",
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
              margin: "16px 0 0",
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
                  width: "min(820px, 100%)",
                  margin: "26px auto 0",
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: "18px",
                }}
              >
                {tokenPackages.map((tokenPackage) => (
                  <TokenPackCard
                    key={tokenPackage.tokens}
                    tokenPackage={tokenPackage}
                    isMobile={isMobile}
                    userId={shopperUserId}
                    userEmail={shopperEmail}
                    onPurchaseBlocked={() => setPurchaseGateOpen(true)}
                  />
                ))}
              </div>

              <div
                style={{
                  width: "min(820px, 100%)",
                  margin: "18px auto 0",
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
                Dreamscape One features. The purchase button opens Shopify
                checkout directly with the selected token pack added.
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
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(circle at 50% 30%, rgba(255,209,138,0.18), transparent 38%), linear-gradient(145deg, rgba(77,31,42,0.9), rgba(4,14,34,0.98))",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      top: isMobile ? "28px" : "24px",
                      left: isMobile ? "14px" : "24px",
                      right: isMobile ? "14px" : "24px",
                      height: isMobile ? "205px" : "325px",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "center",
                      gap: isMobile ? "2px" : "12px",
                    }}
                  >
                    {blindBoxProducts.map((product, index) => (
                      <div
                        key={product.name}
                        style={{
                          flex: "1 1 0",
                          height: index === 1 ? "92%" : "82%",
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "center",
                          transform:
                            index === 0
                              ? "rotate(-4deg)"
                              : index === 2
                              ? "rotate(4deg)"
                              : "none",
                        }}
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            filter:
                              "drop-shadow(0 22px 26px rgba(0,0,0,0.38))",
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(3,10,25,0.02) 36%, rgba(3,10,25,0.94) 82%)",
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

      <TokenPurchaseGate
        open={purchaseGateOpen}
        onClose={() => setPurchaseGateOpen(false)}
      />
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
            width: isDesktop ? "100%" : "min(620px, 100%)",
            marginLeft: isDesktop ? 0 : "auto",
            marginRight: isDesktop ? 0 : "auto",
            display: isDesktop ? "block" : "grid",
            gridTemplateColumns: "1fr",
            gap: isMobile ? "16px" : "18px",
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
