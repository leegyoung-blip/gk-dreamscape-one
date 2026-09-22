"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  formatNumber,
  type PropertyBusinessSpaceApplication,
  type PropertyBusinessSpaceBusiness,
  type PropertyBusinessSpaceDashboard,
  type PropertyBusinessSpaceListing,
  type PropertyBusinessSpaceUnit,
  type PropertyTabStyles,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  dashboard: PropertyBusinessSpaceDashboard;
  currentUserId: string | null;
  actionLoading: boolean;
  isMobile: boolean;
  isCompact: boolean;
  onRefresh: () => Promise<void>;
  onUseOwnedSpace: (slotId: number, unitId: string) => Promise<void>;
  onLeaveSpace: (slotId: number) => Promise<void>;
  onCreateListing: (unitId: string, weeklyRent: number, minWeeks: number, maxWeeks: number) => Promise<void>;
  onCancelListing: (listingId: string) => Promise<void>;
  onApplyForSpace: (listingId: string, slotId: number, weeklyRent: number, leaseWeeks: number) => Promise<void>;
  onRespondApplication: (applicationId: string, action: "accept" | "reject") => Promise<void>;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fitLabel(score: number) {
  if (score >= 85) return "Excellent fit";
  if (score >= 70) return "Strong fit";
  if (score >= 55) return "Usable";
  return "Poor fit";
}

function fitColor(score: number) {
  if (score >= 85) return "#79f2ce";
  if (score >= 70) return "#8ee8ff";
  if (score >= 55) return "#ffd18a";
  return "#ff9b9b";
}

function estimateFit(business: PropertyBusinessSpaceBusiness, space: PropertyBusinessSpaceListing | PropertyBusinessSpaceUnit) {
  if (!business.required_property_type || business.required_property_type !== space.property_type) return 0;
  const target = Math.max(1, Number(business.target_area_sqm || business.minimum_area_sqm || 1));
  const areaScore = clamp((Number(space.area_sqm || 0) / target) * 100, 0, 100);
  const qualityScore = clamp(
    100 - Math.abs(Number(space.appeal || 0) - 65) * 0.55 - Math.abs(Number(space.quality || 0) - 62) * 0.65 - Math.abs(Number(space.efficiency || 0) - 52) * 0.35,
    0,
    100,
  );
  return Math.round(areaScore * 0.45 + qualityScore * 0.55);
}

export default function BusinessSpacePanel({
  dashboard,
  currentUserId,
  actionLoading,
  isMobile,
  isCompact,
  glassPanel,
  primaryButton,
  secondaryButton,
  onRefresh,
  onUseOwnedSpace,
  onLeaveSpace,
  onCreateListing,
  onCancelListing,
  onApplyForSpace,
  onRespondApplication,
}: Props) {
  const businesses = dashboard.businesses || [];
  const ownedUnits = dashboard.owned_commercial_units || [];
  const marketListings = dashboard.market_listings || [];
  const applications = dashboard.applications || [];
  const stats = dashboard.stats || {
    running_businesses: 0,
    businesses_with_space: 0,
    commercial_units_owned: 0,
    spaces_listed: 0,
    incoming_applications: 0,
  };

  const [selectedSlot, setSelectedSlot] = useState<number | null>(businesses[0]?.slot_id || null);
  const [listingUnitId, setListingUnitId] = useState<string | null>(null);
  const [listingRent, setListingRent] = useState(0);
  const [listingMinWeeks, setListingMinWeeks] = useState(8);
  const [listingMaxWeeks, setListingMaxWeeks] = useState(24);
  const [applyListingId, setApplyListingId] = useState<string | null>(null);
  const [applyRent, setApplyRent] = useState(0);
  const [applyWeeks, setApplyWeeks] = useState(16);

  const selectedBusiness = businesses.find((b) => b.slot_id === selectedSlot) || businesses[0] || null;
  const myActiveListings = marketListings.filter((listing) => listing.owner_user_id === currentUserId);
  const publicListings = marketListings.filter((listing) => listing.owner_user_id !== currentUserId);
  const incomingApplications = applications.filter((app) => app.landlord_user_id === currentUserId && app.status === "pending");
  const myApplications = applications.filter((app) => app.business_user_id === currentUserId && app.status === "pending");

  const compatibleOwnedUnits = useMemo(() => {
    if (!selectedBusiness?.required_property_type) return [];
    return ownedUnits.filter((unit) => !unit.occupied && !unit.listed && unit.property_type === selectedBusiness.required_property_type);
  }, [ownedUnits, selectedBusiness]);

  function openListing(unit: PropertyBusinessSpaceUnit) {
    setListingUnitId(unit.unit_id);
    setListingRent(Math.max(1, Math.round(Number(unit.rental_potential || 1))));
    setListingMinWeeks(8);
    setListingMaxWeeks(24);
  }

  function openApplication(listing: PropertyBusinessSpaceListing) {
    setApplyListingId(listing.listing_id);
    setApplyRent(listing.asking_weekly_rent);
    setApplyWeeks(Math.max(listing.min_lease_weeks, Math.min(16, listing.max_lease_weeks)));
  }

  return (
    <section
      data-milo-guide="property-business-spaces"
      style={{
        ...glassPanel,
        padding: isMobile ? "18px" : "22px",
        border: "1px solid rgba(255,209,138,0.16)",
        background: "linear-gradient(145deg, rgba(255,209,138,0.055), rgba(5,13,28,0.76))",
      }}
    >
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", gap: "14px", alignItems: isMobile ? "stretch" : "flex-end" }}>
        <div>
          <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>Business Spaces</p>
          <h2 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "39px", fontWeight: 500 }}>Put commercial property to work</h2>
          <p style={{ margin: "9px 0 0", maxWidth: "920px", color: "rgba(255,255,255,0.52)", fontSize: "13px", lineHeight: 1.6 }}>
            Offices and retail units can now become real premises for Business Builder businesses. Better-fitting spaces can improve how a business performs, while rent becomes a real operating cost.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href="/milo-world/club" style={{ ...secondaryButton, minHeight: "38px", padding: "0 14px" }}>Open Business Builder</Link>
          <button type="button" onClick={() => void onRefresh()} disabled={actionLoading} style={{ ...secondaryButton, minHeight: "38px", padding: "0 14px", opacity: actionLoading ? 0.55 : 1 }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,minmax(0,1fr))", gap: "9px" }}>
        {[
          ["My Businesses", stats.running_businesses],
          ["With Premises", stats.businesses_with_space],
          ["Commercial Units", stats.commercial_units_owned],
          ["Spaces Listed", stats.spaces_listed],
          ["Applications", stats.incoming_applications],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ borderRadius: "14px", padding: "12px", background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <small style={{ color: "rgba(255,255,255,0.44)" }}>{label}</small>
            <strong style={{ display: "block", marginTop: "4px", fontSize: "20px" }}>{value}</strong>
          </div>
        ))}
      </div>

      {businesses.length === 0 ? (
        <div style={{ marginTop: "17px", minHeight: "120px", display: "grid", placeItems: "center", borderRadius: "17px", border: "1px dashed rgba(255,209,138,0.2)", textAlign: "center", padding: "22px", color: "rgba(255,255,255,0.56)" }}>
          <div>
            <strong style={{ display: "block", color: "white" }}>You do not have a running Business Builder business yet.</strong>
            <span style={{ display: "block", marginTop: "6px", fontSize: "12px" }}>Launch a business first, then come back here to choose its premises.</span>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginTop: "18px", display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "2px" }}>
            {businesses.map((business) => {
              const active = selectedBusiness?.slot_id === business.slot_id;
              return (
                <button key={business.slot_id} type="button" onClick={() => setSelectedSlot(business.slot_id)} style={{ minWidth: isMobile ? "210px" : "230px", borderRadius: "15px", border: active ? "1px solid rgba(255,209,138,0.42)" : "1px solid rgba(255,255,255,0.09)", background: active ? "rgba(255,209,138,0.10)" : "rgba(255,255,255,0.035)", color: "white", padding: "12px", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                  <strong style={{ display: "block" }}>{business.business_name}</strong>
                  <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>{business.business_title || business.business_type_id} · {business.staff_count} staff</small>
                  <span style={{ display: "block", marginTop: "7px", color: business.occupancy_id ? "#79f2ce" : "#ffd18a", fontSize: "10px", fontWeight: 900 }}>{business.occupancy_id ? `${business.property_name} · Unit ${business.unit_number}` : "Needs premises"}</span>
                </button>
              );
            })}
          </div>

          {selectedBusiness && (
            <div style={{ marginTop: "14px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.035)", padding: isMobile ? "14px" : "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "minmax(0,1.15fr) minmax(330px,0.85fr)", gap: "14px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ fontSize: "17px" }}>{selectedBusiness.business_name}</strong>
                      <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "12px" }}>{selectedBusiness.required_property_type === "office" ? "Needs office space" : "Needs retail space"} · Target {formatNumber(Number(selectedBusiness.target_area_sqm || 0))} sqm · Budget about {formatNumber(selectedBusiness.weekly_budget)} DT/week</p>
                    </div>
                    {selectedBusiness.occupancy_id && <span style={{ borderRadius: "999px", padding: "6px 9px", background: "rgba(121,242,206,0.1)", color: "#79f2ce", fontSize: "10px", fontWeight: 900 }}>Premises active</span>}
                  </div>

                  {selectedBusiness.occupancy_id ? (
                    <div style={{ marginTop: "13px", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "8px" }}>
                      {[
                        ["Premises", `${selectedBusiness.property_name || "Space"} · Unit ${selectedBusiness.unit_number || ""}`],
                        ["Weekly Cost", `${formatNumber(Number(selectedBusiness.weekly_space_cost || 0))} DT`],
                        ["Fit", `${Number(selectedBusiness.fit_score || 0)}/100`],
                        ["Capacity", `${Number(selectedBusiness.capacity_staff || 0)} staff`],
                      ].map(([label, value]) => (
                        <div key={String(label)} style={{ borderRadius: "13px", padding: "10px", background: "rgba(255,255,255,0.045)" }}><small style={{ color: "rgba(255,255,255,0.4)" }}>{label}</small><strong style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>{value}</strong></div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.56)", fontSize: "12px", lineHeight: 1.55 }}>Choose one of your own compatible commercial properties, or apply for a listed space below.</p>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: isCompact ? "flex-start" : "flex-end", gap: "8px", flexWrap: "wrap" }}>
                  {selectedBusiness.occupancy_id ? (
                    <button type="button" onClick={() => void onLeaveSpace(selectedBusiness.slot_id)} disabled={actionLoading} style={{ ...secondaryButton, minHeight: "38px", opacity: actionLoading ? 0.55 : 1 }}>Leave Premises</button>
                  ) : compatibleOwnedUnits.length > 0 ? (
                    compatibleOwnedUnits.slice(0, 3).map((unit) => {
                      const fit = estimateFit(selectedBusiness, unit);
                      return <button key={unit.unit_id} type="button" onClick={() => void onUseOwnedSpace(selectedBusiness.slot_id, unit.unit_id)} disabled={actionLoading} style={{ ...primaryButton, minHeight: "38px", padding: "0 13px", opacity: actionLoading ? 0.55 : 1 }}>Use {unit.property_name} · U{unit.unit_number} ({fit})</button>;
                    })
                  ) : <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "12px" }}>No compatible owned space available.</span>}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {ownedUnits.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div><p style={{ margin: 0, color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>My Commercial Properties</p><h3 style={{ margin: "6px 0 0", fontSize: "18px" }}>Use them yourself or rent them to businesses</h3></div>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>{ownedUnits.length} commercial unit{ownedUnits.length === 1 ? "" : "s"}</span>
          </div>
          <div style={{ marginTop: "11px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: "10px" }}>
            {ownedUnits.map((unit) => {
              const activeListing = myActiveListings.find((l) => l.unit_id === unit.unit_id);
              return (
                <article key={unit.unit_id} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.035)", padding: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span><strong>{unit.property_name}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.43)" }}>Unit {unit.unit_number} · {unit.property_type} · {unit.area_sqm} sqm</small></span><span style={{ color: unit.occupied ? "#79f2ce" : unit.listed ? "#ffd18a" : "rgba(255,255,255,0.55)", fontSize: "10px", fontWeight: 900 }}>{unit.occupied ? "IN USE" : unit.listed ? "LISTED" : "AVAILABLE"}</span></div>
                  <div style={{ marginTop: "9px", display: "flex", gap: "12px", color: "rgba(255,255,255,0.46)", fontSize: "10px" }}><span>Rent potential <strong style={{ color: "#8ee8ff" }}>{formatNumber(unit.rental_potential)} DT/wk</strong></span><span>Quality <strong style={{ color: "white" }}>{unit.quality}</strong></span></div>
                  {!unit.occupied && !unit.listed && (
                    <button type="button" onClick={() => openListing(unit)} style={{ ...secondaryButton, width: "100%", minHeight: "36px", marginTop: "10px" }}>List as Business Space</button>
                  )}
                  {activeListing && <button type="button" onClick={() => void onCancelListing(activeListing.listing_id)} disabled={actionLoading} style={{ ...secondaryButton, width: "100%", minHeight: "36px", marginTop: "10px", color: "#ffd18a" }}>Cancel · {formatNumber(activeListing.asking_weekly_rent)} DT/wk</button>}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {listingUnitId && (() => {
        const unit = ownedUnits.find((x) => x.unit_id === listingUnitId);
        if (!unit) return null;
        return (
          <div style={{ marginTop: "12px", borderRadius: "16px", padding: "14px", border: "1px solid rgba(255,209,138,0.18)", background: "rgba(255,209,138,0.055)" }}>
            <strong>List {unit.property_name} · Unit {unit.unit_number}</strong>
            <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr auto", gap: "8px", alignItems: "end" }}>
              <label style={{ display: "grid", gap: "5px" }}><small style={{ color: "rgba(255,255,255,0.45)" }}>Weekly rent</small><input type="number" min={1} value={listingRent} onChange={(e) => setListingRent(Math.max(1, Math.round(Number(e.target.value) || 1)))} style={{ height: "40px", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", padding: "0 10px" }} /></label>
              <label style={{ display: "grid", gap: "5px" }}><small style={{ color: "rgba(255,255,255,0.45)" }}>Min weeks</small><input type="number" min={4} value={listingMinWeeks} onChange={(e) => setListingMinWeeks(Math.max(4, Math.round(Number(e.target.value) || 8)))} style={{ height: "40px", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", padding: "0 10px" }} /></label>
              <label style={{ display: "grid", gap: "5px" }}><small style={{ color: "rgba(255,255,255,0.45)" }}>Max weeks</small><input type="number" min={listingMinWeeks} value={listingMaxWeeks} onChange={(e) => setListingMaxWeeks(Math.max(listingMinWeeks, Math.round(Number(e.target.value) || 24)))} style={{ height: "40px", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", padding: "0 10px" }} /></label>
              <div style={{ display: "flex", gap: "7px" }}><button type="button" onClick={() => void onCreateListing(unit.unit_id, listingRent, listingMinWeeks, listingMaxWeeks).then(() => setListingUnitId(null))} disabled={actionLoading} style={{ ...primaryButton, minHeight: "40px" }}>List</button><button type="button" onClick={() => setListingUnitId(null)} style={{ ...secondaryButton, minHeight: "40px" }}>Cancel</button></div>
            </div>
          </div>
        );
      })()}

      {selectedBusiness && !selectedBusiness.occupancy_id && publicListings.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <p style={{ margin: 0, color: "#79f2ce", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Available Business Spaces</p>
          <h3 style={{ margin: "6px 0 0", fontSize: "18px" }}>Find premises for {selectedBusiness.business_name}</h3>
          <div style={{ marginTop: "11px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: "10px" }}>
            {publicListings.filter((listing) => listing.property_type === selectedBusiness.required_property_type).slice(0, 9).map((listing) => {
              const fit = estimateFit(selectedBusiness, listing);
              const pending = myApplications.some((app) => app.listing_id === listing.listing_id && app.business_slot_id === selectedBusiness.slot_id);
              return (
                <article key={listing.listing_id} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.035)", padding: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span><strong>{listing.property_name}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.43)" }}>{listing.area_sqm} sqm · {listing.property_type}</small></span><span style={{ color: fitColor(fit), fontSize: "10px", fontWeight: 900 }}>{fitLabel(fit)} · {fit}</span></div>
                  <div style={{ marginTop: "9px", display: "flex", justifyContent: "space-between", gap: "8px", color: "rgba(255,255,255,0.47)", fontSize: "11px" }}><span>Asking <strong style={{ color: "#ffd18a" }}>{formatNumber(listing.asking_weekly_rent)} DT/wk</strong></span><span>Budget <strong style={{ color: listing.asking_weekly_rent <= selectedBusiness.weekly_budget ? "#79f2ce" : "#ffd18a" }}>{formatNumber(selectedBusiness.weekly_budget)}</strong></span></div>
                  <button type="button" onClick={() => openApplication(listing)} disabled={pending || actionLoading || fit < 35} style={{ ...primaryButton, width: "100%", minHeight: "36px", marginTop: "10px", opacity: pending || actionLoading || fit < 35 ? 0.45 : 1 }}>{pending ? "Application Sent" : fit < 35 ? "Not Suitable" : "Apply for Space"}</button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {applyListingId && selectedBusiness && (() => {
        const listing = marketListings.find((x) => x.listing_id === applyListingId);
        if (!listing) return null;
        return (
          <div style={{ marginTop: "12px", borderRadius: "16px", padding: "14px", border: "1px solid rgba(121,242,206,0.18)", background: "rgba(121,242,206,0.05)" }}>
            <strong>Apply for {listing.property_name}</strong>
            <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "11px" }}>The owner is asking {formatNumber(listing.asking_weekly_rent)} DT/week. You can make a sensible opening offer.</p>
            <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr auto", gap: "8px", alignItems: "end" }}>
              <label style={{ display: "grid", gap: "5px" }}><small style={{ color: "rgba(255,255,255,0.45)" }}>Offer / week</small><input type="number" min={1} value={applyRent} onChange={(e) => setApplyRent(Math.max(1, Math.round(Number(e.target.value) || 1)))} style={{ height: "40px", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", padding: "0 10px" }} /></label>
              <label style={{ display: "grid", gap: "5px" }}><small style={{ color: "rgba(255,255,255,0.45)" }}>Lease weeks</small><input type="number" min={listing.min_lease_weeks} max={listing.max_lease_weeks} value={applyWeeks} onChange={(e) => setApplyWeeks(clamp(Math.round(Number(e.target.value) || 16), listing.min_lease_weeks, listing.max_lease_weeks))} style={{ height: "40px", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", padding: "0 10px" }} /></label>
              <div style={{ display: "flex", gap: "7px" }}><button type="button" onClick={() => void onApplyForSpace(listing.listing_id, selectedBusiness.slot_id, applyRent, applyWeeks).then(() => setApplyListingId(null))} disabled={actionLoading} style={{ ...primaryButton, minHeight: "40px" }}>Send Application</button><button type="button" onClick={() => setApplyListingId(null)} style={{ ...secondaryButton, minHeight: "40px" }}>Cancel</button></div>
            </div>
          </div>
        );
      })()}

      {incomingApplications.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <p style={{ margin: 0, color: "#ffd18a", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Business Applications</p>
          <h3 style={{ margin: "6px 0 0", fontSize: "18px" }}>Businesses want to rent your space</h3>
          <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: "9px" }}>
            {incomingApplications.map((app: PropertyBusinessSpaceApplication) => (
              <article key={app.id} style={{ borderRadius: "15px", border: "1px solid rgba(255,209,138,0.14)", background: "rgba(255,209,138,0.045)", padding: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span><strong>{app.business_name}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.44)" }}>{app.property_name} · {app.lease_weeks} weeks</small></span><span style={{ color: fitColor(app.fit_score), fontSize: "10px", fontWeight: 900 }}>Fit {app.fit_score}</span></div>
                <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.58)", fontSize: "12px" }}>Offers <strong style={{ color: "#ffd18a" }}>{formatNumber(app.proposed_weekly_rent)} DT/week</strong> · Your asking rent {formatNumber(app.asking_weekly_rent)} DT/week</p>
                <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}><button type="button" onClick={() => void onRespondApplication(app.id, "accept")} disabled={actionLoading} style={{ ...primaryButton, minHeight: "36px" }}>Accept</button><button type="button" onClick={() => void onRespondApplication(app.id, "reject")} disabled={actionLoading} style={{ ...secondaryButton, minHeight: "36px" }}>Decline</button></div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
