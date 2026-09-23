"use client";

import { useState } from "react";
import type { TokenPackage } from "../lib/bank-types";
import { DREAM_TOKEN_PURCHASES_ENABLED } from "../lib/bank-config";
import { buildShopifyTokenUrl } from "../lib/token-checkout";

export default function TokenPackCard({
  tokenPackage,
  userId,
  userEmail,
  isMobile,
  onPurchaseBlocked,
}: {
  tokenPackage: TokenPackage;
  userId: string;
  userEmail: string;
  isMobile: boolean;
  onPurchaseBlocked: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const variantConfigured = Boolean(tokenPackage.variantId.trim());
  const accountReady = Boolean(userId);
  const purchasePrerequisitesMet = variantConfigured && accountReady;

  const checkoutUrl =
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
        borderRadius: "22px",
        border: tokenPackage.badge
          ? "1px solid rgba(174,130,255,0.5)"
          : "1px solid rgba(126,232,255,0.2)",
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
        boxShadow: hovered
          ? "0 28px 65px rgba(0,0,0,0.34), 0 0 30px rgba(83,215,255,0.08)"
          : "0 18px 44px rgba(0,0,0,0.22)",
        transform: hovered ? "translateY(-5px)" : "none",
        transition: "transform 220ms ease, box-shadow 220ms ease",
      }}
    >
      <div
        style={{
          minHeight: isMobile ? "156px" : "176px",
          padding: isMobile ? "20px" : "24px",
          background:
            "radial-gradient(circle at 20% 10%, rgba(126,232,255,0.16), transparent 36%), radial-gradient(circle at 90% 0%, rgba(157,112,255,0.16), transparent 34%)",
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
            gap: "12px",
          }}
        >
          <span
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "999px",
              border: "1px solid rgba(126,232,255,0.38)",
              background:
                "radial-gradient(circle at 35% 30%, rgba(189,246,255,0.68), rgba(83,215,255,0.15) 42%, rgba(3,15,31,0.94) 74%)",
              color: "#d9fbff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 950,
              boxShadow: "0 0 24px rgba(83,215,255,0.22)",
            }}
          >
            DT
          </span>

          {tokenPackage.badge && (
            <span
              style={{
                minHeight: "30px",
                padding: "0 11px",
                borderRadius: "999px",
                border: "1px solid rgba(255,209,138,0.28)",
                background: "rgba(255,186,94,0.12)",
                color: "#ffd18a",
                display: "inline-flex",
                alignItems: "center",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {tokenPackage.badge}
            </span>
          )}
        </div>

        <div>
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.48)",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Dream Token Top-Up
          </p>
          <strong
            style={{
              display: "block",
              marginTop: "8px",
              fontSize: isMobile ? "34px" : "40px",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {tokenPackage.tokens.toLocaleString()} DT
          </strong>
        </div>
      </div>

      <div
        style={{
          padding: isMobile ? "18px" : "20px",
          display: "flex",
          flexDirection: "column",
          minHeight: isMobile ? "auto" : "224px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "17px",
              fontWeight: 850,
            }}
          >
            {tokenPackage.name}
          </h3>
          <strong style={{ fontSize: "24px", whiteSpace: "nowrap" }}>
            ${tokenPackage.price.toFixed(2)}
          </strong>
        </div>

        <p
          style={{
            margin: "11px 0 0",
            color: "rgba(255,255,255,0.6)",
            fontSize: "12px",
            lineHeight: 1.55,
          }}
        >
          {tokenPackage.description}
        </p>

        <div style={{ marginTop: "auto", paddingTop: "18px" }}>
          {purchasePrerequisitesMet ? (
            DREAM_TOKEN_PURCHASES_ENABLED ? (
              <a
                href={checkoutUrl}
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "14px",
                  border: "1px solid rgba(126,232,255,0.42)",
                  background:
                    "linear-gradient(135deg, rgba(83,215,255,0.24), rgba(120,99,255,0.24))",
                  color: "white",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Buy Dream Tokens →
              </a>
            ) : (
              <button
                type="button"
                onClick={onPurchaseBlocked}
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "14px",
                  border: "1px solid rgba(126,232,255,0.42)",
                  background:
                    "linear-gradient(135deg, rgba(83,215,255,0.24), rgba(120,99,255,0.24))",
                  color: "white",
                  fontWeight: 900,
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Buy Dream Tokens · Locked
              </button>
            )
          ) : (
            <button
              type="button"
              disabled
              style={{
                width: "100%",
                height: "48px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.11)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.4)",
                fontWeight: 900,
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "not-allowed",
              }}
            >
              {variantConfigured ? "Log in first" : "Token pack unavailable"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
