"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import PropertyResaleTab from "./PropertyResaleTab";
import {
  PROPERTY_TYPE_LABELS,
  formatNumber,
  type PropertyOffering,
  type PropertyResaleListing,
  type RecentPropertySale,
  type PropertyMarketSegment,
  type PropertyMarketHistoryPoint,
  type PropertyTabStyles,
} from "./propertyExchangeShared";
import type { MiloCityDistrictEconomyDashboard } from "./DistrictEconomyDrivers";

type SubTab = "overview" | "resale" | "agent";
type AgentTargetType = "property" | "district";

type AgentReport = {
  ok?: boolean;
  cached?: boolean;
  cost_dt?: number;
  settlement_date?: string;
  target_type?: string;
  target_key?: string;
  report?: {
    title?: string;
    subtitle?: string;
    valuation?: {
      dreamscape_price?: number;
      market_value?: number;
      difference_pct?: number;
    };
    rental?: {
      market_rent?: number;
      gross_yield_pct?: number;
      demand_label?: string;
    };
    district?: {
      outlook?: string;
      demand_score?: number;
      supply_label?: string;
      employment_label?: string;
      resident_interest?: string;
      business_interest?: string;
    };
    movement?: {
      value_30d_pct?: number;
      rent_30d_pct?: number;
    };
    drivers?: string[];
    watch?: string[];
  };
  message?: string;
  reason?: string;
};

type Props = PropertyTabStyles & {
  properties: PropertyOffering[];
  marketSegments: PropertyMarketSegment[];
  marketHistory: PropertyMarketHistoryPoint[];
  districtEconomyDashboard: MiloCityDistrictEconomyDashboard;
  resaleListings: PropertyResaleListing[];
  recentSales: RecentPropertySale[];
  dreamTokens: number;
  actionLoading: boolean;
  marketLoading: boolean;
  message: string;
  isMobile: boolean;
  isCompact: boolean;
  onRefresh: () => void;
  onBuyResale: (listing: PropertyResaleListing) => void;
  onOpenProperty: (property: PropertyOffering) => void;
  onTokensChanged: () => Promise<void> | void;
  initialAgentPropertyId?: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  apartment: "Apartments",
  landed: "Landed Homes",
  office: "Offices",
  retail: "Retail",
};

function direction(value: number) {
  if (value >= 75) return { label: "High", arrow: "↑" };
  if (value >= 58) return { label: "Growing", arrow: "↑" };
  if (value <= 32) return { label: "Cooling", arrow: "↓" };
  if (value <= 44) return { label: "Soft", arrow: "↓" };
  return { label: "Steady", arrow: "→" };
}

function pct(bps: number) {
  const value = Number(bps || 0) / 100;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function titleCase(value: string | undefined) {
  if (!value) return "Balanced";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PropertyMarketTab({
  properties,
  marketSegments,
  districtEconomyDashboard,
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
  onBuyResale,
  onOpenProperty,
  onTokensChanged,
  initialAgentPropertyId,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [agentTargetType, setAgentTargetType] = useState<AgentTargetType>("property");
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || "");
  const [selectedSegmentKey, setSelectedSegmentKey] = useState("residential-hub:apartment");
  const [report, setReport] = useState<AgentReport | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMessage, setAgentMessage] = useState("");

  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  useEffect(() => {
    if (!initialAgentPropertyId) return;
    setSelectedPropertyId(initialAgentPropertyId);
    setAgentTargetType("property");
    setSubTab("agent");
    setReport(null);
    setAgentMessage("");
  }, [initialAgentPropertyId]);

  const segmentCards = useMemo(() => {
    return marketSegments.map((segment) => {
      const living = (districtEconomyDashboard.segments || []).find(
        (item) => item.district_slug === segment.district_slug && item.property_type === segment.property_type
      );
      const demandScore = Number(living?.final_demand_score ?? segment.demand_score ?? 50);
      const trend = direction(demandScore);
      return {
        ...segment,
        demandScore,
        trend,
        driver: living?.driver_text || null,
      };
    });
  }, [marketSegments, districtEconomyDashboard]);

  const stories = useMemo(() => {
    const output: Array<{ title: string; text: string }> = [];
    for (const event of districtEconomyDashboard.active_events || []) {
      output.push({ title: event.title, text: event.summary });
      if (output.length >= 3) return output;
    }
    for (const segment of segmentCards) {
      if (!segment.driver) continue;
      output.push({
        title: `${segment.district_name} · ${TYPE_LABELS[segment.property_type] || segment.property_type}`,
        text: segment.driver,
      });
      if (output.length >= 3) break;
    }
    return output;
  }, [districtEconomyDashboard.active_events, segmentCards]);

  const totalSupply = marketSegments.reduce((sum, segment) => sum + Number(segment.available_supply || 0), 0);
  const residential = segmentCards.filter((segment) => segment.property_type === "apartment" || segment.property_type === "landed");
  const commercial = segmentCards.filter((segment) => segment.property_type === "office" || segment.property_type === "retail");
  const avgResidential = residential.length ? residential.reduce((sum, item) => sum + item.demandScore, 0) / residential.length : 50;
  const avgCommercial = commercial.length ? commercial.reduce((sum, item) => sum + item.demandScore, 0) / commercial.length : 50;
  const selectedProperty = properties.find((property) => property.id === selectedPropertyId) || properties[0] || null;

  async function loadCurrentReport() {
    setAgentLoading(true);
    setAgentMessage("");
    const targetKey = agentTargetType === "property" ? (selectedProperty?.id || "") : selectedSegmentKey;
    if (!targetKey) {
      setAgentMessage("Choose a property or market segment first.");
      setAgentLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_my_milo_property_agent_report", {
      p_target_type: agentTargetType,
      p_target_key: targetKey,
    });
    if (error) {
      setAgentMessage(error.message);
      setAgentLoading(false);
      return;
    }
    const result = (data || {}) as AgentReport;
    setReport(result?.report ? result : null);
    setAgentMessage(result?.report ? "Current report loaded." : "No current report yet. Hire the Property Agent for a fresh analysis.");
    setAgentLoading(false);
  }

  async function hireAgent() {
    setAgentLoading(true);
    setAgentMessage("");
    const targetKey = agentTargetType === "property" ? (selectedProperty?.id || "") : selectedSegmentKey;
    if (!targetKey) {
      setAgentMessage("Choose a property or market segment first.");
      setAgentLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("hire_milo_property_agent", {
      p_target_type: agentTargetType,
      p_target_key: targetKey,
    });
    if (error) {
      setAgentMessage(error.message);
      setAgentLoading(false);
      return;
    }
    const result = (data || {}) as AgentReport;
    if (!result.ok) {
      setAgentMessage(result.message || (result.reason === "insufficient_tokens" ? "You do not have enough DT for this report." : "The Property Agent could not prepare this report."));
      setAgentLoading(false);
      return;
    }
    setReport(result);
    setAgentMessage(result.cached ? "Your current report is still valid, so there was no new charge." : "Property Agent report ready.");
    await onTokensChanged();
    setAgentLoading(false);
  }

  const reportBody = report?.report;

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <section style={{ ...glassPanel, padding: isMobile ? "10px" : "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "8px" }}>
          {([
            ["overview", "Overview"],
            ["resale", "Resale"],
            ["agent", "Property Agent"],
          ] as Array<[SubTab, string]>).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setSubTab(id)} style={{ minWidth: 0, minHeight: "46px", borderRadius: "14px", border: subTab === id ? "1px solid rgba(142,232,255,0.44)" : "1px solid rgba(255,255,255,0.09)", background: subTab === id ? "rgba(142,232,255,0.12)" : "rgba(255,255,255,0.035)", color: "white", fontWeight: 900, fontSize: isMobile ? "11px" : "13px", cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      </section>

      {subTab === "overview" && (
        <>
          <section style={{ ...glassPanel, padding: isMobile ? "16px" : "20px" }}>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 900 }}>Free Market Overview</p>
            <h2 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "38px", fontWeight: 500 }}>What is happening in the property market?</h2>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.52)", fontSize: "13px", lineHeight: 1.55 }}>Everyone gets the essential market picture for free. Hire the Property Agent only when you want deeper analysis of a specific property or segment.</p>

            <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: "9px" }}>
              {segmentCards.map((segment) => (
                <article key={`${segment.district_slug}-${segment.property_type}`} style={{ minWidth: 0, borderRadius: "16px", padding: "13px", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)" }}>
                  <span style={{ display: "block", color: "rgba(255,255,255,0.45)", fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>{segment.district_name}</span>
                  <strong style={{ display: "block", marginTop: "5px", fontSize: isMobile ? "15px" : "17px" }}>{TYPE_LABELS[segment.property_type] || segment.property_type}</strong>
                  <span style={{ display: "block", marginTop: "9px", color: segment.trend.arrow === "↓" ? "#ffb0b0" : segment.trend.arrow === "↑" ? "#9affdf" : "#ffd18a", fontWeight: 900, fontSize: "13px" }}>{segment.trend.label} {segment.trend.arrow}</span>
                  <span style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.56)", fontSize: "11px" }}>Prices {pct(Number(segment.value_change_30d_bps || 0))} in 30d</span>
                </article>
              ))}
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.2fr) minmax(0,.8fr)", gap: "12px" }}>
            <div style={{ ...glassPanel, padding: isMobile ? "16px" : "20px" }}>
              <h3 style={{ margin: 0, fontSize: "21px" }}>What’s happening in the city?</h3>
              <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
                {stories.length ? stories.map((story, index) => (
                  <article key={`${story.title}-${index}`} style={{ borderRadius: "14px", padding: "12px 13px", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.075)" }}>
                    <strong style={{ fontSize: "13px" }}>{story.title}</strong>
                    <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.53)", fontSize: "12px", lineHeight: 1.45 }}>{story.text}</p>
                  </article>
                )) : <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>The market is relatively quiet today.</p>}
              </div>
            </div>

            <div style={{ ...glassPanel, padding: isMobile ? "16px" : "20px" }}>
              <h3 style={{ margin: 0, fontSize: "21px" }}>Market activity</h3>
              <div style={{ marginTop: "12px", display: "grid", gap: "9px" }}>
                {[
                  ["Residential demand", direction(avgResidential).label],
                  ["Commercial demand", direction(avgCommercial).label],
                  ["Properties available", formatNumber(totalSupply)],
                  ["Market update", districtEconomyDashboard.last_updated ? "Updated today" : "Waiting for update"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "9px" }}>
                    <span style={{ color: "rgba(255,255,255,0.49)", fontSize: "12px" }}>{label}</span>
                    <strong style={{ fontSize: "12px" }}>{value}</strong>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setSubTab("agent")} style={{ ...secondaryButton, width: "100%", marginTop: "14px" }}>Need more detail? Ask Property Agent</button>
            </div>
          </section>
        </>
      )}

      {subTab === "resale" && (
        <PropertyResaleTab
          glassPanel={glassPanel}
          primaryButton={primaryButton}
          secondaryButton={secondaryButton}
          properties={properties}
          resaleListings={resaleListings}
          recentSales={recentSales}
          dreamTokens={dreamTokens}
          actionLoading={actionLoading}
          marketLoading={marketLoading}
          message={message}
          isMobile={isMobile}
          isCompact={isCompact}
          onRefresh={onRefresh}
          onBuy={onBuyResale}
          onOpenProperty={onOpenProperty}
        />
      )}

      {subTab === "agent" && (
        <section style={{ ...glassPanel, padding: isMobile ? "16px" : "22px" }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: "14px", alignItems: isMobile ? "stretch" : "flex-start" }}>
            <div>
              <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 900 }}>Milo Property Agent</p>
              <h2 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "38px", fontWeight: 500 }}>Get a deeper market analysis</h2>
              <p style={{ margin: "8px 0 0", maxWidth: "720px", color: "rgba(255,255,255,0.54)", fontSize: "13px", lineHeight: 1.55 }}>A fresh report costs 25 DT. Once purchased, you can reopen it free until the next daily market settlement.</p>
            </div>
            <span style={{ alignSelf: isMobile ? "flex-start" : "center", borderRadius: "999px", padding: "8px 12px", background: "rgba(255,209,138,0.10)", border: "1px solid rgba(255,209,138,0.18)", color: "#ffd18a", fontWeight: 900, fontSize: "12px" }}>{formatNumber(dreamTokens)} DT available</span>
          </div>

          <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "180px minmax(0,1fr)", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr", gap: "8px" }}>
              {(["property", "district"] as AgentTargetType[]).map((type) => (
                <button key={type} type="button" onClick={() => { setAgentTargetType(type); setReport(null); setAgentMessage(""); }} style={{ ...secondaryButton, minHeight: "44px", background: agentTargetType === type ? "rgba(142,232,255,0.12)" : "rgba(255,255,255,0.045)", borderColor: agentTargetType === type ? "rgba(142,232,255,0.32)" : "rgba(255,255,255,0.10)" }}>{type === "property" ? "Property" : "Market Segment"}</button>
              ))}
            </div>

            {agentTargetType === "property" ? (
              <select value={selectedProperty?.id || ""} onChange={(event) => { setSelectedPropertyId(event.target.value); setReport(null); setAgentMessage(""); }} style={{ minWidth: 0, minHeight: "46px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "#071729", color: "white", padding: "0 13px", fontFamily: "inherit" }}>
                {properties.filter((item) => item.is_active).map((property) => <option key={property.id} value={property.id}>{property.name} — {PROPERTY_TYPE_LABELS[property.property_type]}</option>)}
              </select>
            ) : (
              <select value={selectedSegmentKey} onChange={(event) => { setSelectedSegmentKey(event.target.value); setReport(null); setAgentMessage(""); }} style={{ minWidth: 0, minHeight: "46px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", background: "#071729", color: "white", padding: "0 13px", fontFamily: "inherit" }}>
                {marketSegments.map((segment) => <option key={`${segment.district_slug}:${segment.property_type}`} value={`${segment.district_slug}:${segment.property_type}`}>{segment.district_name} — {TYPE_LABELS[segment.property_type] || segment.property_type}</option>)}
              </select>
            )}
          </div>

          <div style={{ marginTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" disabled={agentLoading} onClick={hireAgent} style={{ ...primaryButton, opacity: agentLoading ? 0.6 : 1 }}>{agentLoading ? "Analysing..." : "Hire Property Agent — 25 DT"}</button>
            <button type="button" disabled={agentLoading} onClick={loadCurrentReport} style={secondaryButton}>View Current Report</button>
          </div>

          {agentMessage && <p style={{ margin: "12px 0 0", color: agentMessage.includes("could not") || agentMessage.includes("enough") ? "#ffb0b0" : "#ffd18a", fontSize: "12px", fontWeight: 800 }}>{agentMessage}</p>}

          {reportBody && (
            <div style={{ marginTop: "18px", borderRadius: "20px", border: "1px solid rgba(142,232,255,0.15)", background: "rgba(4,16,28,0.72)", padding: isMobile ? "15px" : "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <span style={{ color: "#8ee8ff", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em" }}>Property Agent Report</span>
                  <h3 style={{ margin: "6px 0 0", fontSize: "23px" }}>{reportBody.title || "Market Analysis"}</h3>
                  {reportBody.subtitle && <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>{reportBody.subtitle}</p>}
                </div>
                {report.settlement_date && <small style={{ color: "rgba(255,255,255,0.38)" }}>Valid for market settlement {report.settlement_date}</small>}
              </div>

              {reportBody.valuation && (
                <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,minmax(0,1fr))", gap: "8px" }}>
                  {[
                    ["Dreamscape Price", `${formatNumber(reportBody.valuation.dreamscape_price || 0)} DT`],
                    ["Estimated Market Value", `${formatNumber(reportBody.valuation.market_value || 0)} DT`],
                    ["Difference", `${Number(reportBody.valuation.difference_pct || 0) > 0 ? "+" : ""}${Number(reportBody.valuation.difference_pct || 0).toFixed(1)}%`],
                  ].map(([label, value]) => <div key={label} style={{ borderRadius: "14px", background: "rgba(255,255,255,0.045)", padding: "11px" }}><span style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 850 }}>{label}</span><strong style={{ display: "block", marginTop: "4px", fontSize: "15px" }}>{value}</strong></div>)}
                </div>
              )}

              <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "10px" }}>
                {reportBody.rental && <div style={{ borderRadius: "15px", background: "rgba(121,242,206,0.045)", padding: "13px" }}><strong>Rental Analysis</strong><p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.56)", fontSize: "12px", lineHeight: 1.55 }}>Estimated rent: <b>{formatNumber(reportBody.rental.market_rent || 0)} DT/week</b><br />Gross yield: <b>{Number(reportBody.rental.gross_yield_pct || 0).toFixed(1)}%</b><br />Tenant demand: <b>{reportBody.rental.demand_label || "Balanced"}</b></p></div>}
                {reportBody.district && <div style={{ borderRadius: "15px", background: "rgba(255,209,138,0.045)", padding: "13px" }}><strong>District Conditions</strong><p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.56)", fontSize: "12px", lineHeight: 1.55 }}>Outlook: <b>{titleCase(reportBody.district.outlook)}</b><br />Supply: <b>{reportBody.district.supply_label || "Balanced"}</b><br />Employment: <b>{reportBody.district.employment_label || "Steady"}</b><br />Resident interest: <b>{reportBody.district.resident_interest || "Balanced"}</b></p></div>}
              </div>

              {(reportBody.drivers?.length || reportBody.watch?.length) ? (
                <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "10px" }}>
                  <div style={{ borderRadius: "15px", border: "1px solid rgba(142,232,255,0.10)", padding: "13px" }}><strong>What is driving this?</strong>{(reportBody.drivers || []).map((item, index) => <p key={index} style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.55)", fontSize: "12px", lineHeight: 1.45 }}>• {item}</p>)}</div>
                  <div style={{ borderRadius: "15px", border: "1px solid rgba(255,209,138,0.10)", padding: "13px" }}><strong>Things to watch</strong>{(reportBody.watch || []).map((item, index) => <p key={index} style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.55)", fontSize: "12px", lineHeight: 1.45 }}>• {item}</p>)}</div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
