"use client";

import {
  DISTRICTS,
  PROPERTY_TYPE_LABELS,
  formatNumber,
  type DistrictId,
  type PropertyDistrictMarket,
  type PropertyMarketHistoryPoint,
  type PropertyMarketSegment,
  type PropertyTabStyles,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  districts: PropertyDistrictMarket[];
  segments: PropertyMarketSegment[];
  history: PropertyMarketHistoryPoint[];
  selectedDistrict: DistrictId | null;
  isMobile: boolean;
  isCompact: boolean;
  onChooseDistrict: (district: DistrictId) => void;
};

function demandLabel(score: number) {
  if (score >= 78) return "Very High";
  if (score >= 64) return "High";
  if (score >= 48) return "Balanced";
  if (score >= 34) return "Soft";
  return "Low";
}

function supplyLabel(market: PropertyDistrictMarket) {
  const supply = Number(market.available_supply || 0);
  const demand = Number(market.demand_count || 0);
  if (supply <= 2 && demand > supply) return "Very Tight";
  if (demand > supply * 1.35) return "Tight";
  if (supply > demand * 1.6) return "Plentiful";
  return "Balanced";
}

function trendText(bps: number) {
  const value = Number(bps || 0) / 100;
  if (Math.abs(value) < 0.05) return "Stable";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function trendColor(bps: number) {
  if (bps > 0) return "#79f2ce";
  if (bps < 0) return "#ffb0b0";
  return "rgba(255,255,255,0.68)";
}

function Sparkline({ values }: { values: number[] }) {
  const safe = values.length > 1 ? values : [10000, ...(values.length ? values : [10000])];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = Math.max(1, max - min);
  const width = 180;
  const height = 42;
  const points = safe
    .map((value, index) => {
      const x = safe.length === 1 ? 0 : (index / (safe.length - 1)) * width;
      const y = height - 5 - ((value - min) / span) * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="42" aria-hidden="true" style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke="rgba(142,232,255,0.82)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DistrictMarketPanel({
  districts,
  segments,
  history,
  selectedDistrict,
  isMobile,
  isCompact,
  glassPanel,
  onChooseDistrict,
}: Props) {
  return (
    <section data-milo-guide="property-market-pulse" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
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
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 900 }}>
            Live Market Pulse
          </p>
          <h2 style={{ margin: "9px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "44px", fontWeight: 500 }}>
            See where demand is moving
          </h2>
          <p style={{ margin: "11px 0 0", maxWidth: "900px", color: "rgba(255,255,255,0.56)", lineHeight: 1.6, fontSize: "13px" }}>
            Residents, tenants, listings and completed deals now shape each district. Strong demand can gradually lift property values and rent potential, while extra supply can cool the market.
          </p>
        </div>
        <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "12px" }}>
          Updates once per day
        </span>
      </div>

      <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: "14px" }}>
        {DISTRICTS.map((districtDef) => {
          const market = districts.find((item) => item.district_slug === districtDef.id);
          const districtSegments = segments.filter((item) => item.district_slug === districtDef.id);
          const districtHistory = history
            .filter((item) => item.district_slug === districtDef.id)
            .reduce<Record<string, number[]>>((acc, item) => {
              const key = item.snapshot_date;
              (acc[key] ||= []).push(Number(item.value_index_bps || 10000));
              return acc;
            }, {});
          const sparkValues = Object.keys(districtHistory)
            .sort()
            .map((key) => Math.round(districtHistory[key].reduce((sum, v) => sum + v, 0) / districtHistory[key].length));

          const active = selectedDistrict === districtDef.id;
          const demand = market?.demand_score ?? 50;
          const valueTrend = market?.value_change_30d_bps ?? 0;
          const rentTrend = market?.rent_change_30d_bps ?? 0;

          return (
            <article
              key={districtDef.id}
              style={{
                borderRadius: "22px",
                border: active ? `1px solid ${districtDef.accent}` : "1px solid rgba(255,255,255,0.1)",
                background: active ? `${districtDef.fill}22` : "rgba(255,255,255,0.04)",
                padding: isMobile ? "16px" : "19px",
                minWidth: 0,
                boxShadow: active ? `0 0 34px ${districtDef.accent}17` : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                <div>
                  <span style={{ display: "block", color: districtDef.accent, fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.13em" }}>
                    {demandLabel(demand)} demand
                  </span>
                  <h3 style={{ margin: "7px 0 0", fontSize: isMobile ? "22px" : "26px" }}>{districtDef.name}</h3>
                </div>
                <div style={{ minWidth: "92px", textAlign: "right" }}>
                  <span style={{ display: "block", color: "rgba(255,255,255,0.42)", fontSize: "10px", textTransform: "uppercase", fontWeight: 850 }}>Demand</span>
                  <strong style={{ display: "block", marginTop: "2px", fontSize: "24px", color: districtDef.accent }}>{demand}/100</strong>
                </div>
              </div>

              <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "8px" }}>
                {[
                  ["Occupancy", `${Math.round(Number(market?.occupancy_rate || 0))}%`],
                  ["Supply", market ? supplyLabel(market) : "—"],
                  ["Avg Rent", market?.avg_weekly_rent ? `${formatNumber(market.avg_weekly_rent)} DT` : "—"],
                  ["Recent Deals", `${Number(market?.recent_resale_sales || 0)}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ borderRadius: "13px", padding: "10px", background: "rgba(255,255,255,0.045)", minWidth: 0 }}>
                    <small style={{ display: "block", color: "rgba(255,255,255,0.4)", lineHeight: 1.2 }}>{label}</small>
                    <strong style={{ display: "block", marginTop: "5px", fontSize: "12px", overflowWrap: "anywhere" }}>{value}</strong>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "15px", display: "grid", gridTemplateColumns: isCompact ? "1fr" : "minmax(0,1fr) 180px", gap: "12px", alignItems: "end" }}>
                <div>
                  <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.52)" }}>
                      Value trend <strong style={{ color: trendColor(valueTrend) }}>{trendText(valueTrend)}</strong>
                    </span>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.52)" }}>
                      Rent trend <strong style={{ color: trendColor(rentTrend) }}>{trendText(rentTrend)}</strong>
                    </span>
                  </div>
                  <div style={{ marginTop: "11px", display: "flex", flexWrap: "wrap", gap: "7px" }}>
                    {districtSegments.map((segment) => (
                      <span key={segment.property_type} style={{ borderRadius: "999px", padding: "6px 9px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.68)", fontSize: "10px", fontWeight: 800 }}>
                        {PROPERTY_TYPE_LABELS[segment.property_type]} · {demandLabel(segment.demand_score)}
                      </span>
                    ))}
                  </div>
                </div>
                <Sparkline values={sparkValues} />
              </div>

              <button
                type="button"
                onClick={() => onChooseDistrict(districtDef.id)}
                style={{
                  width: "100%",
                  minHeight: "42px",
                  marginTop: "15px",
                  borderRadius: "14px",
                  border: `1px solid ${districtDef.accent}55`,
                  background: `${districtDef.fill}55`,
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Explore {districtDef.name}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
