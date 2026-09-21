"use client";

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
  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section data-milo-guide="property-resale-market" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
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
            <p style={{ margin: 0, color: "#ffd18a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>
              Secondary Market
            </p>
            <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "42px", fontWeight: 500 }}>
              Property Resales
            </h2>
            <p style={{ margin: "10px 0 0", maxWidth: "760px", color: "rgba(255,255,255,0.52)", fontSize: "13px", lineHeight: 1.55 }}>
              Buy virtual properties listed by other Dreamscape owners. Resale purchases transfer an existing unit and do not reduce Dreamscape’s primary inventory.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={marketLoading || actionLoading}
            style={{ ...secondaryButton, minHeight: "42px", opacity: marketLoading || actionLoading ? 0.55 : 1 }}
          >
            {marketLoading ? "Refreshing..." : "↻ Refresh Market"}
          </button>
        </div>

        {message && (
          <div style={{ marginTop: "16px", padding: "13px 15px", borderRadius: "14px", border: "1px solid rgba(255,209,138,0.18)", background: "rgba(255,209,138,0.07)", color: "#ffe5bb", fontSize: "13px", fontWeight: 750, lineHeight: 1.5 }}>
            {message}
          </div>
        )}

        {resaleListings.length === 0 ? (
          <div style={{ marginTop: "20px", minHeight: "150px", display: "grid", placeItems: "center", padding: "24px", borderRadius: "18px", border: "1px dashed rgba(255,209,138,0.2)", background: "rgba(255,255,255,0.025)", color: "rgba(255,255,255,0.52)", textAlign: "center" }}>
            No resale properties are available right now.
          </div>
        ) : (
          <div
            style={{
              marginTop: "20px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2, minmax(0,1fr))" : "repeat(3, minmax(0,1fr))",
              gap: "14px",
            }}
          >
            {resaleListings.map((listing) => {
              const property = properties.find((item) => item.id === listing.property_id);
              const image = getPropertyPreviewImage(property);
              const primaryReference = Math.max(listing.primary_listing_price, 1);
              const difference = listing.asking_price - primaryReference;
              const differencePct = Math.round((difference / primaryReference) * 100);
              const canAfford = dreamTokens >= listing.asking_price;

              return (
                <article key={listing.listing_id} style={{ overflow: "hidden", borderRadius: "20px", border: "1px solid rgba(255,209,138,0.16)", background: "linear-gradient(145deg, rgba(85,49,18,0.24), rgba(5,13,28,0.82))" }}>
                  {image && (
                    <button
                      type="button"
                      onClick={() => property && onOpenProperty(property)}
                      style={{ width: "100%", height: "175px", overflow: "hidden", padding: 0, border: 0, background: "transparent", cursor: property ? "pointer" : "default" }}
                    >
                      <img src={image} alt={`${listing.property_name} resale preview`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>
                  )}

                  <div style={{ padding: "17px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                      <div>
                        <span style={{ display: "inline-flex", minHeight: "24px", alignItems: "center", padding: "0 9px", borderRadius: "999px", background: "rgba(255,209,138,0.09)", color: "#ffd18a", fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                          Resale
                        </span>
                        <h3 style={{ margin: "9px 0 0", fontSize: "19px" }}>{listing.property_name}</h3>
                        <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>
                          {listing.district} · {titleCase(listing.property_type)}
                        </p>
                      </div>

                      {differencePct !== 0 && (
                        <span style={{ flexShrink: 0, borderRadius: "999px", padding: "6px 9px", background: difference < 0 ? "rgba(121,242,206,0.1)" : "rgba(255,209,138,0.08)", color: difference < 0 ? "#79f2ce" : "#ffd18a", fontSize: "10px", fontWeight: 900 }}>
                          {difference < 0 ? `${Math.abs(differencePct)}% below primary` : `${differencePct}% above primary`}
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: "15px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ borderRadius: "13px", padding: "11px", background: "rgba(255,255,255,0.045)" }}>
                        <small style={{ color: "rgba(255,255,255,0.42)" }}>Asking</small>
                        <strong style={{ display: "block", marginTop: "4px", color: "#ffd18a" }}>{formatNumber(listing.asking_price)} DT</strong>
                      </div>
                      <div style={{ borderRadius: "13px", padding: "11px", background: "rgba(255,255,255,0.045)" }}>
                        <small style={{ color: "rgba(255,255,255,0.42)" }}>Primary Price</small>
                        <strong style={{ display: "block", marginTop: "4px" }}>{formatNumber(listing.primary_listing_price)} DT</strong>
                      </div>
                    </div>

                    <div style={{ marginTop: "13px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
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
                        background: canAfford ? "linear-gradient(135deg, rgba(181,110,37,0.48), rgba(255,209,138,0.18))" : "rgba(255,255,255,0.06)",
                        opacity: actionLoading || !canAfford ? 0.5 : 1,
                      }}
                    >
                      {actionLoading ? "Processing..." : canAfford ? `Buy for ${formatNumber(listing.asking_price)} DT` : `Need ${formatNumber(listing.asking_price - dreamTokens)} more DT`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section data-milo-guide="property-recent-sales" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
        <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>
          Public Market Record
        </p>
        <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "42px", fontWeight: 500 }}>
          Recent Property Sales
        </h2>
        <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.55 }}>
          Completed Dreamscape property purchases are visible to all Exchange users so you can compare recent market activity.
        </p>

        {recentSales.length === 0 ? (
          <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.58)" }}>No completed property sales yet.</p>
        ) : (
          <div className="milo-scrollbar" style={{ marginTop: "18px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: "9px", maxHeight: "620px", overflowY: "auto", paddingRight: "4px" }}>
            {recentSales.map((sale) => (
              <article key={sale.sale_id} style={{ borderRadius: "17px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.055)", padding: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block" }}>{sale.property_name}</strong>
                    <small style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.46)" }}>
                      {sale.district} · {titleCase(sale.property_type)}
                    </small>
                  </span>
                  <strong style={{ color: "#ffd18a", whiteSpace: "nowrap" }}>{formatNumber(sale.total_price)} DT</strong>
                </div>
                <div style={{ marginTop: "11px", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", color: "rgba(255,255,255,0.54)", fontSize: "12px" }}>
                  <span>{sale.buyer_name} purchased {sale.quantity} unit{sale.quantity === 1 ? "" : "s"}</span>
                  <span>{formatDateTime(sale.sold_at)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
