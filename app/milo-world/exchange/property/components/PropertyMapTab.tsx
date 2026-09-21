"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import DistrictMarketPanel from "./DistrictMarketPanel";
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

function WorldDistrictMap({
  selectedDistrict,
  hoveredDistrict,
  onHover,
  onSelect,
  isMobile,
}: {
  selectedDistrict: DistrictId | null;
  hoveredDistrict: DistrictId | null;
  onHover: (district: DistrictId | null) => void;
  onSelect: (district: DistrictId) => void;
  isMobile: boolean;
}) {
  const zones: Array<{
    id: DistrictId;
    label: string;
    hint: string;
    sideStyle: CSSProperties;
    accent: string;
  }> = [
    {
      id: "residential-hub",
      label: "Residential Hub",
      hint: "Apartments and landed homes",
      sideStyle: { left: "1.5%" },
      accent: "#79f2ce",
    },
    {
      id: "commercial-hub",
      label: "Commercial Hub",
      hint: "Offices and retail units",
      sideStyle: { right: "1.5%" },
      accent: "#ffd18a",
    },
  ];

  return (
    <div
      style={{
        position: "relative",
        borderRadius: isMobile ? "22px" : "28px",
        overflow: "hidden",
        border: "1px solid rgba(126,232,255,0.22)",
        background: "#06111a",
        boxShadow: "0 22px 54px rgba(0,0,0,0.34)",
      }}
    >
      <img
        src={PROPERTY_MAP_IMAGES.full}
        alt="Dreamscape property world map with Residential Hub and Commercial Hub"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          aspectRatio: "3 / 2",
          objectFit: "cover",
        }}
      />

      {zones.map((zone) => {
        const active = selectedDistrict === zone.id || hoveredDistrict === zone.id;
        return (
          <button
            key={zone.id}
            type="button"
            className="district-map-control"
            aria-label={`Open ${zone.label}`}
            onMouseEnter={() => onHover(zone.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(zone.id)}
            onBlur={() => onHover(null)}
            onClick={() => onSelect(zone.id)}
            style={{
              position: "absolute",
              top: "4%",
              bottom: "4%",
              width: "45.5%",
              ...zone.sideStyle,
              padding: 0,
              borderRadius: isMobile ? "16px" : "24px",
              border: active ? `3px solid ${zone.accent}` : "2px solid transparent",
              background: active
                ? `linear-gradient(180deg, transparent 52%, ${zone.accent}25 100%)`
                : "transparent",
              boxShadow: active
                ? `inset 0 0 62px ${zone.accent}24, 0 0 34px ${zone.accent}2b`
                : "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "50%",
                bottom: isMobile ? "10px" : "18px",
                transform: "translateX(-50%)",
                width: isMobile ? "88%" : "min(330px, 82%)",
                borderRadius: "15px",
                padding: isMobile ? "9px 10px" : "12px 16px",
                color: "white",
                background: "rgba(3,12,21,0.86)",
                border: `1px solid ${zone.accent}72`,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "0 12px 28px rgba(0,0,0,0.34)",
                textAlign: "center",
              }}
            >
              <strong style={{ display: "block", color: zone.accent, fontSize: isMobile ? "13px" : "18px" }}>
                {zone.label}
              </strong>
              {!isMobile && (
                <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.62)", fontSize: "12px" }}>
                  {zone.hint}
                </small>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DistrictDetailMap({
  districtId,
  activeType,
  onChooseType,
  isMobile,
}: {
  districtId: DistrictId;
  activeType: PropertyType | "all";
  onChooseType: (type: PropertyType) => void;
  isMobile: boolean;
}) {
  const isResidential = districtId === "residential-hub";
  const topType: PropertyType = isResidential ? "apartment" : "office";
  const bottomType: PropertyType = isResidential ? "landed" : "retail";
  const district = DISTRICTS.find((item) => item.id === districtId)!;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "24px",
        border: "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        background: "rgba(3,15,25,0.82)",
        boxShadow: "0 18px 44px rgba(0,0,0,0.28)",
      }}
    >
      <img
        src={getDistrictImage(districtId)}
        alt={`${district.name} detailed map`}
        style={{ display: "block", width: "100%", height: "auto", aspectRatio: "4 / 3", objectFit: "cover" }}
      />

      {[
        { type: topType, top: "0%", height: "50%" },
        { type: bottomType, top: "50%", height: "50%" },
      ].map((zone) => (
        <button
          key={zone.type}
          type="button"
          className="district-zone-button"
          aria-label={`Show ${PROPERTY_TYPE_LABELS[zone.type]}`}
          onClick={() => onChooseType(zone.type)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: zone.top,
            height: zone.height,
            padding: 0,
            border: activeType === zone.type ? `4px solid ${district.accent}` : "4px solid transparent",
            background: activeType === zone.type
              ? `linear-gradient(180deg, transparent 55%, ${district.accent}1f)`
              : "transparent",
            boxShadow: activeType === zone.type ? `inset 0 0 46px ${district.accent}20` : "none",
            cursor: "pointer",
          }}
        />
      ))}

      {activeType !== "all" && (
        <span
          style={{
            position: "absolute",
            right: isMobile ? "10px" : "16px",
            bottom: isMobile ? "10px" : "16px",
            minHeight: "34px",
            padding: "0 12px",
            borderRadius: "999px",
            border: `1px solid ${district.accent}80`,
            background: "rgba(3,12,21,0.84)",
            color: district.accent,
            fontSize: "11px",
            fontWeight: 900,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {PROPERTY_TYPE_LABELS[activeType]}
        </span>
      )}
    </div>
  );
}

export default function PropertyMapTab({
  properties,
  holdings,
  marketLoading,
  isMobile,
  isCompact,
  isDesktop,
  glassPanel,
  primaryButton,
  secondaryButton,
  onOpenProperty,
  districtMarkets,
  marketSegments,
  marketHistory,
}: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictId | null>(null);
  const [activeType, setActiveType] = useState<PropertyType | "all">("all");

  const selectedDistrictDefinition =
    DISTRICTS.find((district) => district.id === selectedDistrict) || null;

  const visibleProperties = useMemo(() => {
    if (!selectedDistrict) return [];
    return properties.filter((property) => {
      if (property.district_slug !== selectedDistrict) return false;
      if (activeType !== "all" && property.property_type !== activeType) return false;
      return property.is_active;
    });
  }, [properties, selectedDistrict, activeType]);

  const holdingsByProperty = useMemo(
    () => new Map(holdings.map((holding) => [holding.property_id, holding])),
    [holdings]
  );

  function chooseDistrict(id: DistrictId) {
    setSelectedDistrict(id);
    setActiveType("all");
    window.setTimeout(() => {
      document.getElementById("district-detail-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <DistrictMarketPanel
        glassPanel={glassPanel}
        primaryButton={primaryButton}
        secondaryButton={secondaryButton}
        districts={districtMarkets}
        segments={marketSegments}
        history={marketHistory}
        selectedDistrict={selectedDistrict}
        isMobile={isMobile}
        isCompact={isCompact}
        onChooseDistrict={chooseDistrict}
      />

      <section
        data-milo-guide="property-world-map"
        style={{ ...glassPanel, padding: isMobile ? "16px" : "24px" }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "flex-end",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 900 }}>
              Dreamscape Property Map
            </p>
            <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "44px", fontWeight: 500 }}>
              Choose a district to explore
            </h2>
          </div>
          <span style={{ color: "rgba(255,255,255,0.46)", fontSize: "13px" }}>
            More districts will open as Dreamscape grows.
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "minmax(0, 1.5fr) minmax(300px, 0.5fr)" : "1fr", gap: "18px", alignItems: "stretch" }}>
          <WorldDistrictMap
            selectedDistrict={selectedDistrict}
            hoveredDistrict={hoveredDistrict}
            onHover={setHoveredDistrict}
            onSelect={chooseDistrict}
            isMobile={isMobile}
          />

          <div style={{ display: "grid", gap: "12px" }}>
            {DISTRICTS.map((district) => {
              const selected = selectedDistrict === district.id;
              const available = properties
                .filter((property) => property.district_slug === district.id)
                .reduce((total, property) => total + property.available_quantity, 0);

              return (
                <button
                  key={district.id}
                  type="button"
                  onMouseEnter={() => setHoveredDistrict(district.id)}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  onClick={() => chooseDistrict(district.id)}
                  style={{
                    flex: 1,
                    minHeight: "170px",
                    borderRadius: "22px",
                    padding: "20px",
                    textAlign: "left",
                    color: "white",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    border: selected ? `1px solid ${district.accent}` : "1px solid rgba(255,255,255,0.12)",
                    position: "relative",
                    overflow: "hidden",
                    backgroundImage: `linear-gradient(180deg, rgba(2,9,18,0.12) 15%, rgba(2,9,18,0.92) 88%), url(${getDistrictImage(district.id)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    boxShadow: selected
                      ? `0 0 30px ${district.accent}2e, inset 0 0 44px ${district.accent}1a`
                      : "inset 0 0 24px rgba(0,0,0,0.22)",
                  }}
                >
                  <span style={{ display: "block", color: district.accent, fontSize: "11px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    Built District
                  </span>
                  <strong style={{ display: "block", marginTop: "8px", fontSize: "24px" }}>{district.name}</strong>
                  <span style={{ display: "block", marginTop: "7px", maxWidth: "420px", color: "rgba(255,255,255,0.66)", fontSize: "12px", lineHeight: 1.5 }}>
                    {district.subtitle}
                  </span>
                  <span style={{ display: "block", marginTop: "16px", color: "rgba(255,255,255,0.72)", fontSize: "12px", fontWeight: 800 }}>
                    {formatNumber(available)} properties available →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div data-milo-guide="property-primary-market">
      {!selectedDistrictDefinition ? (
        <section
          style={{
            ...glassPanel,
            minHeight: "150px",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            textAlign: "center",
            color: "rgba(255,255,255,0.52)",
          }}
        >
          Select Residential Hub or Commercial Hub to browse properties.
        </section>
      ) : (
        <section
          id="district-detail-section"
          style={{ ...glassPanel, padding: isMobile ? "16px" : "24px" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "minmax(0, 0.75fr) minmax(0, 1.25fr)" : "1fr", gap: "20px", alignItems: "start" }}>
            <div>
              <p style={{ margin: 0, color: selectedDistrictDefinition.accent, fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 900 }}>
                {selectedDistrictDefinition.subtitle}
              </p>
              <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "44px", fontWeight: 500 }}>
                {selectedDistrictDefinition.name}
              </h2>
              <p style={{ margin: "16px 0 0", color: "rgba(255,255,255,0.66)", lineHeight: 1.65 }}>
                {selectedDistrictDefinition.description}
              </p>

              <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "9px" }}>
                <button
                  type="button"
                  onClick={() => setActiveType("all")}
                  style={{
                    minHeight: "40px",
                    padding: "0 15px",
                    borderRadius: "999px",
                    border: activeType === "all" ? `1px solid ${selectedDistrictDefinition.accent}` : "1px solid rgba(255,255,255,0.14)",
                    background: activeType === "all" ? `${selectedDistrictDefinition.fill}66` : "rgba(255,255,255,0.06)",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: 850,
                  }}
                >
                  All Units
                </button>

                {selectedDistrictDefinition.propertyTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setActiveType(type)}
                    style={{
                      minHeight: "40px",
                      padding: "0 15px",
                      borderRadius: "999px",
                      border: activeType === type ? `1px solid ${selectedDistrictDefinition.accent}` : "1px solid rgba(255,255,255,0.14)",
                      background: activeType === type ? `${selectedDistrictDefinition.fill}66` : "rgba(255,255,255,0.06)",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 850,
                    }}
                  >
                    {PROPERTY_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <DistrictDetailMap
              districtId={selectedDistrictDefinition.id}
              activeType={activeType}
              onChooseType={setActiveType}
              isMobile={isMobile}
            />
          </div>

          <div style={{ marginTop: "26px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "25px" }}>Properties for Sale</h3>
              <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "13px" }}>
                These are the properties currently available to buy.
              </p>
            </div>
            {marketLoading && <span style={{ color: "#8ee8ff", fontWeight: 800 }}>Checking availability...</span>}
          </div>

          {visibleProperties.length === 0 ? (
            <div style={{ marginTop: "18px", minHeight: "150px", display: "grid", placeItems: "center", borderRadius: "20px", border: "1px dashed rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.54)", textAlign: "center", padding: "22px" }}>
              No active units are available in this category yet.
            </div>
          ) : (
            <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: "14px" }}>
              {visibleProperties.map((property) => {
                const ownQuantity = holdingsByProperty.get(property.id)?.quantity || 0;
                const availabilityPct = property.total_quantity > 0
                  ? Math.max(0, Math.min(100, (property.available_quantity / property.total_quantity) * 100))
                  : 0;
                const image = getPropertyPreviewImage(property);
                const marketGapPct = property.market_value > 0
                  ? Math.round(((property.listing_price - property.market_value) / property.market_value) * 100)
                  : 0;

                return (
                  <article key={property.id} style={{ borderRadius: "22px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.11)", background: "rgba(255,255,255,0.055)", display: "flex", flexDirection: "column" }}>
                    <div style={{ aspectRatio: "2 / 1", overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                      {image ? (
                        <img src={image} alt={`${property.name} preview`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.45)" }}>Preview unavailable</div>
                      )}
                    </div>

                    <div style={{ padding: "18px", display: "flex", flexDirection: "column", flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ color: selectedDistrictDefinition.accent, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900 }}>
                          {PROPERTY_TYPE_LABELS[property.property_type]}
                        </span>
                        {ownQuantity > 0 && (
                          <span style={{ borderRadius: "999px", padding: "5px 9px", background: "rgba(121,242,206,0.12)", color: "#9affdf", fontSize: "10px", fontWeight: 900 }}>
                            You own {ownQuantity}
                          </span>
                        )}
                      </div>

                      <h3 style={{ margin: "10px 0 0", fontSize: "20px", lineHeight: 1.18 }}>{property.name}</h3>
                      <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "12px" }}>
                        {property.building_name} · {property.area_sqm} sqm
                      </p>

                      <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,minmax(0,1fr))", gap: "8px" }}>
                        <div style={{ borderRadius: "14px", background: "rgba(255,255,255,0.055)", padding: "11px" }}>
                          <span style={{ display: "block", color: "rgba(255,255,255,0.42)", fontSize: "10px", textTransform: "uppercase", fontWeight: 850 }}>Dreamscape Price</span>
                          <strong style={{ display: "block", marginTop: "5px", color: "#ffd18a" }}>{formatNumber(property.listing_price)} DT</strong>
                        </div>
                        <div style={{ borderRadius: "14px", background: "rgba(121,242,206,0.055)", padding: "11px" }}>
                          <span style={{ display: "block", color: "rgba(255,255,255,0.42)", fontSize: "10px", textTransform: "uppercase", fontWeight: 850 }}>Market Value</span>
                          <strong style={{ display: "block", marginTop: "5px", color: "#79f2ce" }}>{formatNumber(property.market_value)} DT</strong>
                        </div>
                        <div style={{ borderRadius: "14px", background: "rgba(142,232,255,0.055)", padding: "11px", gridColumn: isMobile ? "1 / -1" : undefined }}>
                          <span style={{ display: "block", color: "rgba(255,255,255,0.42)", fontSize: "10px", textTransform: "uppercase", fontWeight: 850 }}>Market Rent Potential</span>
                          <strong style={{ display: "block", marginTop: "5px", color: "#8ee8ff" }}>{formatNumber(property.market_rent)} DT/week</strong>
                        </div>
                      </div>

                      {marketGapPct !== 0 && (
                        <div style={{ marginTop: "9px", borderRadius: "12px", padding: "9px 11px", background: marketGapPct < 0 ? "rgba(121,242,206,0.07)" : "rgba(255,209,138,0.07)", border: marketGapPct < 0 ? "1px solid rgba(121,242,206,0.14)" : "1px solid rgba(255,209,138,0.14)", color: marketGapPct < 0 ? "#79f2ce" : "#ffd18a", fontSize: "11px", fontWeight: 850 }}>
                          Dreamscape price is {Math.abs(marketGapPct)}% {marketGapPct < 0 ? "below" : "above"} the live market estimate
                        </div>
                      )}

                      <div style={{ marginTop: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", color: "rgba(255,255,255,0.54)", fontSize: "12px" }}>
                          <span>Available now</span>
                          <strong style={{ color: property.available_quantity > 0 ? "white" : "#ffb0b0" }}>
                            {property.available_quantity} / {property.total_quantity}
                          </strong>
                        </div>
                        <div style={{ height: "6px", marginTop: "8px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                          <div style={{ width: `${availabilityPct}%`, height: "100%", borderRadius: "999px", background: selectedDistrictDefinition.accent, transition: "width 260ms ease" }} />
                        </div>
                      </div>

                      <button type="button" onClick={() => onOpenProperty(property)} style={{ ...primaryButton, width: "100%", marginTop: "18px" }}>
                        View Property
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
      </div>

      <section data-milo-guide="property-virtual-notice" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
        <h2 style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "38px", fontWeight: 500 }}>
          Virtual Property Notice
        </h2>
        <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
          Property units in this Exchange exist only inside Dreamscape. They do not represent real-world land, securities, legal title or financial investment. Dreamscape Tokens have no cash value and cannot be cashed out.
        </p>
      </section>
    </div>
  );
}
