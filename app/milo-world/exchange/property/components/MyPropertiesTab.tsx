"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PropertyManagementModal from "./PropertyManagementModal";
import BusinessSpacePanel from "./BusinessSpacePanel";
import EmploymentEconomyPanel from "./EmploymentEconomyPanel";
import PropertyFinancePanel from "./PropertyFinancePanel";
import {
  formatDateTime,
  formatNumber,
  getPropertyUnitPreviewImage,
  getResidentAvatarSrc,
  titleCase,
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
  type PropertyBusinessSpaceDashboard,
  type MiloEmploymentDashboard,
  type PropertyFinanceDashboard,
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
  businessSpaceDashboard: PropertyBusinessSpaceDashboard;
  employmentDashboard: MiloEmploymentDashboard;
  financeDashboard: PropertyFinanceDashboard;
  currentUserId: string | null;
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
  onRefreshBusinessSpaces: () => Promise<void>;
  onRefreshEmployment: () => Promise<void>;
  onRefreshFinance: () => Promise<void>;
  onCatchUpFinance: (loanId: string) => Promise<void>;
  onPayExtraFinance: (loanId: string, amount: number) => Promise<void>;
  onPayOffFinance: (loanId: string) => Promise<void>;
  onStartProtection: (unitId: string, planCode: "basic" | "plus" | "premium") => Promise<void>;
  onCancelProtection: (policyId: string) => Promise<void>;
  onUseOwnedBusinessSpace: (slotId: number, unitId: string) => Promise<void>;
  onLeaveBusinessSpace: (slotId: number) => Promise<void>;
  onCreateBusinessSpaceListing: (unitId: string, weeklyRent: number, minWeeks: number, maxWeeks: number) => Promise<void>;
  onCancelBusinessSpaceListing: (listingId: string) => Promise<void>;
  onApplyForBusinessSpace: (listingId: string, slotId: number, weeklyRent: number, leaseWeeks: number) => Promise<void>;
  onRespondBusinessSpaceApplication: (applicationId: string, action: "accept" | "reject") => Promise<void>;
  onRespondNpcBusinessSpaceApplication: (applicationId: string, action: "accept" | "reject") => Promise<void>;
  onRespondMaintenanceIssue: (issueId: string, action: "full_repair" | "quick_fix" | "ignore") => Promise<void>;
  onPreventiveService: (unitId: string) => Promise<void>;
  onOpenMessages: () => void;
  onCreateListing: (unitId: string, askingPrice: number) => Promise<void>;
  onCancelListing: (listingId: string) => Promise<void>;
};

type MyPropertiesSection = "overview" | "properties" | "people" | "finance";
type PeopleSection = "tenants" | "applicants" | "businesses";

const UPGRADE_ORDER = [
  "Interior Finish",
  "Furnishing & Fit-Out",
  "Facilities",
  "Smart Systems",
  "Energy Efficiency",
  "Amenities",
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (!Number.isFinite(target)) return null;
  return Math.ceil((target - Date.now()) / 86400000);
}

function reputationLabel(scoreValue: number) {
  const score = clamp(Math.round(Number(scoreValue || 60)), 0, 100);
  if (score >= 85) return "Exceptional";
  if (score >= 72) return "Trusted";
  if (score >= 58) return "Established";
  if (score >= 42) return "Developing";
  return "At Risk";
}

function unitStatus(
  unitId: string,
  activeResaleByUnit: Map<string, MyPropertyListing>,
  occupiedUnitIds: Set<string>,
  rentalListedUnitIds: Set<string>,
  businessOccupiedUnitIds: Set<string>,
  businessListedUnitIds: Set<string>,
  openIssueIds: Set<string>,
) {
  if (openIssueIds.has(unitId)) return { label: "Needs Attention", color: "#ffb0b0" };
  if (activeResaleByUnit.has(unitId)) return { label: "For Sale", color: "#ffd18a" };
  if (businessOccupiedUnitIds.has(unitId)) return { label: "Business in Use", color: "#c6b8ff" };
  if (occupiedUnitIds.has(unitId)) return { label: "Occupied", color: "#79f2ce" };
  if (businessListedUnitIds.has(unitId)) return { label: "Business Space", color: "#d5c7ff" };
  if (rentalListedUnitIds.has(unitId)) return { label: "For Rent", color: "#8ee8ff" };
  return { label: "Vacant", color: "rgba(255,255,255,0.62)" };
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: "26px",
        borderRadius: "999px",
        padding: "0 9px",
        border: `1px solid ${color}33`,
        background: `${color}13`,
        color,
        fontSize: "9px",
        fontWeight: 950,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function ProgressBar({ value, color = "#79f2ce" }: { value: number; color?: string }) {
  const safe = clamp(Number(value || 0), 0, 100);
  return (
    <div style={{ height: "7px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{ width: `${safe}%`, height: "100%", borderRadius: "999px", background: color }} />
    </div>
  );
}

function MiniGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const safe = clamp(Math.round(Number(value || 0)), 0, 100);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "54px minmax(0,1fr)", gap: "11px", alignItems: "center" }}>
      <div
        style={{
          width: "54px",
          height: "54px",
          borderRadius: "50%",
          background: `conic-gradient(${color} ${safe * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div style={{ width: "42px", height: "42px", borderRadius: "50%", display: "grid", placeItems: "center", background: "#07172b", fontSize: "12px", fontWeight: 900 }}>
          {safe}
        </div>
      </div>
      <span>
        <small style={{ display: "block", color: "rgba(255,255,255,0.42)" }}>{label}</small>
        <strong style={{ display: "block", marginTop: "3px", fontSize: "12px", color }}>{safe}/100</strong>
      </span>
    </div>
  );
}

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
  businessSpaceDashboard,
  employmentDashboard,
  financeDashboard,
  currentUserId,
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
  onRefreshBusinessSpaces,
  onRefreshEmployment,
  onRefreshFinance,
  onCatchUpFinance,
  onPayExtraFinance,
  onPayOffFinance,
  onStartProtection,
  onCancelProtection,
  onUseOwnedBusinessSpace,
  onLeaveBusinessSpace,
  onCreateBusinessSpaceListing,
  onCancelBusinessSpaceListing,
  onApplyForBusinessSpace,
  onRespondBusinessSpaceApplication,
  onRespondNpcBusinessSpaceApplication,
  onRespondMaintenanceIssue,
  onPreventiveService,
  onOpenMessages,
  onCreateListing,
  onCancelListing,
}: Props) {
  const [activeSection, setActiveSection] = useState<MyPropertiesSection>("overview");
  const [peopleSection, setPeopleSection] = useState<PeopleSection>("tenants");
  const [workspaceUnitId, setWorkspaceUnitId] = useState<string | null>(units[0]?.unit_id || null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnitFocus, setSelectedUnitFocus] = useState<"overview" | "upgrades">("overview");
  const [listingUnitId, setListingUnitId] = useState<string | null>(null);
  const [askingPrice, setAskingPrice] = useState(0);
  const [localMessage, setLocalMessage] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [showPropertyMenu, setShowPropertyMenu] = useState(false);
  const [showBusinessManager, setShowBusinessManager] = useState(false);
  const [showEmploymentDetails, setShowEmploymentDetails] = useState(false);
  const [showAdvancedFinance, setShowAdvancedFinance] = useState(false);

  const selectedUnit = units.find((unit) => unit.unit_id === selectedUnitId) || null;
  const listingUnit = units.find((unit) => unit.unit_id === listingUnitId) || null;
  const workspaceUnit = units.find((unit) => unit.unit_id === workspaceUnitId) || units[0] || null;
  const selectedResident = residentLifeProfiles.find((resident) => resident.resident_id === selectedResidentId) || null;

  const activeMyListings = useMemo(
    () => myListings.filter((listing) => listing.status === "active"),
    [myListings],
  );
  const recentMyListings = useMemo(
    () => myListings.filter((listing) => listing.status !== "active").slice(0, 8),
    [myListings],
  );
  const activeResaleByUnit = useMemo(() => {
    const map = new Map<string, MyPropertyListing>();
    for (const listing of activeMyListings) map.set(listing.unit_id, listing);
    return map;
  }, [activeMyListings]);

  const activeLeases = leases.filter((lease) => lease.status === "active");
  const activeRentalListings = rentalListings.filter((listing) => listing.status === "active");
  const pendingRentalApplications = rentalApplications.filter((application) => application.status === "pending");
  const activePurchaseOffers = purchaseOffers.filter((offer) => ["active", "pending", "negotiating"].includes(offer.status));
  const occupiedUnitIds = new Set(activeLeases.map((lease) => lease.unit_id));
  const rentalListedUnitIds = new Set(activeRentalListings.map((listing) => listing.unit_id));
  const businessOccupiedUnitIds = new Set(
    [...(businessSpaceDashboard.occupancies || []), ...(businessSpaceDashboard.npc_occupancies || [])]
      .filter((item) => ["active", "arrears"].includes(item.status))
      .map((item) => item.unit_id),
  );
  const businessListedUnitIds = new Set(
    (businessSpaceDashboard.market_listings || [])
      .filter((item) => item.owner_user_id === currentUserId)
      .map((item) => item.unit_id),
  );
  const financedUnitIds = new Set(
    (financeDashboard.loans || [])
      .filter((loan) => ["active", "behind"].includes(loan.status) && Number(loan.principal_remaining || 0) > 0)
      .map((loan) => loan.unit_id),
  );
  const openIssues = maintenanceIssues.filter((issue) => ["open", "ignored", "temporary"].includes(issue.status));
  const openIssueIds = new Set(openIssues.map((issue) => issue.unit_id));

  const contractedWeeklyRent = activeLeases.reduce((sum, lease) => sum + Number(lease.weekly_rent || 0), 0);
  const businessWeeklyRent = [
    ...(businessSpaceDashboard.occupancies || []),
    ...(businessSpaceDashboard.npc_occupancies || []),
  ]
    .filter((item) => item.landlord_user_id === currentUserId && ["active", "arrears"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.weekly_space_cost || 0), 0);
  const weeklyProtectionPremium = (financeDashboard.policies || [])
    .filter((policy) => policy.status === "active")
    .reduce((sum, policy) => sum + Number(policy.weekly_premium || 0), 0);
  const weeklyDebt = Number(financeDashboard.stats.weekly_debt_payment || 0);
  const weeklyIncome = contractedWeeklyRent + businessWeeklyRent;
  const weeklyCashFlow = weeklyIncome - weeklyDebt - weeklyProtectionPremium;
  const portfolioEquity = Number(financeDashboard.stats.property_equity || propertyPortfolioValue || 0);
  const grossPropertyValue = Number(financeDashboard.stats.gross_property_value || propertyPortfolioValue || 0);
  const debtBalance = Number(financeDashboard.stats.debt_balance || 0);

  const occupiedPortfolioIds = new Set([...occupiedUnitIds, ...businessOccupiedUnitIds]);
  const occupancyRate = totalOwnedUnits > 0 ? Math.round((occupiedPortfolioIds.size / totalOwnedUnits) * 100) : 0;
  const averageCondition = Math.round(
    Number(maintenanceStats.average_condition || (units.length > 0 ? units.reduce((sum, unit) => sum + Number(unit.condition || 0), 0) / units.length : 100)),
  );
  const financeHealth = Math.round(Number(financeDashboard.stats.finance_health || 100));
  const portfolioHealth = totalOwnedUnits > 0
    ? Math.round(clamp(occupancyRate, 0, 100) * 0.3 + clamp(averageCondition, 0, 100) * 0.45 + clamp(financeHealth, 0, 100) * 0.25)
    : 100;
  const reputationScore = clamp(Math.round(Number(landlordReputation.score || 60)), 0, 100);
  const reputationName = reputationLabel(reputationScore);

  const pendingBusinessApplications = [
    ...(businessSpaceDashboard.applications || []).filter((application) => application.landlord_user_id === currentUserId && application.status === "pending"),
    ...(businessSpaceDashboard.npc_applications || []).filter((application) => application.landlord_user_id === currentUserId && application.status === "pending"),
  ];
  const loansBehind = (financeDashboard.loans || []).filter((loan) => loan.status === "behind");
  const expiringLeases = activeLeases.filter((lease) => {
    const days = daysUntil(lease.end_date);
    return days !== null && days >= 0 && days <= 14;
  });

  const attentionItems = [
    ...openIssues.slice(0, 2).map((issue) => {
      const unit = units.find((item) => item.unit_id === issue.unit_id);
      return {
        id: `issue-${issue.issue_id}`,
        icon: "🔧",
        title: issue.title,
        detail: `${unit?.property_name || "Property"}${unit ? ` · Unit ${unit.unit_number}` : ""}`,
        tone: issue.severity === "critical" || issue.severity === "major" ? "#ff9b9b" : "#ffd18a",
        action: "Fix now",
        run: () => {
          setWorkspaceUnitId(issue.unit_id);
          setSelectedUnitFocus("overview");
          setSelectedUnitId(issue.unit_id);
        },
      };
    }),
    ...(pendingRentalApplications.length > 0
      ? [{
          id: "rental-applications",
          icon: "👤",
          title: `${pendingRentalApplications.length} rental application${pendingRentalApplications.length === 1 ? "" : "s"}`,
          detail: "Someone is waiting for your response.",
          tone: "#8ee8ff",
          action: "Review",
          run: () => { setPeopleSection("applicants"); setActiveSection("people"); },
        }]
      : []),
    ...(pendingBusinessApplications.length > 0
      ? [{
          id: "business-applications",
          icon: "🏢",
          title: `${pendingBusinessApplications.length} business space application${pendingBusinessApplications.length === 1 ? "" : "s"}`,
          detail: "A business wants to use one of your commercial units.",
          tone: "#c6b8ff",
          action: "Review",
          run: () => { setPeopleSection("businesses"); setActiveSection("people"); },
        }]
      : []),
    ...expiringLeases.slice(0, 1).map((lease) => ({
      id: `lease-${lease.lease_id}`,
      icon: "📅",
      title: `${lease.resident_name}'s lease is ending soon`,
      detail: `${daysUntil(lease.end_date)} days remaining`,
      tone: "#ffd18a",
      action: "View tenant",
      run: () => {
        const resident = residentLifeProfiles.find((item) => item.resident_id === lease.resident_id);
        if (resident) setSelectedResidentId(resident.resident_id);
        setPeopleSection("tenants");
        setActiveSection("people");
      },
    })),
    ...(loansBehind.length > 0
      ? [{
          id: "finance-behind",
          icon: "💳",
          title: `${loansBehind.length} finance plan${loansBehind.length === 1 ? " needs" : "s need"} attention`,
          detail: "Catch up before taking new property finance.",
          tone: "#ff9b9b",
          action: "Open finance",
          run: () => setActiveSection("finance"),
        }]
      : []),
    ...(unreadMessages > 0
      ? [{
          id: "messages",
          icon: "💬",
          title: `${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}`,
          detail: "Your Property Phone has new updates.",
          tone: "#79f2ce",
          action: "Open messages",
          run: onOpenMessages,
        }]
      : []),
  ].slice(0, 6);

  function openResaleListing(unit: PropertyUnit) {
    if (occupiedUnitIds.has(unit.unit_id)) {
      setLocalMessage("This property currently has a tenant, so it cannot be listed for sale yet.");
      return;
    }
    if (rentalListedUnitIds.has(unit.unit_id)) {
      setLocalMessage("Take this property off the rental market before listing it for sale.");
      return;
    }
    if (businessOccupiedUnitIds.has(unit.unit_id)) {
      setLocalMessage("This commercial property is being used by a business. End that occupancy before selling it.");
      return;
    }
    if (businessListedUnitIds.has(unit.unit_id)) {
      setLocalMessage("Cancel the Business Space listing before putting this property up for sale.");
      return;
    }
    if (financedUnitIds.has(unit.unit_id)) {
      setLocalMessage("Pay off this property's finance plan before listing it for sale.");
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
      setLocalMessage(`Set an asking price between ${formatNumber(min)} and ${formatNumber(max)} DT.`);
      return;
    }

    await onCreateListing(listingUnit.unit_id, price);
    setListingUnitId(null);
    setLocalMessage("");
  }

  function openUnit(unitId: string, focus: "overview" | "upgrades" = "overview") {
    setWorkspaceUnitId(unitId);
    setSelectedUnitFocus(focus);
    setSelectedUnitId(unitId);
    setShowPropertyMenu(false);
  }

  const activeSectionMeta: Record<MyPropertiesSection, { label: string; short: string }> = {
    overview: { label: "Overview", short: "Portfolio" },
    properties: { label: "Properties", short: "Properties" },
    people: { label: "People", short: "People" },
    finance: { label: "Finance", short: "Finance" },
  };

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
          rentalListing={rentalListings.find((item) => item.unit_id === selectedUnit.unit_id && item.status === "active") || null}
          applications={rentalApplications.filter((item) => item.unit_id === selectedUnit.unit_id)}
          lease={leases.find((item) => item.unit_id === selectedUnit.unit_id && item.status === "active") || null}
          purchaseOffers={purchaseOffers.filter((item) => item.unit_id === selectedUnit.unit_id)}
          marketSetting={marketSettings.find((item) => item.unit_id === selectedUnit.unit_id) || null}
          isPlayerResaleActive={activeResaleByUnit.has(selectedUnit.unit_id)}
          maintenanceIssues={maintenanceIssues.filter((item) => item.unit_id === selectedUnit.unit_id)}
          maintenanceActions={maintenanceActions.filter((item) => item.unit_id === selectedUnit.unit_id)}
          residentLifeProfiles={residentLifeProfiles}
          focusSection={selectedUnitFocus}
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

      {selectedResident && (
        <div
          onClick={() => setSelectedResidentId(null)}
          style={{ position: "fixed", inset: 0, zIndex: 145, display: "grid", placeItems: "center", padding: isMobile ? "12px" : "26px", background: "rgba(0,0,0,0.74)", backdropFilter: "blur(12px)" }}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            style={{ ...glassPanel, width: "min(700px,100%)", maxHeight: "88vh", overflowY: "auto", padding: isMobile ? "18px" : "26px", position: "relative" }}
          >
            <button type="button" onClick={() => setSelectedResidentId(null)} style={{ position: "absolute", right: "14px", top: "14px", width: "38px", height: "38px", borderRadius: "50%", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "white", fontSize: "20px", cursor: "pointer" }}>×</button>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "72px minmax(0,1fr)" : "96px minmax(0,1fr)", gap: "16px", alignItems: "center", paddingRight: "48px" }}>
              {getResidentAvatarSrc(selectedResident.avatar_key) ? (
                <img src={getResidentAvatarSrc(selectedResident.avatar_key) || ""} alt={selectedResident.display_name} style={{ width: isMobile ? "72px" : "96px", height: isMobile ? "72px" : "96px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(121,242,206,0.25)" }} />
              ) : (
                <div style={{ width: isMobile ? "72px" : "96px", height: isMobile ? "72px" : "96px", borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(121,242,206,0.15)", color: "#79f2ce", fontSize: "30px", fontWeight: 950 }}>{selectedResident.display_name.slice(0, 1)}</div>
              )}
              <div>
                <p style={{ margin: 0, color: "#79f2ce", fontSize: "10px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>{selectedResident.relationship_to_user === "tenant" ? "Your Tenant" : titleCase(selectedResident.relationship_to_user)}</p>
                <h2 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "38px", fontWeight: 500 }}>{selectedResident.display_name}</h2>
                <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.52)", fontSize: "12px" }}>{selectedResident.occupation}{selectedResident.employer_name ? ` · ${selectedResident.employer_name}` : ""}</p>
              </div>
            </div>

            <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: "9px" }}>
              {[
                ["Income / month", `${formatNumber(selectedResident.monthly_income)} DT`],
                ["Savings", `${formatNumber(selectedResident.savings)} DT`],
                ["Max rent", `${formatNumber(selectedResident.max_weekly_rent)} DT/wk`],
                ["Household", String(selectedResident.household_size)],
              ].map(([label, value]) => (
                <div key={label} style={{ borderRadius: "14px", background: "rgba(255,255,255,0.045)", padding: "12px" }}>
                  <small style={{ color: "rgba(255,255,255,0.4)" }}>{label}</small>
                  <strong style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>{value}</strong>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "10px" }}>
              <div style={{ borderRadius: "15px", background: "rgba(255,255,255,0.04)", padding: "13px" }}>
                <small style={{ color: "rgba(255,255,255,0.42)" }}>Current home</small>
                <strong style={{ display: "block", marginTop: "5px" }}>{selectedResident.property_name || "Not currently renting from you"}</strong>
                {selectedResident.unit_number != null && <span style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.48)", fontSize: "11px" }}>Unit {selectedResident.unit_number}{selectedResident.current_weekly_rent != null ? ` · ${formatNumber(selectedResident.current_weekly_rent)} DT/week` : ""}</span>}
              </div>
              <div style={{ borderRadius: "15px", background: "rgba(255,255,255,0.04)", padding: "13px" }}>
                <small style={{ color: "rgba(255,255,255,0.42)" }}>Budget health</small>
                <strong style={{ display: "block", marginTop: "5px", color: selectedResident.financial_pressure >= 70 ? "#ff9b9b" : selectedResident.financial_pressure >= 50 ? "#ffd18a" : "#79f2ce" }}>{selectedResident.financial_pressure >= 70 ? "Under pressure" : selectedResident.financial_pressure >= 50 ? "Watchful" : "Comfortable"}</strong>
                <span style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.48)", fontSize: "11px" }}>{selectedResident.move_intent ? `Thinking of moving${selectedResident.move_reason ? ` · ${titleCase(selectedResident.move_reason)}` : ""}` : "No move plans right now"}</span>
              </div>
            </div>

            {residentLifeEvents.find((event) => event.resident_id === selectedResident.resident_id) && (() => {
              const event = residentLifeEvents.find((item) => item.resident_id === selectedResident.resident_id)!;
              return (
                <div style={{ marginTop: "14px", borderRadius: "15px", border: "1px solid rgba(121,242,206,0.12)", background: "rgba(121,242,206,0.05)", padding: "13px" }}>
                  <small style={{ color: "#79f2ce", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>Latest update</small>
                  <strong style={{ display: "block", marginTop: "5px" }}>{event.title}</strong>
                  <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "11px", lineHeight: 1.5 }}>{event.description}</p>
                </div>
              );
            })()}

            <div style={{ marginTop: "18px", display: "flex", gap: "9px", flexWrap: "wrap" }}>
              <button type="button" onClick={onOpenMessages} style={{ ...primaryButton, minHeight: "40px" }}>Open Property Phone</button>
              <button type="button" onClick={() => setSelectedResidentId(null)} style={{ ...secondaryButton, minHeight: "40px" }}>Close</button>
            </div>
          </section>
        </div>
      )}

      {listingUnit && (
        <div onClick={() => setListingUnitId(null)} style={{ position: "fixed", inset: 0, zIndex: 140, display: "grid", placeItems: "center", padding: isMobile ? "14px" : "28px", background: "rgba(0,0,0,0.74)", backdropFilter: "blur(12px)" }}>
          <section onClick={(event) => event.stopPropagation()} style={{ ...glassPanel, width: "min(660px,100%)", padding: isMobile ? "22px" : "30px", position: "relative" }}>
            <button type="button" onClick={() => setListingUnitId(null)} aria-label="Close property sale form" style={{ position: "absolute", top: "16px", right: "16px", width: "38px", height: "38px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.07)", color: "white", cursor: "pointer", fontSize: "20px" }}>×</button>
            <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.16em" }}>List Property for Sale</p>
            <h2 style={{ margin: "10px 48px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "38px", fontWeight: 500 }}>{listingUnit.property_name} · Unit {listingUnit.unit_number}</h2>
            {(() => {
              const reference = Math.max(1, listingUnit.current_value);
              const min = Math.max(1, Math.round(reference * 0.85));
              const max = Math.max(min, Math.round(reference * 1.15));
              return (
                <>
                  <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "8px" }}>
                    {[["Value", `${formatNumber(reference)} DT`], ["Minimum", `${formatNumber(min)} DT`], ["Maximum", `${formatNumber(max)} DT`]].map(([label, value]) => (
                      <div key={label} style={{ borderRadius: "13px", background: "rgba(255,255,255,0.045)", padding: "11px" }}><small style={{ color: "rgba(255,255,255,0.42)" }}>{label}</small><strong style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>{value}</strong></div>
                    ))}
                  </div>
                  <label style={{ marginTop: "16px", display: "grid", gap: "7px" }}>
                    <span style={{ color: "rgba(255,255,255,0.58)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 900 }}>Asking Price</span>
                    <input type="number" min={min} max={max} value={askingPrice} onChange={(event) => setAskingPrice(Math.round(Number(event.target.value) || 0))} style={{ height: "48px", borderRadius: "14px", border: "1px solid rgba(255,209,138,0.24)", background: "rgba(255,255,255,0.08)", color: "white", padding: "0 15px", fontSize: "16px", outline: "none" }} />
                  </label>
                </>
              );
            })()}
            {localMessage && <p style={{ margin: "12px 0 0", color: "#ffb0b0", fontWeight: 800 }}>{localMessage}</p>}
            <div style={{ marginTop: "18px", display: "flex", gap: "9px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => void submitResaleListing()} disabled={actionLoading} style={{ ...primaryButton, flex: 1, minWidth: "180px", opacity: actionLoading ? 0.55 : 1 }}>{actionLoading ? "Creating Listing..." : "List Property for Sale"}</button>
              <button type="button" onClick={() => setListingUnitId(null)} style={secondaryButton}>Cancel</button>
            </div>
          </section>
        </div>
      )}

      <div style={{ display: "grid", gap: "16px", minWidth: 0 }}>
        <section data-milo-guide="property-my-properties-nav" style={{ ...glassPanel, padding: isMobile ? "10px" : "12px", borderRadius: "22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: isMobile ? "6px" : "8px" }}>
            {(Object.keys(activeSectionMeta) as MyPropertiesSection[]).map((section) => {
              const active = activeSection === section;
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  style={{
                    minWidth: 0,
                    minHeight: isMobile ? "42px" : "46px",
                    borderRadius: "15px",
                    border: active ? "1px solid rgba(142,232,255,0.34)" : "1px solid transparent",
                    background: active ? "linear-gradient(145deg,rgba(83,215,255,0.14),rgba(121,242,206,0.07))" : "transparent",
                    color: active ? "white" : "rgba(255,255,255,0.48)",
                    fontWeight: 900,
                    fontSize: isMobile ? "11px" : "12px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {isMobile ? activeSectionMeta[section].short : activeSectionMeta[section].label}
                </button>
              );
            })}
          </div>
        </section>

        {(message || localMessage) && (
          <div style={{ padding: "12px 14px", borderRadius: "14px", border: "1px solid rgba(255,209,138,0.16)", background: "rgba(255,209,138,0.06)", color: localMessage ? "#ffb0b0" : "#ffe5bb", fontSize: "12px", fontWeight: 750 }}>
            {localMessage || message}
          </div>
        )}

        {activeSection === "overview" && (
          <>
            <section data-milo-guide="property-portfolio-summary" style={{ ...glassPanel, padding: isMobile ? "20px" : "26px", overflow: "hidden", position: "relative", background: "radial-gradient(circle at 85% 10%,rgba(121,242,206,0.11),transparent 28%),linear-gradient(145deg,rgba(83,215,255,0.055),rgba(5,13,28,0.78))" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.5fr) minmax(270px,0.5fr)", gap: "22px", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>My Property Portfolio</p>
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
                    <strong style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "38px" : "52px", fontWeight: 500, letterSpacing: "-0.045em" }}>{formatNumber(portfolioEquity)} DT</strong>
                    <span style={{ color: "rgba(255,255,255,0.48)", fontSize: "12px" }}>property equity</span>
                  </div>
                  <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.56)", fontSize: "13px" }}>{totalOwnedUnits} propert{totalOwnedUnits === 1 ? "y" : "ies"} · {occupiedPortfolioIds.size} occupied · {weeklyIncome > 0 ? `${formatNumber(weeklyIncome)} DT/week income` : "No rent collected yet"}</p>

                  <div style={{ marginTop: "18px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {[
                      [`Occupancy ${occupancyRate}%`, occupancyRate >= 70 ? "#79f2ce" : "#ffd18a"],
                      [`Condition ${averageCondition}`, averageCondition >= 75 ? "#79f2ce" : averageCondition >= 50 ? "#ffd18a" : "#ff9b9b"],
                      [`★ ${reputationName} · ${reputationScore}/100`, reputationScore >= 72 ? "#79f2ce" : "#ffd18a"],
                      [debtBalance > 0 ? `${formatNumber(debtBalance)} DT finance` : "Debt free", debtBalance > 0 ? "#c6b8ff" : "#79f2ce"],
                    ].map(([label, color]) => <StatusPill key={label} label={label} color={color} />)}
                  </div>
                </div>

                <div style={{ display: "grid", placeItems: "center" }}>
                  <div style={{ width: isMobile ? "150px" : "178px", height: isMobile ? "150px" : "178px", borderRadius: "50%", display: "grid", placeItems: "center", background: `conic-gradient(#79f2ce ${portfolioHealth * 3.6}deg, rgba(255,255,255,0.08) 0deg)`, boxShadow: "0 24px 70px rgba(0,0,0,0.28)" }}>
                    <div style={{ width: isMobile ? "124px" : "148px", height: isMobile ? "124px" : "148px", borderRadius: "50%", display: "grid", placeItems: "center", textAlign: "center", background: "linear-gradient(145deg,#07172b,#0b1f39)" }}>
                      <span><strong style={{ display: "block", fontSize: isMobile ? "34px" : "42px", lineHeight: 1 }}>{portfolioHealth}</strong><small style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,0.45)", fontWeight: 800 }}>Portfolio Health</small></span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: "8px" }}>
                {[
                  ["Cash", `${formatNumber(dreamTokens)} DT`],
                  ["Gross value", `${formatNumber(grossPropertyValue)} DT`],
                  ["Weekly income", `${formatNumber(weeklyIncome)} DT`],
                  ["Weekly cash flow", `${weeklyCashFlow >= 0 ? "+" : ""}${formatNumber(weeklyCashFlow)} DT`],
                ].map(([label, value]) => (
                  <div key={label} style={{ padding: "11px 12px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <small style={{ color: "rgba(255,255,255,0.38)" }}>{label}</small>
                    <strong style={{ display: "block", marginTop: "4px", fontSize: "13px", color: label === "Weekly cash flow" ? (weeklyCashFlow >= 0 ? "#79f2ce" : "#ff9b9b") : "white" }}>{value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ ...glassPanel, padding: isMobile ? "18px" : "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, color: "#ffd18a", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Needs Your Attention</p>
                  <h2 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "29px" : "36px", fontWeight: 500 }}>What should I handle next?</h2>
                </div>
                {attentionItems.length > 0 && <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "11px" }}>{attentionItems.length} item{attentionItems.length === 1 ? "" : "s"}</span>}
              </div>

              {attentionItems.length === 0 ? (
                <div style={{ marginTop: "16px", minHeight: "92px", display: "grid", placeItems: "center", borderRadius: "17px", border: "1px dashed rgba(121,242,206,0.2)", background: "rgba(121,242,206,0.035)", color: "#79f2ce", textAlign: "center", padding: "18px", fontWeight: 800 }}>Everything is running smoothly.</div>
              ) : (
                <div style={{ marginTop: "14px", display: "grid", gap: "7px" }}>
                  {attentionItems.map((item) => (
                    <button key={item.id} type="button" onClick={item.run} style={{ width: "100%", display: "grid", gridTemplateColumns: "38px minmax(0,1fr) auto", gap: "11px", alignItems: "center", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "15px", background: "rgba(255,255,255,0.035)", color: "white", padding: "11px 12px", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                      <span style={{ width: "38px", height: "38px", borderRadius: "12px", display: "grid", placeItems: "center", background: `${item.tone}16`, fontSize: "18px" }}>{item.icon}</span>
                      <span style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: "12px" }}>{item.title}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.detail}</small></span>
                      <span style={{ color: item.tone, fontSize: "11px", fontWeight: 900, whiteSpace: "nowrap" }}>{item.action} →</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section style={{ ...glassPanel, padding: isMobile ? "18px" : "22px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div><p style={{ margin: 0, color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Your Properties</p><h2 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "29px" : "35px", fontWeight: 500 }}>Swipe through your portfolio</h2></div>
                <button type="button" onClick={() => setActiveSection("properties")} style={{ ...secondaryButton, minHeight: "38px", padding: "0 14px" }}>View all →</button>
              </div>

              {units.length === 0 ? (
                <div style={{ marginTop: "14px", minHeight: "120px", display: "grid", placeItems: "center", borderRadius: "17px", border: "1px dashed rgba(142,232,255,0.2)", textAlign: "center", padding: "20px" }}>
                  <div><strong>Buy your first property to start your portfolio.</strong><div style={{ marginTop: "10px" }}><Link href="/milo-world/exchange/property" style={primaryButton}>Open Property Map</Link></div></div>
                </div>
              ) : (
                <div className="milo-scrollbar" style={{ marginTop: "14px", display: "flex", gap: "11px", overflowX: "auto", paddingBottom: "4px", scrollSnapType: "x proximity" }}>
                  {units.map((unit) => {
                    const image = getPropertyUnitPreviewImage(unit, properties);
                    const status = unitStatus(unit.unit_id, activeResaleByUnit, occupiedUnitIds, rentalListedUnitIds, businessOccupiedUnitIds, businessListedUnitIds, openIssueIds);
                    return (
                      <button key={unit.unit_id} type="button" onClick={() => { setWorkspaceUnitId(unit.unit_id); setActiveSection("properties"); }} style={{ flex: "0 0 auto", width: isMobile ? "210px" : "235px", overflow: "hidden", scrollSnapAlign: "start", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.04)", color: "white", padding: 0, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                        <div style={{ height: isMobile ? "120px" : "132px", background: "rgba(142,232,255,0.06)", overflow: "hidden" }}>{image && <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}</div>
                        <div style={{ padding: "12px" }}><strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{unit.property_name}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)" }}>Unit {unit.unit_number} · {unit.district}</small><div style={{ marginTop: "9px" }}><StatusPill label={status.label} color={status.color} /></div></div>
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => window.location.assign("/milo-world/exchange/property")} style={{ flex: "0 0 auto", width: isMobile ? "170px" : "190px", minHeight: "184px", borderRadius: "18px", border: "1px dashed rgba(142,232,255,0.22)", background: "rgba(142,232,255,0.035)", color: "#8ee8ff", cursor: "pointer", fontFamily: "inherit", fontWeight: 900 }}>＋ Buy Property</button>
                </div>
              )}
            </section>
          </>
        )}

        {activeSection === "properties" && (
          <section data-milo-guide="property-managed-units" style={{ ...glassPanel, padding: isMobile ? "16px" : "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
              <div><p style={{ margin: 0, color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Properties</p><h2 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "39px", fontWeight: 500 }}>Choose a property to manage</h2></div>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>{units.length} owned</span>
            </div>

            {units.length === 0 || !workspaceUnit ? (
              <div style={{ marginTop: "16px", minHeight: "150px", display: "grid", placeItems: "center", borderRadius: "17px", border: "1px dashed rgba(142,232,255,0.2)", textAlign: "center", padding: "22px" }}>Buy your first property from the Property Map to start managing it here.</div>
            ) : (
              <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: isMobile || isCompact ? "1fr" : "220px minmax(0,1fr)", gap: "14px", alignItems: "start" }}>
                <div className="milo-scrollbar" style={{ display: "flex", flexDirection: isMobile || isCompact ? "row" : "column", gap: "8px", overflowX: isMobile || isCompact ? "auto" : "hidden", maxHeight: isMobile || isCompact ? undefined : "690px", overflowY: isMobile || isCompact ? "hidden" : "auto", paddingRight: isMobile || isCompact ? 0 : "2px", paddingBottom: isMobile || isCompact ? "3px" : 0 }}>
                  {units.map((unit) => {
                    const image = getPropertyUnitPreviewImage(unit, properties);
                    const active = workspaceUnit.unit_id === unit.unit_id;
                    const status = unitStatus(unit.unit_id, activeResaleByUnit, occupiedUnitIds, rentalListedUnitIds, businessOccupiedUnitIds, businessListedUnitIds, openIssueIds);
                    return (
                      <button key={unit.unit_id} type="button" onClick={() => { setWorkspaceUnitId(unit.unit_id); setShowPropertyMenu(false); }} style={{ flex: isMobile || isCompact ? "0 0 220px" : undefined, width: isMobile || isCompact ? "220px" : "100%", minWidth: 0, display: "grid", gridTemplateColumns: "58px minmax(0,1fr)", gap: "9px", alignItems: "center", borderRadius: "15px", border: active ? "1px solid rgba(142,232,255,0.35)" : "1px solid rgba(255,255,255,0.07)", background: active ? "rgba(142,232,255,0.08)" : "rgba(255,255,255,0.025)", color: "white", padding: "8px", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                        <div style={{ width: "58px", height: "54px", borderRadius: "11px", overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>{image && <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                        <span style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{unit.property_name}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.4)" }}>Unit {unit.unit_number}</small><small style={{ display: "block", marginTop: "3px", color: status.color, fontWeight: 850 }}>{status.label}</small></span>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const unit = workspaceUnit;
                  const image = getPropertyUnitPreviewImage(unit, properties);
                  const activeResale = activeResaleByUnit.get(unit.unit_id);
                  const status = unitStatus(unit.unit_id, activeResaleByUnit, occupiedUnitIds, rentalListedUnitIds, businessOccupiedUnitIds, businessListedUnitIds, openIssueIds);
                  const lease = activeLeases.find((item) => item.unit_id === unit.unit_id) || null;
                  const resident = lease ? residentLifeProfiles.find((item) => item.resident_id === lease.resident_id) || null : null;
                  const businessOccupancy = [...(businessSpaceDashboard.occupancies || []), ...(businessSpaceDashboard.npc_occupancies || [])].find((item) => item.unit_id === unit.unit_id && ["active", "arrears"].includes(item.status)) || null;
                  const financeLoan = (financeDashboard.loans || []).find((loan) => loan.unit_id === unit.unit_id && ["active", "behind"].includes(loan.status) && Number(loan.principal_remaining || 0) > 0) || null;
                  const policy = (financeDashboard.policies || []).find((item) => item.unit_id === unit.unit_id && item.status === "active") || null;
                  const issues = openIssues.filter((item) => item.unit_id === unit.unit_id);
                  const gain = Number(unit.current_value || 0) - Number(unit.purchase_price || 0);
                  const gainPct = Number(unit.purchase_price || 0) > 0 ? (gain / Number(unit.purchase_price || 1)) * 100 : 0;

                  return (
                    <article style={{ overflow: "hidden", borderRadius: "21px", border: "1px solid rgba(255,255,255,0.09)", background: "linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))" }}>
                      <div style={{ position: "relative", height: isMobile ? "220px" : "300px", background: "rgba(142,232,255,0.05)", overflow: "hidden" }}>
                        {image && <img src={image} alt={`${unit.property_name} Unit ${unit.unit_number}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 45%,rgba(3,10,24,0.82) 100%)" }} />
                        <div style={{ position: "absolute", left: "16px", bottom: "15px", right: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "10px" }}>
                          <div><StatusPill label={status.label} color={status.color} /><h3 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "28px" : "36px", fontWeight: 500 }}>{unit.property_name}</h3><p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)", fontSize: "11px" }}>Unit {unit.unit_number} · {unit.district} · {unit.area_sqm} sqm</p></div>
                        </div>
                      </div>

                      <div style={{ padding: isMobile ? "16px" : "20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: "8px" }}>
                          {[
                            ["Value", `${formatNumber(unit.current_value)} DT`, "#ffd18a"],
                            ["Rent potential", `${formatNumber(unit.rental_potential)} DT/wk`, "#8ee8ff"],
                            ["Market position", `${gain >= 0 ? "+" : ""}${gainPct.toFixed(1)}%`, gain >= 0 ? "#79f2ce" : "#ff9b9b"],
                            ["Equity", `${formatNumber(financeLoan ? Math.max(0, unit.current_value - financeLoan.principal_remaining) : unit.current_value)} DT`, "#c6b8ff"],
                          ].map(([label, value, color]) => (
                            <div key={label} style={{ borderRadius: "14px", padding: "11px", background: "rgba(255,255,255,0.04)" }}><small style={{ color: "rgba(255,255,255,0.4)" }}>{label}</small><strong style={{ display: "block", marginTop: "4px", fontSize: "12px", color }}>{value}</strong></div>
                          ))}
                        </div>

                        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "0.8fr 1.2fr", gap: "14px" }}>
                          <div style={{ display: "grid", gap: "11px" }}>
                            <MiniGauge value={unit.condition} label="Condition" color={unit.condition >= 75 ? "#79f2ce" : unit.condition >= 50 ? "#ffd18a" : "#ff9b9b"} />
                            <MiniGauge value={Math.round((unit.upgrade_level_total / 30) * 100)} label="Upgrade progress" color="#8ee8ff" />
                          </div>
                          <div style={{ borderRadius: "16px", padding: "13px", background: "rgba(255,255,255,0.035)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}><small style={{ color: "rgba(255,255,255,0.42)", fontWeight: 850 }}>Upgrade paths</small><small style={{ color: "#8ee8ff" }}>{unit.upgrade_level_total}/30</small></div>
                            <div style={{ marginTop: "10px", display: "grid", gap: "8px" }}>
                              {UPGRADE_ORDER.map((category) => {
                                const level = clamp(Number(unit.upgrade_levels?.[category] || 0), 0, 5);
                                return (
                                  <div key={category} style={{ display: "grid", gridTemplateColumns: "minmax(100px,1fr) auto", gap: "10px", alignItems: "center" }}>
                                    <small style={{ color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{category}</small>
                                    <span style={{ display: "flex", gap: "4px" }}>{[1,2,3,4,5].map((step) => <i key={step} style={{ width: "9px", height: "9px", borderRadius: "50%", background: step <= level ? "#8ee8ff" : "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.08)" }} />)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {(lease || businessOccupancy || financeLoan || policy || issues.length > 0) && (
                          <div style={{ marginTop: "14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {lease && <StatusPill label={`${lease.resident_name} · ${formatNumber(lease.weekly_rent)} DT/wk`} color="#79f2ce" />}
                            {businessOccupancy && <StatusPill label={`${businessOccupancy.business_name} · business`} color="#c6b8ff" />}
                            {financeLoan && <StatusPill label={`${formatNumber(financeLoan.principal_remaining)} DT finance`} color={financeLoan.status === "behind" ? "#ff9b9b" : "#c6b8ff"} />}
                            {policy && <StatusPill label={`🛡 ${titleCase(policy.plan_code)}`} color="#8ee8ff" />}
                            {issues.length > 0 && <StatusPill label={`${issues.length} repair${issues.length === 1 ? "" : "s"} needed`} color="#ff9b9b" />}
                          </div>
                        )}

                        {(resident || businessOccupancy) && (
                          <button type="button" onClick={() => { if (resident) setSelectedResidentId(resident.resident_id); else { setPeopleSection("businesses"); setActiveSection("people"); } }} style={{ marginTop: "13px", width: "100%", display: "flex", alignItems: "center", gap: "10px", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", background: "rgba(255,255,255,0.035)", padding: "10px 12px", color: "white", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                            {resident && getResidentAvatarSrc(resident.avatar_key) ? <img src={getResidentAvatarSrc(resident.avatar_key) || ""} alt="" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }} /> : <span style={{ width: "38px", height: "38px", borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(121,242,206,0.12)" }}>{businessOccupancy ? "🏢" : "👤"}</span>}
                            <span style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: "11px" }}>{resident ? resident.display_name : businessOccupancy?.business_name}</strong><small style={{ display: "block", marginTop: "2px", color: "rgba(255,255,255,0.4)" }}>{resident ? `Tenant · ${resident.occupation}` : "Business occupant"}</small></span><span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.35)" }}>→</span>
                          </button>
                        )}

                        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr auto" : "minmax(150px,1fr) minmax(150px,1fr) 48px", gap: "8px", alignItems: "stretch", position: "relative" }}>
                          <button type="button" onClick={() => openUnit(unit.unit_id, "overview")} style={{ ...primaryButton, width: "100%", minHeight: "42px" }}>Manage Property</button>
                          <button type="button" onClick={() => openUnit(unit.unit_id, "upgrades")} style={{ ...secondaryButton, width: "100%", minHeight: "42px", color: "#8ee8ff" }}>Upgrade</button>
                          <button type="button" aria-label="More property actions" onClick={() => setShowPropertyMenu((value) => !value)} style={{ ...secondaryButton, minWidth: "44px", minHeight: "42px", padding: 0, fontSize: "20px" }}>•••</button>
                          {showPropertyMenu && (
                            <div style={{ position: "absolute", right: 0, bottom: "50px", zIndex: 5, width: "220px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(5,16,35,0.98)", boxShadow: "0 18px 50px rgba(0,0,0,0.4)", padding: "7px" }}>
                              {activeResale ? (
                                <button type="button" onClick={() => void onCancelListing(activeResale.listing_id).then(() => setShowPropertyMenu(false))} disabled={actionLoading} style={{ width: "100%", minHeight: "38px", border: 0, borderRadius: "10px", background: "transparent", color: "#ffd18a", textAlign: "left", padding: "0 10px", cursor: "pointer", fontFamily: "inherit" }}>Cancel sale listing</button>
                              ) : (
                                <button type="button" onClick={() => { openResaleListing(unit); setShowPropertyMenu(false); }} disabled={Boolean(lease || rentalListedUnitIds.has(unit.unit_id) || businessOccupiedUnitIds.has(unit.unit_id) || businessListedUnitIds.has(unit.unit_id) || financeLoan)} style={{ width: "100%", minHeight: "38px", border: 0, borderRadius: "10px", background: "transparent", color: "white", textAlign: "left", padding: "0 10px", cursor: "pointer", fontFamily: "inherit", opacity: lease || rentalListedUnitIds.has(unit.unit_id) || businessOccupiedUnitIds.has(unit.unit_id) || businessListedUnitIds.has(unit.unit_id) || financeLoan ? 0.4 : 1 }}>List for sale</button>
                              )}
                              <button type="button" onClick={() => { setActiveSection("finance"); setShowPropertyMenu(false); }} style={{ width: "100%", minHeight: "38px", border: 0, borderRadius: "10px", background: "transparent", color: "white", textAlign: "left", padding: "0 10px", cursor: "pointer", fontFamily: "inherit" }}>Finance & protection</button>
                              <button type="button" onClick={() => { setPeopleSection(businessOccupancy ? "businesses" : "tenants"); setActiveSection("people"); setShowPropertyMenu(false); }} style={{ width: "100%", minHeight: "38px", border: 0, borderRadius: "10px", background: "transparent", color: "white", textAlign: "left", padding: "0 10px", cursor: "pointer", fontFamily: "inherit" }}>People & occupants</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })()}
              </div>
            )}
          </section>
        )}

        {activeSection === "people" && (
          <section data-milo-guide="property-people" style={{ ...glassPanel, padding: isMobile ? "16px" : "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
              <div><p style={{ margin: 0, color: "#79f2ce", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>People</p><h2 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "39px", fontWeight: 500 }}>Who is connected to your properties?</h2></div>
              <button type="button" onClick={onOpenMessages} style={{ ...secondaryButton, minHeight: "38px" }}>Property Phone{unreadMessages > 0 ? ` · ${unreadMessages}` : ""}</button>
            </div>

            <div style={{ marginTop: "15px", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "7px" }}>
              {(["tenants", "applicants", "businesses"] as PeopleSection[]).map((section) => {
                const active = peopleSection === section;
                const count = section === "tenants" ? activeLeases.length : section === "applicants" ? pendingRentalApplications.length + activePurchaseOffers.length : (businessSpaceDashboard.businesses || []).length + (businessSpaceDashboard.npc_occupancies || []).filter((item) => item.landlord_user_id === currentUserId && ["active", "arrears"].includes(item.status)).length;
                return (
                  <button key={section} type="button" onClick={() => setPeopleSection(section)} style={{ minHeight: "42px", borderRadius: "13px", border: active ? "1px solid rgba(121,242,206,0.28)" : "1px solid rgba(255,255,255,0.07)", background: active ? "rgba(121,242,206,0.08)" : "rgba(255,255,255,0.025)", color: active ? "white" : "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "inherit", fontWeight: 900, fontSize: "11px" }}>{titleCase(section)} <span style={{ color: active ? "#79f2ce" : "rgba(255,255,255,0.3)" }}>{count}</span></button>
                );
              })}
            </div>

            {peopleSection === "tenants" && (
              <div style={{ marginTop: "16px" }}>
                {activeLeases.length === 0 ? (
                  <div style={{ minHeight: "130px", display: "grid", placeItems: "center", borderRadius: "17px", border: "1px dashed rgba(121,242,206,0.2)", color: "rgba(255,255,255,0.48)", textAlign: "center", padding: "20px" }}>No active tenants yet. List a home for rent from a property&apos;s Manage screen.</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: "11px" }}>
                    {activeLeases.map((lease) => {
                      const resident = residentLifeProfiles.find((item) => item.resident_id === lease.resident_id);
                      const unit = units.find((item) => item.unit_id === lease.unit_id);
                      const avatar = getResidentAvatarSrc(resident?.avatar_key);
                      const remaining = daysUntil(lease.end_date);
                      return (
                        <article key={lease.lease_id} style={{ borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.035)", padding: "15px", textAlign: "center" }}>
                          <div style={{ width: "76px", height: "76px", margin: "0 auto", borderRadius: "50%", overflow: "hidden", background: "rgba(121,242,206,0.12)", display: "grid", placeItems: "center", fontSize: "26px", fontWeight: 950, color: "#79f2ce" }}>{avatar ? <img src={avatar} alt={lease.resident_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : lease.resident_name.slice(0,1)}</div>
                          <strong style={{ display: "block", marginTop: "10px", fontSize: "15px" }}>{lease.resident_name}</strong>
                          <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.44)" }}>{resident?.occupation || lease.occupation}</small>
                          <div style={{ marginTop: "10px", borderRadius: "13px", background: "rgba(121,242,206,0.045)", padding: "9px" }}><small style={{ color: "rgba(255,255,255,0.42)" }}>{unit?.property_name || "Property"} · Unit {unit?.unit_number || "—"}</small><strong style={{ display: "block", marginTop: "3px", color: "#79f2ce", fontSize: "12px" }}>{formatNumber(lease.weekly_rent)} DT/week</strong></div>
                          <div style={{ marginTop: "9px", display: "flex", justifyContent: "center", gap: "7px", flexWrap: "wrap" }}><StatusPill label={`😊 ${Math.round(Number(lease.satisfaction || 0))}/100`} color={lease.satisfaction >= 70 ? "#79f2ce" : lease.satisfaction >= 50 ? "#ffd18a" : "#ff9b9b"} />{remaining !== null && <StatusPill label={remaining <= 14 ? `${remaining} days left` : "Lease active"} color={remaining <= 14 ? "#ffd18a" : "#8ee8ff"} />}</div>
                          <button type="button" onClick={() => resident && setSelectedResidentId(resident.resident_id)} disabled={!resident} style={{ ...secondaryButton, width: "100%", minHeight: "38px", marginTop: "11px", opacity: resident ? 1 : 0.45 }}>View Tenant</button>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {peopleSection === "applicants" && (
              <div style={{ marginTop: "16px", display: "grid", gap: "14px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}><strong style={{ fontSize: "13px" }}>Rental applications</strong><button type="button" onClick={() => void onRefreshResidentMarket()} disabled={actionLoading} style={{ ...secondaryButton, minHeight: "34px", padding: "0 11px", fontSize: "10px" }}>↻ Check</button></div>
                  {pendingRentalApplications.length === 0 ? <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.44)", fontSize: "12px" }}>No rental applications waiting.</p> : (
                    <div style={{ marginTop: "9px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: "8px" }}>
                      {pendingRentalApplications.map((application) => (
                        <button key={application.application_id} type="button" onClick={() => openUnit(application.unit_id, "overview")} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "10px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.035)", color: "white", padding: "12px", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}><span><strong style={{ display: "block", fontSize: "12px" }}>{application.resident_name}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)" }}>{application.occupation} · {formatNumber(application.proposed_weekly_rent)} DT/week</small></span><span style={{ color: "#8ee8ff", fontSize: "10px", fontWeight: 900 }}>Fit {application.fit_score}</span></button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <strong style={{ fontSize: "13px" }}>Purchase offers</strong>
                  {activePurchaseOffers.length === 0 ? <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.44)", fontSize: "12px" }}>No active purchase offers.</p> : (
                    <div style={{ marginTop: "9px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: "8px" }}>
                      {activePurchaseOffers.map((offer) => (
                        <button key={offer.offer_id} type="button" onClick={() => openUnit(offer.unit_id, "overview")} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "10px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.035)", color: "white", padding: "12px", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}><span><strong style={{ display: "block", fontSize: "12px" }}>{offer.resident_name}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)" }}>{offer.occupation} · offer for your property</small></span><span style={{ color: "#ffd18a", fontSize: "11px", fontWeight: 900 }}>{formatNumber(offer.offer_amount)} DT</span></button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {peopleSection === "businesses" && (
              <div style={{ marginTop: "16px", display: "grid", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: "10px" }}>
                  {(businessSpaceDashboard.businesses || []).map((business) => (
                    <article key={business.slot_id} style={{ borderRadius: "17px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.035)", padding: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}><span><strong style={{ display: "block" }}>{business.business_name}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)" }}>{business.business_title || business.business_type_id} · {business.staff_count} staff</small></span><StatusPill label={business.occupancy_id ? "Premises active" : "Needs premises"} color={business.occupancy_id ? "#79f2ce" : "#ffd18a"} /></div>
                      <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.52)", fontSize: "11px" }}>{business.occupancy_id ? `${business.property_name} · Unit ${business.unit_number} · Fit ${business.fit_score ?? "—"}/100` : `${titleCase(business.required_property_type || "commercial")} space · budget about ${formatNumber(business.weekly_budget)} DT/week`}</p>
                    </article>
                  ))}

                  {(businessSpaceDashboard.npc_occupancies || []).filter((item) => item.landlord_user_id === currentUserId && ["active", "arrears"].includes(item.status)).map((occupancy) => (
                    <article key={occupancy.id} style={{ borderRadius: "17px", border: "1px solid rgba(198,184,255,0.16)", background: "rgba(198,184,255,0.045)", padding: "14px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr)", gap: "10px", alignItems: "center" }}>
                        {getResidentAvatarSrc(occupancy.avatar_key) ? <img src={getResidentAvatarSrc(occupancy.avatar_key) || ""} alt="" style={{ width: "46px", height: "46px", borderRadius: "50%", objectFit: "cover" }} /> : <span style={{ width: "46px", height: "46px", borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(198,184,255,0.12)" }}>🏢</span>}
                        <span style={{ minWidth: 0 }}><strong style={{ display: "block" }}>{occupancy.business_name}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)" }}>{occupancy.property_name} · {formatNumber(occupancy.weekly_space_cost)} DT/week</small><small style={{ display: "block", marginTop: "3px", color: occupancy.growth_state === "expanding" ? "#79f2ce" : occupancy.growth_state === "strained" ? "#ffd18a" : "#c6b8ff" }}>{occupancy.growth_state === "expanding" ? "Growing" : occupancy.growth_state === "strained" ? "Under pressure" : "Steady"}</small></span>
                      </div>
                    </article>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setShowBusinessManager((value) => !value)} style={{ ...primaryButton, minHeight: "40px" }}>{showBusinessManager ? "Hide Business Space Manager" : "Manage Business Spaces"}</button>
                  <button type="button" onClick={() => setShowEmploymentDetails((value) => !value)} style={{ ...secondaryButton, minHeight: "40px" }}>{showEmploymentDetails ? "Hide Jobs & Income" : "Jobs & Income Details"}</button>
                  <Link href="/milo-world/club" style={{ ...secondaryButton, minHeight: "40px" }}>Open Business Builder</Link>
                </div>

                {showBusinessManager && (
                  <BusinessSpacePanel
                    dashboard={businessSpaceDashboard}
                    currentUserId={currentUserId}
                    actionLoading={actionLoading}
                    isMobile={isMobile}
                    isCompact={isCompact}
                    glassPanel={glassPanel}
                    primaryButton={primaryButton}
                    secondaryButton={secondaryButton}
                    onRefresh={onRefreshBusinessSpaces}
                    onUseOwnedSpace={onUseOwnedBusinessSpace}
                    onLeaveSpace={onLeaveBusinessSpace}
                    onCreateListing={onCreateBusinessSpaceListing}
                    onCancelListing={onCancelBusinessSpaceListing}
                    onApplyForSpace={onApplyForBusinessSpace}
                    onRespondApplication={onRespondBusinessSpaceApplication}
                    onRespondNpcApplication={onRespondNpcBusinessSpaceApplication}
                  />
                )}

                {showEmploymentDetails && (
                  <EmploymentEconomyPanel
                    dashboard={employmentDashboard}
                    connectedResidentIds={residentLifeProfiles.map((resident) => resident.resident_id)}
                    isMobile={isMobile}
                    isCompact={isCompact}
                    actionLoading={actionLoading}
                    glassPanel={glassPanel}
                    secondaryButton={secondaryButton}
                    onRefresh={() => void onRefreshEmployment()}
                  />
                )}
              </div>
            )}

            {residentLifeEvents.length > 0 && peopleSection !== "businesses" && (
              <div style={{ marginTop: "18px", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "14px" }}>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.42)", fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em" }}>Recent resident stories</p>
                <div className="milo-scrollbar" style={{ marginTop: "9px", maxHeight: "230px", overflowY: "auto", display: "grid", gap: "6px", paddingRight: "2px" }}>
                  {residentLifeEvents.slice(0, 8).map((event) => {
                    const resident = residentLifeProfiles.find((item) => item.resident_id === event.resident_id);
                    return <button key={event.event_id} type="button" onClick={() => resident && setSelectedResidentId(resident.resident_id)} style={{ display: "grid", gridTemplateColumns: "36px minmax(0,1fr) auto", gap: "9px", alignItems: "center", borderRadius: "13px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)", color: "white", padding: "9px", textAlign: "left", cursor: resident ? "pointer" : "default", fontFamily: "inherit" }}>{resident && getResidentAvatarSrc(resident.avatar_key) ? <img src={getResidentAvatarSrc(resident.avatar_key) || ""} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} /> : <span style={{ width: "36px", height: "36px", borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(121,242,206,0.1)" }}>👤</span>}<span style={{ minWidth: 0 }}><strong style={{ display: "block", fontSize: "10px" }}>{resident?.display_name || "Resident"} · {event.title}</strong><small style={{ display: "block", marginTop: "2px", color: "rgba(255,255,255,0.38)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.description}</small></span><small style={{ color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap" }}>{formatDateTime(event.occurred_at)}</small></button>;
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "finance" && (
          <section data-milo-guide="property-finance-workspace" style={{ display: "grid", gap: "14px" }}>
            <section style={{ ...glassPanel, padding: isMobile ? "18px" : "24px", background: "radial-gradient(circle at 85% 10%,rgba(198,184,255,0.10),transparent 28%),linear-gradient(145deg,rgba(198,184,255,0.04),rgba(5,13,28,0.78))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}><div><p style={{ margin: 0, color: "#c6b8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Portfolio Money</p><h2 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "39px", fontWeight: 500 }}>See what you really own</h2></div><StatusPill label={`Finance health ${financeHealth}/100`} color={financeHealth >= 75 ? "#79f2ce" : financeHealth >= 50 ? "#ffd18a" : "#ff9b9b"} /></div>

              <div style={{ marginTop: "18px", display: "grid", gap: "14px" }}>
                <div><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}><span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>Property Value</span><strong>{formatNumber(grossPropertyValue)} DT</strong></div><ProgressBar value={100} color="#8ee8ff" /></div>
                <div><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}><span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>Outstanding Finance</span><strong style={{ color: debtBalance > 0 ? "#c6b8ff" : "#79f2ce" }}>{formatNumber(debtBalance)} DT</strong></div><ProgressBar value={grossPropertyValue > 0 ? (debtBalance / grossPropertyValue) * 100 : 0} color="#c6b8ff" /></div>
                <div style={{ paddingTop: "2px" }}><div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "6px" }}><span style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>Your Property Equity</span><strong style={{ color: "#79f2ce", fontSize: "18px" }}>{formatNumber(portfolioEquity)} DT</strong></div><ProgressBar value={grossPropertyValue > 0 ? (portfolioEquity / grossPropertyValue) * 100 : 100} color="#79f2ce" /></div>
              </div>

              <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: "8px" }}>
                {[
                  ["Rental income", `${formatNumber(weeklyIncome)} DT/wk`, "#8ee8ff"],
                  ["Repayments", `${formatNumber(weeklyDebt)} DT/wk`, "#c6b8ff"],
                  ["Protection", `${formatNumber(weeklyProtectionPremium)} DT/wk`, "#ffd18a"],
                  ["Cash flow", `${weeklyCashFlow >= 0 ? "+" : ""}${formatNumber(weeklyCashFlow)} DT/wk`, weeklyCashFlow >= 0 ? "#79f2ce" : "#ff9b9b"],
                ].map(([label, value, color]) => <div key={label} style={{ borderRadius: "14px", background: "rgba(255,255,255,0.04)", padding: "11px" }}><small style={{ color: "rgba(255,255,255,0.4)" }}>{label}</small><strong style={{ display: "block", marginTop: "4px", color, fontSize: "12px" }}>{value}</strong></div>)}
              </div>
            </section>

            <section style={{ ...glassPanel, padding: isMobile ? "16px" : "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}><div><strong>Finance plans</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)" }}>{financeDashboard.loans.length} total · {financeDashboard.stats.active_loans} active</small></div><button type="button" onClick={() => setShowAdvancedFinance((value) => !value)} style={{ ...secondaryButton, minHeight: "36px", padding: "0 12px" }}>{showAdvancedFinance ? "Hide Finance Controls" : "Manage Finance & Protection"}</button></div>
              {(financeDashboard.loans || []).filter((loan) => ["active", "behind"].includes(loan.status) && loan.principal_remaining > 0).length === 0 ? <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.44)", fontSize: "12px" }}>No active property finance plans.</p> : (
                <div style={{ marginTop: "12px", display: "grid", gap: "8px" }}>
                  {(financeDashboard.loans || []).filter((loan) => ["active", "behind"].includes(loan.status) && loan.principal_remaining > 0).map((loan) => {
                    const progress = loan.original_principal > 0 ? ((loan.original_principal - loan.principal_remaining) / loan.original_principal) * 100 : 100;
                    return <div key={loan.loan_id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 180px", gap: "10px", alignItems: "center", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", padding: "12px" }}><span><strong style={{ display: "block", fontSize: "12px" }}>{loan.property_name} · Unit {loan.unit_number}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)" }}>{formatNumber(loan.principal_remaining)} DT remaining · {formatNumber(loan.scheduled_weekly_payment)} DT/week</small><div style={{ marginTop: "8px" }}><ProgressBar value={progress} color={loan.status === "behind" ? "#ff9b9b" : "#c6b8ff"} /></div></span><div style={{ textAlign: isMobile ? "left" : "right" }}><StatusPill label={loan.status === "behind" ? "Payment behind" : `${Math.round(progress)}% repaid`} color={loan.status === "behind" ? "#ff9b9b" : "#c6b8ff"} /></div></div>;
                  })}
                </div>
              )}
            </section>

            <section style={{ ...glassPanel, padding: isMobile ? "16px" : "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}><div><strong>Property protection</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)" }}>{financeDashboard.stats.protected_units} protected unit{financeDashboard.stats.protected_units === 1 ? "" : "s"}</small></div><span style={{ color: "#8ee8ff", fontSize: "18px" }}>🛡</span></div>
              <div className="milo-scrollbar" style={{ marginTop: "11px", display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "3px" }}>
                {units.map((unit) => {
                  const policy = (financeDashboard.policies || []).find((item) => item.unit_id === unit.unit_id && item.status === "active");
                  return <div key={unit.unit_id} style={{ flex: "0 0 205px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", padding: "11px" }}><strong style={{ display: "block", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{unit.property_name}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.4)" }}>Unit {unit.unit_number}</small><div style={{ marginTop: "8px" }}><StatusPill label={policy ? `🛡 ${titleCase(policy.plan_code)}` : "No protection"} color={policy ? "#8ee8ff" : "rgba(255,255,255,0.48)"} /></div></div>;
                })}
              </div>
            </section>

            <section style={{ ...glassPanel, padding: isMobile ? "16px" : "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}><div><strong>Sale listings</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)" }}>{activeMyListings.length} active</small></div><button type="button" onClick={() => setActiveSection("properties")} style={{ ...secondaryButton, minHeight: "34px", padding: "0 11px", fontSize: "10px" }}>Choose property to sell</button></div>
              {activeMyListings.length === 0 ? <p style={{ margin: "11px 0 0", color: "rgba(255,255,255,0.44)", fontSize: "12px" }}>No properties are currently listed for sale.</p> : (
                <div style={{ marginTop: "10px", display: "grid", gap: "7px" }}>{activeMyListings.map((listing) => <div key={listing.listing_id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "10px", alignItems: "center", borderRadius: "14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "11px" }}><span><strong style={{ display: "block", fontSize: "11px" }}>{listing.property_name} · Unit {listing.unit_number}</strong><small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.4)" }}>{formatNumber(listing.asking_price)} DT · expires {formatDateTime(listing.expires_at)}</small></span><button type="button" onClick={() => void onCancelListing(listing.listing_id)} disabled={actionLoading} style={{ ...secondaryButton, minHeight: "34px", padding: "0 10px", color: "#ffd18a", fontSize: "10px" }}>Cancel</button></div>)}</div>
              )}

              {recentMyListings.length > 0 && <details style={{ marginTop: "10px" }}><summary style={{ cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: "11px", fontWeight: 850 }}>Past sales & listings</summary><div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>{recentMyListings.map((listing) => <div key={listing.listing_id} style={{ borderRadius: "12px", background: "rgba(255,255,255,0.025)", padding: "9px 10px", display: "flex", justifyContent: "space-between", gap: "8px" }}><span style={{ fontSize: "10px" }}>{listing.property_name} · Unit {listing.unit_number}</span><small style={{ color: "rgba(255,255,255,0.38)" }}>{titleCase(listing.status)}</small></div>)}</div></details>}
            </section>

            {showAdvancedFinance && (
              <PropertyFinancePanel
                dashboard={financeDashboard}
                units={units}
                dreamTokens={dreamTokens}
                actionLoading={actionLoading}
                isMobile={isMobile}
                isCompact={isCompact}
                glassPanel={glassPanel}
                primaryButton={primaryButton}
                secondaryButton={secondaryButton}
                onRefresh={onRefreshFinance}
                onCatchUp={onCatchUpFinance}
                onPayExtra={onPayExtraFinance}
                onPayOff={onPayOffFinance}
                onStartProtection={onStartProtection}
                onCancelProtection={onCancelProtection}
              />
            )}
          </section>
        )}
      </div>
    </>
  );
}
