"use client";

import { useMemo, useState } from "react";
import PropertyManagementModal from "./PropertyManagementModal";
import ResidentLifePanel from "./ResidentLifePanel";
import {
  formatDateTime,
  formatNumber,
  getPropertyUnitPreviewImage,
  type MyPropertyListing,
  type PropertyLease,
  type PropertyOffering,
  type PropertyPurchaseOffer,
  type PropertyRentalApplication,
  type PropertyRentalListing,
  type PropertyTabStyles,
  type PropertyUnit,
  type PropertyUnitMarketSetting,
  type PropertyUpgradeCatalogRow,
  type PropertyMaintenanceIssue,
  type PropertyMaintenanceAction,
  type PropertyMaintenanceStats,
  type PropertyLandlordReputation,
  type PropertyResidentLifeProfile,
  type PropertyResidentLifeEvent,
  type PropertyResidentLifeStats,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  dreamTokens: number;
  properties: PropertyOffering[];
  units: PropertyUnit[];
  upgradeCatalog: PropertyUpgradeCatalogRow[];
  myListings: MyPropertyListing[];
  propertyPortfolioValue: number;
  totalOwnedUnits: number;
  rentalListings: PropertyRentalListing[];
  rentalApplications: PropertyRentalApplication[];
  leases: PropertyLease[];
  purchaseOffers: PropertyPurchaseOffer[];
  marketSettings: PropertyUnitMarketSetting[];
  maintenanceIssues: PropertyMaintenanceIssue[];
  maintenanceActions: PropertyMaintenanceAction[];
  maintenanceStats: PropertyMaintenanceStats;
  landlordReputation: PropertyLandlordReputation;
  residentLifeProfiles: PropertyResidentLifeProfile[];
  residentLifeEvents: PropertyResidentLifeEvent[];
  residentLifeStats: PropertyResidentLifeStats;
  unreadMessages: number;
  actionLoading: boolean;
  message: string;
  isMobile: boolean;
  isCompact: boolean;
  onUpgradeUnit: (unitId: string, category: string) => Promise<void>;
  onCreateRentalListing: (
    unitId: string,
    askingWeeklyRent: number,
    openToPurchaseOffers: boolean
  ) => Promise<void>;
  onCancelRentalListing: (listingId: string) => Promise<void>;
  onTogglePurchaseOffers: (unitId: string, enabled: boolean) => Promise<void>;
  onRefreshResidentMarket: () => Promise<void>;
  onRefreshResidentLife: () => Promise<void>;
  onRespondMaintenanceIssue: (issueId: string, action: "full_repair" | "quick_fix" | "ignore") => Promise<void>;
  onPreventiveService: (unitId: string) => Promise<void>;
  onOpenMessages: () => void;
  onCreateListing: (unitId: string, askingPrice: number) => Promise<void>;
  onCancelListing: (listingId: string) => Promise<void>;
};

export default function MyPropertiesTab({
  dreamTokens,
  properties,
  units,
  upgradeCatalog,
  myListings,
  propertyPortfolioValue,
  totalOwnedUnits,
  rentalListings,
  rentalApplications,
  leases,
  purchaseOffers,
  marketSettings,
  maintenanceIssues,
  maintenanceActions,
  maintenanceStats,
  landlordReputation,
  residentLifeProfiles,
  residentLifeEvents,
  residentLifeStats,
  unreadMessages,
  actionLoading,
  message,
  isMobile,
  isCompact,
  glassPanel,
  primaryButton,
  secondaryButton,
  onUpgradeUnit,
  onCreateRentalListing,
  onCancelRentalListing,
  onTogglePurchaseOffers,
  onRefreshResidentMarket,
  onRefreshResidentLife,
  onRespondMaintenanceIssue,
  onPreventiveService,
  onOpenMessages,
  onCreateListing,
  onCancelListing,
}: Props) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [listingUnitId, setListingUnitId] = useState<string | null>(null);
  const [askingPrice, setAskingPrice] = useState(0);
  const [localMessage, setLocalMessage] = useState("");

  const selectedUnit = units.find((unit) => unit.unit_id === selectedUnitId) || null;
  const listingUnit = units.find((unit) => unit.unit_id === listingUnitId) || null;

  const activeMyListings = useMemo(
    () => myListings.filter((listing) => listing.status === "active"),
    [myListings]
  );
  const recentMyListings = useMemo(
    () => myListings.filter((listing) => listing.status !== "active").slice(0, 10),
    [myListings]
  );
  const activeResaleByUnit = useMemo(() => {
    const map = new Map<string, MyPropertyListing>();
    for (const listing of activeMyListings) map.set(listing.unit_id, listing);
    return map;
  }, [activeMyListings]);

  const activeLeases = leases.filter((lease) => lease.status === "active");
  const activeRentalListings = rentalListings.filter((listing) => listing.status === "active");
  const occupiedUnitIds = new Set(activeLeases.map((lease) => lease.unit_id));
  const rentalListedUnitIds = new Set(activeRentalListings.map((listing) => listing.unit_id));
  const contractedWeeklyRent = activeLeases.reduce(
    (sum, lease) => sum + Number(lease.weekly_rent || 0),
    0
  );

  function openResaleListing(unit: PropertyUnit) {
    if (occupiedUnitIds.has(unit.unit_id)) {
      setLocalMessage("This unit has an active tenant and cannot be listed for sale.");
      return;
    }
    if (rentalListedUnitIds.has(unit.unit_id)) {
      setLocalMessage("Cancel the rental listing before listing this unit for resale.");
      return;
    }
    setListingUnitId(unit.unit_id);
    setAskingPrice(unit.current_value);
    setLocalMessage("");
  }

  async function submitResaleListing() {
    if (!listingUnit) return;
    const reference = Math.max(1, Number(listingUnit.current_value || 0));
    const min = Math.max(1, Math.round(reference * 0.85));
    const max = Math.max(min, Math.round(reference * 1.15));
    const price = Math.round(Number(askingPrice || 0));

    if (price < min || price > max) {
      setLocalMessage(
        `Choose an asking price between ${formatNumber(min)} and ${formatNumber(max)} DT.`
      );
      return;
    }

    await onCreateListing(listingUnit.unit_id, price);
    setListingUnitId(null);
    setLocalMessage("");
  }

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
          rentalListing={
            rentalListings.find(
              (item) => item.unit_id === selectedUnit.unit_id && item.status === "active"
            ) || null
          }
          applications={rentalApplications.filter(
            (item) => item.unit_id === selectedUnit.unit_id
          )}
          lease={
            leases.find(
              (item) => item.unit_id === selectedUnit.unit_id && item.status === "active"
            ) || null
          }
          purchaseOffers={purchaseOffers.filter(
            (item) => item.unit_id === selectedUnit.unit_id
          )}
          marketSetting={
            marketSettings.find((item) => item.unit_id === selectedUnit.unit_id) || null
          }
          isPlayerResaleActive={activeResaleByUnit.has(selectedUnit.unit_id)}
          maintenanceIssues={maintenanceIssues.filter((item) => item.unit_id === selectedUnit.unit_id)}
          maintenanceActions={maintenanceActions.filter((item) => item.unit_id === selectedUnit.unit_id)}
          onClose={() => setSelectedUnitId(null)}
          onUpgrade={onUpgradeUnit}
          onCreateRentalListing={onCreateRentalListing}
          onCancelRentalListing={onCancelRentalListing}
          onTogglePurchaseOffers={onTogglePurchaseOffers}
          onRespondMaintenanceIssue={onRespondMaintenanceIssue}
          onPreventiveService={onPreventiveService}
          onOpenMessages={onOpenMessages}
        />
      )}

      {listingUnit && (
        <div
          onClick={() => setListingUnitId(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 130,
            display: "grid",
            placeItems: "center",
            padding: isMobile ? "14px" : "28px",
            background: "rgba(0,0,0,0.74)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            style={{
              ...glassPanel,
              width: "min(660px, 100%)",
              padding: isMobile ? "22px" : "30px",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setListingUnitId(null)}
              aria-label="Close exact-unit resale form"
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
              Exact-Unit Resale
            </p>
            <h2 style={{ margin: "12px 48px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "32px" : "40px", fontWeight: 500 }}>
              {listingUnit.property_name} · Unit {listingUnit.unit_number}
            </h2>
            <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.56)", lineHeight: 1.55 }}>
              This exact managed unit will transfer to the buyer with all of its upgrades intact.
            </p>

            {(() => {
              const reference = Math.max(1, listingUnit.current_value);
              const min = Math.max(1, Math.round(reference * 0.85));
              const max = Math.max(min, Math.round(reference * 1.15));
              return (
                <>
                  <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "9px" }}>
                    {[
                      ["Unit Value", `${formatNumber(reference)} DT`],
                      ["Minimum", `${formatNumber(min)} DT`],
                      ["Maximum", `${formatNumber(max)} DT`],
                    ].map(([label, value]) => (
                      <div key={label} style={{ borderRadius: "14px", background: "rgba(255,255,255,0.055)", padding: "12px" }}>
                        <small style={{ color: "rgba(255,255,255,0.45)" }}>{label}</small>
                        <strong style={{ display: "block", marginTop: "5px" }}>{value}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "9px" }}>
                    {[
                      ["Upgrades", `${listingUnit.upgrade_level_total}/30`],
                      ["Rent Potential", `${formatNumber(listingUnit.rental_potential)} DT/wk`],
                      ["Appeal", `${listingUnit.appeal}/100`],
                    ].map(([label, value]) => (
                      <div key={label} style={{ borderRadius: "14px", background: "rgba(255,255,255,0.035)", padding: "12px" }}>
                        <small style={{ color: "rgba(255,255,255,0.42)" }}>{label}</small>
                        <strong style={{ display: "block", marginTop: "5px", color: "#8ee8ff" }}>{value}</strong>
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
                      value={askingPrice}
                      onChange={(event) => setAskingPrice(Math.round(Number(event.target.value) || 0))}
                      style={{ height: "48px", borderRadius: "14px", border: "1px solid rgba(255,209,138,0.24)", background: "rgba(255,255,255,0.08)", color: "white", padding: "0 15px", fontSize: "16px", outline: "none" }}
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
                onClick={() => void submitResaleListing()}
                disabled={actionLoading}
                style={{ ...primaryButton, flex: 1, minWidth: "190px", opacity: actionLoading ? 0.55 : 1 }}
              >
                {actionLoading ? "Creating Listing..." : "List This Exact Unit"}
              </button>
              <button type="button" onClick={() => setListingUnitId(null)} style={secondaryButton}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}

      <div style={{ display: "grid", gap: "18px" }}>
        <section
          data-milo-guide="property-portfolio-summary"
          style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: "12px" }}
        >
          {[
            ["Cash", `${formatNumber(dreamTokens)} DT`, "Available DT"],
            ["Property Value", `${formatNumber(propertyPortfolioValue)} DT`, "Exact managed-unit value"],
            ["Contracted Rent", `${formatNumber(contractedWeeklyRent)} DT/wk`, `${activeLeases.length} active tenant${activeLeases.length === 1 ? "" : "s"}`],
            ["Occupancy", `${activeLeases.length} / ${totalOwnedUnits}`, `${activeRentalListings.length} listed for rent`],
          ].map(([label, value, detail]) => (
            <article key={label} style={{ ...glassPanel, padding: isMobile ? "15px" : "18px", borderRadius: "20px" }}>
              <span style={{ display: "block", color: "rgba(255,255,255,0.45)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 900 }}>{label}</span>
              <strong style={{ display: "block", marginTop: "7px", fontSize: isMobile ? "19px" : "24px" }}>{value}</strong>
              <small style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.4)" }}>{detail}</small>
            </article>
          ))}
        </section>

        <section data-milo-guide="property-resident-overview" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: "14px", alignItems: isMobile ? "stretch" : "flex-end" }}>
            <div>
              <p style={{ margin: 0, color: "#79f2ce", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>Dreamscape Resident Market</p>
              <h2 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "39px", fontWeight: 500 }}>Tenants, applications and offers</h2>
            </div>
            <button type="button" onClick={() => void onRefreshResidentMarket()} disabled={actionLoading} style={{ ...secondaryButton, minHeight: "42px" }}>
              ↻ Resident Market
            </button>
          </div>

          <div style={{ marginTop: "17px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,minmax(0,1fr))", gap: "10px" }}>
            {[
              ["Rental Listings", activeRentalListings.length],
              ["Applications", rentalApplications.filter((item) => item.status === "pending").length],
              ["Active Tenants", activeLeases.length],
              ["Resident Offers", purchaseOffers.filter((item) => item.status === "active").length],
              ["Landlord Reputation", `${Math.round(Number(landlordReputation.score || 60))}/100`],
              ["Unread Messages", unreadMessages],
            ].map(([label, value]) => (
              <button
                key={String(label)}
                type="button"
                onClick={() => label === "Unread Messages" && onOpenMessages()}
                style={{
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "14px",
                  color: "white",
                  textAlign: "left",
                  cursor: label === "Unread Messages" ? "pointer" : "default",
                  fontFamily: "inherit",
                }}
              >
                <small style={{ color: "rgba(255,255,255,0.46)" }}>{label}</small>
                <strong style={{ display: "block", marginTop: "5px", fontSize: "22px", color: label === "Landlord Reputation" ? "#79f2ce" : label === "Unread Messages" && Number(value) > 0 ? "#ffd18a" : "white" }}>{value}</strong>
              </button>
            ))}
          </div>
        </section>

        <section data-milo-guide="property-reputation" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px", border: "1px solid rgba(142,232,255,0.14)", background: "linear-gradient(145deg, rgba(83,215,255,0.05), rgba(5,13,28,0.74))" }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: "14px", alignItems: isMobile ? "stretch" : "flex-end" }}>
            <div>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>Landlord Reputation</p>
              <h2 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "39px", fontWeight: 500 }}>
                {Math.round(Number(landlordReputation.score || 60))}/100 · {Number(landlordReputation.score || 60) >= 85 ? "Exceptional" : Number(landlordReputation.score || 60) >= 72 ? "Trusted" : Number(landlordReputation.score || 60) >= 58 ? "Established" : Number(landlordReputation.score || 60) >= 42 ? "Developing" : "At Risk"}
              </h2>
              <p style={{ margin: "9px 0 0", maxWidth: "830px", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.55 }}>
                Residents remember completed leases, renewal history, satisfaction, repairs, ignored problems and early departures. Reputation now influences renewal behaviour and how much flexibility tenants have during negotiations.
              </p>
            </div>
            <button type="button" onClick={onOpenMessages} style={{ ...primaryButton, minHeight: "42px" }}>
              Open Property Messages{unreadMessages > 0 ? ` · ${unreadMessages}` : ""}
            </button>
          </div>
          <div style={{ marginTop: "17px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,minmax(0,1fr))", gap: "10px" }}>
            {[
              ["Completed Leases", landlordReputation.completed_leases],
              ["Renewals", landlordReputation.renewals],
              ["Avg Satisfaction", `${Math.round(Number(landlordReputation.average_satisfaction || 80))}/100`],
              ["Full Repairs", landlordReputation.full_repairs],
              ["Early Departures", landlordReputation.early_departures],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ borderRadius: "16px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)", padding: "14px" }}>
                <small style={{ color: "rgba(255,255,255,0.46)" }}>{label}</small>
                <strong style={{ display: "block", marginTop: "5px", fontSize: "21px", color: label === "Early Departures" && Number(value) > 0 ? "#ffd18a" : "white" }}>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <ResidentLifePanel
          residents={residentLifeProfiles}
          events={residentLifeEvents}
          stats={residentLifeStats}
          isMobile={isMobile}
          isCompact={isCompact}
          actionLoading={actionLoading}
          glassPanel={glassPanel}
          secondaryButton={secondaryButton}
          onRefresh={() => void onRefreshResidentLife()}
          onOpenMessages={onOpenMessages}
        />

        <section data-milo-guide="property-maintenance-overview" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px", border: "1px solid rgba(121,242,206,0.15)", background: "linear-gradient(145deg, rgba(121,242,206,0.05), rgba(5,13,28,0.74))" }}>
          <div>
            <p style={{ margin: 0, color: "#79f2ce", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>Property Health</p>
            <h2 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "39px", fontWeight: 500 }}>Condition now changes the economics</h2>
            <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.55, maxWidth: "840px" }}>
              Wear, maintenance issues and landlord decisions affect property value, rent potential and tenant satisfaction. Major neglected problems can cause an active tenant to leave early.
            </p>
          </div>

          <div style={{ marginTop: "17px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: "10px" }}>
            {[
              ["Average Condition", `${Math.round(Number(maintenanceStats.average_condition || 100))}/100`],
              ["Open Issues", Number(maintenanceStats.open_issues || 0)],
              ["Urgent Issues", Number(maintenanceStats.urgent_issues || 0)],
              ["At-risk Tenants", Number(maintenanceStats.at_risk_tenants || 0)],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ borderRadius: "16px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)", padding: "14px" }}>
                <small style={{ color: "rgba(255,255,255,0.46)" }}>{label}</small>
                <strong style={{ display: "block", marginTop: "5px", fontSize: "22px", color: label === "Urgent Issues" && Number(value) > 0 ? "#ff9292" : label === "At-risk Tenants" && Number(value) > 0 ? "#ffd18a" : "white" }}>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        {message && (
          <div style={{ padding: "13px 15px", borderRadius: "14px", border: "1px solid rgba(255,209,138,0.18)", background: "rgba(255,209,138,0.07)", color: "#ffe5bb", fontSize: "13px", fontWeight: 750 }}>
            {message}
          </div>
        )}

        <section data-milo-guide="property-managed-units" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>My Property Units</p>
          <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "42px", fontWeight: 500 }}>Manage exact assets</h2>
          <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.55 }}>
            Each card is one real managed unit. Upgrades, tenants and resale listings belong to that exact unit.
          </p>

          {units.length === 0 ? (
            <div style={{ marginTop: "18px", minHeight: "130px", display: "grid", placeItems: "center", borderRadius: "17px", border: "1px dashed rgba(132,218,255,0.18)", color: "rgba(255,255,255,0.5)" }}>
              Purchase a property from the Property Map to begin.
            </div>
          ) : (
            <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: "14px" }}>
              {units.map((unit) => {
                const image = getPropertyUnitPreviewImage(unit, properties);
                const activeResale = activeResaleByUnit.get(unit.unit_id);
                const occupied = occupiedUnitIds.has(unit.unit_id);
                const listedForRent = rentalListedUnitIds.has(unit.unit_id);
                const status = activeResale ? "Listed for Sale" : occupied ? "Tenant Active" : listedForRent ? "Listed for Rent" : "Vacant";
                const statusColor = activeResale ? "#ffd18a" : occupied ? "#79f2ce" : listedForRent ? "#8ee8ff" : "rgba(255,255,255,0.62)";

                return (
                  <article key={unit.unit_id} style={{ overflow: "hidden", borderRadius: "20px", border: activeResale ? "1px solid rgba(255,209,138,0.25)" : "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.045)" }}>
                    {image && <img src={image} alt={`${unit.property_name} Unit ${unit.unit_number}`} style={{ width: "100%", height: "150px", objectFit: "cover", display: "block" }} />}
                    <div style={{ padding: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ minWidth: 0 }}>
                          <strong style={{ display: "block", fontSize: "16px" }}>{unit.property_name}</strong>
                          <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>Unit {unit.unit_number} · {unit.district}</small>
                        </span>
                        <span style={{ flexShrink: 0, borderRadius: "999px", padding: "5px 8px", background: `${statusColor}12`, color: statusColor, fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>{status}</span>
                      </div>

                      <div style={{ marginTop: "13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <div style={{ borderRadius: "13px", padding: "10px", background: "rgba(255,255,255,0.04)" }}><small style={{ color: "rgba(255,255,255,0.42)" }}>Value</small><strong style={{ display: "block", marginTop: "4px", color: "#ffd18a" }}>{formatNumber(unit.current_value)} DT</strong></div>
                        <div style={{ borderRadius: "13px", padding: "10px", background: "rgba(255,255,255,0.04)" }}><small style={{ color: "rgba(255,255,255,0.42)" }}>Rent Potential</small><strong style={{ display: "block", marginTop: "4px", color: "#8ee8ff" }}>{formatNumber(unit.rental_potential)} DT/wk</strong></div>
                      </div>

                      <div style={{ marginTop: "11px", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "7px", color: "rgba(255,255,255,0.45)", fontSize: "10px" }}>
                        <span>Upgrades <strong style={{ color: "rgba(255,255,255,0.78)" }}>{unit.upgrade_level_total}/30</strong></span>
                        <span>Condition <strong style={{ color: unit.condition >= 75 ? "#79f2ce" : unit.condition >= 50 ? "#ffd18a" : "#ff9292" }}>{unit.condition}</strong></span>
                        <span>Issues <strong style={{ color: maintenanceIssues.some((item) => item.unit_id === unit.unit_id && ["open","ignored","temporary"].includes(item.status)) ? "#ffb0b0" : "#79f2ce" }}>{maintenanceIssues.filter((item) => item.unit_id === unit.unit_id && ["open","ignored","temporary"].includes(item.status)).length}</strong></span>
                      </div>

                      <button type="button" onClick={() => setSelectedUnitId(unit.unit_id)} style={{ ...primaryButton, width: "100%", minHeight: "40px", marginTop: "13px" }}>
                        View & Manage
                      </button>

                      {activeResale ? (
                        <button type="button" onClick={() => void onCancelListing(activeResale.listing_id)} disabled={actionLoading} style={{ ...secondaryButton, width: "100%", minHeight: "38px", marginTop: "8px", color: "#ffd18a" }}>
                          Cancel Resale · {formatNumber(activeResale.asking_price)} DT
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openResaleListing(unit)}
                          disabled={actionLoading || occupied || listedForRent}
                          style={{ ...secondaryButton, width: "100%", minHeight: "38px", marginTop: "8px", opacity: actionLoading || occupied || listedForRent ? 0.45 : 1 }}
                        >
                          {occupied ? "Tenant Active" : listedForRent ? "Cancel Rental Listing First" : "List Exact Unit for Resale"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section data-milo-guide="property-upgrade-overview" style={{ ...glassPanel, padding: isMobile ? "18px" : "22px", border: "1px solid rgba(121,242,206,0.15)", background: "linear-gradient(145deg, rgba(121,242,206,0.05), rgba(5,13,28,0.74))" }}>
          <p style={{ margin: 0, color: "#79f2ce", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>Asset Identity</p>
          <h3 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "29px" : "35px", fontWeight: 500 }}>Upgrades now travel with the property</h3>
          <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.56)", lineHeight: 1.6, fontSize: "13px", maxWidth: "900px" }}>
            Player resale is no longer based on a generic property type. The buyer receives the exact unit shown in the listing, including its upgrade levels, value and rent potential.
          </p>
        </section>

        <section data-milo-guide="property-my-listings" style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, color: "#ffd18a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>My Resale Activity</p>
              <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "32px" : "39px", fontWeight: 500 }}>Exact-Unit Listings</h2>
            </div>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>{activeMyListings.length} active</span>
          </div>

          {activeMyListings.length === 0 && recentMyListings.length === 0 ? (
            <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.55)" }}>You have not created any exact-unit resale listings yet.</p>
          ) : (
            <div className="milo-scrollbar" style={{ marginTop: "17px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: "9px", maxHeight: "560px", overflowY: "auto", paddingRight: "3px" }}>
              {[...activeMyListings, ...recentMyListings].map((listing) => (
                <article key={listing.listing_id} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block" }}>{listing.property_name} · Unit {listing.unit_number}</strong>
                      <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>{formatNumber(listing.asking_price)} DT · {listing.upgrade_level_total}/30 upgrades</small>
                    </span>
                    <span style={{ flexShrink: 0, borderRadius: "999px", padding: "5px 8px", background: listing.status === "active" ? "rgba(121,242,206,0.1)" : listing.status === "sold" ? "rgba(142,232,255,0.1)" : "rgba(255,255,255,0.07)", color: listing.status === "active" ? "#79f2ce" : listing.status === "sold" ? "#8ee8ff" : "rgba(255,255,255,0.62)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>{listing.status}</span>
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
