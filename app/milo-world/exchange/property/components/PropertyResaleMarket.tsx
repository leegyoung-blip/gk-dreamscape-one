"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

export type PropertyResaleListing = {
  listing_id: string;
  property_id: string;
  property_name: string;
  district: string;
  property_type: string;
  seller_name: string;
  asking_price: number;
  current_value: number;
  primary_listing_price: number;
  expires_at: string;
};

export type MyPropertyListing = {
  listing_id: string;
  property_id: string;
  property_name: string;
  district: string;
  property_type: string;
  asking_price: number;
  current_value: number;
  primary_listing_price: number;
  status: "active" | "sold" | "cancelled" | "expired" | string;
  created_at: string;
  expires_at: string;
  sold_at: string | null;
  buyer_name: string | null;
};

type PropertyOfferingLite = {
  id: string;
  code: string;
  name: string;
  district: string;
  property_type: string;
  building_name: string;
  unit_type: string;
  current_value: number;
  listing_price: number;
  weekly_rent: number;
  area_sqm: number;
  preview_image_url: string | null;
};

type PropertyHoldingLite = {
  id: string;
  property_id: string;
  quantity: number;
  purchase_price: number;
};

type Props = {
  properties: PropertyOfferingLite[];
  holdings: PropertyHoldingLite[];
  resaleListings: PropertyResaleListing[];
  myListings: MyPropertyListing[];
  dreamTokens: number;
  actionLoading: boolean;
  marketLoading: boolean;
  message: string;
  isMobile: boolean;
  isCompact: boolean;
  glassPanel: CSSProperties;
  primaryButton: CSSProperties;
  secondaryButton: CSSProperties;
  onRefresh: () => void;
  onBuy: (listing: PropertyResaleListing) => Promise<void>;
  onCreateListing: (propertyId: string, askingPrice: number) => Promise<void>;
  onCancelListing: (listingId: string) => Promise<void>;
};

const PROPERTY_ASSET_BASE = "/milo-world/property-exchange";

const PROPERTY_PREVIEW_IMAGES = {
  parkview: `${PROPERTY_ASSET_BASE}/parkview-apartment.png`,
  skyline: `${PROPERTY_ASSET_BASE}/skyline-apartment.png`,
  gardenTerrace: `${PROPERTY_ASSET_BASE}/garden-terrace-house.png`,
  lakeview: `${PROPERTY_ASSET_BASE}/lakeview-detached-villa.png`,
  commerceTower: `${PROPERTY_ASSET_BASE}/commerce-tower-office.png`,
  enterpriseExecutive: `${PROPERTY_ASSET_BASE}/enterprise-executive-office.png`,
  standardRetail: `${PROPERTY_ASSET_BASE}/standard-retail.png`,
  cornerRetail: `${PROPERTY_ASSET_BASE}/corner-retail.png`,
};

function getPreviewImage(property: PropertyOfferingLite | undefined) {
  if (!property) return null;

  const searchValue = [
    property.code,
    property.name,
    property.building_name,
    property.unit_type,
  ]
    .join(" ")
    .toLowerCase();

  if (searchValue.includes("parkview")) return PROPERTY_PREVIEW_IMAGES.parkview;
  if (searchValue.includes("skyline")) return PROPERTY_PREVIEW_IMAGES.skyline;
  if (searchValue.includes("garden terrace")) return PROPERTY_PREVIEW_IMAGES.gardenTerrace;
  if (searchValue.includes("lakeview")) return PROPERTY_PREVIEW_IMAGES.lakeview;
  if (searchValue.includes("commerce tower")) return PROPERTY_PREVIEW_IMAGES.commerceTower;
  if (searchValue.includes("enterprise") && searchValue.includes("office")) {
    return PROPERTY_PREVIEW_IMAGES.enterpriseExecutive;
  }
  if (searchValue.includes("standard") && searchValue.includes("retail")) {
    return PROPERTY_PREVIEW_IMAGES.standardRetail;
  }
  if (searchValue.includes("corner") && searchValue.includes("retail")) {
    return PROPERTY_PREVIEW_IMAGES.cornerRetail;
  }

  return property.preview_image_url;
}

function formatNumber(value: number) {
  return Math.round(Number(value || 0)).toLocaleString();
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-SG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function PropertyResaleMarket({
  properties,
  holdings,
  resaleListings,
  myListings,
  dreamTokens,
  actionLoading,
  marketLoading,
  message,
  isMobile,
  isCompact,
  glassPanel,
  primaryButton,
  secondaryButton,
  onRefresh,
  onBuy,
  onCreateListing,
  onCancelListing,
}: Props) {
  const [listingPropertyId, setListingPropertyId] = useState<string | null>(null);
  const [askingPrice, setAskingPrice] = useState(0);
  const [localMessage, setLocalMessage] = useState("");

  const activeListingsByProperty = useMemo(() => {
    const map = new Map<string, MyPropertyListing>();
    for (const listing of myListings) {
      if (listing.status === "active") {
        map.set(listing.property_id, listing);
      }
    }
    return map;
  }, [myListings]);

  const listingProperty = useMemo(
    () => properties.find((property) => property.id === listingPropertyId) || null,
    [properties, listingPropertyId]
  );

  const activeMyListings = useMemo(
    () => myListings.filter((listing) => listing.status === "active"),
    [myListings]
  );

  const recentMyListings = useMemo(
    () => myListings.filter((listing) => listing.status !== "active").slice(0, 8),
    [myListings]
  );

  function openListing(property: PropertyOfferingLite) {
    const reference = Math.max(property.current_value, property.listing_price, 1);
    setListingPropertyId(property.id);
    setAskingPrice(reference);
    setLocalMessage("");
  }

  async function submitListing() {
    if (!listingProperty) return;

    const reference = Math.max(
      listingProperty.current_value,
      listingProperty.listing_price,
      1
    );
    const min = Math.max(1, Math.round(reference * 0.85));
    const max = Math.max(min, Math.round(reference * 1.15));
    const price = Math.round(Number(askingPrice || 0));

    if (price < min || price > max) {
      setLocalMessage(`Choose an asking price between ${formatNumber(min)} and ${formatNumber(max)} DT.`);
      return;
    }

    await onCreateListing(listingProperty.id, price);
    setListingPropertyId(null);
    setLocalMessage("");
  }

  return (
    <>
      {listingProperty && (
        <div
          onClick={() => setListingPropertyId(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            display: "grid",
            placeItems: "center",
            padding: isMobile ? "14px" : "28px",
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            style={{
              ...glassPanel,
              width: "min(620px, 100%)",
              padding: isMobile ? "22px" : "30px",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setListingPropertyId(null)}
              aria-label="Close resale listing form"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "38px",
                height: "38px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.07)",
                color: "white",
                cursor: "pointer",
                fontSize: "20px",
              }}
            >
              ×
            </button>

            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "12px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
              }}
            >
              Create Resale Listing
            </p>

            <h2
              style={{
                margin: "12px 48px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "32px" : "40px",
                fontWeight: 500,
              }}
            >
              {listingProperty.name}
            </h2>

            <p
              style={{
                margin: "10px 0 0",
                color: "rgba(255,255,255,0.56)",
                lineHeight: 1.55,
              }}
            >
              List one unit for sale to other Dreamscape Exchange users. The listing expires after 7 days if it is not sold.
            </p>

            {(() => {
              const reference = Math.max(
                listingProperty.current_value,
                listingProperty.listing_price,
                1
              );
              const min = Math.max(1, Math.round(reference * 0.85));
              const max = Math.max(min, Math.round(reference * 1.15));

              return (
                <>
                  <div
                    style={{
                      marginTop: "20px",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                      gap: "9px",
                    }}
                  >
                    {[
                      ["Reference", `${formatNumber(reference)} DT`],
                      ["Minimum", `${formatNumber(min)} DT`],
                      ["Maximum", `${formatNumber(max)} DT`],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          borderRadius: "14px",
                          background: "rgba(255,255,255,0.055)",
                          padding: "12px",
                        }}
                      >
                        <small style={{ color: "rgba(255,255,255,0.45)" }}>{label}</small>
                        <strong style={{ display: "block", marginTop: "5px" }}>{value}</strong>
                      </div>
                    ))}
                  </div>

                  <label style={{ marginTop: "18px", display: "grid", gap: "8px" }}>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.62)",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        fontWeight: 900,
                      }}
                    >
                      Asking Price
                    </span>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      step={1}
                      value={askingPrice}
                      onChange={(event) => setAskingPrice(Math.round(Number(event.target.value) || 0))}
                      style={{
                        height: "48px",
                        borderRadius: "14px",
                        border: "1px solid rgba(255,209,138,0.24)",
                        background: "rgba(255,255,255,0.08)",
                        color: "white",
                        padding: "0 15px",
                        fontSize: "16px",
                        outline: "none",
                      }}
                    />
                  </label>
                </>
              );
            })()}

            {localMessage && (
              <p style={{ margin: "12px 0 0", color: "#ffb0b0", fontWeight: 800 }}>
                {localMessage}
              </p>
            )}

            <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void submitListing()}
                disabled={actionLoading}
                style={{ ...primaryButton, flex: 1, minWidth: "180px", opacity: actionLoading ? 0.55 : 1 }}
              >
                {actionLoading ? "Creating Listing..." : "List 1 Unit for Resale"}
              </button>
              <button
                type="button"
                onClick={() => setListingPropertyId(null)}
                disabled={actionLoading}
                style={{ ...secondaryButton, minWidth: "110px" }}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      <section
        style={{
          ...glassPanel,
          marginTop: "18px",
          padding: isMobile ? "18px" : "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "flex-end",
            gap: "14px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontWeight: 900,
              }}
            >
              Secondary Market
            </p>
            <h2
              style={{
                margin: "10px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "34px" : "42px",
                fontWeight: 500,
              }}
            >
              Property Resales
            </h2>
            <p
              style={{
                margin: "10px 0 0",
                maxWidth: "720px",
                color: "rgba(255,255,255,0.52)",
                fontSize: "13px",
                lineHeight: 1.55,
              }}
            >
              Buy virtual properties listed by other Dreamscape owners. Resale purchases transfer an existing unit and do not reduce Dreamscape’s primary inventory.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={marketLoading || actionLoading}
            style={{
              ...secondaryButton,
              minHeight: "42px",
              opacity: marketLoading || actionLoading ? 0.55 : 1,
            }}
          >
            {marketLoading ? "Refreshing..." : "↻ Refresh Market"}
          </button>
        </div>

        {message && (
          <div
            style={{
              marginTop: "16px",
              padding: "13px 15px",
              borderRadius: "14px",
              border: "1px solid rgba(255,209,138,0.18)",
              background: "rgba(255,209,138,0.07)",
              color: "#ffe5bb",
              fontSize: "13px",
              fontWeight: 750,
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        {resaleListings.length === 0 ? (
          <div
            style={{
              marginTop: "20px",
              minHeight: "150px",
              display: "grid",
              placeItems: "center",
              padding: "24px",
              borderRadius: "18px",
              border: "1px dashed rgba(255,209,138,0.2)",
              background: "rgba(255,255,255,0.025)",
              color: "rgba(255,255,255,0.52)",
              textAlign: "center",
            }}
          >
            No resale properties are available right now.
          </div>
        ) : (
          <div
            style={{
              marginTop: "20px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : isCompact
                ? "repeat(2, minmax(0,1fr))"
                : "repeat(3, minmax(0,1fr))",
              gap: "14px",
            }}
          >
            {resaleListings.map((listing) => {
              const property = properties.find((item) => item.id === listing.property_id);
              const image = getPreviewImage(property);
              const primaryReference = Math.max(listing.primary_listing_price, 1);
              const difference = listing.asking_price - primaryReference;
              const differencePct = Math.round((difference / primaryReference) * 100);
              const canAfford = dreamTokens >= listing.asking_price;

              return (
                <article
                  key={listing.listing_id}
                  style={{
                    overflow: "hidden",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,209,138,0.16)",
                    background: "linear-gradient(145deg, rgba(85,49,18,0.24), rgba(5,13,28,0.82))",
                  }}
                >
                  {image && (
                    <div style={{ height: "175px", overflow: "hidden" }}>
                      <img
                        src={image}
                        alt={`${listing.property_name} resale preview`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                  )}

                  <div style={{ padding: "17px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                      <div>
                        <span
                          style={{
                            display: "inline-flex",
                            minHeight: "24px",
                            alignItems: "center",
                            padding: "0 9px",
                            borderRadius: "999px",
                            background: "rgba(255,209,138,0.09)",
                            color: "#ffd18a",
                            fontSize: "9px",
                            fontWeight: 900,
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                          }}
                        >
                          Resale
                        </span>
                        <h3 style={{ margin: "9px 0 0", fontSize: "19px" }}>{listing.property_name}</h3>
                        <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>
                          {listing.district} · {titleCase(listing.property_type)}
                        </p>
                      </div>

                      {differencePct !== 0 && (
                        <span
                          style={{
                            flexShrink: 0,
                            borderRadius: "999px",
                            padding: "6px 9px",
                            background: difference < 0 ? "rgba(121,242,206,0.1)" : "rgba(255,209,138,0.08)",
                            color: difference < 0 ? "#79f2ce" : "#ffd18a",
                            fontSize: "10px",
                            fontWeight: 900,
                          }}
                        >
                          {difference < 0
                            ? `${Math.abs(differencePct)}% below primary`
                            : `${differencePct}% above primary`}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: "15px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ borderRadius: "13px", padding: "11px", background: "rgba(255,255,255,0.045)" }}>
                        <small style={{ color: "rgba(255,255,255,0.42)" }}>Asking</small>
                        <strong style={{ display: "block", marginTop: "4px", color: "#ffd18a" }}>
                          {formatNumber(listing.asking_price)} DT
                        </strong>
                      </div>
                      <div style={{ borderRadius: "13px", padding: "11px", background: "rgba(255,255,255,0.045)" }}>
                        <small style={{ color: "rgba(255,255,255,0.42)" }}>Primary Price</small>
                        <strong style={{ display: "block", marginTop: "4px" }}>
                          {formatNumber(listing.primary_listing_price)} DT
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "13px",
                        paddingTop: "12px",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        flexWrap: "wrap",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "12px",
                      }}
                    >
                      <span>Seller: <strong style={{ color: "rgba(255,255,255,0.82)" }}>{listing.seller_name}</strong></span>
                      <span>Ends {formatDateTime(listing.expires_at)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void onBuy(listing)}
                      disabled={actionLoading || !canAfford}
                      style={{
                        ...primaryButton,
                        width: "100%",
                        marginTop: "15px",
                        border: "1px solid rgba(255,209,138,0.3)",
                        background: canAfford
                          ? "linear-gradient(135deg, rgba(181,110,37,0.48), rgba(255,209,138,0.18))"
                          : "rgba(255,255,255,0.06)",
                        opacity: actionLoading || !canAfford ? 0.5 : 1,
                      }}
                    >
                      {actionLoading
                        ? "Processing..."
                        : canAfford
                        ? `Buy for ${formatNumber(listing.asking_price)} DT`
                        : `Need ${formatNumber(listing.asking_price - dreamTokens)} more DT`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <section style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
          <p
            style={{
              margin: 0,
              color: "#79f2ce",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontWeight: 900,
            }}
          >
            Sell Property
          </p>
          <h2
            style={{
              margin: "10px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "32px" : "39px",
              fontWeight: 500,
            }}
          >
            List My Units
          </h2>
          <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.55 }}>
            List one owned unit at a time. Asking prices are limited to 85–115% of the current reference value.
          </p>

          {holdings.length === 0 ? (
            <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.55)" }}>
              Purchase a property before creating a resale listing.
            </p>
          ) : (
            <div style={{ marginTop: "17px", display: "grid", gap: "10px" }}>
              {holdings.map((holding) => {
                const property = properties.find((item) => item.id === holding.property_id);
                if (!property) return null;
                const active = activeListingsByProperty.get(property.id);

                return (
                  <article
                    key={holding.id}
                    style={{
                      borderRadius: "16px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                      <span>
                        <strong style={{ display: "block" }}>{property.name}</strong>
                        <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>
                          {holding.quantity} unit{holding.quantity === 1 ? "" : "s"} owned · Reference {formatNumber(Math.max(property.current_value, property.listing_price))} DT
                        </small>
                      </span>

                      {active && (
                        <span
                          style={{
                            borderRadius: "999px",
                            padding: "5px 8px",
                            background: "rgba(255,209,138,0.1)",
                            color: "#ffd18a",
                            fontSize: "10px",
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Listed
                        </span>
                      )}
                    </div>

                    {active ? (
                      <div style={{ marginTop: "11px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>
                          Asking <strong style={{ color: "#ffd18a" }}>{formatNumber(active.asking_price)} DT</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => void onCancelListing(active.listing_id)}
                          disabled={actionLoading}
                          style={{ ...secondaryButton, minHeight: "36px", padding: "0 13px", fontSize: "12px" }}
                        >
                          Cancel Listing
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openListing(property)}
                        disabled={actionLoading}
                        style={{ ...primaryButton, width: "100%", minHeight: "40px", marginTop: "11px" }}
                      >
                        List 1 Unit for Resale
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
          <p
            style={{
              margin: 0,
              color: "#ffd18a",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontWeight: 900,
            }}
          >
            My Resale Activity
          </p>
          <h2
            style={{
              margin: "10px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "32px" : "39px",
              fontWeight: 500,
            }}
          >
            My Listings
          </h2>

          {activeMyListings.length === 0 && recentMyListings.length === 0 ? (
            <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.55)" }}>
              You have not created any resale listings yet.
            </p>
          ) : (
            <div className="milo-scrollbar" style={{ marginTop: "17px", display: "grid", gap: "9px", maxHeight: "460px", overflowY: "auto", paddingRight: "3px" }}>
              {[...activeMyListings, ...recentMyListings].map((listing) => (
                <article
                  key={listing.listing_id}
                  style={{
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                    <span>
                      <strong style={{ display: "block" }}>{listing.property_name}</strong>
                      <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>
                        {formatNumber(listing.asking_price)} DT · created {formatDateTime(listing.created_at)}
                      </small>
                    </span>
                    <span
                      style={{
                        borderRadius: "999px",
                        padding: "5px 8px",
                        background:
                          listing.status === "active"
                            ? "rgba(121,242,206,0.1)"
                            : listing.status === "sold"
                            ? "rgba(142,232,255,0.1)"
                            : "rgba(255,255,255,0.07)",
                        color:
                          listing.status === "active"
                            ? "#79f2ce"
                            : listing.status === "sold"
                            ? "#8ee8ff"
                            : "rgba(255,255,255,0.62)",
                        fontSize: "10px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                      }}
                    >
                      {listing.status}
                    </span>
                  </div>

                  <div style={{ marginTop: "9px", color: "rgba(255,255,255,0.48)", fontSize: "12px", lineHeight: 1.5 }}>
                    {listing.status === "active" && <>Expires {formatDateTime(listing.expires_at)}</>}
                    {listing.status === "sold" && <>{listing.buyer_name ? `Purchased by ${listing.buyer_name}` : "Sold"} · {formatDateTime(listing.sold_at)}</>}
                    {listing.status === "cancelled" && <>Listing cancelled.</>}
                    {listing.status === "expired" && <>Listing expired without a sale.</>}
                  </div>

                  {listing.status === "active" && (
                    <button
                      type="button"
                      onClick={() => void onCancelListing(listing.listing_id)}
                      disabled={actionLoading}
                      style={{ ...secondaryButton, width: "100%", minHeight: "38px", marginTop: "11px" }}
                    >
                      Cancel Listing
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}
