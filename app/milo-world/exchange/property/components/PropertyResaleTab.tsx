"use client";

import { useMemo, useState } from "react";
import {
  formatDateTime,
  formatNumber,
  getPropertyPreviewImage,
  titleCase,
  type PropertyOffering,
  type PropertyResaleListing,
  type PropertyTabStyles,
  type RecentPropertySale,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  properties: PropertyOffering[];
  resaleListings: PropertyResaleListing[];
  recentSales: RecentPropertySale[];
  dreamTokens: number;
  actionLoading: boolean;
  marketLoading: boolean;
  message: string;
  isMobile: boolean;
  isCompact: boolean;
  onRefresh: () => void;
  onBuy: (listing: PropertyResaleListing) => Promise<void>;
  onOpenProperty: (property: PropertyOffering) => void;
};

type ResaleView = "listings" | "sales";
type ListingFilter = "all" | "homes" | "commercial" | "below-value" | "affordable";
type ListingSort = "best-value" | "lowest-price" | "highest-rent" | "most-upgraded" | "ending-soon";
type SalesFilter = "all" | "homes" | "commercial" | "owner-resale";

function median(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (clean.length === 0) return 0;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 === 0 ? (clean[mid - 1] + clean[mid]) / 2 : clean[mid];
}

function propertyGroup(type: string) {
  const normalized = String(type || "").toLowerCase();
  return normalized === "apartment" || normalized === "landed" ? "homes" : "commercial";
}

function priceDifferencePct(askingPrice: number, currentValue: number) {
  const reference = Math.max(1, Number(currentValue || 0));
  return Math.round(((Number(askingPrice || 0) - reference) / reference) * 100);
}

function listingTone(diffPct: number) {
  if (diffPct <= -5) {
    return {
      label: `${Math.abs(diffPct)}% below value`,
      color: "#79f2ce",
      background: "rgba(121,242,206,0.10)",
      border: "rgba(121,242,206,0.18)",
    };
  }
  if (diffPct < 5) {
    return {
      label: diffPct < 0 ? `${Math.abs(diffPct)}% below value` : diffPct > 0 ? `${diffPct}% above value` : "At current value",
      color: "#8ee8ff",
      background: "rgba(142,232,255,0.09)",
      border: "rgba(142,232,255,0.17)",
    };
  }
  return {
    label: `${diffPct}% above value`,
    color: "#ffd18a",
    background: "rgba(255,209,138,0.09)",
    border: "rgba(255,209,138,0.17)",
  };
}

export default function PropertyResaleTab({
  properties,
  resaleListings,
  recentSales,
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
  onOpenProperty,
}: Props) {
  const [view, setView] = useState<ResaleView>("listings");
  const [listingFilter, setListingFilter] = useState<ListingFilter>("all");
  const [listingSort, setListingSort] = useState<ListingSort>("best-value");
  const [salesFilter, setSalesFilter] = useState<SalesFilter>("all");

  const propertyById = useMemo(() => {
    const map = new Map<string, PropertyOffering>();
    for (const property of properties) map.set(property.id, property);
    return map;
  }, [properties]);

  const recentComparableByProperty = useMemo(() => {
    const map = new Map<string, number>();
    for (const property of properties) {
      const comparablePrices = recentSales
        .filter((sale) => sale.property_id === property.id)
        .slice(0, 8)
        .map((sale) => Number(sale.price_per_unit || 0))
        .filter((value) => value > 0);
      if (comparablePrices.length > 0) map.set(property.id, Math.round(median(comparablePrices)));
    }
    return map;
  }, [properties, recentSales]);

  const summary = useMemo(() => {
    const diffs = resaleListings.map((listing) => priceDifferencePct(listing.asking_price, listing.current_value));
    const belowValue = diffs.filter((value) => value < 0).length;
    const affordable = resaleListings.filter((listing) => Number(listing.asking_price || 0) <= dreamTokens).length;
    const medianAsk = Math.round(median(resaleListings.map((listing) => Number(listing.asking_price || 0))));
    const recentOwnerResales = recentSales.filter((sale) => sale.sale_source === "player_resale").length;

    return {
      listings: resaleListings.length,
      belowValue,
      affordable,
      medianAsk,
      recentOwnerResales,
    };
  }, [resaleListings, recentSales, dreamTokens]);

  const filteredListings = useMemo(() => {
    const next = resaleListings.filter((listing) => {
      if (listingFilter === "all") return true;
      if (listingFilter === "homes") return propertyGroup(listing.property_type) === "homes";
      if (listingFilter === "commercial") return propertyGroup(listing.property_type) === "commercial";
      if (listingFilter === "below-value") return Number(listing.asking_price || 0) < Number(listing.current_value || 0);
      if (listingFilter === "affordable") return Number(listing.asking_price || 0) <= dreamTokens;
      return true;
    });

    return [...next].sort((a, b) => {
      if (listingSort === "lowest-price") return a.asking_price - b.asking_price;
      if (listingSort === "highest-rent") return b.rental_potential - a.rental_potential;
      if (listingSort === "most-upgraded") return b.upgrade_level_total - a.upgrade_level_total;
      if (listingSort === "ending-soon") return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      return priceDifferencePct(a.asking_price, a.current_value) - priceDifferencePct(b.asking_price, b.current_value);
    });
  }, [resaleListings, listingFilter, listingSort, dreamTokens]);

  const filteredSales = useMemo(() => {
    return recentSales.filter((sale) => {
      if (salesFilter === "all") return true;
      if (salesFilter === "homes") return propertyGroup(sale.property_type) === "homes";
      if (salesFilter === "commercial") return propertyGroup(sale.property_type) === "commercial";
      if (salesFilter === "owner-resale") return sale.sale_source === "player_resale";
      return true;
    });
  }, [recentSales, salesFilter]);

  const saleSummary = useMemo(() => {
    const perUnitPrices = filteredSales.map((sale) => Number(sale.price_per_unit || 0)).filter((value) => value > 0);
    const ownerResales = filteredSales.filter((sale) => sale.sale_source === "player_resale").length;
    const totalVolume = filteredSales.reduce((sum, sale) => sum + Number(sale.total_price || 0), 0);
    return {
      sales: filteredSales.length,
      ownerResales,
      medianPrice: Math.round(median(perUnitPrices)),
      totalVolume,
    };
  }, [filteredSales]);

  const filterButton = (active: boolean) => ({
    border: active ? "1px solid rgba(255,209,138,0.38)" : "1px solid rgba(255,255,255,0.09)",
    background: active ? "rgba(255,209,138,0.11)" : "rgba(255,255,255,0.035)",
    color: active ? "#ffd18a" : "rgba(255,255,255,0.64)",
    borderRadius: "999px",
    minHeight: "36px",
    padding: "0 13px",
    fontSize: "11px",
    fontWeight: 900,
    fontFamily: "inherit",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  });

  return (
    <div style={{ display: "grid", gap: "16px", minWidth: 0 }}>
      <section
        data-milo-guide="property-resale-market"
        style={{
          ...glassPanel,
          padding: isMobile ? "16px" : "22px",
          overflow: "hidden",
          border: "1px solid rgba(255,209,138,0.14)",
          background:
            "radial-gradient(circle at 0% 0%, rgba(255,209,138,0.08), transparent 30%), linear-gradient(145deg, rgba(53,33,15,0.18), rgba(5,13,28,0.80))",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "flex-end",
            gap: "14px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>
              Owner Resale Market
            </p>
            <h2 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "39px", fontWeight: 500 }}>
              Find your next property
            </h2>
            <p style={{ margin: "7px 0 0", maxWidth: "760px", color: "rgba(255,255,255,0.50)", fontSize: "12px", lineHeight: 1.55 }}>
              Compare owner listings with current value and recent sales. Upgrades and property condition stay with the exact unit when it changes hands.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={marketLoading || actionLoading}
            style={{ ...secondaryButton, minHeight: "40px", opacity: marketLoading || actionLoading ? 0.55 : 1, flexShrink: 0 }}
          >
            {marketLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        <div
          style={{
            marginTop: "17px",
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))",
            gap: "8px",
          }}
        >
          {([
            ["For Sale", summary.listings, "owner listings"],
            ["Below Value", summary.belowValue, "asking below current value"],
            ["Within Budget", summary.affordable, `${formatNumber(dreamTokens)} DT available`],
            ["Median Ask", summary.medianAsk > 0 ? `${formatNumber(summary.medianAsk)} DT` : "—", `${summary.recentOwnerResales} recent owner resales`],
          ] as Array<[string, string | number, string]>).map(([label, value, detail]) => (
            <div key={label} style={{ minWidth: 0, borderRadius: "15px", border: "1px solid rgba(255,255,255,0.075)", background: "rgba(255,255,255,0.038)", padding: isMobile ? "11px" : "13px" }}>
              <small style={{ display: "block", color: "rgba(255,255,255,0.42)", fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</small>
              <strong style={{ display: "block", marginTop: "4px", fontSize: isMobile ? "18px" : "21px" }}>{value}</strong>
              <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.34)", fontSize: "9px", lineHeight: 1.35 }}>{detail}</small>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "15px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            padding: "4px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.075)",
          }}
        >
          {([
            ["listings", `Listings · ${resaleListings.length}`],
            ["sales", `Recent Sales · ${recentSales.length}`],
          ] as Array<[ResaleView, string]>).map(([id, label]) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                style={{
                  minHeight: "42px",
                  borderRadius: "12px",
                  border: active ? "1px solid rgba(255,209,138,0.20)" : "1px solid transparent",
                  background: active ? "rgba(255,209,138,0.10)" : "transparent",
                  color: active ? "#ffd18a" : "rgba(255,255,255,0.50)",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {message && (
        <div style={{ padding: "12px 14px", borderRadius: "14px", border: "1px solid rgba(255,209,138,0.18)", background: "rgba(255,209,138,0.07)", color: "#ffe5bb", fontSize: "12px", fontWeight: 750, lineHeight: 1.5 }}>
          {message}
        </div>
      )}

      {view === "listings" ? (
        <section style={{ ...glassPanel, padding: isMobile ? "15px" : "20px", minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: "10px" }}>
            <div className="milo-scrollbar" style={{ display: "flex", gap: "7px", overflowX: "auto", paddingBottom: "2px", minWidth: 0 }}>
              {([
                ["all", "All"],
                ["homes", "Homes"],
                ["commercial", "Commercial"],
                ["below-value", "Below Value"],
                ["affordable", "Within Budget"],
              ] as Array<[ListingFilter, string]>).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setListingFilter(id)} style={filterButton(listingFilter === id)}>
                  {label}
                </button>
              ))}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              <span style={{ color: "rgba(255,255,255,0.40)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>Sort</span>
              <select
                value={listingSort}
                onChange={(event) => setListingSort(event.target.value as ListingSort)}
                style={{
                  minHeight: "38px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "#0b1729",
                  color: "white",
                  padding: "0 11px",
                  fontFamily: "inherit",
                  fontSize: "11px",
                  outline: "none",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <option value="best-value">Price vs value</option>
                <option value="lowest-price">Lowest price</option>
                <option value="highest-rent">Highest rent</option>
                <option value="most-upgraded">Most upgraded</option>
                <option value="ending-soon">Ending soon</option>
              </select>
            </label>
          </div>

          {filteredListings.length === 0 ? (
            <div style={{ marginTop: "16px", minHeight: "150px", display: "grid", placeItems: "center", padding: "24px", borderRadius: "18px", border: "1px dashed rgba(255,209,138,0.18)", background: "rgba(255,255,255,0.025)", color: "rgba(255,255,255,0.50)", textAlign: "center" }}>
              {resaleListings.length === 0 ? "No owner-listed properties are available right now." : "No current listings match this filter."}
            </div>
          ) : (
            <div
              style={{
                marginTop: "15px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))",
                gap: "12px",
              }}
            >
              {filteredListings.map((listing) => {
                const property = propertyById.get(listing.property_id);
                const image = getPropertyPreviewImage(property);
                const diffPct = priceDifferencePct(listing.asking_price, listing.current_value);
                const tone = listingTone(diffPct);
                const canAfford = dreamTokens >= listing.asking_price;
                const comparable = recentComparableByProperty.get(listing.property_id) || 0;
                const yieldPct = listing.asking_price > 0 ? Math.round((listing.rental_potential * 52 * 1000) / listing.asking_price) / 10 : 0;

                return (
                  <article
                    key={listing.listing_id}
                    style={{
                      minWidth: 0,
                      overflow: "hidden",
                      borderRadius: "19px",
                      border: diffPct < 0 ? "1px solid rgba(121,242,206,0.17)" : "1px solid rgba(255,255,255,0.09)",
                      background: "linear-gradient(145deg, rgba(255,255,255,0.045), rgba(5,13,28,0.76))",
                    }}
                  >
                    <div style={{ position: "relative", height: isMobile ? "180px" : "160px", background: "rgba(255,209,138,0.04)" }}>
                      {image ? (
                        <button
                          type="button"
                          onClick={() => property && onOpenProperty(property)}
                          style={{ width: "100%", height: "100%", padding: 0, border: 0, background: "transparent", cursor: property ? "pointer" : "default" }}
                        >
                          <img src={image} alt={`${listing.property_name} Unit ${listing.unit_number}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </button>
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.26)", fontSize: "12px" }}>Property preview</div>
                      )}

                      <span style={{ position: "absolute", top: "11px", left: "11px", borderRadius: "999px", padding: "6px 9px", background: "rgba(3,12,21,0.82)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", color: "white", fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>
                        Owner Resale
                      </span>

                      <span style={{ position: "absolute", top: "11px", right: "11px", borderRadius: "999px", padding: "6px 9px", background: tone.background, border: `1px solid ${tone.border}`, backdropFilter: "blur(8px)", color: tone.color, fontSize: "9px", fontWeight: 900 }}>
                        {tone.label}
                      </span>
                    </div>

                    <div style={{ padding: "15px" }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: "17px", lineHeight: 1.2 }}>{listing.property_name}</h3>
                        <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.43)", fontSize: "10px" }}>
                          Unit {listing.unit_number} · {listing.district} · {titleCase(listing.property_type)}
                        </p>
                      </div>

                      <div style={{ marginTop: "13px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "10px" }}>
                        <span>
                          <small style={{ display: "block", color: "rgba(255,255,255,0.40)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Asking Price</small>
                          <strong style={{ display: "block", marginTop: "3px", color: "#ffd18a", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "24px", fontWeight: 500 }}>{formatNumber(listing.asking_price)} DT</strong>
                        </span>
                        <small style={{ color: canAfford ? "#79f2ce" : "rgba(255,255,255,0.40)", fontWeight: 850, fontSize: "10px", textAlign: "right" }}>
                          {canAfford ? "Within your DT balance" : `${formatNumber(listing.asking_price - dreamTokens)} DT short`}
                        </small>
                      </div>

                      <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "7px" }}>
                        {([
                          ["Current Value", `${formatNumber(listing.current_value)} DT`],
                          ["Rent", `${formatNumber(listing.rental_potential)} /wk`],
                          ["Yield", `${yieldPct.toFixed(1)}%`],
                        ] as Array<[string, string]>).map(([label, value]) => (
                          <div key={label} style={{ minWidth: 0, borderRadius: "12px", padding: "9px", background: "rgba(255,255,255,0.038)" }}>
                            <small style={{ display: "block", color: "rgba(255,255,255,0.35)", fontSize: "8px" }}>{label}</small>
                            <strong style={{ display: "block", marginTop: "3px", fontSize: "10px", color: label === "Rent" ? "#8ee8ff" : "white", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</strong>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "10px", alignItems: "center" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", color: "rgba(255,255,255,0.40)", fontSize: "9px" }}>
                            <span>Property quality</span>
                            <span>{Math.round((listing.appeal + listing.quality + listing.efficiency) / 3)}/100</span>
                          </div>
                          <div style={{ marginTop: "5px", height: "5px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                            <div style={{ width: `${Math.max(0, Math.min(100, Math.round((listing.appeal + listing.quality + listing.efficiency) / 3)))}%`, height: "100%", borderRadius: "999px", background: "linear-gradient(90deg,#8ee8ff,#79f2ce)" }} />
                          </div>
                        </div>
                        <span style={{ borderRadius: "999px", padding: "5px 8px", background: "rgba(121,242,206,0.07)", color: "#79f2ce", fontSize: "9px", fontWeight: 900, whiteSpace: "nowrap" }}>
                          {listing.upgrade_level_total}/30 upgrades
                        </span>
                      </div>

                      {comparable > 0 && (
                        <div style={{ marginTop: "10px", borderRadius: "11px", padding: "8px 10px", background: "rgba(142,232,255,0.045)", border: "1px solid rgba(142,232,255,0.08)", color: "rgba(255,255,255,0.51)", fontSize: "9px" }}>
                          Recent comparable sales for this property: <strong style={{ color: "#8ee8ff" }}>{formatNumber(comparable)} DT/unit</strong>
                        </div>
                      )}

                      <div style={{ marginTop: "11px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", gap: "8px", color: "rgba(255,255,255,0.39)", fontSize: "9px" }}>
                        <span>Seller · <strong style={{ color: "rgba(255,255,255,0.66)" }}>{listing.seller_name}</strong></span>
                        <span style={{ textAlign: "right" }}>Ends {formatDateTime(listing.expires_at)}</span>
                      </div>

                      <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: property ? "0.72fr 1.28fr" : "1fr", gap: "8px" }}>
                        {property && (
                          <button type="button" onClick={() => onOpenProperty(property)} style={{ ...secondaryButton, width: "100%", minHeight: "40px", padding: "0 10px", fontSize: "10px" }}>
                            View Property
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void onBuy(listing)}
                          disabled={actionLoading || !canAfford}
                          style={{
                            ...primaryButton,
                            width: "100%",
                            minHeight: "40px",
                            padding: "0 10px",
                            fontSize: "10px",
                            border: "1px solid rgba(255,209,138,0.28)",
                            background: canAfford ? "linear-gradient(135deg, rgba(181,110,37,0.48), rgba(255,209,138,0.18))" : "rgba(255,255,255,0.06)",
                            opacity: actionLoading || !canAfford ? 0.48 : 1,
                          }}
                        >
                          {actionLoading ? "Processing..." : canAfford ? "Buy This Unit" : "Not Enough DT"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section data-milo-guide="property-recent-sales" style={{ ...glassPanel, padding: isMobile ? "15px" : "20px", minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: "12px", alignItems: isMobile ? "stretch" : "flex-end" }}>
            <div>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 900 }}>Market Evidence</p>
              <h3 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "27px" : "32px", fontWeight: 500 }}>What properties actually sold for</h3>
              <p style={{ margin: "6px 0 0", maxWidth: "740px", color: "rgba(255,255,255,0.46)", fontSize: "11px", lineHeight: 1.5 }}>
                Completed sales give you a reference point before buying. Exact-unit upgrades and condition can still make two sale prices different.
              </p>
            </div>

            <div className="milo-scrollbar" style={{ display: "flex", gap: "7px", overflowX: "auto", paddingBottom: "2px" }}>
              {([
                ["all", "All Sales"],
                ["homes", "Homes"],
                ["commercial", "Commercial"],
                ["owner-resale", "Owner Resales"],
              ] as Array<[SalesFilter, string]>).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setSalesFilter(id)} style={filterButton(salesFilter === id)}>{label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "15px", display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: "8px" }}>
            {([
              ["Completed Sales", saleSummary.sales],
              ["Owner Resales", saleSummary.ownerResales],
              ["Median / Unit", saleSummary.medianPrice > 0 ? `${formatNumber(saleSummary.medianPrice)} DT` : "—"],
              ["Recorded Volume", saleSummary.totalVolume > 0 ? `${formatNumber(saleSummary.totalVolume)} DT` : "—"],
            ] as Array<[string, string | number]>).map(([label, value]) => (
              <div key={label} style={{ borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.035)", padding: "11px" }}>
                <small style={{ display: "block", color: "rgba(255,255,255,0.38)", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</small>
                <strong style={{ display: "block", marginTop: "4px", fontSize: isMobile ? "16px" : "18px" }}>{value}</strong>
              </div>
            ))}
          </div>

          {filteredSales.length === 0 ? (
            <div style={{ marginTop: "16px", minHeight: "130px", display: "grid", placeItems: "center", borderRadius: "17px", border: "1px dashed rgba(142,232,255,0.17)", color: "rgba(255,255,255,0.48)" }}>
              No completed sales match this filter yet.
            </div>
          ) : (
            <div className="milo-scrollbar" style={{ marginTop: "15px", maxHeight: isMobile ? "520px" : "600px", overflowY: "auto", paddingRight: "3px", display: "grid", gap: "7px" }}>
              {filteredSales.map((sale) => {
                const property = propertyById.get(sale.property_id);
                const image = getPropertyPreviewImage(property);
                const current = Number(property?.market_value || property?.current_value || 0);
                const soldPerUnit = Number(sale.price_per_unit || 0);
                const vsCurrent = current > 0 && soldPerUnit > 0 ? Math.round(((soldPerUnit - current) / current) * 100) : null;

                return (
                  <article
                    key={`${sale.sale_source}-${sale.sale_id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "58px minmax(0,1fr)" : "66px minmax(0,1fr) auto",
                      gap: "11px",
                      alignItems: "center",
                      minWidth: 0,
                      borderRadius: "15px",
                      border: "1px solid rgba(255,255,255,0.075)",
                      background: "rgba(255,255,255,0.035)",
                      padding: "9px",
                    }}
                  >
                    <div style={{ width: isMobile ? "58px" : "66px", height: isMobile ? "58px" : "66px", borderRadius: "12px", overflow: "hidden", background: "rgba(142,232,255,0.05)" }}>
                      {image ? <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                          {sale.property_name}{sale.unit_number ? ` · Unit ${sale.unit_number}` : ""}
                        </strong>
                        <span style={{ borderRadius: "999px", padding: "3px 6px", background: sale.sale_source === "player_resale" ? "rgba(255,209,138,0.08)" : "rgba(142,232,255,0.07)", color: sale.sale_source === "player_resale" ? "#ffd18a" : "#8ee8ff", fontSize: "7px", fontWeight: 900, textTransform: "uppercase" }}>
                          {sale.sale_source === "player_resale" ? "Owner Resale" : "New Sale"}
                        </span>
                      </div>

                      <div style={{ marginTop: "4px", display: "flex", gap: "8px", flexWrap: "wrap", color: "rgba(255,255,255,0.39)", fontSize: "9px" }}>
                        <span>{sale.district} · {titleCase(sale.property_type)}</span>
                        <span>{formatDateTime(sale.sold_at)}</span>
                      </div>

                      <div style={{ marginTop: "5px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "baseline" }}>
                        <strong style={{ color: "#ffd18a", fontSize: "13px" }}>{formatNumber(sale.total_price)} DT</strong>
                        {sale.quantity > 1 && <span style={{ color: "rgba(255,255,255,0.43)", fontSize: "9px" }}>{formatNumber(sale.price_per_unit)} DT/unit · {sale.quantity} units</span>}
                        {vsCurrent !== null && (
                          <span style={{ color: vsCurrent <= 0 ? "#79f2ce" : "#ffd18a", fontSize: "9px", fontWeight: 850 }}>
                            {vsCurrent === 0 ? "at today's value" : `${Math.abs(vsCurrent)}% ${vsCurrent < 0 ? "below" : "above"} today's value`}
                          </span>
                        )}
                      </div>

                      <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.34)", fontSize: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sale.seller_name ? `${sale.seller_name} → ${sale.buyer_name}` : `${sale.buyer_name} purchased from Dreamscape`}
                      </small>
                    </div>

                    {!isMobile && property && (
                      <button type="button" onClick={() => onOpenProperty(property)} style={{ ...secondaryButton, minHeight: "34px", padding: "0 10px", fontSize: "9px" }}>
                        View Property
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
