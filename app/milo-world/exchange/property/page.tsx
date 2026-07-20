"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";
type DistrictId = "residential-hub" | "commercial-hub";
type PropertyType = "apartment" | "landed" | "office" | "retail";

type Profile = {
  id: string;
  email: string | null;
  role: string | null;
  tier: string | null;
  milo_exchange_age_band: string | null;
  milo_exchange_unlocked: boolean | null;
  milo_exchange_locked_until: string | null;
  milo_exchange_age_verified_at: string | null;
  milo_exchange_age_verification_method: string | null;
  milo_exchange_terms_accepted_at: string | null;
};

type DistrictDefinition = {
  id: DistrictId;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  fill: string;
  propertyTypes: PropertyType[];
};

type PropertyOffering = {
  id: string;
  code: string;
  name: string;
  district: string;
  district_slug: DistrictId;
  property_type: PropertyType;
  building_name: string;
  unit_type: string;
  description: string;
  address: string;
  current_value: number;
  listing_price: number;
  weekly_rent: number;
  available_quantity: number;
  total_quantity: number;
  area_sqm: number;
  bedrooms: number | null;
  preview_image_url: string | null;
  display_order: number;
  is_active: boolean;
};

type PropertyHolding = {
  id: string;
  user_id: string;
  property_id: string;
  quantity: number;
  purchase_price: number;
  created_at: string;
  updated_at: string;
};

type RecentPropertySale = {
  sale_id: string;
  property_id: string;
  property_name: string;
  district: string;
  property_type: string;
  buyer_name: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  sold_at: string;
};

const DISTRICTS: DistrictDefinition[] = [
  {
    id: "residential-hub",
    name: "Residential Hub",
    subtitle: "Homes, neighbourhood parks and community living",
    description:
      "The first residential district in Milo’s built world. It contains apartment developments and limited landed estates surrounded by green corridors.",
    accent: "#79f2ce",
    fill: "#187c69",
    propertyTypes: ["apartment", "landed"],
  },
  {
    id: "commercial-hub",
    name: "Commercial Hub",
    subtitle: "Offices, retail and the centre of business",
    description:
      "The business centre of the built world. Office towers provide workspaces while the central mall contains retail units facing the main plaza.",
    accent: "#ffd18a",
    fill: "#b76b23",
    propertyTypes: ["office", "retail"],
  },
];

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Apartment Units",
  landed: "Landed Properties",
  office: "Office Units",
  retail: "Retail Units",
};


const PROPERTY_ASSET_BASE = "/milo-world/property-exchange";

const PROPERTY_MAP_IMAGES: Record<"full" | DistrictId, string> = {
  full: `${PROPERTY_ASSET_BASE}/full-map.png`,
  "residential-hub": `${PROPERTY_ASSET_BASE}/residential-hub.png`,
  "commercial-hub": `${PROPERTY_ASSET_BASE}/commercial-hub.png`,
};

const PROPERTY_PREVIEW_IMAGES = {
  parkview: `${PROPERTY_ASSET_BASE}/parkview-apartment.png`,
  skyline: `${PROPERTY_ASSET_BASE}/skyline-apartment.png`,
  gardenTerrace: `${PROPERTY_ASSET_BASE}/garden-terrace-house.png`,
  lakeview: `${PROPERTY_ASSET_BASE}/lakeview-detached-villa.png`,
  commerceTower: `${PROPERTY_ASSET_BASE}/commerce-tower-office.png`,
  enterpriseExecutive: `${PROPERTY_ASSET_BASE}/enterprise-executive-office.png`,
  standardRetail: `${PROPERTY_ASSET_BASE}/standard-retail.png`,
  cornerRetail: `${PROPERTY_ASSET_BASE}/corner-retail.png`,
};

function getDistrictImage(districtId: DistrictId) {
  return PROPERTY_MAP_IMAGES[districtId];
}

function getPropertyPreviewImage(property: PropertyOffering) {
  const searchValue = [
    property.code,
    property.name,
    property.building_name,
    property.unit_type,
  ]
    .join(" ")
    .toLowerCase();

  if (searchValue.includes("parkview")) return PROPERTY_PREVIEW_IMAGES.parkview;
  if (searchValue.includes("skyline")) return PROPERTY_PREVIEW_IMAGES.skyline;
  if (searchValue.includes("garden terrace")) {
    return PROPERTY_PREVIEW_IMAGES.gardenTerrace;
  }
  if (searchValue.includes("lakeview")) return PROPERTY_PREVIEW_IMAGES.lakeview;
  if (searchValue.includes("commerce tower")) {
    return PROPERTY_PREVIEW_IMAGES.commerceTower;
  }
  if (searchValue.includes("enterprise") && searchValue.includes("office")) {
    return PROPERTY_PREVIEW_IMAGES.enterpriseExecutive;
  }
  if (searchValue.includes("standard") && searchValue.includes("retail")) {
    return PROPERTY_PREVIEW_IMAGES.standardRetail;
  }
  if (searchValue.includes("corner") && searchValue.includes("retail")) {
    return PROPERTY_PREVIEW_IMAGES.cornerRetail;
  }

  return property.preview_image_url;
}

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1180 || isPortrait) {
        setScreenMode("tablet");
      } else {
        setScreenMode("desktop");
      }
    }

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return screenMode;
}

function calculateAge(dateString: string) {
  const today = new Date();
  const birthDate = new Date(`${dateString}T00:00:00`);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function getAgeBand(age: number) {
  if (age < 13) return "under_13";
  if (age < 16) return "13_15";
  if (age < 18) return "16_17";
  return "18_plus";
}

function getSixteenthBirthday(dateString: string) {
  const birthDate = new Date(`${dateString}T00:00:00`);
  birthDate.setFullYear(birthDate.getFullYear() + 16);
  return birthDate.toISOString().slice(0, 10);
}

function getTodayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number) {
  return Math.round(Number(value || 0)).toLocaleString();
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-SG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
      .district-zone-button:focus-visible {
        outline: 3px solid rgba(142,232,255,0.9);
        outline-offset: -6px;
      }

      .district-map-control,
      .district-zone-button {
        transition: box-shadow 180ms ease, background 180ms ease,
          border-color 180ms ease, transform 180ms ease;
      }

      .district-map-control:hover {
        transform: translateY(-2px);
      }

      .district-zone-button:hover {
        box-shadow: inset 0 0 0 4px rgba(255,255,255,0.72),
          inset 0 0 52px rgba(126,232,255,0.2);
      }

      @keyframes districtPulse {
        0%, 100% { opacity: 0.52; }
        50% { opacity: 0.88; }
      }

      @keyframes mapFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
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
  function districtIsActive(id: DistrictId) {
    return selectedDistrict === id || hoveredDistrict === id;
  }

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
        alt="World map with the Residential Hub and Commercial Hub divided by a river and surrounded by undeveloped forest"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          aspectRatio: "3 / 2",
          objectFit: "cover",
        }}
      />

      {zones.map((zone) => {
        const isActive = districtIsActive(zone.id);

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
              border: isActive
                ? `3px solid ${zone.accent}`
                : "2px solid transparent",
              background: isActive
                ? `linear-gradient(180deg, transparent 52%, ${zone.accent}25 100%)`
                : "transparent",
              boxShadow: isActive
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
              <strong
                style={{
                  display: "block",
                  color: zone.accent,
                  fontSize: isMobile ? "13px" : "18px",
                }}
              >
                {zone.label}
              </strong>
              {!isMobile && (
                <small
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: "rgba(255,255,255,0.62)",
                    fontSize: "12px",
                  }}
                >
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

  function zoneIsActive(type: PropertyType) {
    return activeType === type;
  }

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
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          aspectRatio: "4 / 3",
          objectFit: "cover",
        }}
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
            border: zoneIsActive(zone.type)
              ? `4px solid ${district.accent}`
              : "4px solid transparent",
            background: zoneIsActive(zone.type)
              ? `linear-gradient(180deg, transparent 55%, ${district.accent}1f)`
              : "transparent",
            boxShadow: zoneIsActive(zone.type)
              ? `inset 0 0 46px ${district.accent}20`
              : "none",
            cursor: "pointer",
          }}
        />
      ))}

      {activeType !== "all" && (
        <button
          type="button"
          onClick={() => onChooseType(activeType as PropertyType)}
          aria-label={`Selected category: ${PROPERTY_TYPE_LABELS[activeType as PropertyType]}`}
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
            fontFamily: "inherit",
            pointerEvents: "none",
          }}
        >
          {PROPERTY_TYPE_LABELS[activeType as PropertyType]}
        </button>
      )}
    </div>
  );
}

function UnitPreviewIllustration({ property }: { property: PropertyOffering }) {
  const imageUrl = getPropertyPreviewImage(property);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${property.name} interior preview`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "220px",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        textAlign: "center",
        background:
          "linear-gradient(145deg, rgba(15,35,48,0.96), rgba(4,13,23,0.98))",
        color: "rgba(255,255,255,0.62)",
      }}
    >
      <div>
        <strong style={{ display: "block", color: "white", fontSize: "18px" }}>
          {property.name}
        </strong>
        <span style={{ display: "block", marginTop: "8px", fontSize: "13px" }}>
          Preview image not found
        </span>
      </div>
    </div>
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

      <div
        style={{
          position: "relative",
          zIndex: 5,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: isMobile ? "18px" : "32px",
        }}
      >
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
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "13px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            {eyebrow}
          </p>

          <h1
            style={{
              margin: "14px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "40px" : "58px",
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            {title}
          </h1>

          <div
            style={{
              marginTop: "22px",
              color: "rgba(255,255,255,0.76)",
              fontSize: "16px",
              lineHeight: 1.65,
            }}
          >
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function MiloPropertyExchangePage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dreamTokens, setDreamTokens] = useState(0);
  const [properties, setProperties] = useState<PropertyOffering[]>([]);
  const [holdings, setHoldings] = useState<PropertyHolding[]>([]);
  const [recentSales, setRecentSales] = useState<RecentPropertySale[]>([]);

  const [selectedDistrict, setSelectedDistrict] = useState<DistrictId | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictId | null>(null);
  const [activeType, setActiveType] = useState<PropertyType | "all">("all");
  const [previewProperty, setPreviewProperty] = useState<PropertyOffering | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  const [dob, setDob] = useState("");
  const [confirmAge, setConfirmAge] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [gateError, setGateError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [tradeMessage, setTradeMessage] = useState("");

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

  const holdingsByProperty = useMemo(() => {
    return new Map(holdings.map((holding) => [holding.property_id, holding]));
  }, [holdings]);

  const totalOwnedUnits = useMemo(() => {
    return holdings.reduce((total, holding) => total + Number(holding.quantity || 0), 0);
  }, [holdings]);

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

  const isLockedUnder16 = useMemo(() => {
    if (!profile?.milo_exchange_locked_until) return false;
    if (profile.milo_exchange_unlocked) return false;
    return profile.milo_exchange_locked_until > getTodayDateOnly();
  }, [profile]);

  const canEnterExchange =
    Boolean(profile?.milo_exchange_unlocked) &&
    Boolean(profile?.milo_exchange_terms_accepted_at) &&
    (profile?.milo_exchange_age_band === "16_17" ||
      profile?.milo_exchange_age_band === "18_plus");

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
    padding: isMobile ? "16px 0 150px" : "26px 0 170px",
  };

  const glassPanel: CSSProperties = {
    borderRadius: isMobile ? "22px" : "28px",
    border: "1px solid rgba(132,218,255,0.18)",
    background: "rgba(5,13,28,0.72)",
    boxShadow:
      "0 28px 80px rgba(0,0,0,0.42), inset 0 0 42px rgba(83,215,255,0.035)",
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
    loadPage();
  }, []);

  useEffect(() => {
    if (!canEnterExchange || !userId) return;

    const channel = supabase
      .channel("milo-property-inventory-live")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "milo_exchange_properties",
        },
        () => {
          refreshMarket();
        }
      )
      .subscribe();

    function handleFocus() {
      refreshMarket();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
    };
  }, [canEnterExchange, userId]);

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

    await Promise.all([
      loadProfile(user.id),
      loadDreamTokens(user.id),
      loadPropertyMarket(user.id),
    ]);

    setLoading(false);
  }

  async function loadProfile(id: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id,email,role,tier,milo_exchange_age_band,milo_exchange_unlocked,milo_exchange_locked_until,milo_exchange_age_verified_at,milo_exchange_age_verification_method,milo_exchange_terms_accepted_at"
      )
      .eq("id", id)
      .single();

    if (error) {
      console.warn("Could not load profile:", error.message);
      setPageMessage("Could not load your Exchange access profile.");
      return;
    }

    setProfile(data as Profile);
  }

  async function loadDreamTokens(id: string) {
    const { data, error } = await supabase
      .from("dream_token_transactions")
      .select("amount")
      .eq("user_id", id)
      .eq("token_kind", "virtual");

    if (error) {
      console.warn("Could not load Dreamscape Tokens:", error.message);
      setDreamTokens(0);
      return;
    }

    const total = (data || []).reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );
    setDreamTokens(total);
  }

  async function loadPropertyMarket(id: string) {
    setMarketLoading(true);

    const [propertiesResult, holdingsResult, salesResult] = await Promise.all([
      supabase
        .from("milo_exchange_properties")
        .select(
          "id,code,name,district,district_slug,property_type,building_name,unit_type,description,address,current_value,listing_price,weekly_rent,available_quantity,total_quantity,area_sqm,bedrooms,preview_image_url,display_order,is_active"
        )
        .eq("is_active", true)
        .in("district_slug", ["residential-hub", "commercial-hub"])
        .order("display_order", { ascending: true }),
      supabase
        .from("milo_exchange_property_holdings")
        .select(
          "id,user_id,property_id,quantity,purchase_price,created_at,updated_at"
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_milo_exchange_recent_property_sales", {
        p_limit: 20,
      }),
    ]);

    if (propertiesResult.error) {
      console.warn("Could not load property inventory:", propertiesResult.error.message);
      setProperties([]);
      setPageMessage(
        "The property market database is not ready. Run the supplied Property Exchange SQL in Supabase."
      );
    } else {
      const nextProperties = (propertiesResult.data || []).map((row) => ({
        ...row,
        current_value: Number(row.current_value || 0),
        listing_price: Number(row.listing_price || 0),
        weekly_rent: Number(row.weekly_rent || 0),
        available_quantity: Number(row.available_quantity || 0),
        total_quantity: Number(row.total_quantity || 0),
        area_sqm: Number(row.area_sqm || 0),
        bedrooms: row.bedrooms === null ? null : Number(row.bedrooms),
        display_order: Number(row.display_order || 0),
      })) as PropertyOffering[];
      setProperties(nextProperties);
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

    setMarketLoading(false);
  }

  async function refreshMarket() {
    if (!userId) return;

    await Promise.all([loadDreamTokens(userId), loadPropertyMarket(userId)]);
  }

  async function handleAgeVerification() {
    if (!userId) return;

    setGateError("");

    if (!dob) {
      setGateError("Please enter your date of birth.");
      return;
    }

    if (!confirmAge) {
      setGateError("Please confirm that your date of birth is accurate.");
      return;
    }

    if (!confirmTerms) {
      setGateError(
        "Please confirm that you understand this is a virtual property market using Dreamscape Tokens."
      );
      return;
    }

    const age = calculateAge(dob);

    if (Number.isNaN(age) || age < 0 || age > 120) {
      setGateError("Please enter a valid date of birth.");
      return;
    }

    const ageBand = getAgeBand(age);
    const now = new Date().toISOString();
    setActionLoading(true);

    if (age < 16) {
      const lockedUntil = getSixteenthBirthday(dob);
      const { error } = await supabase
        .from("profiles")
        .update({
          milo_exchange_age_band: ageBand,
          milo_exchange_unlocked: false,
          milo_exchange_locked_until: lockedUntil,
          milo_exchange_age_verified_at: now,
          milo_exchange_age_verification_method: "self_declared_dob",
          milo_exchange_terms_accepted_at: null,
        })
        .eq("id", userId);

      setActionLoading(false);

      if (error) {
        setGateError("Could not save the age check. Check the profiles update policy.");
        return;
      }

      await loadProfile(userId);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        milo_exchange_age_band: ageBand,
        milo_exchange_unlocked: true,
        milo_exchange_locked_until: null,
        milo_exchange_age_verified_at: now,
        milo_exchange_age_verification_method: "self_declared_dob",
        milo_exchange_terms_accepted_at: now,
      })
      .eq("id", userId);

    setActionLoading(false);

    if (error) {
      setGateError("Could not unlock the Property Exchange. Check the profiles update policy.");
      return;
    }

    await Promise.all([loadProfile(userId), loadPropertyMarket(userId)]);
  }

  function chooseDistrict(id: DistrictId) {
    setSelectedDistrict(id);
    setActiveType("all");
    setTradeMessage("");

    window.setTimeout(() => {
      document
        .getElementById("district-detail-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function openPreview(property: PropertyOffering) {
    setPreviewProperty(property);
    setPurchaseQuantity(1);
    setTradeMessage("");
  }

  async function buyProperty(property: PropertyOffering) {
    if (!userId || !canEnterExchange) return;

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

    setActionLoading(false);

    if (error) {
      console.warn("Property purchase failed:", error.message);
      setTradeMessage(`Purchase failed: ${error.message}`);
      return;
    }

    const result = (data || {}) as Record<string, unknown>;
    setTradeMessage(
      String(
        result.message ||
          `Purchased ${quantity} ${property.unit_type}${quantity === 1 ? "" : "s"}.`
      )
    );

    window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket();

    setPreviewProperty((current) => {
      if (!current) return current;
      const refreshed = properties.find((item) => item.id === current.id);
      return refreshed || current;
    });
  }

  if (loading) {
    return (
      <CenterPanel eyebrow="Milo’s Property Exchange" title="Loading the property map..." isMobile={isMobile}>
        <p>Preparing districts, property inventory and public sale records.</p>
      </CenterPanel>
    );
  }

  if (!userId) {
    return (
      <CenterPanel eyebrow="Exchange Access" title="Log in to enter the Property Exchange" isMobile={isMobile}>
        <p>
          Your Dreamscape account is required to save property holdings, process
          token purchases and show your units in the Exchange portfolio.
        </p>
        <div style={{ marginTop: "24px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <Link href="/login" style={primaryButton}>Log In</Link>
          <Link href="/milo-world/exchange" style={secondaryButton}>Exchange Home</Link>
        </div>
      </CenterPanel>
    );
  }

  if (isLockedUnder16) {
    return (
      <CenterPanel eyebrow="Locked Feature" title="Milo’s Exchange is for users aged 16 and above." isMobile={isMobile}>
        <p>
          The virtual property market is locked for this account. Other parts of
          Dreamscape remain available.
        </p>
        {profile?.milo_exchange_locked_until && (
          <p style={{ color: "rgba(255,255,255,0.58)", fontSize: "14px" }}>
            This feature can be reviewed again from {profile.milo_exchange_locked_until}.
          </p>
        )}
        <Link href="/milo-world/exchange" style={{ ...primaryButton, marginTop: "20px" }}>
          Exchange Home
        </Link>
      </CenterPanel>
    );
  }

  if (!canEnterExchange) {
    return (
      <CenterPanel eyebrow="Age Check Required" title="Milo’s Exchange is for users aged 16 and above." isMobile={isMobile}>
        <p>
          Verify your age before entering. These are virtual properties inside
          Dreamscape and are purchased only with earned Dreamscape Tokens.
        </p>

        <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 900 }}>
              Date of birth
            </span>
            <input type="date" value={dob} onChange={(event) => setDob(event.target.value)} style={inputStyle} />
          </label>

          <label style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: "12px", alignItems: "start" }}>
            <input type="checkbox" checked={confirmAge} onChange={(event) => setConfirmAge(event.target.checked)} style={{ marginTop: "4px" }} />
            <span>I confirm that my date of birth is accurate.</span>
          </label>

          <label style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: "12px", alignItems: "start" }}>
            <input type="checkbox" checked={confirmTerms} onChange={(event) => setConfirmTerms(event.target.checked)} style={{ marginTop: "4px" }} />
            <span>
              I understand these are virtual Dreamscape properties. Dreamscape
              Tokens have no cash value and the units do not represent legal
              ownership of real-world land or buildings.
            </span>
          </label>

          {gateError && <p style={{ color: "#ffb0b0", fontWeight: 800 }}>{gateError}</p>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <button
              type="button"
              onClick={handleAgeVerification}
              disabled={actionLoading}
              style={{ ...primaryButton, opacity: actionLoading ? 0.6 : 1 }}
            >
              {actionLoading ? "Checking..." : "Continue"}
            </button>
            <Link href="/milo-world/exchange" style={secondaryButton}>Exchange Home</Link>
          </div>
        </div>
      </CenterPanel>
    );
  }

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
            style={{
              ...glassPanel,
              width: "min(1040px, 100%)",
              maxHeight: "92dvh",
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "1fr",
              overflowX: "hidden",
            }}
          >
            <div style={{ width: "100%", aspectRatio: "2 / 1", minHeight: isMobile ? "220px" : "420px" }}>
              <UnitPreviewIllustration property={previewProperty} />
            </div>

            <div style={{ padding: isMobile ? "22px" : "32px", position: "relative" }}>
              <button
                type="button"
                onClick={() => setPreviewProperty(null)}
                aria-label="Close property preview"
                style={{
                  position: "absolute",
                  top: "18px",
                  right: "18px",
                  width: "40px",
                  height: "40px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "20px",
                }}
              >
                ×
              </button>

              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 900 }}>
                {previewProperty.district} · {PROPERTY_TYPE_LABELS[previewProperty.property_type]}
              </p>

              <h2 style={{ margin: "14px 48px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "44px", fontWeight: 500, lineHeight: 1.02 }}>
                {previewProperty.name}
              </h2>

              <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.56)", fontSize: "14px" }}>
                {previewProperty.address}
              </p>

              <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.72)", lineHeight: 1.65 }}>
                {previewProperty.description}
              </p>

              <div style={{ marginTop: "22px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                {[
                  ["Unit Type", previewProperty.unit_type],
                  ["Floor Area", `${previewProperty.area_sqm} sqm`],
                  ["Dreamscape Price", `${formatNumber(previewProperty.listing_price)} DT`],
                  ["Weekly Rental", `${formatNumber(previewProperty.weekly_rent)} DT`],
                  ["Units Available", `${previewProperty.available_quantity}`],
                  ["Your Holdings", `${holdingsByProperty.get(previewProperty.id)?.quantity || 0}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", padding: "14px" }}>
                    <span style={{ display: "block", color: "rgba(255,255,255,0.46)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 850 }}>
                      {label}
                    </span>
                    <strong style={{ display: "block", marginTop: "7px", fontSize: "16px" }}>{value}</strong>
                  </div>
                ))}
              </div>

              <label style={{ marginTop: "22px", display: "grid", gap: "8px" }}>
                <span style={{ color: "rgba(255,255,255,0.64)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900 }}>
                  Purchase quantity
                </span>
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
                <strong style={{ color: "#ffd18a" }}>
                  {formatNumber(purchaseQuantity * previewProperty.listing_price)} DT
                </strong>
              </div>

              <button
                type="button"
                onClick={() => buyProperty(previewProperty)}
                disabled={actionLoading || previewProperty.available_quantity <= 0}
                style={{
                  ...primaryButton,
                  width: "100%",
                  marginTop: "16px",
                  background:
                    previewProperty.available_quantity <= 0
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(83,215,255,0.18)",
                  opacity: actionLoading ? 0.6 : 1,
                  cursor:
                    actionLoading || previewProperty.available_quantity <= 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {previewProperty.available_quantity <= 0
                  ? "Sold Out"
                  : actionLoading
                  ? "Processing Purchase..."
                  : "Purchase Unit"}
              </button>

              {tradeMessage && (
                <p style={{ margin: "14px 0 0", color: "#ffd18a", fontWeight: 800, lineHeight: 1.5 }}>
                  {tradeMessage}
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      <div style={contentWrap}>
        <header
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: "12px",
          }}
        >
          <Link href="/milo-world/exchange" style={navButtonStyle}>← Exchange Home</Link>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "9px", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
            <Link href="/milo-world/exchange/stocks" style={navButtonStyle}>Stock Exchange</Link>
            <Link href="/profile" style={navButtonStyle}>{formatNumber(dreamTokens)} DT</Link>
            <span style={{ ...navButtonStyle, color: "#ffd18a", borderColor: "rgba(255,209,138,0.24)" }}>16+ Virtual Market</span>
          </div>
        </header>

        <section style={{ marginTop: isMobile ? "38px" : "52px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", letterSpacing: "0.24em", textTransform: "uppercase", fontWeight: 900 }}>
            Milo’s Exchange
          </p>
          <h1 style={{ margin: "14px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "46px" : isCompact ? "64px" : "78px", fontWeight: 500, lineHeight: 0.96 }}>
            Property Exchange
          </h1>
          <p style={{ margin: "18px auto 0", maxWidth: "760px", color: "rgba(255,255,255,0.64)", lineHeight: 1.7, fontSize: isMobile ? "15px" : "17px" }}>
            Explore the first two built districts, compare unit supply and rental
            income, and purchase virtual properties directly from Dreamscape.
          </p>
        </section>

        <section style={{ marginTop: "28px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: "12px" }}>
          {[
            ["Cash Holdings", `${formatNumber(dreamTokens)} DT`],
            ["Property Value", `${formatNumber(propertyPortfolioValue)} DT`],
            ["Weekly Rental", `${formatNumber(weeklyRentalIncome)} DT`],
            ["Units Owned", `${totalOwnedUnits}`],
          ].map(([label, value]) => (
            <article key={label} style={{ ...glassPanel, padding: isMobile ? "16px" : "20px" }}>
              <span style={{ color: "rgba(255,255,255,0.48)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 850 }}>
                {label}
              </span>
              <strong style={{ display: "block", marginTop: "9px", fontSize: isMobile ? "21px" : "27px", letterSpacing: "-0.04em" }}>
                {value}
              </strong>
            </article>
          ))}
        </section>

        {pageMessage && (
          <p style={{ margin: "18px 0 0", padding: "14px 18px", borderRadius: "16px", border: "1px solid rgba(255,209,138,0.18)", background: "rgba(255,209,138,0.08)", color: "#ffd18a", fontWeight: 800 }}>
            {pageMessage}
          </p>
        )}

        <section style={{ ...glassPanel, marginTop: "18px", padding: isMobile ? "16px" : "24px" }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "flex-end", gap: "12px", marginBottom: "20px" }}>
            <div>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 900 }}>
                World Development Map
              </p>
              <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "44px", fontWeight: 500 }}>
                Choose a built district
              </h2>
            </div>
            <span style={{ color: "rgba(255,255,255,0.46)", fontSize: "13px" }}>
              The surrounding forest is reserved for future development.
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
                const isSelected = selectedDistrict === district.id;
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
                      border: isSelected
                        ? `1px solid ${district.accent}`
                        : "1px solid rgba(255,255,255,0.12)",
                      position: "relative",
                      overflow: "hidden",
                      backgroundImage: `linear-gradient(180deg, rgba(2,9,18,0.12) 15%, rgba(2,9,18,0.92) 88%), url(${getDistrictImage(district.id)})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      boxShadow: isSelected
                        ? `0 0 30px ${district.accent}2e, inset 0 0 44px ${district.accent}1a`
                        : "inset 0 0 24px rgba(0,0,0,0.22)",
                    }}
                  >
                    <span style={{ color: district.accent, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>
                      Built District
                    </span>
                    <strong style={{ display: "block", marginTop: "10px", fontSize: "23px", textShadow: "0 3px 14px rgba(0,0,0,0.9)" }}>
                      {district.name}
                    </strong>
                    <span style={{ display: "block", marginTop: "8px", color: "rgba(255,255,255,0.78)", fontSize: "13px", lineHeight: 1.5, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>
                      {district.subtitle}
                    </span>
                    <span style={{ display: "block", marginTop: "14px", color: district.accent, fontWeight: 900, fontSize: "13px" }}>
                      {available} units currently available →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {selectedDistrictDefinition && (
          <section id="district-detail-section" style={{ ...glassPanel, marginTop: "18px", padding: isMobile ? "16px" : "24px", scrollMarginTop: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "0.92fr 1.08fr" : "1fr", gap: "22px", alignItems: "start" }}>
              <div>
                <p style={{ margin: 0, color: selectedDistrictDefinition.accent, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>
                  District Detail
                </p>
                <h2 style={{ margin: "12px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "38px" : "50px", fontWeight: 500, lineHeight: 1 }}>
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
                <h3 style={{ margin: 0, fontSize: "25px" }}>Available Units</h3>
                <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "13px" }}>
                  Inventory decreases immediately after a completed purchase.
                </p>
              </div>
              {marketLoading && <span style={{ color: "#8ee8ff", fontWeight: 800 }}>Refreshing market...</span>}
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

                  return (
                    <article key={property.id} style={{ borderRadius: "22px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.11)", background: "rgba(255,255,255,0.055)", display: "flex", flexDirection: "column" }}>
                      <div style={{ aspectRatio: "2 / 1", overflow: "hidden" }}>
                        <UnitPreviewIllustration property={property} />
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

                        <h3 style={{ margin: "10px 0 0", fontSize: "20px", lineHeight: 1.18 }}>
                          {property.name}
                        </h3>
                        <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "12px" }}>
                          {property.building_name} · {property.area_sqm} sqm
                        </p>

                        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div style={{ borderRadius: "14px", background: "rgba(255,255,255,0.055)", padding: "11px" }}>
                            <span style={{ display: "block", color: "rgba(255,255,255,0.42)", fontSize: "10px", textTransform: "uppercase", fontWeight: 850 }}>Price</span>
                            <strong style={{ display: "block", marginTop: "5px", color: "#ffd18a" }}>{formatNumber(property.listing_price)} DT</strong>
                          </div>
                          <div style={{ borderRadius: "14px", background: "rgba(255,255,255,0.055)", padding: "11px" }}>
                            <span style={{ display: "block", color: "rgba(255,255,255,0.42)", fontSize: "10px", textTransform: "uppercase", fontWeight: 850 }}>Weekly Rent</span>
                            <strong style={{ display: "block", marginTop: "5px", color: "#8ee8ff" }}>{formatNumber(property.weekly_rent)} DT</strong>
                          </div>
                        </div>

                        <div style={{ marginTop: "14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", color: "rgba(255,255,255,0.54)", fontSize: "12px" }}>
                            <span>Available inventory</span>
                            <strong style={{ color: property.available_quantity > 0 ? "white" : "#ffb0b0" }}>
                              {property.available_quantity} / {property.total_quantity}
                            </strong>
                          </div>
                          <div style={{ height: "6px", marginTop: "8px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                            <div style={{ width: `${availabilityPct}%`, height: "100%", borderRadius: "999px", background: selectedDistrictDefinition.accent, transition: "width 260ms ease" }} />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => openPreview(property)}
                          style={{ ...primaryButton, width: "100%", marginTop: "18px" }}
                        >
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

        <section style={{ marginTop: "18px", display: "grid", gridTemplateColumns: isDesktop ? "0.95fr 1.05fr" : "1fr", gap: "18px", alignItems: "start" }}>
          <section style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>
              Your Portfolio
            </p>
            <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "42px", fontWeight: 500 }}>
              My Property Units
            </h2>

            {holdings.length === 0 ? (
              <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.58)", lineHeight: 1.6 }}>
                You have not purchased a property unit yet.
              </p>
            ) : (
              <div style={{ marginTop: "18px", display: "grid", gap: "10px" }}>
                {holdings.map((holding) => {
                  const property = properties.find((item) => item.id === holding.property_id);
                  if (!property) return null;

                  return (
                    <button
                      key={holding.id}
                      type="button"
                      onClick={() => openPreview(property)}
                      style={{
                        borderRadius: "17px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.055)",
                        color: "white",
                        padding: "15px",
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: "12px",
                        alignItems: "center",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <span>
                        <strong style={{ display: "block" }}>{property.name}</strong>
                        <small style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.48)" }}>
                          {property.district} · {holding.quantity} unit{holding.quantity === 1 ? "" : "s"}
                        </small>
                      </span>
                      <span style={{ textAlign: "right" }}>
                        <strong style={{ color: "#ffd18a" }}>{formatNumber(property.current_value * holding.quantity)} DT</strong>
                        <small style={{ display: "block", marginTop: "5px", color: "#8ee8ff" }}>
                          +{formatNumber(property.weekly_rent * holding.quantity)} DT/week
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}>
            <p style={{ margin: 0, color: "#ffd18a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 900 }}>
              Public Market Record
            </p>
            <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "42px", fontWeight: 500 }}>
              Recent Property Sales
            </h2>
            <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: 1.55 }}>
              Completed Dreamscape property purchases are visible to all Exchange users.
            </p>

            {recentSales.length === 0 ? (
              <p style={{ margin: "18px 0 0", color: "rgba(255,255,255,0.58)" }}>
                No completed property sales yet.
              </p>
            ) : (
              <div className="milo-scrollbar" style={{ marginTop: "18px", display: "grid", gap: "9px", maxHeight: "520px", overflowY: "auto", paddingRight: "4px" }}>
                {recentSales.map((sale) => (
                  <article key={sale.sale_id} style={{ borderRadius: "17px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.055)", padding: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                      <span>
                        <strong style={{ display: "block" }}>{sale.property_name}</strong>
                        <small style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.46)" }}>
                          {sale.district} · {titleCase(sale.property_type)}
                        </small>
                      </span>
                      <strong style={{ color: "#ffd18a", whiteSpace: "nowrap" }}>
                        {formatNumber(sale.total_price)} DT
                      </strong>
                    </div>
                    <div style={{ marginTop: "11px", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", color: "rgba(255,255,255,0.54)", fontSize: "12px" }}>
                      <span>
                        {sale.buyer_name} purchased {sale.quantity} unit{sale.quantity === 1 ? "" : "s"}
                      </span>
                      <span>{formatDateTime(sale.sold_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>

        <section style={{ ...glassPanel, marginTop: "18px", padding: isMobile ? "18px" : "24px" }}>
          <h2 style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "38px", fontWeight: 500 }}>
            Virtual Property Notice
          </h2>
          <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>
            Property units in this Exchange exist only inside Dreamscape. They do
            not represent real-world land, securities, legal title or financial
            investment. Dreamscape Tokens have no cash value and cannot be cashed out.
          </p>
        </section>
      </div>

      <div
        style={{
          position: isMobile ? "relative" : "fixed",
          right: isMobile ? "auto" : "22px",
          bottom: isMobile ? "auto" : "20px",
          zIndex: 18,
          width: isMobile ? "calc(100% - 28px)" : "min(430px, calc(100vw - 44px))",
          margin: isMobile ? "-118px 14px 18px" : 0,
          display: "grid",
          gridTemplateColumns: "86px 1fr",
          gap: "12px",
          alignItems: "end",
          pointerEvents: "none",
        }}
      >
        <img
          src="/milo-world/milo-character.png"
          alt="Milo"
          style={{ width: "92px", height: "auto", objectFit: "contain", filter: "drop-shadow(0 14px 30px rgba(0,0,0,0.55))" }}
        />
        <div style={{ marginBottom: "20px", borderRadius: "20px 20px 20px 6px", border: "1px solid rgba(132,218,255,0.24)", background: "rgba(5,13,28,0.9)", color: "white", padding: "15px 17px", boxShadow: "0 20px 48px rgba(0,0,0,0.4)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}>
          <strong style={{ color: "#8ee8ff", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Milo says
          </strong>
          <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.72)", fontSize: "13px", lineHeight: 1.5 }}>
            I built the first two hubs before opening the surrounding forest.
            Choose a district, compare the remaining supply and preview each unit
            before purchasing it.
          </p>
        </div>
      </div>
    </main>
  );
}
