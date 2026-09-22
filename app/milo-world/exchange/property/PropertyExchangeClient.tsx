"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import MiloExchangeGuide from "../components/MiloExchangeGuide";
import MyPropertiesTab from "./components/MyPropertiesTab";
import PropertyMapTab from "./components/PropertyMapTab";
import PropertyResaleTab from "./components/PropertyResaleTab";
import PropertyPhone from "./components/PropertyPhone";
import {
  PROPERTY_TYPE_LABELS,
  formatNumber,
  getPropertyPreviewImage,
  type MyPropertyListing,
  type PropertyHolding,
  type PropertyOffering,
  type PropertyUnit,
  type PropertyUpgradeCatalogRow,
  type PropertyRentalListing,
  type PropertyRentalApplication,
  type PropertyLease,
  type PropertyPurchaseOffer,
  type PropertyUnitMarketSetting,
  type PropertyResidentDashboard,
  type PropertyMaintenanceIssue,
  type PropertyMaintenanceAction,
  type PropertyMaintenanceDashboard,
  type PropertyMaintenanceStats,
  type PropertyResaleListing,
  type RecentPropertySale,
  type PropertyConversation,
  type PropertyMessage,
  type PropertyRenewalNegotiation,
  type PropertyLandlordReputation,
  type PropertyCommunicationsDashboard,
  type PropertyResidentLifeProfile,
  type PropertyResidentLifeEvent,
  type PropertyResidentLifeStats,
  type PropertyResidentLifeDashboard,
  type PropertyDistrictMarket,
  type PropertyMarketSegment,
  type PropertyMarketHistoryPoint,
  type PropertyMarketDashboard,
} from "./components/propertyExchangeShared";

type ScreenMode = "desktop" | "tablet" | "mobile";
type PropertyTab = "map" | "properties" | "resale";

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      if (width <= 720) setScreenMode("mobile");
      else if (width <= 1180 || isPortrait) setScreenMode("tablet");
      else setScreenMode("desktop");
    }

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return screenMode;
}

function ExchangeStyles() {
  return (
    <style>{`
      .milo-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(132, 218, 255, 0.45) rgba(255,255,255,0.12);
      }

      .milo-scrollbar::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .milo-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(132, 218, 255, 0.45);
        border-radius: 999px;
      }

      .district-map-control:focus-visible,
      .district-zone-button:focus-visible,
      .property-tab-button:focus-visible {
        outline: 3px solid rgba(142,232,255,0.9);
        outline-offset: 3px;
      }

      .district-map-control,
      .district-zone-button,
      .property-tab-button {
        transition: box-shadow 180ms ease, background 180ms ease,
          border-color 180ms ease, transform 180ms ease;
      }

      .district-map-control:hover,
      .property-tab-button:hover {
        transform: translateY(-2px);
      }

      .district-zone-button:hover {
        box-shadow: inset 0 0 0 4px rgba(255,255,255,0.72),
          inset 0 0 52px rgba(126,232,255,0.2);
      }
    `}</style>
  );
}

function Background() {
  return (
    <>
      <video
        src="/milo-world/milo-world-bg-loop.mp4"
        poster="/milo-world/milo-world-bg.png"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
          transform: "scale(1.01)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(180deg, rgba(1,7,18,0.58), rgba(1,7,18,0.82) 48%, rgba(1,7,18,0.96)), radial-gradient(circle at 50% 8%, rgba(83,215,255,0.15), transparent 36%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2,
          boxShadow: "inset 0 0 220px rgba(0,0,0,0.82)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function CenterPanel({
  eyebrow,
  title,
  children,
  isMobile,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  isMobile: boolean;
}) {
  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#020817",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <ExchangeStyles />
      <Background />
      <div style={{ position: "relative", zIndex: 5, minHeight: "100vh", display: "grid", placeItems: "center", padding: isMobile ? "18px" : "32px" }}>
        <section
          style={{
            width: "min(760px, 100%)",
            padding: isMobile ? "24px" : "38px",
            borderRadius: isMobile ? "24px" : "30px",
            border: "1px solid rgba(132,218,255,0.2)",
            background: "rgba(5,13,28,0.82)",
            boxShadow: "0 30px 90px rgba(0,0,0,0.48)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "13px", letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 900 }}>
            {eyebrow}
          </p>
          <h1 style={{ margin: "14px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "40px" : "58px", fontWeight: 500, lineHeight: 1 }}>
            {title}
          </h1>
          <div style={{ marginTop: "22px", color: "rgba(255,255,255,0.76)", fontSize: "16px", lineHeight: 1.65 }}>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PropertyExchangeClient() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<PropertyTab>("map");

  const [userId, setUserId] = useState<string | null>(null);
  const [dreamTokens, setDreamTokens] = useState(0);
  const [properties, setProperties] = useState<PropertyOffering[]>([]);
  const [holdings, setHoldings] = useState<PropertyHolding[]>([]);
  const [recentSales, setRecentSales] = useState<RecentPropertySale[]>([]);
  const [resaleListings, setResaleListings] = useState<PropertyResaleListing[]>([]);
  const [myListings, setMyListings] = useState<MyPropertyListing[]>([]);
  const [propertyUnits, setPropertyUnits] = useState<PropertyUnit[]>([]);
  const [upgradeCatalog, setUpgradeCatalog] = useState<PropertyUpgradeCatalogRow[]>([]);
  const [rentalListings, setRentalListings] = useState<PropertyRentalListing[]>([]);
  const [rentalApplications, setRentalApplications] = useState<PropertyRentalApplication[]>([]);
  const [leases, setLeases] = useState<PropertyLease[]>([]);
  const [purchaseOffers, setPurchaseOffers] = useState<PropertyPurchaseOffer[]>([]);
  const [marketSettings, setMarketSettings] = useState<PropertyUnitMarketSetting[]>([]);
  const [maintenanceIssues, setMaintenanceIssues] = useState<PropertyMaintenanceIssue[]>([]);
  const [maintenanceActions, setMaintenanceActions] = useState<PropertyMaintenanceAction[]>([]);
  const [maintenanceStats, setMaintenanceStats] = useState<PropertyMaintenanceStats>({
    open_issues: 0,
    urgent_issues: 0,
    at_risk_tenants: 0,
    average_condition: 100,
  });
  const [propertyConversations, setPropertyConversations] = useState<PropertyConversation[]>([]);
  const [propertyMessages, setPropertyMessages] = useState<PropertyMessage[]>([]);
  const [renewalNegotiations, setRenewalNegotiations] = useState<PropertyRenewalNegotiation[]>([]);
  const [landlordReputation, setLandlordReputation] = useState<PropertyLandlordReputation>({
    user_id: null,
    score: 60,
    completed_leases: 0,
    renewals: 0,
    early_departures: 0,
    full_repairs: 0,
    ignored_issues: 0,
    average_satisfaction: 80,
    updated_at: null,
  });
  const [propertyUnreadCount, setPropertyUnreadCount] = useState(0);
  const [residentLifeProfiles, setResidentLifeProfiles] = useState<PropertyResidentLifeProfile[]>([]);
  const [residentLifeEvents, setResidentLifeEvents] = useState<PropertyResidentLifeEvent[]>([]);
  const [residentLifeStats, setResidentLifeStats] = useState<PropertyResidentLifeStats>({
    connected_residents: 0,
    active_tenants: 0,
    considering_move: 0,
    financial_pressure: 0,
    recent_life_events: 0,
  });
  const [districtMarkets, setDistrictMarkets] = useState<PropertyDistrictMarket[]>([]);
  const [marketSegments, setMarketSegments] = useState<PropertyMarketSegment[]>([]);
  const [marketHistory, setMarketHistory] = useState<PropertyMarketHistoryPoint[]>([]);
  const [phoneOpenRequest, setPhoneOpenRequest] = useState(0);

  const [previewProperty, setPreviewProperty] = useState<PropertyOffering | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [pageMessage, setPageMessage] = useState("");
  const [tradeMessage, setTradeMessage] = useState("");

  const holdingsByProperty = useMemo(
    () => new Map(holdings.map((holding) => [holding.property_id, holding])),
    [holdings]
  );

  const totalOwnedUnits = useMemo(
    () => propertyUnits.length || holdings.reduce((total, holding) => total + Number(holding.quantity || 0), 0),
    [propertyUnits, holdings]
  );

  const propertyPortfolioValue = useMemo(() => {
    if (propertyUnits.length > 0) {
      return propertyUnits.reduce((total, unit) => total + Number(unit.current_value || 0), 0);
    }

    return holdings.reduce((total, holding) => {
      const property = properties.find((item) => item.id === holding.property_id);
      const unitValue = Number(property?.market_value || property?.current_value || holding.purchase_price || 0);
      return total + Number(holding.quantity || 0) * unitValue;
    }, 0);
  }, [propertyUnits, holdings, properties]);

  const pageShell: CSSProperties = {
    position: "relative",
    minHeight: "100vh",
    background: "#020817",
    color: "white",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflowX: "hidden",
  };

  const contentWrap: CSSProperties = {
    position: "relative",
    zIndex: 5,
    width: isMobile ? "calc(100% - 20px)" : "calc(100% - 32px)",
    maxWidth: "none",
    margin: "0 auto",
    padding: isMobile ? "16px 0 82px" : "26px 0 96px",
  };

  const glassPanel: CSSProperties = {
    borderRadius: isMobile ? "22px" : "28px",
    border: "1px solid rgba(132,218,255,0.18)",
    background: "rgba(5,13,28,0.72)",
    boxShadow: "0 28px 80px rgba(0,0,0,0.42), inset 0 0 42px rgba(83,215,255,0.035)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };

  const navButtonStyle: CSSProperties = {
    minHeight: isMobile ? "38px" : "42px",
    padding: isMobile ? "0 14px" : "0 20px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    color: "rgba(255,255,255,0.9)",
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: isMobile ? "0.07em" : "0.12em",
    fontSize: isMobile ? "10px" : "12px",
    fontWeight: 850,
    border: "1px solid rgba(132,218,255,0.22)",
    background: "rgba(5,13,28,0.66)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    whiteSpace: "nowrap",
  };

  const primaryButton: CSSProperties = {
    minHeight: "48px",
    padding: "0 22px",
    borderRadius: "14px",
    border: "1px solid rgba(132,218,255,0.32)",
    background: "rgba(83,215,255,0.16)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
  };

  const secondaryButton: CSSProperties = {
    ...primaryButton,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.16)",
  };

  const inputStyle: CSSProperties = {
    height: "48px",
    borderRadius: "14px",
    border: "1px solid rgba(132,218,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    padding: "0 15px",
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
  };

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    if (!userId) return;
    function handleFocus() {
      void refreshMarket();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [userId]);

  async function loadPage() {
    setLoading(true);
    setPageMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUserId(null);
      setLoading(false);
      return;
    }

    setUserId(user.id);
    await Promise.all([loadDreamTokens(), loadPropertyMarket(user.id)]);
    await refreshMaintenanceSimulation(false);
    await refreshResidentLife(false);
    await refreshResidentSimulation(false);
    await refreshLeaseLifecycle(false);
    await refreshDistrictMarket(false);
    await Promise.all([
      loadDreamTokens(),
      loadPropertyMarket(user.id),
      loadResidentDashboard(),
      loadMaintenanceDashboard(),
      loadPropertyCommunications(),
      loadResidentLifeDashboard(),
      loadDistrictMarketDashboard(),
    ]);
    setLoading(false);
  }

  async function loadDreamTokens() {
    const { data, error } = await supabase.rpc("get_my_virtual_dream_token_balance");
    if (error) {
      console.warn("Could not load Dreamscape Tokens:", error.message);
      setDreamTokens(0);
      return;
    }
    setDreamTokens(Number(data || 0));
  }

  async function loadResidentDashboard() {
    const { data, error } = await supabase.rpc("get_my_milo_property_resident_dashboard");

    if (error) {
      console.warn("Could not load resident property dashboard:", error.message);
      setRentalListings([]);
      setRentalApplications([]);
      setLeases([]);
      setPurchaseOffers([]);
      setMarketSettings([]);
      return;
    }

    const dashboard = (data || {}) as Partial<PropertyResidentDashboard>;
    setRentalListings((dashboard.rental_listings || []).map((item) => ({
      ...item,
      asking_weekly_rent: Number(item.asking_weekly_rent || 0),
      market_rent_at_listing: Number(item.market_rent_at_listing || 0),
    })));
    setRentalApplications((dashboard.applications || []).map((item) => ({
      ...item,
      household_size: Number(item.household_size || 0),
      max_weekly_rent: Number(item.max_weekly_rent || 0),
      purchase_budget: Number(item.purchase_budget || 0),
      proposed_weekly_rent: Number(item.proposed_weekly_rent || 0),
      lease_weeks: Number(item.lease_weeks || 0),
      fit_score: Number(item.fit_score || 0),
      reliability: Number(item.reliability || 0),
    })));
    setLeases((dashboard.leases || []).map((item) => ({
      ...item,
      weekly_rent: Number(item.weekly_rent || 0),
      lease_weeks: Number(item.lease_weeks || 0),
      paid_weeks: Number(item.paid_weeks || 0),
      total_rent_paid: Number(item.total_rent_paid || 0),
      satisfaction: Number(item.satisfaction || 0),
    })));
    setPurchaseOffers((dashboard.purchase_offers || []).map((item) => ({
      ...item,
      offer_amount: Number(item.offer_amount || 0),
      value_at_offer: Number(item.value_at_offer || 0),
    })));
    setMarketSettings(dashboard.market_settings || []);
  }

  async function loadResidentLifeDashboard() {
    const { data, error } = await supabase.rpc("get_my_milo_property_resident_life");

    if (error) {
      console.warn("Could not load resident life dashboard:", error.message);
      setResidentLifeProfiles([]);
      setResidentLifeEvents([]);
      setResidentLifeStats({
        connected_residents: 0,
        active_tenants: 0,
        considering_move: 0,
        financial_pressure: 0,
        recent_life_events: 0,
      });
      return;
    }

    const dashboard = (data || {}) as Partial<PropertyResidentLifeDashboard>;
    setResidentLifeProfiles((dashboard.residents || []).map((item) => ({
      ...item,
      household_size: Number(item.household_size || 0),
      monthly_income: Number(item.monthly_income || 0),
      max_weekly_rent: Number(item.max_weekly_rent || 0),
      purchase_budget: Number(item.purchase_budget || 0),
      reliability: Number(item.reliability || 0),
      career_level: Number(item.career_level || 1),
      savings: Number(item.savings || 0),
      financial_pressure: Number(item.financial_pressure || 0),
      mobility_score: Number(item.mobility_score || 0),
      life_event_count: Number(item.life_event_count || 0),
      unit_number: item.unit_number == null ? null : Number(item.unit_number),
      current_weekly_rent: item.current_weekly_rent == null ? null : Number(item.current_weekly_rent),
      satisfaction: item.satisfaction == null ? null : Number(item.satisfaction),
      move_intent: Boolean(item.move_intent),
    })));
    setResidentLifeEvents((dashboard.events || []).map((item) => ({
      ...item,
      income_before: Number(item.income_before || 0),
      income_after: Number(item.income_after || 0),
      household_before: Number(item.household_before || 0),
      household_after: Number(item.household_after || 0),
      savings_before: Number(item.savings_before || 0),
      savings_after: Number(item.savings_after || 0),
      financial_pressure_before: Number(item.financial_pressure_before || 0),
      financial_pressure_after: Number(item.financial_pressure_after || 0),
      move_intent_after: Boolean(item.move_intent_after),
      metadata: (item.metadata || {}) as Record<string, unknown>,
    })));
    const stats = dashboard.stats || ({} as PropertyResidentLifeStats);
    setResidentLifeStats({
      connected_residents: Number(stats.connected_residents || 0),
      active_tenants: Number(stats.active_tenants || 0),
      considering_move: Number(stats.considering_move || 0),
      financial_pressure: Number(stats.financial_pressure || 0),
      recent_life_events: Number(stats.recent_life_events || 0),
    });
  }

  async function refreshResidentLife(showMessage = false) {
    const { data, error } = await supabase.rpc("refresh_my_milo_property_resident_life");

    if (error) {
      console.warn("Could not refresh resident life:", error.message);
      return;
    }

    if (showMessage) {
      const result = (data || {}) as Record<string, unknown>;
      const world = (result.world || {}) as Record<string, unknown>;
      const events = Number(world.life_events_created || 0);
      const messages = Number(result.messages_created || 0);
      const moves = Number(world.move_intent_changes || 0);
      if (events || messages || moves) {
        setTradeMessage(`Resident life updated · ${events} life event${events === 1 ? "" : "s"} · ${messages} new message${messages === 1 ? "" : "s"} · ${moves} moving-plan change${moves === 1 ? "" : "s"}.`);
      } else {
        setTradeMessage("Resident life is up to date.");
      }
    }
  }

  async function loadPropertyCommunications() {
    const { data, error } = await supabase.rpc("get_my_milo_property_communications");

    if (error) {
      console.warn("Could not load property communications:", error.message);
      setPropertyConversations([]);
      setPropertyMessages([]);
      setRenewalNegotiations([]);
      setPropertyUnreadCount(0);
      return;
    }

    const dashboard = (data || {}) as Partial<PropertyCommunicationsDashboard>;
    setPropertyConversations(
      (dashboard.conversations || []).map((item) => ({
        ...item,
        unit_number: Number(item.unit_number || 0),
        unread_count: Number(item.unread_count || 0),
      }))
    );
    setPropertyMessages(
      (dashboard.messages || []).map((item) => ({
        ...item,
        metadata: (item.metadata || {}) as Record<string, unknown>,
      }))
    );
    setRenewalNegotiations(
      (dashboard.renewal_negotiations || []).map((item) => ({
        ...item,
        proposed_weekly_rent: Number(item.proposed_weekly_rent || 0),
        proposed_lease_weeks: Number(item.proposed_lease_weeks || 0),
        round_number: Number(item.round_number || 0),
      }))
    );
    const reputation = dashboard.reputation || ({} as PropertyLandlordReputation);
    setLandlordReputation({
      user_id: reputation.user_id || null,
      score: Number(reputation.score || 60),
      completed_leases: Number(reputation.completed_leases || 0),
      renewals: Number(reputation.renewals || 0),
      early_departures: Number(reputation.early_departures || 0),
      full_repairs: Number(reputation.full_repairs || 0),
      ignored_issues: Number(reputation.ignored_issues || 0),
      average_satisfaction: Number(reputation.average_satisfaction || 80),
      updated_at: reputation.updated_at || null,
    });
    setPropertyUnreadCount(Number(dashboard.unread_count || 0));
  }

  async function refreshLeaseLifecycle(showMessage = false) {
    const { data, error } = await supabase.rpc("refresh_my_milo_property_lease_lifecycle");

    if (error) {
      console.warn("Could not refresh property lease lifecycle:", error.message);
      return;
    }

    if (showMessage) {
      const result = (data || {}) as Record<string, unknown>;
      const renewalMessages = Number(result.renewal_messages_created || 0);
      const activated = Number(result.renewals_activated || 0);
      const completed = Number(result.leases_completed || 0);
      if (renewalMessages || activated || completed) {
        setTradeMessage(
          `Lease lifecycle refreshed · ${renewalMessages} new renewal message${renewalMessages === 1 ? "" : "s"} · ${activated} renewal${activated === 1 ? "" : "s"} activated · ${completed} lease${completed === 1 ? "" : "s"} completed.`
        );
      }
    }
  }

  async function markConversationRead(conversationId: string) {
    const { error } = await supabase.rpc("mark_milo_property_conversation_read", {
      p_conversation_id: conversationId,
    });
    if (error) {
      console.warn("Could not mark conversation read:", error.message);
      return;
    }
    await loadPropertyCommunications();
  }

  async function respondPropertyCommunication(
    sourceType: "rental_application" | "purchase_offer" | "renewal",
    sourceId: string,
    action: "accept" | "decline" | "reject" | "counter",
    counterWeeklyRent?: number,
    counterLeaseWeeks?: number
  ) {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    setTradeMessage("");

    const { data, error } = await supabase.rpc("respond_to_milo_property_communication", {
      p_source_type: sourceType,
      p_source_id: sourceId,
      p_action: action,
      p_counter_weekly_rent: counterWeeklyRent ?? null,
      p_counter_lease_weeks: counterLeaseWeeks ?? null,
    });

    if (error) {
      setTradeMessage(`Could not send message response: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    setTradeMessage(String(result.message || "Message sent."));
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket(false);
    setActionLoading(false);
  }

  async function loadMaintenanceDashboard() {
    const { data, error } = await supabase.rpc(
      "get_my_milo_property_maintenance_dashboard"
    );

    if (error) {
      console.warn("Could not load property maintenance dashboard:", error.message);
      setMaintenanceIssues([]);
      setMaintenanceActions([]);
      setMaintenanceStats({
        open_issues: 0,
        urgent_issues: 0,
        at_risk_tenants: 0,
        average_condition: 100,
      });
      return;
    }

    const dashboard = (data || {}) as Partial<PropertyMaintenanceDashboard>;
    setMaintenanceIssues(
      (dashboard.issues || []).map((item) => ({
        ...item,
        full_repair_cost: Number(item.full_repair_cost || 0),
        quick_fix_cost: Number(item.quick_fix_cost || 0),
        condition_damage: Number(item.condition_damage || 0),
        satisfaction_damage: Number(item.satisfaction_damage || 0),
      }))
    );
    setMaintenanceActions(
      (dashboard.actions || []).map((item) => ({
        ...item,
        cost: Number(item.cost || 0),
        condition_change: Number(item.condition_change || 0),
        satisfaction_change: Number(item.satisfaction_change || 0),
      }))
    );
    const stats = dashboard.stats || ({} as PropertyMaintenanceStats);
    setMaintenanceStats({
      open_issues: Number(stats.open_issues || 0),
      urgent_issues: Number(stats.urgent_issues || 0),
      at_risk_tenants: Number(stats.at_risk_tenants || 0),
      average_condition: Number(stats.average_condition || 100),
    });
  }

  async function refreshMaintenanceSimulation(showMessage = false) {
    const { data, error } = await supabase.rpc(
      "refresh_my_milo_property_maintenance"
    );

    if (error) {
      console.warn("Could not refresh property maintenance:", error.message);
      return;
    }

    if (showMessage) {
      const result = (data || {}) as Record<string, unknown>;
      const issuesCreated = Number(result.issues_created || 0);
      const departures = Number(result.tenant_departures || 0);
      if (issuesCreated > 0 || departures > 0) {
        setTradeMessage(
          `Property care refreshed · ${issuesCreated} new maintenance issue${
            issuesCreated === 1 ? "" : "s"
          } · ${departures} tenant departure${departures === 1 ? "" : "s"}.`
        );
      } else {
        setTradeMessage("Property care is up to date.");
      }
    }
  }

  async function refreshResidentSimulation(showMessage = false) {
    const { data, error } = await supabase.rpc("refresh_my_milo_property_resident_market");
    if (error) {
      console.warn("Could not refresh Dreamscape resident market:", error.message);
      return;
    }

    if (showMessage) {
      const result = (data || {}) as Record<string, unknown>;
      const applicationsCreated = Number(result.applications_created || 0);
      const offersCreated = Number(result.purchase_offers_created || 0);
      if (applicationsCreated > 0 || offersCreated > 0) {
        setTradeMessage(`Resident market refreshed · ${applicationsCreated} new application${applicationsCreated === 1 ? "" : "s"} · ${offersCreated} new purchase offer${offersCreated === 1 ? "" : "s"}.`);
      } else {
        setTradeMessage("Resident market is up to date.");
      }
    }
  }

  async function refreshDistrictMarket(showMessage = false) {
    const { data, error } = await supabase.rpc("refresh_milo_exchange_property_market");
    if (error) {
      console.warn("Could not refresh property district market:", error.message);
      return;
    }

    if (showMessage) {
      const result = (data || {}) as Record<string, unknown>;
      setTradeMessage(
        `Market pulse updated · ${Number(result.segments_updated || 0)} district market segment${Number(result.segments_updated || 0) === 1 ? "" : "s"} checked.`
      );
    }
  }

  async function loadDistrictMarketDashboard() {
    const { data, error } = await supabase.rpc("get_milo_exchange_property_market_dashboard");
    if (error) {
      console.warn("Could not load district market dashboard:", error.message);
      setDistrictMarkets([]);
      setMarketSegments([]);
      setMarketHistory([]);
      return;
    }

    const dashboard = (data || {}) as Partial<PropertyMarketDashboard>;
    setDistrictMarkets((dashboard.districts || []).map((item) => ({
      ...item,
      demand_score: Number(item.demand_score || 0),
      demand_count: Number(item.demand_count || 0),
      available_supply: Number(item.available_supply || 0),
      primary_available: Number(item.primary_available || 0),
      active_rental_listings: Number(item.active_rental_listings || 0),
      active_resale_listings: Number(item.active_resale_listings || 0),
      owned_units: Number(item.owned_units || 0),
      active_leases: Number(item.active_leases || 0),
      occupancy_rate: Number(item.occupancy_rate || 0),
      avg_weekly_rent: Number(item.avg_weekly_rent || 0),
      value_index_bps: Number(item.value_index_bps || 10000),
      rent_index_bps: Number(item.rent_index_bps || 10000),
      value_change_30d_bps: Number(item.value_change_30d_bps || 0),
      rent_change_30d_bps: Number(item.rent_change_30d_bps || 0),
      recent_applications: Number(item.recent_applications || 0),
      recent_purchase_offers: Number(item.recent_purchase_offers || 0),
      recent_resale_sales: Number(item.recent_resale_sales || 0),
    })) as PropertyDistrictMarket[]);
    setMarketSegments((dashboard.segments || []).map((item) => ({
      ...item,
      demand_score: Number(item.demand_score || 0),
      demand_count: Number(item.demand_count || 0),
      available_supply: Number(item.available_supply || 0),
      primary_available: Number(item.primary_available || 0),
      active_rental_listings: Number(item.active_rental_listings || 0),
      active_resale_listings: Number(item.active_resale_listings || 0),
      owned_units: Number(item.owned_units || 0),
      active_leases: Number(item.active_leases || 0),
      occupancy_rate: Number(item.occupancy_rate || 0),
      avg_weekly_rent: Number(item.avg_weekly_rent || 0),
      avg_rental_ask: Number(item.avg_rental_ask || 0),
      avg_resale_ask: Number(item.avg_resale_ask || 0),
      recent_applications: Number(item.recent_applications || 0),
      recent_purchase_offers: Number(item.recent_purchase_offers || 0),
      recent_resale_sales: Number(item.recent_resale_sales || 0),
      value_index_bps: Number(item.value_index_bps || 10000),
      rent_index_bps: Number(item.rent_index_bps || 10000),
      value_change_30d_bps: Number(item.value_change_30d_bps || 0),
      rent_change_30d_bps: Number(item.rent_change_30d_bps || 0),
    })) as PropertyMarketSegment[]);
    setMarketHistory((dashboard.history || []).map((item) => ({
      ...item,
      demand_score: Number(item.demand_score || 0),
      demand_count: Number(item.demand_count || 0),
      available_supply: Number(item.available_supply || 0),
      occupancy_rate: Number(item.occupancy_rate || 0),
      avg_weekly_rent: Number(item.avg_weekly_rent || 0),
      avg_rental_ask: Number(item.avg_rental_ask || 0),
      avg_resale_ask: Number(item.avg_resale_ask || 0),
      recent_applications: Number(item.recent_applications || 0),
      recent_purchase_offers: Number(item.recent_purchase_offers || 0),
      recent_resale_sales: Number(item.recent_resale_sales || 0),
      value_index_bps: Number(item.value_index_bps || 10000),
      rent_index_bps: Number(item.rent_index_bps || 10000),
    })) as PropertyMarketHistoryPoint[]);
  }

  async function loadPropertyMarket(id: string) {
    setMarketLoading(true);

    const [
      propertiesResult,
      holdingsResult,
      salesResult,
      unitResaleSalesResult,
      resaleResult,
      myListingsResult,
      catalogResult,
    ] = await Promise.all([
      supabase.rpc("get_milo_exchange_property_market_inventory"),
      supabase
        .from("milo_exchange_property_holdings")
        .select("id,user_id,property_id,quantity,purchase_price,created_at,updated_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_milo_exchange_recent_property_sales", { p_limit: 20 }),
      supabase.rpc("get_milo_exchange_recent_unit_resale_sales", { p_limit: 20 }),
      supabase.rpc("get_milo_exchange_unit_resale_listings", { p_limit: 30 }),
      supabase.rpc("get_my_milo_exchange_unit_resale_listings", { p_limit: 50 }),
      supabase.rpc("get_milo_exchange_property_upgrade_catalog"),
    ]);

    if (propertiesResult.error) {
      console.warn("Could not load property inventory:", propertiesResult.error.message);
      setProperties([]);
      setPageMessage("The property market database is not ready. Check the Property Exchange database setup.");
    } else {
      setProperties(((propertiesResult.data || []) as PropertyOffering[]).map((row) => ({
        ...row,
        current_value: Number(row.current_value || 0),
        listing_price: Number(row.listing_price || 0),
        weekly_rent: Number(row.weekly_rent || 0),
        market_value: Number(row.market_value || row.current_value || row.listing_price || 0),
        market_rent: Number(row.market_rent || row.weekly_rent || 0),
        value_index_bps: Number(row.value_index_bps || 10000),
        rent_index_bps: Number(row.rent_index_bps || 10000),
        available_quantity: Number(row.available_quantity || 0),
        total_quantity: Number(row.total_quantity || 0),
        area_sqm: Number(row.area_sqm || 0),
        bedrooms: row.bedrooms === null ? null : Number(row.bedrooms),
        display_order: Number(row.display_order || 0),
      })));
    }

    if (holdingsResult.error) {
      console.warn("Could not load property holdings:", holdingsResult.error.message);
      setHoldings([]);
    } else {
      setHoldings(((holdingsResult.data || []) as PropertyHolding[]).map((row) => ({
        ...row,
        quantity: Number(row.quantity || 0),
        purchase_price: Number(row.purchase_price || 0),
      })));
    }

    if (catalogResult.error) {
      console.warn("Could not load property upgrade catalog:", catalogResult.error.message);
      setUpgradeCatalog([]);
      setPageMessage((current) => current || "Property upgrades are temporarily unavailable. Refresh once after applying the latest Property Exchange update.");
    } else {
      setUpgradeCatalog(((catalogResult.data || []) as PropertyUpgradeCatalogRow[]).map((row) => ({
        ...row,
        level: Number(row.level || 0),
        upgrade_cost: Number(row.upgrade_cost || 0),
        value_bonus_bps: Number(row.value_bonus_bps || 0),
        rent_bonus_bps: Number(row.rent_bonus_bps || 0),
        appeal_bonus: Number(row.appeal_bonus || 0),
        quality_bonus: Number(row.quality_bonus || 0),
        efficiency_bonus: Number(row.efficiency_bonus || 0),
        display_order: Number(row.display_order || 0),
      })));
    }

    const primarySales = salesResult.error
      ? []
      : (salesResult.data || []).map((row: Record<string, unknown>) => ({
          sale_id: String(row.sale_id || ""),
          unit_id: null,
          property_id: String(row.property_id || ""),
          unit_number: null,
          property_name: String(row.property_name || "Property Unit"),
          district: String(row.district || ""),
          property_type: String(row.property_type || ""),
          buyer_name: String(row.buyer_name || "Dreamscape User"),
          seller_name: null,
          quantity: Number(row.quantity || 0),
          price_per_unit: Number(row.price_per_unit || 0),
          total_price: Number(row.total_price || 0),
          sold_at: String(row.sold_at || ""),
          sale_source: "primary" as const,
        }));

    if (salesResult.error) {
      console.warn("Could not load recent primary property sales:", salesResult.error.message);
    }

    const exactResaleSales = unitResaleSalesResult.error
      ? []
      : (unitResaleSalesResult.data || []).map((row: Record<string, unknown>) => ({
          sale_id: String(row.sale_id || ""),
          unit_id: row.unit_id ? String(row.unit_id) : null,
          property_id: String(row.property_id || ""),
          unit_number: Number(row.unit_number || 0) || null,
          property_name: String(row.property_name || "Property Unit"),
          district: String(row.district || ""),
          property_type: String(row.property_type || ""),
          buyer_name: String(row.buyer_name || "Dreamscape User"),
          seller_name: row.seller_name ? String(row.seller_name) : null,
          quantity: 1,
          price_per_unit: Number(row.total_price || 0),
          total_price: Number(row.total_price || 0),
          sold_at: String(row.sold_at || ""),
          sale_source: "player_resale" as const,
        }));

    if (unitResaleSalesResult.error) {
      console.warn("Could not load exact-unit resale sales:", unitResaleSalesResult.error.message);
    }

    setRecentSales(
      [...primarySales, ...exactResaleSales]
        .sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime())
        .slice(0, 30)
    );

    if (resaleResult.error) {
      console.warn("Could not load exact-unit resale listings:", resaleResult.error.message);
      setResaleListings([]);
    } else {
      setResaleListings((resaleResult.data || []).map((row: Record<string, unknown>) => ({
        listing_id: String(row.listing_id || ""),
        unit_id: String(row.unit_id || ""),
        property_id: String(row.property_id || ""),
        unit_number: Number(row.unit_number || 0),
        property_name: String(row.property_name || "Property Unit"),
        district: String(row.district || ""),
        property_type: String(row.property_type || ""),
        seller_name: String(row.seller_name || "Dreamscape User"),
        asking_price: Number(row.asking_price || 0),
        current_value: Number(row.current_value || 0),
        primary_listing_price: Number(row.primary_listing_price || 0),
        rental_potential: Number(row.rental_potential || 0),
        upgrade_spend: Number(row.upgrade_spend || 0),
        upgrade_level_total: Number(row.upgrade_level_total || 0),
        appeal: Number(row.appeal || 0),
        quality: Number(row.quality || 0),
        efficiency: Number(row.efficiency || 0),
        upgrade_levels: (row.upgrade_levels || {}) as Record<string, number>,
        created_at: String(row.created_at || ""),
        expires_at: String(row.expires_at || ""),
      })) as PropertyResaleListing[]);
    }

    if (myListingsResult.error) {
      console.warn("Could not load your exact-unit resale listings:", myListingsResult.error.message);
      setMyListings([]);
    } else {
      setMyListings((myListingsResult.data || []).map((row: Record<string, unknown>) => ({
        listing_id: String(row.listing_id || ""),
        unit_id: String(row.unit_id || ""),
        property_id: String(row.property_id || ""),
        unit_number: Number(row.unit_number || 0),
        property_name: String(row.property_name || "Property Unit"),
        district: String(row.district || ""),
        property_type: String(row.property_type || ""),
        asking_price: Number(row.asking_price || 0),
        current_value: Number(row.current_value || 0),
        primary_listing_price: Number(row.primary_listing_price || 0),
        rental_potential: Number(row.rental_potential || 0),
        upgrade_spend: Number(row.upgrade_spend || 0),
        upgrade_level_total: Number(row.upgrade_level_total || 0),
        status: String(row.status || ""),
        created_at: String(row.created_at || ""),
        expires_at: String(row.expires_at || ""),
        sold_at: row.sold_at ? String(row.sold_at) : null,
        buyer_name: row.buyer_name ? String(row.buyer_name) : null,
      })) as MyPropertyListing[]);
    }

    const syncResult = await supabase.rpc("sync_my_milo_exchange_property_units");
    if (syncResult.error) {
      console.warn("Could not sync managed property units:", syncResult.error.message);
      setPropertyUnits([]);
    } else {
      const unitsResult = await supabase.rpc("get_my_milo_exchange_property_units");
      if (unitsResult.error) {
        console.warn("Could not load managed property units:", unitsResult.error.message);
        setPropertyUnits([]);
      } else {
        setPropertyUnits((unitsResult.data || []).map((row: Record<string, unknown>) => ({
          unit_id: String(row.unit_id || ""),
          property_id: String(row.property_id || ""),
          unit_number: Number(row.unit_number || 0),
          property_name: String(row.property_name || "Property Unit"),
          district: String(row.district || ""),
          property_type: String(row.property_type || ""),
          building_name: String(row.building_name || ""),
          unit_type: String(row.unit_type || ""),
          purchase_price: Number(row.purchase_price || 0),
          base_value: Number(row.base_value || 0),
          current_value: Number(row.current_value || 0),
          base_weekly_rent: Number(row.base_weekly_rent || 0),
          rental_potential: Number(row.rental_potential || 0),
          area_sqm: Number(row.area_sqm || 0),
          bedrooms: row.bedrooms === null || row.bedrooms === undefined ? null : Number(row.bedrooms),
          preview_image_url: row.preview_image_url ? String(row.preview_image_url) : null,
          upgrade_spend: Number(row.upgrade_spend || 0),
          upgrade_level_total: Number(row.upgrade_level_total || 0),
          appeal: Number(row.appeal || 0),
          quality: Number(row.quality || 0),
          efficiency: Number(row.efficiency || 0),
          condition: Number(row.condition || 100),
          upgrade_levels: (row.upgrade_levels || {}) as Record<string, number>,
          acquired_at: String(row.acquired_at || ""),
        })) as PropertyUnit[]);
      }
    }

    setMarketLoading(false);
  }

  async function refreshMarket(showResidentMessage = false) {
    if (!userId) return;
    await refreshMaintenanceSimulation(false);
    await refreshResidentLife(false);
    await refreshResidentSimulation(showResidentMessage);
    await refreshLeaseLifecycle(false);
    await refreshDistrictMarket(false);
    await Promise.all([
      loadDreamTokens(),
      loadPropertyMarket(userId),
      loadResidentDashboard(),
      loadMaintenanceDashboard(),
      loadPropertyCommunications(),
      loadResidentLifeDashboard(),
      loadDistrictMarketDashboard(),
    ]);
  }

  function openPreview(property: PropertyOffering) {
    setPreviewProperty(property);
    setPurchaseQuantity(1);
    setTradeMessage("");
  }

  async function buyProperty(property: PropertyOffering) {
    if (!userId) return;

    const quantity = Math.max(1, Math.floor(Number(purchaseQuantity) || 1));
    if (quantity > property.available_quantity) {
      setTradeMessage("There are not enough units available for that purchase.");
      return;
    }

    const total = quantity * property.listing_price;
    if (total > dreamTokens) {
      setTradeMessage("You do not have enough Dreamscape Tokens for this purchase.");
      return;
    }

    setActionLoading(true);
    setTradeMessage("");
    const { data, error } = await supabase.rpc("buy_milo_exchange_property", {
      p_property_id: property.id,
      p_quantity: quantity,
    });

    if (error) {
      console.warn("Property purchase failed:", error.message);
      setTradeMessage(`Purchase failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    setTradeMessage(String(result.message || `Purchased ${quantity} ${property.unit_type}${quantity === 1 ? "" : "s"}.`));
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket();
    setPreviewProperty(null);
    setActionLoading(false);
  }

  async function buyResaleProperty(listing: PropertyResaleListing) {
    if (!userId || actionLoading) return;
    if (listing.asking_price > dreamTokens) {
      setTradeMessage(`You need ${formatNumber(listing.asking_price)} DT to purchase this resale property.`);
      return;
    }

    setActionLoading(true);
    setTradeMessage("");
    const { data, error } = await supabase.rpc("buy_milo_exchange_property_unit_listing", {
      p_listing_id: listing.listing_id,
    });

    if (error) {
      console.warn("Exact-unit resale purchase failed:", error.message);
      setTradeMessage(`Purchase failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    if (result.ok === false) {
      const reason = String(result.reason || "listing_not_active");
      setTradeMessage(
        reason === "listing_not_active"
          ? "This unit is no longer available."
          : reason === "listing_expired"
          ? "This resale listing has expired."
          : reason === "buyer_is_seller"
          ? "You cannot purchase your own listing."
          : reason === "seller_no_longer_owns_unit"
          ? "The seller no longer owns this exact unit."
          : reason === "insufficient_tokens"
          ? "You do not have enough Dream Tokens for this purchase."
          : reason === "tenant_active"
          ? "This unit now has an active tenant and cannot be sold."
          : reason === "rental_listing_active"
          ? "This unit is currently listed for rent and cannot be sold."
          : reason
      );
      setActionLoading(false);
      await refreshMarket();
      return;
    }

    setTradeMessage(
      `Purchased ${listing.property_name} Unit ${listing.unit_number} for ${formatNumber(
        listing.asking_price
      )} DT from ${listing.seller_name}. Its upgrades transferred with the unit.`
    );
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket();
    setActionLoading(false);
  }

  async function createResaleListing(unitId: string, askingPrice: number) {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    setTradeMessage("");

    const { data, error } = await supabase.rpc("create_milo_exchange_property_unit_listing", {
      p_unit_id: unitId,
      p_asking_price: Math.round(askingPrice),
    });

    if (error) {
      console.warn("Could not create exact-unit resale listing:", error.message);
      setTradeMessage(`Listing failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    if (result.ok === false) {
      const reason = String(result.reason || "listing_failed");
      setTradeMessage(
        reason === "unit_not_owned"
          ? "You no longer own this property unit."
          : reason === "tenant_active"
          ? "A unit with an active tenant cannot be listed for sale."
          : reason === "rental_listing_active"
          ? "Cancel the rental listing before listing this unit for sale."
          : reason === "already_listed"
          ? "This exact unit is already listed for resale."
          : reason === "price_out_of_range"
          ? `The asking price must stay between ${formatNumber(Number(result.minimum || 0))} and ${formatNumber(Number(result.maximum || 0))} DT.`
          : reason
      );
      setActionLoading(false);
      await refreshMarket();
      return;
    }

    const unit = propertyUnits.find((item) => item.unit_id === unitId);
    setTradeMessage(
      `${unit?.property_name || "Property"} Unit ${unit?.unit_number || ""} is now listed for ${formatNumber(
        askingPrice
      )} DT.`
    );
    await refreshMarket();
    setActionLoading(false);
  }

  async function cancelResaleListing(listingId: string) {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    setTradeMessage("");

    const { data, error } = await supabase.rpc("cancel_milo_exchange_property_unit_listing", {
      p_listing_id: listingId,
    });

    if (error) {
      console.warn("Could not cancel exact-unit resale listing:", error.message);
      setTradeMessage(`Cancellation failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    setTradeMessage(result.ok === false ? "That resale listing is no longer active." : "Resale listing cancelled.");
    await refreshMarket();
    setActionLoading(false);
  }

  async function upgradePropertyUnit(unitId: string, category: string) {
    if (!userId || actionLoading) return;

    setActionLoading(true);
    setTradeMessage("");

    const { data, error } = await supabase.rpc(
      "upgrade_my_milo_exchange_property_unit",
      { p_unit_id: unitId, p_category: category }
    );

    if (error) {
      console.warn("Property upgrade failed:", error.message);
      setTradeMessage(`Upgrade failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    if (result.ok === false) {
      const reason = String(result.reason || "upgrade_failed");
      setTradeMessage(
        reason === "insufficient_tokens"
          ? "You do not have enough Dream Tokens for this upgrade."
          : reason === "max_level"
          ? "This upgrade is already at maximum level."
          : reason === "unit_not_found"
          ? "This property unit could not be found."
          : "The upgrade could not be completed."
      );
      setActionLoading(false);
      return;
    }

    setTradeMessage(`Upgrade installed. Property value and rent potential have been recalculated.`);
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket();
    setActionLoading(false);
  }

  async function createRentalListing(unitId: string, askingWeeklyRent: number, openToPurchaseOffers: boolean) {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    setTradeMessage("");

    const { data, error } = await supabase.rpc("create_my_milo_property_rental_listing", {
      p_unit_id: unitId,
      p_asking_weekly_rent: Math.round(askingWeeklyRent),
      p_open_to_purchase_offers: openToPurchaseOffers,
    });

    if (error) {
      setTradeMessage(`Rental listing failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    setTradeMessage(String(result.message || "Property listed for rent."));
    await refreshMarket(false);
    setActionLoading(false);
  }

  async function cancelRentalListing(listingId: string) {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    const { data, error } = await supabase.rpc("cancel_my_milo_property_rental_listing", { p_listing_id: listingId });
    if (error) {
      setTradeMessage(`Could not cancel rental listing: ${error.message}`);
      setActionLoading(false);
      return;
    }
    const result = (data || {}) as Record<string, unknown>;
    setTradeMessage(String(result.message || "Rental listing cancelled."));
    await refreshMarket(false);
    setActionLoading(false);
  }

  async function respondRentalApplication(applicationId: string, action: "accept" | "decline") {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    const { data, error } = await supabase.rpc("respond_to_milo_property_rental_application", {
      p_application_id: applicationId,
      p_action: action,
    });
    if (error) {
      setTradeMessage(`Could not update application: ${error.message}`);
      setActionLoading(false);
      return;
    }
    const result = (data || {}) as Record<string, unknown>;
    setTradeMessage(String(result.message || "Application updated."));
    if (action === "accept") window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket(false);
    setActionLoading(false);
  }

  async function togglePurchaseOffers(unitId: string, enabled: boolean) {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    const { data, error } = await supabase.rpc("set_my_milo_property_purchase_offers", {
      p_unit_id: unitId,
      p_enabled: enabled,
    });
    if (error) {
      setTradeMessage(`Could not update purchase-offer setting: ${error.message}`);
      setActionLoading(false);
      return;
    }
    const result = (data || {}) as Record<string, unknown>;
    setTradeMessage(String(result.message || "Purchase-offer setting updated."));
    await refreshMarket(false);
    setActionLoading(false);
  }

  async function respondPurchaseOffer(offerId: string, action: "accept" | "reject") {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    const { data, error } = await supabase.rpc("respond_to_milo_property_purchase_offer", {
      p_offer_id: offerId,
      p_action: action,
    });
    if (error) {
      setTradeMessage(`Could not update purchase offer: ${error.message}`);
      setActionLoading(false);
      return;
    }
    const result = (data || {}) as Record<string, unknown>;
    setTradeMessage(String(result.message || "Purchase offer updated."));
    if (action === "accept") window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket(false);
    setActionLoading(false);
  }

  async function respondMaintenanceIssue(
    issueId: string,
    action: "full_repair" | "quick_fix" | "ignore"
  ) {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    setTradeMessage("");

    const { data, error } = await supabase.rpc(
      "respond_to_milo_property_maintenance_issue",
      { p_issue_id: issueId, p_action: action }
    );

    if (error) {
      setTradeMessage(`Maintenance action failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    if (result.ok === false) {
      const reason = String(result.reason || "maintenance_failed");
      setTradeMessage(
        reason === "insufficient_tokens"
          ? `You need ${formatNumber(Number(result.required || 0))} DT for this repair.`
          : reason === "issue_already_resolved"
          ? "This maintenance issue has already been resolved."
          : "This maintenance action could not be completed."
      );
      setActionLoading(false);
      await refreshMarket(false);
      return;
    }

    setTradeMessage(String(result.message || "Property maintenance updated."));
    if (action !== "ignore") window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket(false);
    setActionLoading(false);
  }

  async function preventiveService(unitId: string) {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    setTradeMessage("");

    const { data, error } = await supabase.rpc(
      "service_my_milo_property_unit",
      { p_unit_id: unitId }
    );

    if (error) {
      setTradeMessage(`Preventive service failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    if (result.ok === false) {
      const reason = String(result.reason || "service_failed");
      setTradeMessage(
        reason === "insufficient_tokens"
          ? `You need ${formatNumber(Number(result.required || 0))} DT for this service.`
          : reason === "service_cooldown"
          ? `This property was serviced recently. Next service: ${String(
              result.next_available_on || "later"
            )}.`
          : "Preventive service could not be completed."
      );
      setActionLoading(false);
      return;
    }

    setTradeMessage(String(result.message || "Preventive service completed."));
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket(false);
    setActionLoading(false);
  }

  if (loading) {
    return (
      <CenterPanel eyebrow="Milo’s Property Exchange" title="Loading the property market..." isMobile={isMobile}>
        <p>Preparing the map, your property portfolio and the resale market.</p>
      </CenterPanel>
    );
  }

  if (!userId) {
    return (
      <CenterPanel eyebrow="Exchange Access" title="Log in to enter the Property Exchange" isMobile={isMobile}>
        <p>Your Dreamscape account is required to save property holdings, process token purchases and manage resale listings.</p>
        <div style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <Link href="/login" style={primaryButton}>Log In</Link>
          <Link href="/milo-world/exchange" style={secondaryButton}>Exchange Home</Link>
        </div>
      </CenterPanel>
    );
  }

  const tabs: Array<{ id: PropertyTab; label: string; description: string; icon: string }> = [
    { id: "map", label: "Property Map", description: "Explore Dreamscape and buy properties", icon: "⌖" },
    { id: "properties", label: "My Properties", description: "Manage homes, tenants and upgrades", icon: "⌂" },
    { id: "resale", label: "Resale Market", description: "Buy properties from other owners", icon: "⇄" },
  ];

  const tabStyles = { glassPanel, primaryButton, secondaryButton };
  const previewImage = getPropertyPreviewImage(previewProperty || undefined);

  return (
    <main className="milo-scrollbar" style={pageShell}>
      <ExchangeStyles />
      <Background />

      {previewProperty && (
        <div
          onClick={() => setPreviewProperty(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            display: "grid",
            placeItems: "center",
            padding: isMobile ? "12px" : "28px",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <section
            className="milo-scrollbar"
            onClick={(event) => event.stopPropagation()}
            style={{ ...glassPanel, width: "min(1040px, 100%)", maxHeight: "92dvh", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr", overflowX: "hidden" }}
          >
            <div style={{ width: "100%", aspectRatio: "2 / 1", minHeight: isMobile ? "220px" : "420px", background: "rgba(255,255,255,0.04)" }}>
              {previewImage ? (
                <img src={previewImage} alt={`${previewProperty.name} interior preview`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.5)" }}>Preview image not found</div>
              )}
            </div>

            <div style={{ padding: isMobile ? "22px" : "32px", position: "relative" }}>
              <button
                type="button"
                onClick={() => setPreviewProperty(null)}
                aria-label="Close property preview"
                style={{ position: "absolute", top: "18px", right: "18px", width: "40px", height: "40px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", color: "white", cursor: "pointer", fontSize: "20px" }}
              >
                ×
              </button>

              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 900 }}>
                {previewProperty.district} · {PROPERTY_TYPE_LABELS[previewProperty.property_type]}
              </p>
              <h2 style={{ margin: "14px 48px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "44px", fontWeight: 500, lineHeight: 1.02 }}>
                {previewProperty.name}
              </h2>
              <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.56)", fontSize: "14px" }}>{previewProperty.address}</p>
              <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.72)", lineHeight: 1.65 }}>{previewProperty.description}</p>

              <div style={{ marginTop: "22px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                {[
                  ["Unit Type", previewProperty.unit_type],
                  ["Floor Area", `${previewProperty.area_sqm} sqm`],
                  ["Dreamscape Price", `${formatNumber(previewProperty.listing_price)} DT`],
                  ["Live Market Value", `${formatNumber(previewProperty.market_value)} DT`],
                  ["Market Rent Potential", `${formatNumber(previewProperty.market_rent)} DT/week`],
                  ["Units Available", `${previewProperty.available_quantity}`],
                  ["Your Holdings", `${holdingsByProperty.get(previewProperty.id)?.quantity || 0}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", padding: "14px" }}>
                    <span style={{ display: "block", color: "rgba(255,255,255,0.46)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 850 }}>{label}</span>
                    <strong style={{ display: "block", marginTop: "7px", fontSize: "16px" }}>{value}</strong>
                  </div>
                ))}
              </div>

              <label style={{ marginTop: "22px", display: "grid", gap: "8px" }}>
                <span style={{ color: "rgba(255,255,255,0.64)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900 }}>Purchase quantity</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, previewProperty.available_quantity)}
                  value={purchaseQuantity}
                  onChange={(event) => {
                    const next = Math.max(1, Math.floor(Number(event.target.value) || 1));
                    setPurchaseQuantity(Math.min(next, Math.max(1, previewProperty.available_quantity)));
                  }}
                  style={inputStyle}
                />
              </label>

              <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", gap: "12px", borderRadius: "16px", background: "rgba(255,209,138,0.09)", border: "1px solid rgba(255,209,138,0.18)", padding: "15px" }}>
                <span style={{ color: "rgba(255,255,255,0.58)" }}>Purchase total</span>
                <strong style={{ color: "#ffd18a" }}>{formatNumber(purchaseQuantity * previewProperty.listing_price)} DT</strong>
              </div>

              <button
                type="button"
                onClick={() => void buyProperty(previewProperty)}
                disabled={actionLoading || previewProperty.available_quantity <= 0}
                style={{ ...primaryButton, width: "100%", marginTop: "16px", background: previewProperty.available_quantity <= 0 ? "rgba(255,255,255,0.08)" : "rgba(83,215,255,0.18)", opacity: actionLoading ? 0.6 : 1, cursor: actionLoading || previewProperty.available_quantity <= 0 ? "not-allowed" : "pointer" }}
              >
                {previewProperty.available_quantity <= 0 ? "Sold Out" : actionLoading ? "Processing Purchase..." : "Purchase Unit"}
              </button>

              {tradeMessage && <p style={{ margin: "14px 0 0", color: "#ffd18a", fontWeight: 800, lineHeight: 1.5 }}>{tradeMessage}</p>}
            </div>
          </section>
        </div>
      )}

      <div style={contentWrap}>
        <header style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: "12px" }}>
          <Link href="/milo-world/exchange" style={navButtonStyle}>← Exchange Home</Link>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "9px", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
            <Link href="/milo-world/exchange/stocks" style={navButtonStyle}>Stock Exchange</Link>
            <Link href="/profile" style={navButtonStyle}>{formatNumber(dreamTokens)} DT</Link>
            <span style={{ ...navButtonStyle, color: "#ffd18a", borderColor: "rgba(255,209,138,0.24)" }}>Virtual Learning Market</span>
          </div>
        </header>

        <section style={{ marginTop: isMobile ? "34px" : "46px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", letterSpacing: "0.24em", textTransform: "uppercase", fontWeight: 900 }}>Milo’s Exchange</p>
          <h1 style={{ margin: "14px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "46px" : isCompact ? "64px" : "78px", fontWeight: 500, lineHeight: 0.96 }}>
            Property Exchange
          </h1>
          <p style={{ margin: "18px auto 0", maxWidth: "760px", color: "rgba(255,255,255,0.64)", lineHeight: 1.7, fontSize: isMobile ? "15px" : "17px" }}>
            Browse Dreamscape, buy a place, improve it, find tenants, look after your properties and grow your portfolio over time.
          </p>
        </section>

        {pageMessage && (
          <p style={{ margin: "18px 0 0", padding: "14px 18px", borderRadius: "16px", border: "1px solid rgba(255,209,138,0.18)", background: "rgba(255,209,138,0.08)", color: "#ffd18a", fontWeight: 800 }}>
            {pageMessage}
          </p>
        )}

        <section data-milo-guide="property-tabs" style={{ ...glassPanel, marginTop: "26px", padding: isMobile ? "9px" : "11px" }}>
          <div className="milo-scrollbar" role="tablist" aria-label="Property Exchange sections" style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, minmax(150px, 1fr))" : "repeat(3, minmax(0, 1fr))", gap: "8px", overflowX: isMobile ? "auto" : "visible" }}>
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className="property-tab-button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setTradeMessage("");
                  }}
                  style={{
                    minWidth: isMobile ? "150px" : 0,
                    minHeight: isMobile ? "62px" : "76px",
                    borderRadius: "18px",
                    border: active ? "1px solid rgba(132,218,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    background: active ? "linear-gradient(135deg, rgba(83,215,255,0.16), rgba(255,209,138,0.08))" : "rgba(255,255,255,0.04)",
                    color: "white",
                    padding: isMobile ? "10px" : "13px 16px",
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "38px minmax(0,1fr)",
                    gap: "10px",
                    alignItems: "center",
                    textAlign: isMobile ? "center" : "left",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    boxShadow: active ? "0 0 28px rgba(83,215,255,0.08)" : "none",
                  }}
                >
                  {!isMobile && (
                    <span style={{ width: "38px", height: "38px", borderRadius: "12px", display: "grid", placeItems: "center", background: active ? "rgba(142,232,255,0.16)" : "rgba(255,255,255,0.06)", color: active ? "#8ee8ff" : "rgba(255,255,255,0.62)", fontSize: "20px", fontWeight: 900 }}>
                      {tab.icon}
                    </span>
                  )}
                  <span>
                    <strong style={{ display: "block", fontSize: isMobile ? "12px" : "15px" }}>{tab.label}</strong>
                    {!isMobile && <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.43)", lineHeight: 1.3 }}>{tab.description}</small>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div style={{ marginTop: "18px" }}>
          {activeTab === "map" && (
            <PropertyMapTab
              {...tabStyles}
              properties={properties}
              holdings={holdings}
              marketLoading={marketLoading}
              isMobile={isMobile}
              isCompact={isCompact}
              isDesktop={isDesktop}
              onOpenProperty={openPreview}
              districtMarkets={districtMarkets}
              marketSegments={marketSegments}
              marketHistory={marketHistory}
            />
          )}

          {activeTab === "properties" && (
            <MyPropertiesTab
              {...tabStyles}
              dreamTokens={dreamTokens}
              properties={properties}
              myListings={myListings}
              propertyPortfolioValue={propertyPortfolioValue}
              units={propertyUnits}
              upgradeCatalog={upgradeCatalog}
              totalOwnedUnits={totalOwnedUnits}
              rentalListings={rentalListings}
              rentalApplications={rentalApplications}
              leases={leases}
              purchaseOffers={purchaseOffers}
              marketSettings={marketSettings}
              maintenanceIssues={maintenanceIssues}
              maintenanceActions={maintenanceActions}
              maintenanceStats={maintenanceStats}
              landlordReputation={landlordReputation}
              residentLifeProfiles={residentLifeProfiles}
              residentLifeEvents={residentLifeEvents}
              residentLifeStats={residentLifeStats}
              unreadMessages={propertyUnreadCount}
              actionLoading={actionLoading}
              message={tradeMessage}
              isMobile={isMobile}
              isCompact={isCompact}
              onUpgradeUnit={upgradePropertyUnit}
              onCreateRentalListing={createRentalListing}
              onCancelRentalListing={cancelRentalListing}
              onTogglePurchaseOffers={togglePurchaseOffers}
              onRefreshResidentMarket={() => refreshMarket(true)}
              onRefreshResidentLife={async () => {
                await refreshResidentLife(true);
                await refreshResidentSimulation(false);
                await refreshLeaseLifecycle(false);
                await Promise.all([
                  loadResidentLifeDashboard(),
                  loadResidentDashboard(),
                  loadPropertyCommunications(),
                ]);
              }}
              onRespondMaintenanceIssue={respondMaintenanceIssue}
              onPreventiveService={preventiveService}
              onOpenMessages={() => setPhoneOpenRequest((value) => value + 1)}
              onCreateListing={createResaleListing}
              onCancelListing={cancelResaleListing}
            />
          )}

          {activeTab === "resale" && (
            <PropertyResaleTab
              {...tabStyles}
              properties={properties}
              resaleListings={resaleListings}
              recentSales={recentSales}
              dreamTokens={dreamTokens}
              actionLoading={actionLoading}
              marketLoading={marketLoading}
              message={tradeMessage}
              isMobile={isMobile}
              isCompact={isCompact}
              onRefresh={() => void refreshMarket()}
              onBuy={buyResaleProperty}
              onOpenProperty={openPreview}
            />
          )}
        </div>
      </div>

      <PropertyPhone
        conversations={propertyConversations}
        messages={propertyMessages}
        renewalNegotiations={renewalNegotiations}
        rentalApplications={rentalApplications}
        purchaseOffers={purchaseOffers}
        reputation={landlordReputation}
        residentLifeProfiles={residentLifeProfiles}
        residentLifeEvents={residentLifeEvents}
        unreadCount={propertyUnreadCount}
        actionLoading={actionLoading}
        isMobile={isMobile}
        openRequest={phoneOpenRequest}
        onMarkRead={markConversationRead}
        onRespond={respondPropertyCommunication}
        onRefresh={() => refreshMarket(false)}
      />

      <MiloExchangeGuide
        page="property"
        isMobile={isMobile}
        onStepChange={(step) => {
          if (step.propertyTab) setActiveTab(step.propertyTab);
        }}
      />
    </main>
  );
}
