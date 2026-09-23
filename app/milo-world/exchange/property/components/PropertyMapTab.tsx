"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  DISTRICTS,
  PROPERTY_MAP_IMAGES,
  PROPERTY_TYPE_LABELS,
  formatNumber,
  getDistrictImage,
  getPropertyPreviewImage,
  type DistrictId,
  type PropertyHolding,
  type PropertyOffering,
  type PropertyDistrictMarket,
  type PropertyMarketSegment,
  type PropertyMarketHistoryPoint,
  type PropertyTabStyles,
  type PropertyType,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  properties: PropertyOffering[];
  holdings: PropertyHolding[];
  marketLoading: boolean;
  isMobile: boolean;
  isCompact: boolean;
  isDesktop: boolean;
  onOpenProperty: (property: PropertyOffering) => void;
  districtMarkets: PropertyDistrictMarket[];
  marketSegments: PropertyMarketSegment[];
  marketHistory: PropertyMarketHistoryPoint[];
};

function WorldDistrictMap({ selectedDistrict, hoveredDistrict, onHover, onSelect, isMobile }: {
  selectedDistrict: DistrictId | null;
  hoveredDistrict: DistrictId | null;
  onHover: (district: DistrictId | null) => void;
  onSelect: (district: DistrictId) => void;
  isMobile: boolean;
}) {
  const zones: Array<{ id: DistrictId; label: string; hint: string; sideStyle: CSSProperties; accent: string }> = [
    { id: "residential-hub", label: "Residential Hub", hint: "Apartments and landed homes", sideStyle: { left: "1.5%" }, accent: "#79f2ce" },
    { id: "commercial-hub", label: "Commercial Hub", hint: "Offices and retail units", sideStyle: { right: "1.5%" }, accent: "#ffd18a" },
  ];

  return (
    <div style={{ position: "relative", borderRadius: isMobile ? "22px" : "28px", overflow: "hidden", border: "1px solid rgba(126,232,255,0.22)", background: "#06111a", boxShadow: "0 22px 54px rgba(0,0,0,0.34)" }}>
      <img src={PROPERTY_MAP_IMAGES.full} alt="Dreamscape property world map" style={{ display: "block", width: "100%", height: "auto", aspectRatio: "3 / 2", objectFit: "cover" }} />
      {zones.map((zone) => {
        const active = selectedDistrict === zone.id || hoveredDistrict === zone.id;
        return (
          <button key={zone.id} type="button" aria-label={`Open ${zone.label}`} onMouseEnter={() => onHover(zone.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(zone.id)} onBlur={() => onHover(null)} onClick={() => onSelect(zone.id)}
            style={{ position: "absolute", top: "4%", bottom: "4%", width: "45.5%", ...zone.sideStyle, padding: 0, borderRadius: isMobile ? "16px" : "24px", border: active ? `3px solid ${zone.accent}` : "2px solid transparent", background: active ? `linear-gradient(180deg, transparent 52%, ${zone.accent}25 100%)` : "transparent", boxShadow: active ? `inset 0 0 62px ${zone.accent}24, 0 0 34px ${zone.accent}2b` : "none", cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ position: "absolute", left: "50%", bottom: isMobile ? "10px" : "18px", transform: "translateX(-50%)", width: isMobile ? "88%" : "min(330px, 82%)", borderRadius: "15px", padding: isMobile ? "9px 10px" : "12px 16px", color: "white", background: "rgba(3,12,21,0.86)", border: `1px solid ${zone.accent}72`, backdropFilter: "blur(12px)", textAlign: "center" }}>
              <strong style={{ display: "block", color: zone.accent, fontSize: isMobile ? "13px" : "18px" }}>{zone.label}</strong>
              {!isMobile && <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.62)", fontSize: "12px" }}>{zone.hint}</small>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function PropertyMapTab({ properties, holdings, marketLoading, isMobile, isCompact, isDesktop, glassPanel, primaryButton, onOpenProperty }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictId | null>(null);
  const [activeType, setActiveType] = useState<PropertyType | "all">("all");

  const selectedDistrictDefinition = DISTRICTS.find((district) => district.id === selectedDistrict) || null;
  const visibleProperties = useMemo(() => {
    if (!selectedDistrict) return [];
    return properties.filter((property) => property.district_slug === selectedDistrict && (activeType === "all" || property.property_type === activeType) && property.is_active);
  }, [properties, selectedDistrict, activeType]);
  const holdingsByProperty = useMemo(() => new Map(holdings.map((holding) => [holding.property_id, holding])), [holdings]);

  function chooseDistrict(id: DistrictId) {
    setSelectedDistrict(id);
    setActiveType("all");
    window.setTimeout(() => document.getElementById("district-properties")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section data-milo-guide="property-world-map" style={{ ...glassPanel, padding: isMobile ? "14px" : "20px" }}>
        <div style={{ marginBottom: "14px" }}>
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 900 }}>Dreamscape Property Map</p>
          <h2 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "40px", fontWeight: 500 }}>Where would you like to buy?</h2>
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.52)", fontSize: "13px" }}>Choose a district first. Market analysis now lives in the Market tab.</p>
        </div>

        <WorldDistrictMap selectedDistrict={selectedDistrict} hoveredDistrict={hoveredDistrict} onHover={setHoveredDistrict} onSelect={chooseDistrict} isMobile={isMobile} />

        <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: "10px" }}>
          {DISTRICTS.map((district) => {
            const available = properties.filter((property) => property.district_slug === district.id).reduce((total, property) => total + property.available_quantity, 0);
            const selected = selectedDistrict === district.id;
            return (
              <button key={district.id} type="button" onClick={() => chooseDistrict(district.id)} style={{ minWidth: 0, borderRadius: "17px", padding: "14px 16px", textAlign: "left", color: "white", cursor: "pointer", fontFamily: "inherit", border: selected ? `1px solid ${district.accent}` : "1px solid rgba(255,255,255,0.10)", background: selected ? `${district.fill}42` : "rgba(255,255,255,0.035)" }}>
                <strong style={{ display: "block", color: district.accent, fontSize: "17px" }}>{district.name}</strong>
                <span style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.52)", fontSize: "12px" }}>{district.subtitle}</span>
                <span style={{ display: "block", marginTop: "8px", color: "rgba(255,255,255,0.72)", fontSize: "12px", fontWeight: 800 }}>{formatNumber(available)} properties available</span>
              </button>
            );
          })}
        </div>
      </section>

      {!selectedDistrictDefinition ? (
        <section style={{ ...glassPanel, minHeight: "120px", display: "grid", placeItems: "center", padding: "22px", textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
          Tap Residential Hub or Commercial Hub to start exploring.
        </section>
      ) : (
        <section id="district-properties" data-milo-guide="property-primary-market" style={{ ...glassPanel, padding: isMobile ? "15px" : "20px" }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "flex-end", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <p style={{ margin: 0, color: selectedDistrictDefinition.accent, fontSize: "11px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>{selectedDistrictDefinition.subtitle}</p>
              <h2 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "39px", fontWeight: 500 }}>{selectedDistrictDefinition.name}</h2>
              <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.52)", fontSize: "13px" }}>Choose a property type, then open a property for full details.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <button type="button" onClick={() => setActiveType("all")} style={{ minHeight: "38px", padding: "0 14px", borderRadius: "999px", border: activeType === "all" ? `1px solid ${selectedDistrictDefinition.accent}` : "1px solid rgba(255,255,255,0.12)", background: activeType === "all" ? `${selectedDistrictDefinition.fill}66` : "rgba(255,255,255,0.05)", color: "white", fontWeight: 850, cursor: "pointer" }}>All</button>
              {selectedDistrictDefinition.propertyTypes.map((type) => (
                <button key={type} type="button" onClick={() => setActiveType(type)} style={{ minHeight: "38px", padding: "0 14px", borderRadius: "999px", border: activeType === type ? `1px solid ${selectedDistrictDefinition.accent}` : "1px solid rgba(255,255,255,0.12)", background: activeType === type ? `${selectedDistrictDefinition.fill}66` : "rgba(255,255,255,0.05)", color: "white", fontWeight: 850, cursor: "pointer" }}>{PROPERTY_TYPE_LABELS[type]}</button>
              ))}
            </div>
          </div>

          {marketLoading ? <p style={{ marginTop: "18px", color: "#8ee8ff", fontWeight: 800 }}>Checking availability...</p> : null}

          {visibleProperties.length === 0 ? (
            <div style={{ marginTop: "18px", minHeight: "130px", display: "grid", placeItems: "center", borderRadius: "18px", border: "1px dashed rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.52)" }}>No active properties are available in this category yet.</div>
          ) : (
            <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: "12px" }}>
              {visibleProperties.map((property) => {
                const ownQuantity = holdingsByProperty.get(property.id)?.quantity || 0;
                const image = getPropertyPreviewImage(property);
                return (
                  <article key={property.id} style={{ minWidth: 0, borderRadius: "19px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.045)", display: "flex", flexDirection: "column" }}>
                    <div style={{ aspectRatio: "16 / 9", overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                      {image ? <img src={image} alt={`${property.name} preview`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.4)" }}>Preview unavailable</div>}
                    </div>
                    <div style={{ padding: "15px", display: "flex", flexDirection: "column", flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                        <span style={{ color: selectedDistrictDefinition.accent, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 900 }}>{PROPERTY_TYPE_LABELS[property.property_type]}</span>
                        {ownQuantity > 0 && <span style={{ borderRadius: "999px", padding: "4px 8px", background: "rgba(121,242,206,0.11)", color: "#9affdf", fontSize: "9px", fontWeight: 900 }}>You own {ownQuantity}</span>}
                      </div>
                      <h3 style={{ margin: "8px 0 0", fontSize: "19px", lineHeight: 1.2 }}>{property.name}</h3>
                      <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.46)", fontSize: "11px" }}>{selectedDistrictDefinition.name} · {property.area_sqm} sqm</p>

                      <div style={{ marginTop: "13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div style={{ borderRadius: "13px", background: "rgba(255,255,255,0.05)", padding: "10px" }}>
                          <span style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 850 }}>Price</span>
                          <strong style={{ display: "block", marginTop: "4px", color: "#ffd18a", fontSize: "15px" }}>{formatNumber(property.listing_price)} DT</strong>
                        </div>
                        <div style={{ borderRadius: "13px", background: "rgba(121,242,206,0.05)", padding: "10px" }}>
                          <span style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 850 }}>Approx. Value</span>
                          <strong style={{ display: "block", marginTop: "4px", color: "#79f2ce", fontSize: "15px" }}>{formatNumber(property.market_value)} DT</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: "11px", display: "flex", justifyContent: "space-between", gap: "10px", color: "rgba(255,255,255,0.54)", fontSize: "11px" }}>
                        <span>Available</span>
                        <strong style={{ color: property.available_quantity > 0 ? "white" : "#ffb0b0" }}>{property.available_quantity}</strong>
                      </div>

                      <button type="button" onClick={() => onOpenProperty(property)} style={{ ...primaryButton, width: "100%", marginTop: "14px" }}>View Property</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section style={{ ...glassPanel, padding: isMobile ? "15px" : "18px" }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.52)", lineHeight: 1.55, fontSize: "12px" }}>
          All properties and Dreamscape Tokens are fictional and exist only inside Dreamscape. For market trends, resale listings and deeper analysis, open the Market tab.
        </p>
      </section>
    </div>
  );
}
