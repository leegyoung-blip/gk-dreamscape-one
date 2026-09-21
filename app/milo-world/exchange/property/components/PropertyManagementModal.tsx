"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  formatNumber,
  formatPercentFromBps,
  getPropertyUnitPreviewImage,
  type PropertyOffering,
  type PropertyTabStyles,
  type PropertyUnit,
  type PropertyUpgradeCatalogRow,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  unit: PropertyUnit;
  properties: PropertyOffering[];
  catalog: PropertyUpgradeCatalogRow[];
  dreamTokens: number;
  actionLoading: boolean;
  isMobile: boolean;
  onClose: () => void;
  onUpgrade: (unitId: string, category: string) => Promise<void>;
};

const CATEGORY_ICONS: Record<string, string> = {
  interior: "◇",
  fitout: "▦",
  facilities: "◫",
  smart_systems: "⌁",
  efficiency: "↯",
  amenities: "✦",
};

function statBar(value: number, label: string, locked = false) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div style={{ display: "grid", gap: "7px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: 850 }}>
          {label}
        </span>
        <span style={{ color: locked ? "rgba(255,255,255,0.38)" : "#8ee8ff", fontSize: "12px", fontWeight: 900 }}>
          {locked ? "Phase 3" : `${safe}/100`}
        </span>
      </div>
      <div style={{ height: "8px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div
          style={{
            width: `${locked ? 0 : safe}%`,
            height: "100%",
            borderRadius: "999px",
            background: locked
              ? "rgba(255,255,255,0.12)"
              : "linear-gradient(90deg, rgba(83,215,255,0.58), rgba(255,209,138,0.82))",
          }}
        />
      </div>
    </div>
  );
}

export default function PropertyManagementModal({
  unit,
  properties,
  catalog,
  dreamTokens,
  actionLoading,
  isMobile,
  glassPanel,
  primaryButton,
  onClose,
  onUpgrade,
}: Props) {
  const property = properties.find((item) => item.id === unit.property_id);
  const image = getPropertyUnitPreviewImage(unit, properties);

  const categories = useMemo(() => {
    const firstByCategory = new Map<string, PropertyUpgradeCatalogRow>();
    for (const row of catalog) {
      if (!firstByCategory.has(row.category)) firstByCategory.set(row.category, row);
    }
    return Array.from(firstByCategory.values()).sort(
      (a, b) => a.display_order - b.display_order
    );
  }, [catalog]);

  const totalPossibleLevels = Math.max(1, categories.length * 5);
  const progress = Math.min(100, (unit.upgrade_level_total / totalPossibleLevels) * 100);
  const valueGain = unit.current_value - unit.base_value;
  const rentGain = unit.rental_potential - unit.base_weekly_rent;

  function getCatalogRow(category: string, level: number) {
    return catalog.find((row) => row.category === category && row.level === level);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "grid",
        placeItems: "center",
        padding: isMobile ? "10px" : "28px",
        background: "rgba(0,0,0,0.74)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <section
        className="milo-scrollbar"
        onClick={(event) => event.stopPropagation()}
        style={{
          ...glassPanel,
          width: "min(1180px, 100%)",
          maxHeight: "94dvh",
          overflowY: "auto",
          overflowX: "hidden",
          borderRadius: isMobile ? "22px" : "30px",
          background: "rgba(4,11,24,0.96)",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.15fr) minmax(360px, 0.85fr)",
            minHeight: isMobile ? undefined : "420px",
          }}
        >
          <div
            style={{
              position: "relative",
              minHeight: isMobile ? "240px" : "420px",
              overflow: "hidden",
              background: "linear-gradient(145deg, rgba(15,35,48,0.96), rgba(4,13,23,0.98))",
            }}
          >
            {image ? (
              <img
                src={image}
                alt={`${unit.property_name} Unit ${unit.unit_number}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ minHeight: "100%", display: "grid", placeItems: "center", padding: "28px", textAlign: "center", color: "rgba(255,255,255,0.55)" }}>
                Property preview
              </div>
            )}

            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, transparent 50%, rgba(1,7,18,0.88))",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "absolute", left: "22px", right: "22px", bottom: "20px" }}>
              <span style={{ display: "inline-flex", minHeight: "28px", alignItems: "center", padding: "0 10px", borderRadius: "999px", border: "1px solid rgba(142,232,255,0.28)", background: "rgba(3,12,21,0.76)", color: "#8ee8ff", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                Managed Property · Unit {unit.unit_number}
              </span>
              <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "32px" : "44px", fontWeight: 500, lineHeight: 1 }}>
                {unit.property_name}
              </h2>
              <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.62)", fontSize: "13px" }}>
                {unit.district} · {unit.unit_type}
              </p>
            </div>
          </div>

          <div style={{ position: "relative", padding: isMobile ? "22px" : "28px" }}>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close property manager"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                width: "40px",
                height: "40px",
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

            <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>
              Property Performance
            </p>

            <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                ["Current Value", `${formatNumber(unit.current_value)} DT`, valueGain > 0 ? `+${formatNumber(valueGain)} from upgrades` : "Base market value"],
                ["Rent Potential", `${formatNumber(unit.rental_potential)} DT/wk`, rentGain > 0 ? `+${formatNumber(rentGain)} from upgrades` : "Not automatic income"],
                ["Upgrade Spend", `${formatNumber(unit.upgrade_spend)} DT`, `${unit.upgrade_level_total}/${totalPossibleLevels} levels`],
                ["Available Cash", `${formatNumber(dreamTokens)} DT`, "For upgrades and market activity"],
              ].map(([label, value, note]) => (
                <div key={label} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.05)", padding: "14px" }}>
                  <span style={{ display: "block", color: "rgba(255,255,255,0.43)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.09em" }}>{label}</span>
                  <strong style={{ display: "block", marginTop: "6px", fontSize: "18px", color: label === "Current Value" ? "#ffd18a" : "white" }}>{value}</strong>
                  <small style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.42)", lineHeight: 1.35 }}>{note}</small>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.58)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Overall Upgrade Progress
                </span>
                <strong style={{ color: "#8ee8ff", fontSize: "12px" }}>{Math.round(progress)}%</strong>
              </div>
              <div style={{ marginTop: "7px", height: "9px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", borderRadius: "999px", background: "linear-gradient(90deg, rgba(83,215,255,0.7), rgba(255,209,138,0.9))" }} />
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "grid", gap: "13px" }}>
              {statBar(unit.appeal, "Appeal")}
              {statBar(unit.quality, "Quality")}
              {statBar(unit.efficiency, "Efficiency")}
              {statBar(unit.condition, "Condition", true)}
            </div>

            <div style={{ marginTop: "20px", borderRadius: "16px", border: "1px solid rgba(121,242,206,0.16)", background: "rgba(121,242,206,0.055)", padding: "14px", color: "rgba(255,255,255,0.66)", fontSize: "12px", lineHeight: 1.55 }}>
              <strong style={{ color: "#79f2ce" }}>Phase 2:</strong> rent is no longer paid automatically. You will choose an asking rent and Dreamscape residents will decide whether to apply for this unit.
            </div>
          </div>
        </div>

        <div data-milo-guide="property-upgrade-system" style={{ padding: isMobile ? "22px" : "28px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: "12px", alignItems: isMobile ? "flex-start" : "flex-end" }}>
            <div>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                Upgrade Workshop
              </p>
              <h3 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "38px", fontWeight: 500 }}>
                Improve this property
              </h3>
              <p style={{ margin: "9px 0 0", maxWidth: "760px", color: "rgba(255,255,255,0.52)", fontSize: "13px", lineHeight: 1.55 }}>
                Upgrades change this unit’s own value, rent potential and management stats. They do not raise the base market price of every property of the same type.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
            {categories.map((category) => {
              const currentLevel = Number(unit.upgrade_levels?.[category.category] || 0);
              const currentRow = currentLevel > 0 ? getCatalogRow(category.category, currentLevel) : undefined;
              const nextRow = currentLevel < 5 ? getCatalogRow(category.category, currentLevel + 1) : undefined;
              const maxed = currentLevel >= 5;
              const canAfford = !nextRow || dreamTokens >= nextRow.upgrade_cost;

              const valueDelta = nextRow
                ? nextRow.value_bonus_bps - Number(currentRow?.value_bonus_bps || 0)
                : 0;
              const rentDelta = nextRow
                ? nextRow.rent_bonus_bps - Number(currentRow?.rent_bonus_bps || 0)
                : 0;

              return (
                <article
                  key={category.category}
                  style={{
                    borderRadius: "19px",
                    border: maxed ? "1px solid rgba(121,242,206,0.2)" : "1px solid rgba(255,255,255,0.09)",
                    background: maxed ? "rgba(121,242,206,0.05)" : "rgba(255,255,255,0.04)",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: "12px", alignItems: "start" }}>
                    <span style={{ width: "42px", height: "42px", borderRadius: "13px", display: "grid", placeItems: "center", background: "rgba(142,232,255,0.08)", color: "#8ee8ff", fontSize: "19px", fontWeight: 900 }}>
                      {CATEGORY_ICONS[category.category] || "•"}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: "15px" }}>{category.display_name}</strong>
                      <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                        {nextRow?.description || category.description}
                      </small>
                    </span>
                    <strong style={{ color: maxed ? "#79f2ce" : "#ffd18a", fontSize: "12px", whiteSpace: "nowrap" }}>
                      L{currentLevel}/5
                    </strong>
                  </div>

                  <div style={{ marginTop: "13px", display: "flex", gap: "6px" }}>
                    {Array.from({ length: 5 }, (_, index) => index + 1).map((level) => (
                      <span
                        key={level}
                        style={{
                          flex: 1,
                          height: "7px",
                          borderRadius: "999px",
                          background: level <= currentLevel ? "rgba(142,232,255,0.75)" : "rgba(255,255,255,0.08)",
                        }}
                      />
                    ))}
                  </div>

                  {!maxed && nextRow && (
                    <div style={{ marginTop: "13px", display: "flex", flexWrap: "wrap", gap: "7px" }}>
                      {valueDelta > 0 && (
                        <span style={{ borderRadius: "999px", padding: "6px 9px", background: "rgba(255,209,138,0.07)", color: "#ffd18a", fontSize: "10px", fontWeight: 850 }}>
                          Value +{formatPercentFromBps(valueDelta)}
                        </span>
                      )}
                      {rentDelta > 0 && (
                        <span style={{ borderRadius: "999px", padding: "6px 9px", background: "rgba(142,232,255,0.07)", color: "#8ee8ff", fontSize: "10px", fontWeight: 850 }}>
                          Rent +{formatPercentFromBps(rentDelta)}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void onUpgrade(unit.unit_id, category.category)}
                    disabled={actionLoading || maxed || !nextRow || !canAfford}
                    style={{
                      ...primaryButton,
                      width: "100%",
                      minHeight: "42px",
                      marginTop: "14px",
                      opacity: actionLoading || maxed || !nextRow || !canAfford ? 0.5 : 1,
                      cursor: actionLoading || maxed || !nextRow || !canAfford ? "not-allowed" : "pointer",
                      background: maxed ? "rgba(121,242,206,0.08)" : "rgba(83,215,255,0.13)",
                    }}
                  >
                    {maxed
                      ? "Maximum Level"
                      : !nextRow
                      ? "Unavailable"
                      : canAfford
                      ? `Upgrade to L${currentLevel + 1} · ${formatNumber(nextRow.upgrade_cost)} DT`
                      : `Need ${formatNumber(nextRow.upgrade_cost - dreamTokens)} more DT`}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
