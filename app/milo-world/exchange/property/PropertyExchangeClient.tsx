"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import MiloExchangeGuide from "../components/MiloExchangeGuide";
import MyPropertiesTab from "./components/MyPropertiesTab";
import PropertyMapTab from "./components/PropertyMapTab";
import PropertyResaleTab from "./components/PropertyResaleTab";
import {
  PROPERTY_TYPE_LABELS,
  formatNumber,
  getPropertyPreviewImage,
  type MyPropertyListing,
  type PropertyHolding,
  type PropertyOffering,
  type PropertyRentPayout,
  type PropertyResaleListing,
  type RecentPropertySale,
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
  const [latestRentPayout, setLatestRentPayout] = useState<PropertyRentPayout | null>(null);

  const [previewProperty, setPreviewProperty] = useState<PropertyOffering | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [pageMessage, setPageMessage] = useState("");
  const [tradeMessage, setTradeMessage] = useState("");

  const holdingsByProperty = useMemo(
    () => new Map(holdings.map((holding) => [holding.property_id, holding])),
    [holdings]
  );

  const totalOwnedUnits = useMemo(
    () => holdings.reduce((total, holding) => total + Number(holding.quantity || 0), 0),
    [holdings]
  );

  const propertyPortfolioValue = useMemo(() => {
    return holdings.reduce((total, holding) => {
      const property = properties.find((item) => item.id === holding.property_id);
      const unitValue = Number(property?.current_value || holding.purchase_price || 0);
      return total + Number(holding.quantity || 0) * unitValue;
    }, 0);
  }, [holdings, properties]);

  const weeklyRentalIncome = useMemo(() => {
    return holdings.reduce((total, holding) => {
      const property = properties.find((item) => item.id === holding.property_id);
      return total + Number(holding.quantity || 0) * Number(property?.weekly_rent || 0);
    }, 0);
  }, [holdings, properties]);

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
    width: "min(1440px, calc(100% - 32px))",
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

  async function loadPropertyMarket(id: string) {
    setMarketLoading(true);

    const [
      propertiesResult,
      holdingsResult,
      salesResult,
      resaleResult,
      myListingsResult,
      rentPayoutResult,
    ] = await Promise.all([
      supabase
        .from("milo_exchange_properties")
        .select("id,code,name,district,district_slug,property_type,building_name,unit_type,description,address,current_value,listing_price,weekly_rent,available_quantity,total_quantity,area_sqm,bedrooms,preview_image_url,display_order,is_active")
        .eq("is_active", true)
        .in("district_slug", ["residential-hub", "commercial-hub"])
        .order("display_order", { ascending: true }),
      supabase
        .from("milo_exchange_property_holdings")
        .select("id,user_id,property_id,quantity,purchase_price,created_at,updated_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_milo_exchange_recent_property_sales", { p_limit: 20 }),
      supabase.rpc("get_milo_exchange_property_resale_listings", { p_limit: 20 }),
      supabase.rpc("get_my_milo_exchange_property_listings", { p_limit: 30 }),
      supabase
        .from("milo_exchange_property_rent_payouts")
        .select("week_start,amount,paid_at")
        .eq("user_id", id)
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (propertiesResult.error) {
      console.warn("Could not load property inventory:", propertiesResult.error.message);
      setProperties([]);
      setPageMessage("The property market database is not ready. Check the Property Exchange database setup.");
    } else {
      setProperties(
        (propertiesResult.data || []).map((row) => ({
          ...row,
          current_value: Number(row.current_value || 0),
          listing_price: Number(row.listing_price || 0),
          weekly_rent: Number(row.weekly_rent || 0),
          available_quantity: Number(row.available_quantity || 0),
          total_quantity: Number(row.total_quantity || 0),
          area_sqm: Number(row.area_sqm || 0),
          bedrooms: row.bedrooms === null ? null : Number(row.bedrooms),
          display_order: Number(row.display_order || 0),
        })) as PropertyOffering[]
      );
    }

    if (holdingsResult.error) {
      console.warn("Could not load property holdings:", holdingsResult.error.message);
      setHoldings([]);
    } else {
      setHoldings(
        (holdingsResult.data || []).map((row) => ({
          ...row,
          quantity: Number(row.quantity || 0),
          purchase_price: Number(row.purchase_price || 0),
        })) as PropertyHolding[]
      );
    }

    if (salesResult.error) {
      console.warn("Could not load recent property sales:", salesResult.error.message);
      setRecentSales([]);
    } else {
      setRecentSales(
        (salesResult.data || []).map((row: Record<string, unknown>) => ({
          sale_id: String(row.sale_id || ""),
          property_id: String(row.property_id || ""),
          property_name: String(row.property_name || "Property Unit"),
          district: String(row.district || ""),
          property_type: String(row.property_type || ""),
          buyer_name: String(row.buyer_name || "Dreamscape User"),
          quantity: Number(row.quantity || 0),
          price_per_unit: Number(row.price_per_unit || 0),
          total_price: Number(row.total_price || 0),
          sold_at: String(row.sold_at || ""),
        }))
      );
    }

    if (resaleResult.error) {
      console.warn("Could not load property resale listings:", resaleResult.error.message);
      setResaleListings([]);
    } else {
      setResaleListings(
        (resaleResult.data || []).map((row: Record<string, unknown>) => ({
          listing_id: String(row.listing_id || ""),
          property_id: String(row.property_id || ""),
          property_name: String(row.property_name || "Property Unit"),
          district: String(row.district || ""),
          property_type: String(row.property_type || ""),
          seller_name: String(row.seller_name || "Dreamscape User"),
          asking_price: Number(row.asking_price || 0),
          current_value: Number(row.current_value || 0),
          primary_listing_price: Number(row.primary_listing_price || 0),
          expires_at: String(row.expires_at || ""),
        }))
      );
    }

    if (myListingsResult.error) {
      console.warn("Could not load your property resale listings:", myListingsResult.error.message);
      setMyListings([]);
    } else {
      setMyListings(
        (myListingsResult.data || []).map((row: Record<string, unknown>) => ({
          listing_id: String(row.listing_id || ""),
          property_id: String(row.property_id || ""),
          property_name: String(row.property_name || "Property Unit"),
          district: String(row.district || ""),
          property_type: String(row.property_type || ""),
          asking_price: Number(row.asking_price || 0),
          current_value: Number(row.current_value || 0),
          primary_listing_price: Number(row.primary_listing_price || 0),
          status: String(row.status || ""),
          created_at: String(row.created_at || ""),
          expires_at: String(row.expires_at || ""),
          sold_at: row.sold_at ? String(row.sold_at) : null,
          buyer_name: row.buyer_name ? String(row.buyer_name) : null,
        }))
      );
    }

    if (rentPayoutResult.error) {
      console.warn("Could not load property rent payout history:", rentPayoutResult.error.message);
      setLatestRentPayout(null);
    } else if (rentPayoutResult.data) {
      setLatestRentPayout({
        week_start: String(rentPayoutResult.data.week_start || ""),
        amount: Number(rentPayoutResult.data.amount || 0),
        paid_at: String(rentPayoutResult.data.paid_at || ""),
      });
    } else {
      setLatestRentPayout(null);
    }

    setMarketLoading(false);
  }

  async function refreshMarket() {
    if (!userId) return;
    await Promise.all([loadDreamTokens(), loadPropertyMarket(userId)]);
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
    const { data, error } = await supabase.rpc("buy_milo_exchange_property_listing", {
      p_listing_id: listing.listing_id,
    });

    if (error) {
      console.warn("Resale property purchase failed:", error.message);
      setTradeMessage(`Purchase failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    if (result.ok === false || result.success === false) {
      const reason = String(result.reason || "This resale listing is no longer available.");
      setTradeMessage(
        reason === "listing_not_active"
          ? "This property has already been purchased."
          : reason === "listing_expired"
          ? "This resale listing has expired."
          : reason === "buyer_is_seller"
          ? "You cannot purchase your own listing."
          : reason === "seller_no_longer_owns_property"
          ? "This property is no longer available from the seller."
          : reason
      );
      setActionLoading(false);
      await refreshMarket();
      return;
    }

    setTradeMessage(`Purchased ${listing.property_name} for ${formatNumber(listing.asking_price)} DT from ${listing.seller_name}.`);
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket();
    setActionLoading(false);
  }

  async function createResaleListing(propertyId: string, askingPrice: number) {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    setTradeMessage("");

    const { data, error } = await supabase.rpc("create_milo_exchange_property_listing", {
      p_property_id: propertyId,
      p_asking_price: Math.round(askingPrice),
    });

    if (error) {
      console.warn("Could not create property resale listing:", error.message);
      setTradeMessage(`Listing failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    const property = properties.find((item) => item.id === propertyId);
    setTradeMessage(
      result.already_listed
        ? `${property?.name || "This property"} is already listed for resale.`
        : `${property?.name || "Property"} is now listed for ${formatNumber(askingPrice)} DT.`
    );

    await refreshMarket();
    setActionLoading(false);
  }

  async function cancelResaleListing(listingId: string) {
    if (!userId || actionLoading) return;
    setActionLoading(true);
    setTradeMessage("");

    const { error } = await supabase.rpc("cancel_milo_exchange_property_listing", {
      p_listing_id: listingId,
    });

    if (error) {
      console.warn("Could not cancel resale listing:", error.message);
      setTradeMessage(`Cancellation failed: ${error.message}`);
      setActionLoading(false);
      return;
    }

    setTradeMessage("Resale listing cancelled.");
    await refreshMarket();
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
    { id: "map", label: "Property Map", description: "Explore and buy primary units", icon: "⌖" },
    { id: "properties", label: "My Properties", description: "Holdings, rent and listings", icon: "⌂" },
    { id: "resale", label: "Resale Market", description: "Buy units from other owners", icon: "⇄" },
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
                  ["Weekly Rent Rate", `${formatNumber(previewProperty.weekly_rent)} DT/week`],
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
            Explore the primary property map, manage your own portfolio and listings, or trade with other owners in the resale market.
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
            />
          )}

          {activeTab === "properties" && (
            <MyPropertiesTab
              {...tabStyles}
              dreamTokens={dreamTokens}
              properties={properties}
              holdings={holdings}
              myListings={myListings}
              propertyPortfolioValue={propertyPortfolioValue}
              weeklyRentalIncome={weeklyRentalIncome}
              totalOwnedUnits={totalOwnedUnits}
              latestRentPayout={latestRentPayout}
              actionLoading={actionLoading}
              message={tradeMessage}
              isMobile={isMobile}
              isCompact={isCompact}
              onOpenProperty={openPreview}
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
