"use client";

import { useMemo, useState } from "react";
import PropertyManagementModal from "./PropertyManagementModal";
import {
  formatDateTime,
  formatNumber,
  getPropertyUnitPreviewImage,
  type MyPropertyListing,
  type PropertyHolding,
  type PropertyOffering,
  type PropertyTabStyles,
  type PropertyUnit,
  type PropertyUpgradeCatalogRow,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  dreamTokens: number;
  properties: PropertyOffering[];
  holdings: PropertyHolding[];
  units: PropertyUnit[];
  upgradeCatalog: PropertyUpgradeCatalogRow[];
  myListings: MyPropertyListing[];
  propertyPortfolioValue: number;
  rentalPotential: number;
  totalOwnedUnits: number;
  actionLoading: boolean;
  message: string;
  isMobile: boolean;
  isCompact: boolean;
  onUpgradeUnit: (unitId: string, category: string) => Promise<void>;
  onCreateListing: (propertyId: string, askingPrice: number) => Promise<void>;
  onCancelListing: (listingId: string) => Promise<void>;
};

export default function MyPropertiesTab({
  dreamTokens,
  properties,
  holdings,
  units,
  upgradeCatalog,
  myListings,
  propertyPortfolioValue,
  rentalPotential,
  totalOwnedUnits,
  actionLoading,
  message,
  isMobile,
  isCompact,
  glassPanel,
  primaryButton,
  secondaryButton,
  onUpgradeUnit,
  onCreateListing,
  onCancelListing,
}: Props) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [listingPropertyId, setListingPropertyId] = useState<string | null>(null);
  const [askingPrice, setAskingPrice] = useState(0);
  const [localMessage, setLocalMessage] = useState("");

  const selectedUnit = units.find((unit) => unit.unit_id === selectedUnitId) || null;

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
    () => myListings.filter((listing) => listing.status !== "active").slice(0, 8),
    [myListings]
  );

  const averageUpgradeLevel =
    units.length > 0
      ? units.reduce((sum, unit) => sum + unit.upgrade_level_total, 0) /
        units.length
      : 0;

  function openListing(property: PropertyOffering) {
    const managedValues = units
      .filter((unit) => unit.property_id === property.id)
      .map((unit) => unit.current_value);
    const reference = Math.max(
      ...managedValues,
      Number(property.current_value || 0),
      Number(property.listing_price || 0),
      1
    );
    setListingPropertyId(property.id);
    setAskingPrice(reference);
    setLocalMessage("");
  }

  async function submitListing() {
    const property = properties.find((item) => item.id === listingPropertyId);
    if (!property) return;

    const managedValues = units
      .filter((unit) => unit.property_id === property.id)
      .map((unit) => unit.current_value);
    const reference = Math.max(
      ...managedValues,
      Number(property.current_value || 0),
      Number(property.listing_price || 0),
      1
    );
    const min = Math.max(1, Math.round(reference * 0.85));
    const max = Math.max(min, Math.round(reference * 1.15));
    const price = Math.round(Number(askingPrice || 0));

    if (price < min || price > max) {
      setLocalMessage(
        `Choose an asking price between ${formatNumber(min)} and ${formatNumber(max)} DT.`
      );
      return;
    }

    await onCreateListing(property.id, price);
    setListingPropertyId(null);
    setLocalMessage("");
  }

  const listingProperty = properties.find((item) => item.id === listingPropertyId) || null;

  return (
    <>
      {selectedUnit && (
        <PropertyManagementModal
          unit={selectedUnit}
          properties={properties}
          catalog={upgradeCatalog}
          dreamTokens={dreamTokens}
          actionLoading={actionLoading}
          isMobile={isMobile}
          glassPanel={glassPanel}
          primaryButton={primaryButton}
          secondaryButton={secondaryButton}
          onClose={() => setSelectedUnitId(null)}
          onUpgrade={async (unitId, category) => {
            await onUpgradeUnit(unitId, category);
          }}
        />
      )}

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
              style={{ position: "absolute", top: "16px", right: "16px", width: "38px", height: "38px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.07)", color: "white", cursor: "pointer", fontSize: "20px" }}
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
              List one unit for sale to another Exchange user. Until the exact-unit resale selector arrives in Phase 2, the compatibility layer transfers the least-upgraded matching unit when you own several identical units.
            </p>

            {(() => {
              const managedValues = units
                .filter((unit) => unit.property_id === listingProperty.id)
                .map((unit) => unit.current_value);
              const reference = Math.max(
                ...managedValues,
                Number(listingProperty.current_value || 0),
                Number(listingProperty.listing_price || 0),
                1
              );
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
                      style={{ height: "48px", borderRadius: "14px", border: "1px solid rgba(255,209,138,0.24)", background: "rgba(255,255,255,0.08)", color: "white", padding: "0 15px", fontSize: "16px", outline: "none" }}
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
            ["Cash", `${formatNumber(dreamTokens)} DT`, "Available to invest"],
            ["Property Value", `${formatNumber(propertyPortfolioValue)} DT`, "Includes upgrade value"],
            ["Rent Potential", `${formatNumber(rentalPotential)} DT/wk`, "Potential, not automatic income"],
            ["Owned Units", `${totalOwnedUnits}`, `${averageUpgradeLevel.toFixed(1)} upgrade levels avg.`],
          ].map(([label, value, note]) => (
            <article key={label} style={{ ...glassPanel, padding: isMobile ? "16px" : "20px", minWidth: 0 }}>
              <span style={{ color: "rgba(255,255,255,0.48)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 850 }}>{label}</span>
              <strong style={{ display: "block", marginTop: "8px", fontSize: isMobile ? "20px" : "26px", letterSpacing: "-0.03em", color: label === "Property Value" ? "#ffd18a" : "white", overflowWrap: "anywhere" }}>{value}</strong>
              <small style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,0.42)", lineHeight: 1.35 }}>{note}</small>
            </article>
          ))}
        </section>

        {message && (
          <div style={{ padding: "13px 15px", borderRadius: "14px", border: "1px solid rgba(255,209,138,0.18)", background: "rgba(255,209,138,0.07)", color: "#ffe5bb", fontSize: "13px", fontWeight: 750, lineHeight: 1.5 }}>
            {message}
          </div>
        )}

        <section data-milo-guide="property-unit-management" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end", gap: "12px" }}>
            <div>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>
                Property Management
              </p>
              <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "42px", fontWeight: 500 }}>
                My Property Units
              </h2>
              <p style={{ margin: "9px 0 0", maxWidth: "760px", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.55 }}>
                Each owned unit is now a persistent asset. Open a unit to improve its value, rent potential, appeal, quality and efficiency.
              </p>
            </div>
            <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "12px" }}>
              6 upgrade paths · 5 levels each
            </span>
          </div>

          {units.length === 0 ? (
            <div style={{ marginTop: "18px", minHeight: "150px", display: "grid", placeItems: "center", padding: "24px", borderRadius: "18px", border: "1px dashed rgba(132,218,255,0.18)", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
              Purchase a unit from the Property Map to start managing and upgrading it.
            </div>
          ) : (
            <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: "14px" }}>
              {units.map((unit) => {
                const image = getPropertyUnitPreviewImage(unit, properties);
                const valueGain = unit.current_value - unit.base_value;
                return (
                  <article key={unit.unit_id} style={{ overflow: "hidden", borderRadius: "20px", border: "1px solid rgba(132,218,255,0.14)", background: "linear-gradient(145deg, rgba(8,45,73,0.22), rgba(5,13,28,0.82))" }}>
                    {image && (
                      <div style={{ height: "165px", overflow: "hidden", position: "relative" }}>
                        <img src={image} alt={`${unit.property_name} Unit ${unit.unit_number}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <span style={{ position: "absolute", left: "12px", bottom: "12px", minHeight: "26px", display: "inline-flex", alignItems: "center", padding: "0 9px", borderRadius: "999px", background: "rgba(3,12,21,0.82)", border: "1px solid rgba(142,232,255,0.24)", color: "#8ee8ff", fontSize: "10px", fontWeight: 900 }}>
                          Unit {unit.unit_number}
                        </span>
                      </div>
                    )}
                    <div style={{ padding: "17px" }}>
                      <h3 style={{ margin: 0, fontSize: "19px" }}>{unit.property_name}</h3>
                      <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>{unit.district} · {unit.unit_type}</p>

                      <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div style={{ borderRadius: "13px", padding: "11px", background: "rgba(255,255,255,0.045)" }}>
                          <small style={{ color: "rgba(255,255,255,0.42)" }}>Value</small>
                          <strong style={{ display: "block", marginTop: "4px", color: "#ffd18a" }}>{formatNumber(unit.current_value)} DT</strong>
                          {valueGain > 0 && <small style={{ display: "block", marginTop: "4px", color: "#79f2ce" }}>+{formatNumber(valueGain)}</small>}
                        </div>
                        <div style={{ borderRadius: "13px", padding: "11px", background: "rgba(255,255,255,0.045)" }}>
                          <small style={{ color: "rgba(255,255,255,0.42)" }}>Rent Potential</small>
                          <strong style={{ display: "block", marginTop: "4px", color: "#8ee8ff" }}>{formatNumber(unit.rental_potential)} DT/wk</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", color: "rgba(255,255,255,0.48)", fontSize: "11px" }}>
                        <span>Upgrades {unit.upgrade_level_total}/30</span>
                        <span>Appeal {unit.appeal}</span>
                      </div>

                      <button type="button" onClick={() => setSelectedUnitId(unit.unit_id)} style={{ ...primaryButton, width: "100%", minHeight: "42px", marginTop: "14px" }}>
                        View & Upgrade
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section data-milo-guide="property-upgrade-overview" style={{ ...glassPanel, padding: isMobile ? "18px" : "22px", border: "1px solid rgba(121,242,206,0.15)", background: "linear-gradient(145deg, rgba(121,242,206,0.05), rgba(5,13,28,0.74))" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.2fr) minmax(280px,0.8fr)", gap: "18px", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: "#79f2ce", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>How Upgrades Work</p>
              <h3 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "29px" : "35px", fontWeight: 500 }}>Build a better asset, not just a bigger number</h3>
              <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.56)", lineHeight: 1.6, fontSize: "13px" }}>
                Interior, fit-out, facilities, smart systems, efficiency and amenities affect different stats. Property value and rent potential rise according to the upgrades installed on that specific unit.
              </p>
            </div>
            <div style={{ borderRadius: "17px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", padding: "15px", color: "rgba(255,255,255,0.58)", fontSize: "12px", lineHeight: 1.55 }}>
              <strong style={{ display: "block", color: "#ffd18a", marginBottom: "5px" }}>No automatic rent</strong>
              Rent shown here is now market potential only. Phase 2 adds rental listings, Dreamscape resident applicants, leases and actual rent collection.
            </div>
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)", gap: "18px", alignItems: "start" }}>
          <section data-milo-guide="property-my-listings" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
            <p style={{ margin: 0, color: "#79f2ce", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>Manage Ownership</p>
            <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "40px", fontWeight: 500 }}>Sell My Units</h2>
            <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.55 }}>
              List one owned unit at a time. Asking prices remain limited to 85–115% of the managed reference value.
            </p>

            {holdings.length === 0 ? (
              <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.55)" }}>Purchase a property before creating a resale listing.</p>
            ) : (
              <div style={{ marginTop: "17px", display: "grid", gap: "10px" }}>
                {holdings.map((holding) => {
                  const property = properties.find((item) => item.id === holding.property_id);
                  if (!property) return null;
                  const active = activeListingsByProperty.get(property.id);
                  const managedValue = Math.max(
                    ...units.filter((unit) => unit.property_id === property.id).map((unit) => unit.current_value),
                    Number(property.current_value || 0),
                    Number(property.listing_price || 0)
                  );

                  return (
                    <article key={holding.id} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                        <span>
                          <strong style={{ display: "block" }}>{property.name}</strong>
                          <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>
                            {holding.quantity} unit{holding.quantity === 1 ? "" : "s"} owned · Managed reference {formatNumber(managedValue)} DT
                          </small>
                        </span>
                        {active && <span style={{ borderRadius: "999px", padding: "5px 8px", background: "rgba(255,209,138,0.1)", color: "#ffd18a", fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>Listed</span>}
                      </div>

                      {active ? (
                        <div style={{ marginTop: "11px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>Asking <strong style={{ color: "#ffd18a" }}>{formatNumber(active.asking_price)} DT</strong></span>
                          <button type="button" onClick={() => void onCancelListing(active.listing_id)} disabled={actionLoading} style={{ ...secondaryButton, minHeight: "36px", padding: "0 13px", fontSize: "12px" }}>Cancel Listing</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => openListing(property)} disabled={actionLoading} style={{ ...primaryButton, width: "100%", minHeight: "40px", marginTop: "11px" }}>List 1 Unit for Resale</button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

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
              <div className="milo-scrollbar" style={{ marginTop: "17px", display: "grid", gap: "9px", maxHeight: "520px", overflowY: "auto", paddingRight: "3px" }}>
                {[...activeMyListings, ...recentMyListings].map((listing) => (
                  <article key={listing.listing_id} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: "block" }}>{listing.property_name}</strong>
                        <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>{formatNumber(listing.asking_price)} DT · created {formatDateTime(listing.created_at)}</small>
                      </span>
                      <span style={{ flexShrink: 0, borderRadius: "999px", padding: "5px 8px", background: listing.status === "active" ? "rgba(121,242,206,0.1)" : listing.status === "sold" ? "rgba(142,232,255,0.1)" : "rgba(255,255,255,0.07)", color: listing.status === "active" ? "#79f2ce" : listing.status === "sold" ? "#8ee8ff" : "rgba(255,255,255,0.62)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>{listing.status}</span>
                    </div>
                    <div style={{ marginTop: "9px", color: "rgba(255,255,255,0.48)", fontSize: "12px", lineHeight: 1.5 }}>
                      {listing.status === "active" && <>Expires {formatDateTime(listing.expires_at)}</>}
                      {listing.status === "sold" && <>{listing.buyer_name ? `Purchased by ${listing.buyer_name}` : "Sold"} · {formatDateTime(listing.sold_at)}</>}
                      {listing.status === "cancelled" && <>Listing cancelled.</>}
                      {listing.status === "expired" && <>Listing expired without a sale.</>}
                    </div>
                    {listing.status === "active" && <button type="button" onClick={() => void onCancelListing(listing.listing_id)} disabled={actionLoading} style={{ ...secondaryButton, width: "100%", minHeight: "38px", marginTop: "11px" }}>Cancel Listing</button>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
