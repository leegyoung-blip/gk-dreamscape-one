"use client";

import { useMemo, useState } from "react";
import {
  formatDateTime,
  formatNumber,
  type MyPropertyListing,
  type PropertyHolding,
  type PropertyOffering,
  type PropertyRentPayout,
  type PropertyTabStyles,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  dreamTokens: number;
  properties: PropertyOffering[];
  holdings: PropertyHolding[];
  myListings: MyPropertyListing[];
  propertyPortfolioValue: number;
  weeklyRentalIncome: number;
  totalOwnedUnits: number;
  latestRentPayout: PropertyRentPayout | null;
  actionLoading: boolean;
  message: string;
  isMobile: boolean;
  isCompact: boolean;
  onOpenProperty: (property: PropertyOffering) => void;
  onCreateListing: (propertyId: string, askingPrice: number) => Promise<void>;
  onCancelListing: (listingId: string) => Promise<void>;
};

export default function MyPropertiesTab({
  dreamTokens,
  properties,
  holdings,
  myListings,
  propertyPortfolioValue,
  weeklyRentalIncome,
  totalOwnedUnits,
  latestRentPayout,
  actionLoading,
  message,
  isMobile,
  isCompact,
  glassPanel,
  primaryButton,
  secondaryButton,
  onOpenProperty,
  onCreateListing,
  onCancelListing,
}: Props) {
  const [listingPropertyId, setListingPropertyId] = useState<string | null>(null);
  const [askingPrice, setAskingPrice] = useState(0);
  const [localMessage, setLocalMessage] = useState("");

  const activeListingsByProperty = useMemo(() => {
    const map = new Map<string, MyPropertyListing>();
    for (const listing of myListings) {
      if (listing.status === "active") map.set(listing.property_id, listing);
    }
    return map;
  }, [myListings]);

  const activeMyListings = useMemo(
    () => myListings.filter((listing) => listing.status === "active"),
    [myListings]
  );

  const recentMyListings = useMemo(
    () => myListings.filter((listing) => listing.status !== "active").slice(0, 12),
    [myListings]
  );

  const listingProperty = useMemo(
    () => properties.find((property) => property.id === listingPropertyId) || null,
    [properties, listingPropertyId]
  );

  function openListing(property: PropertyOffering) {
    const reference = Math.max(property.current_value, property.listing_price, 1);
    setListingPropertyId(property.id);
    setAskingPrice(reference);
    setLocalMessage("");
  }

  async function submitListing() {
    if (!listingProperty) return;

    const reference = Math.max(listingProperty.current_value, listingProperty.listing_price, 1);
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
            style={{ ...glassPanel, width: "min(620px, 100%)", padding: isMobile ? "22px" : "30px", position: "relative" }}
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

            <p style={{ margin: 0, color: "#ffd18a", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.16em" }}>
              Create Resale Listing
            </p>
            <h2 style={{ margin: "12px 48px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "32px" : "40px", fontWeight: 500 }}>
              {listingProperty.name}
            </h2>
            <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.56)", lineHeight: 1.55 }}>
              List one owned unit for sale to other Dreamscape Exchange users. The listing expires after 7 days if it is not sold.
            </p>

            {(() => {
              const reference = Math.max(listingProperty.current_value, listingProperty.listing_price, 1);
              const min = Math.max(1, Math.round(reference * 0.85));
              const max = Math.max(min, Math.round(reference * 1.15));
              return (
                <>
                  <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "9px" }}>
                    {[
                      ["Reference", `${formatNumber(reference)} DT`],
                      ["Minimum", `${formatNumber(min)} DT`],
                      ["Maximum", `${formatNumber(max)} DT`],
                    ].map(([label, value]) => (
                      <div key={label} style={{ borderRadius: "14px", background: "rgba(255,255,255,0.055)", padding: "12px" }}>
                        <small style={{ color: "rgba(255,255,255,0.45)" }}>{label}</small>
                        <strong style={{ display: "block", marginTop: "5px" }}>{value}</strong>
                      </div>
                    ))}
                  </div>

                  <label style={{ marginTop: "18px", display: "grid", gap: "8px" }}>
                    <span style={{ color: "rgba(255,255,255,0.62)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900 }}>
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

            {localMessage && <p style={{ margin: "12px 0 0", color: "#ffb0b0", fontWeight: 800 }}>{localMessage}</p>}

            <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void submitListing()}
                disabled={actionLoading}
                style={{ ...primaryButton, flex: 1, minWidth: "180px", opacity: actionLoading ? 0.55 : 1 }}
              >
                {actionLoading ? "Creating Listing..." : "List 1 Unit for Resale"}
              </button>
              <button type="button" onClick={() => setListingPropertyId(null)} disabled={actionLoading} style={{ ...secondaryButton, minWidth: "110px" }}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      <div style={{ display: "grid", gap: "18px" }}>
        <section data-milo-guide="property-my-summary" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: "12px" }}>
          {[
            { label: "Cash Holdings", value: `${formatNumber(dreamTokens)} DT`, note: "Available to invest" },
            { label: "Property Value", value: `${formatNumber(propertyPortfolioValue)} DT`, note: "Current reference value" },
            { label: "Weekly Rent Rate", value: `${formatNumber(weeklyRentalIncome)} DT`, note: "Automatic Monday payout" },
            { label: "Units Owned", value: `${totalOwnedUnits}`, note: "Across all properties" },
          ].map((item) => (
            <article key={item.label} style={{ ...glassPanel, padding: isMobile ? "16px" : "20px" }}>
              <span style={{ color: "rgba(255,255,255,0.48)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 850 }}>{item.label}</span>
              <strong style={{ display: "block", marginTop: "9px", fontSize: isMobile ? "21px" : "27px", letterSpacing: "-0.04em" }}>{item.value}</strong>
              <span style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,0.4)", fontSize: "11px", lineHeight: 1.4 }}>{item.note}</span>
            </article>
          ))}
        </section>

        <section
          style={{
            ...glassPanel,
            padding: isMobile ? "14px 16px" : "17px 20px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            gap: "10px",
            alignItems: isMobile ? "flex-start" : "center",
          }}
        >
          <div>
            <strong style={{ color: "#79f2ce", fontSize: "13px" }}>Rental income is paid automatically in DT.</strong>
            <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.52)", fontSize: "12px", lineHeight: 1.5 }}>
              Every Monday, the server pays one week of rent for the units held at payout time.
            </p>
          </div>
          <div style={{ flexShrink: 0, textAlign: isMobile ? "left" : "right" }}>
            <span style={{ display: "block", color: "rgba(255,255,255,0.42)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 850 }}>
              Last rental payout
            </span>
            <strong style={{ display: "block", marginTop: "4px", color: latestRentPayout ? "#79f2ce" : "rgba(255,255,255,0.6)", fontSize: "13px" }}>
              {latestRentPayout ? `+${formatNumber(latestRentPayout.amount)} DT · ${formatDateTime(latestRentPayout.paid_at)}` : "No payout yet"}
            </strong>
          </div>
        </section>

        {message && (
          <div style={{ padding: "13px 15px", borderRadius: "14px", border: "1px solid rgba(255,209,138,0.18)", background: "rgba(255,209,138,0.07)", color: "#ffe5bb", fontSize: "13px", fontWeight: 750, lineHeight: 1.5 }}>
            {message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)", gap: "18px", alignItems: "start" }}>
          <section style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>Your Portfolio</p>
            <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "42px", fontWeight: 500 }}>
              My Property Units
            </h2>

            {holdings.length === 0 ? (
              <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.58)", lineHeight: 1.6 }}>You have not purchased a property unit yet.</p>
            ) : (
              <div style={{ marginTop: "18px", display: "grid", gap: "10px" }}>
                {holdings.map((holding) => {
                  const property = properties.find((item) => item.id === holding.property_id);
                  if (!property) return null;
                  return (
                    <button
                      key={holding.id}
                      type="button"
                      onClick={() => onOpenProperty(property)}
                      style={{
                        borderRadius: "17px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.055)",
                        color: "white",
                        padding: "15px",
                        display: "grid",
                        gridTemplateColumns: "minmax(0,1fr) auto",
                        gap: "12px",
                        alignItems: "center",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: "block" }}>{property.name}</strong>
                        <small style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.48)" }}>
                          {property.district} · {holding.quantity} unit{holding.quantity === 1 ? "" : "s"}
                        </small>
                      </span>
                      <span style={{ textAlign: "right" }}>
                        <strong style={{ color: "#ffd18a", whiteSpace: "nowrap" }}>{formatNumber(property.current_value * holding.quantity)} DT</strong>
                        <small style={{ display: "block", marginTop: "5px", color: "#8ee8ff", whiteSpace: "nowrap" }}>
                          +{formatNumber(property.weekly_rent * holding.quantity)} DT/week
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section data-milo-guide="property-my-listings" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
            <p style={{ margin: 0, color: "#79f2ce", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>Manage Ownership</p>
            <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "42px", fontWeight: 500 }}>
              Sell My Units
            </h2>
            <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.55 }}>
              List one owned unit at a time. Asking prices are limited to 85–115% of the current reference value.
            </p>

            {holdings.length === 0 ? (
              <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.55)" }}>Purchase a property before creating a resale listing.</p>
            ) : (
              <div style={{ marginTop: "17px", display: "grid", gap: "10px" }}>
                {holdings.map((holding) => {
                  const property = properties.find((item) => item.id === holding.property_id);
                  if (!property) return null;
                  const active = activeListingsByProperty.get(property.id);
                  return (
                    <article key={holding.id} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                        <span>
                          <strong style={{ display: "block" }}>{property.name}</strong>
                          <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>
                            {holding.quantity} unit{holding.quantity === 1 ? "" : "s"} owned · Reference {formatNumber(Math.max(property.current_value, property.listing_price))} DT
                          </small>
                        </span>
                        {active && <span style={{ borderRadius: "999px", padding: "5px 8px", background: "rgba(255,209,138,0.1)", color: "#ffd18a", fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>Listed</span>}
                      </div>

                      {active ? (
                        <div style={{ marginTop: "11px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>
                            Asking <strong style={{ color: "#ffd18a" }}>{formatNumber(active.asking_price)} DT</strong>
                          </span>
                          <button type="button" onClick={() => void onCancelListing(active.listing_id)} disabled={actionLoading} style={{ ...secondaryButton, minHeight: "36px", padding: "0 13px", fontSize: "12px" }}>
                            Cancel Listing
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => openListing(property)} disabled={actionLoading} style={{ ...primaryButton, width: "100%", minHeight: "40px", marginTop: "11px" }}>
                          List 1 Unit for Resale
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, color: "#ffd18a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>My Resale Activity</p>
              <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "32px" : "39px", fontWeight: 500 }}>My Listings</h2>
            </div>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>{activeMyListings.length} active</span>
          </div>

          {activeMyListings.length === 0 && recentMyListings.length === 0 ? (
            <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.55)" }}>You have not created any resale listings yet.</p>
          ) : (
            <div className="milo-scrollbar" style={{ marginTop: "17px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: "9px", maxHeight: "520px", overflowY: "auto", paddingRight: "3px" }}>
              {[...activeMyListings, ...recentMyListings].map((listing) => (
                <article key={listing.listing_id} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block" }}>{listing.property_name}</strong>
                      <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>
                        {formatNumber(listing.asking_price)} DT · created {formatDateTime(listing.created_at)}
                      </small>
                    </span>
                    <span style={{ flexShrink: 0, borderRadius: "999px", padding: "5px 8px", background: listing.status === "active" ? "rgba(121,242,206,0.1)" : listing.status === "sold" ? "rgba(142,232,255,0.1)" : "rgba(255,255,255,0.07)", color: listing.status === "active" ? "#79f2ce" : listing.status === "sold" ? "#8ee8ff" : "rgba(255,255,255,0.62)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>
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
                    <button type="button" onClick={() => void onCancelListing(listing.listing_id)} disabled={actionLoading} style={{ ...secondaryButton, width: "100%", minHeight: "38px", marginTop: "11px" }}>
                      Cancel Listing
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
