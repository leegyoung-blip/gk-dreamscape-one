"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";

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

type District = {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  active: boolean;
  accent: string;
  fill: string;
  path: string;
  labelX: number;
  labelY: number;
};

type PropertyRecord = {
  id: string;
  name: string;
  district: string;
  propertyType: string;
  description: string;
  address: string;
  currentValue: number;
  listingPrice: number;
  weeklyRent: number;
  areaSqm: number;
  bedrooms: number | null;
  upgradeLevel: number;
  ownerUserId: string | null;
  ownerType: "dreamscape" | "user";
  status: "available" | "listed" | "owned" | "reserved" | string;
  imageUrl: string | null;
  isActive: boolean;
  isDemo: boolean;
};

type PropertyHolding = {
  id: string;
  user_id: string;
  property_id: string;
  purchase_price: number;
  created_at: string;
};

type PropertyTrade = {
  id: string;
  property_id: string;
  buyer_user_id: string | null;
  seller_user_id: string | null;
  price: number;
  created_at: string;
};

const DISTRICTS: District[] = [
  {
    id: "milo-central",
    name: "Milo Central",
    shortName: "Milo Central",
    subtitle: "The heart of Dreamscape commerce",
    description:
      "A lively central district filled with apartments, shops, offices and entertainment spaces. Milo Central is designed for users who want strong activity and steady rental demand.",
    active: true,
    accent: "#ffd18a",
    fill: "#c9832e",
    path: "M55 75 L350 45 L408 190 L318 284 L82 252 Z",
    labelX: 215,
    labelY: 158,
  },
  {
    id: "nova-innovation-district",
    name: "Nova Innovation District",
    shortName: "Nova Innovation",
    subtitle: "Studios, laboratories and maker spaces",
    description:
      "A future-focused district built around creative studios, technology offices and workshop properties. Properties here favour upgrades, experimentation and long-term growth.",
    active: true,
    accent: "#8ee8ff",
    fill: "#2875a0",
    path: "M362 46 L650 70 L626 250 L410 192 Z",
    labelX: 506,
    labelY: 137,
  },
  {
    id: "rex-adventure-coast",
    name: "Rex Adventure Coast",
    shortName: "Rex Coast",
    subtitle: "Coastal homes and adventure venues",
    description:
      "A colourful coastal district with waterfront apartments, activity venues and visitor attractions. It is suited to players who prefer tourism and event-based properties.",
    active: true,
    accent: "#86ffd7",
    fill: "#238a76",
    path: "M650 72 L943 102 L920 292 L730 336 L626 250 Z",
    labelX: 785,
    labelY: 190,
  },
  {
    id: "creators-quarter",
    name: "Creator’s Quarter",
    shortName: "Creator’s Quarter",
    subtitle: "Coming in a future district release",
    description:
      "A future district for galleries, studios and player-run creative venues.",
    active: false,
    accent: "#bda7ff",
    fill: "#182133",
    path: "M82 254 L318 286 L396 438 L170 532 L44 420 Z",
    labelX: 215,
    labelY: 382,
  },
  {
    id: "dreamscape-harbour",
    name: "Dreamscape Harbour",
    shortName: "Harbour",
    subtitle: "Coming in a future district release",
    description:
      "A future waterfront business and transport district with limited landmark sites.",
    active: false,
    accent: "#8ee8ff",
    fill: "#182133",
    path: "M318 286 L410 194 L625 252 L672 430 L396 438 Z",
    labelX: 500,
    labelY: 334,
  },
  {
    id: "starlight-gardens",
    name: "Starlight Gardens",
    shortName: "Starlight Gardens",
    subtitle: "Coming in a future district release",
    description:
      "A future low-density residential district surrounded by parks and gardens.",
    active: false,
    accent: "#a9ffc7",
    fill: "#182133",
    path: "M625 252 L730 338 L918 294 L955 444 L672 430 Z",
    labelX: 800,
    labelY: 377,
  },
  {
    id: "skyforge-heights",
    name: "Skyforge Heights",
    shortName: "Skyforge Heights",
    subtitle: "Coming in a future district release",
    description:
      "A future high-rise district containing towers, premium offices and skyline residences.",
    active: false,
    accent: "#a8c8ff",
    fill: "#182133",
    path: "M170 534 L396 440 L520 590 L178 604 L72 518 Z",
    labelX: 285,
    labelY: 526,
  },
  {
    id: "ember-valley",
    name: "Ember Valley",
    shortName: "Ember Valley",
    subtitle: "Coming in a future district release",
    description:
      "A future industrial and production district for larger workshops and specialised facilities.",
    active: false,
    accent: "#ffae7a",
    fill: "#182133",
    path: "M396 440 L672 432 L930 446 L850 588 L520 590 Z",
    labelX: 650,
    labelY: 520,
  },
];

const FALLBACK_PROPERTIES: PropertyRecord[] = [
  {
    id: "demo-milo-01",
    name: "Central View Apartment 08-12",
    district: "Milo Central",
    propertyType: "Apartment",
    description:
      "A compact city apartment overlooking the central market plaza. Suitable as a starter property with steady weekly rental demand.",
    address: "12 Milo Avenue, Tower A",
    currentValue: 1180,
    listingPrice: 1200,
    weeklyRent: 6,
    areaSqm: 72,
    bedrooms: 2,
    upgradeLevel: 1,
    ownerUserId: null,
    ownerType: "dreamscape",
    status: "available",
    imageUrl: null,
    isActive: true,
    isDemo: true,
  },
  {
    id: "demo-milo-02",
    name: "Market Walk Shop 01-06",
    district: "Milo Central",
    propertyType: "Shop",
    description:
      "A ground-floor shop facing the busiest pedestrian street in Milo Central. It offers stronger rent but a higher entry price.",
    address: "6 Market Walk",
    currentValue: 2450,
    listingPrice: 2500,
    weeklyRent: 13,
    areaSqm: 58,
    bedrooms: null,
    upgradeLevel: 0,
    ownerUserId: null,
    ownerType: "dreamscape",
    status: "available",
    imageUrl: null,
    isActive: true,
    isDemo: true,
  },
  {
    id: "demo-milo-03",
    name: "Exchange Office Suite 12-03",
    district: "Milo Central",
    propertyType: "Office",
    description:
      "A flexible office suite close to Milo’s Exchange. Designed for future business activities and professional upgrades.",
    address: "3 Exchange Boulevard",
    currentValue: 3280,
    listingPrice: 3350,
    weeklyRent: 17,
    areaSqm: 86,
    bedrooms: null,
    upgradeLevel: 2,
    ownerUserId: null,
    ownerType: "dreamscape",
    status: "available",
    imageUrl: null,
    isActive: true,
    isDemo: true,
  },
  {
    id: "demo-nova-01",
    name: "Nova Maker Studio 03-07",
    district: "Nova Innovation District",
    propertyType: "Maker Studio",
    description:
      "A bright maker studio with flexible work areas for future design and production activities.",
    address: "7 Prototype Lane",
    currentValue: 2880,
    listingPrice: 2920,
    weeklyRent: 15,
    areaSqm: 92,
    bedrooms: null,
    upgradeLevel: 1,
    ownerUserId: null,
    ownerType: "dreamscape",
    status: "available",
    imageUrl: null,
    isActive: true,
    isDemo: true,
  },
  {
    id: "demo-nova-02",
    name: "Innovation Loft 14-02",
    district: "Nova Innovation District",
    propertyType: "Loft Apartment",
    description:
      "A modern loft located above the district’s research promenade, with good long-term growth potential.",
    address: "2 Nova Crescent",
    currentValue: 1760,
    listingPrice: 1800,
    weeklyRent: 8,
    areaSqm: 81,
    bedrooms: 2,
    upgradeLevel: 0,
    ownerUserId: null,
    ownerType: "dreamscape",
    status: "available",
    imageUrl: null,
    isActive: true,
    isDemo: true,
  },
  {
    id: "demo-nova-03",
    name: "Future Lab Unit 05-11",
    district: "Nova Innovation District",
    propertyType: "Laboratory",
    description:
      "A specialised laboratory unit designed for higher-value upgrades and future production systems.",
    address: "11 Discovery Circuit",
    currentValue: 4380,
    listingPrice: 4450,
    weeklyRent: 23,
    areaSqm: 118,
    bedrooms: null,
    upgradeLevel: 2,
    ownerUserId: null,
    ownerType: "dreamscape",
    status: "available",
    imageUrl: null,
    isActive: true,
    isDemo: true,
  },
  {
    id: "demo-rex-01",
    name: "Adventure Coast Apartment 06-04",
    district: "Rex Adventure Coast",
    propertyType: "Waterfront Apartment",
    description:
      "A waterfront apartment near the adventure pier, suitable for rental income linked to visitor activity.",
    address: "4 Adventure Shore",
    currentValue: 1580,
    listingPrice: 1620,
    weeklyRent: 8,
    areaSqm: 76,
    bedrooms: 2,
    upgradeLevel: 1,
    ownerUserId: null,
    ownerType: "dreamscape",
    status: "available",
    imageUrl: null,
    isActive: true,
    isDemo: true,
  },
  {
    id: "demo-rex-02",
    name: "Coastal Activity Venue",
    district: "Rex Adventure Coast",
    propertyType: "Event Venue",
    description:
      "A small event venue for future player activities, parties and multiplayer experiences.",
    address: "18 Rex Boardwalk",
    currentValue: 4980,
    listingPrice: 5100,
    weeklyRent: 27,
    areaSqm: 155,
    bedrooms: null,
    upgradeLevel: 1,
    ownerUserId: null,
    ownerType: "dreamscape",
    status: "available",
    imageUrl: null,
    isActive: true,
    isDemo: true,
  },
  {
    id: "demo-rex-03",
    name: "Boardwalk Food Kiosk 01-03",
    district: "Rex Adventure Coast",
    propertyType: "Retail Kiosk",
    description:
      "A compact boardwalk kiosk with affordable entry pricing and strong visitor visibility.",
    address: "3 Rex Boardwalk",
    currentValue: 1380,
    listingPrice: 1400,
    weeklyRent: 7,
    areaSqm: 35,
    bedrooms: null,
    upgradeLevel: 0,
    ownerUserId: null,
    ownerType: "dreamscape",
    status: "available",
    imageUrl: null,
    isActive: true,
    isDemo: true,
  },
];

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

function normaliseProperty(row: Record<string, unknown>): PropertyRecord {
  const ownerUserId =
    typeof row.owner_user_id === "string" ? row.owner_user_id : null;

  const status = String(row.status || (ownerUserId ? "owned" : "available"));

  return {
    id: String(row.id || ""),
    name: String(row.name || row.property_name || "Unnamed Property"),
    district: String(row.district || row.district_name || ""),
    propertyType: String(row.property_type || row.type || "Property"),
    description: String(row.description || ""),
    address: String(row.address || row.location || "Dreamscape"),
    currentValue: Number(row.current_value ?? row.valuation ?? row.price ?? 0),
    listingPrice: Number(
      row.listing_price ?? row.sale_price ?? row.current_value ?? row.price ?? 0
    ),
    weeklyRent: Number(row.weekly_rent ?? row.rent_per_week ?? 0),
    areaSqm: Number(row.area_sqm ?? row.floor_area ?? 0),
    bedrooms:
      row.bedrooms === null || row.bedrooms === undefined
        ? null
        : Number(row.bedrooms),
    upgradeLevel: Number(row.upgrade_level ?? 0),
    ownerUserId,
    ownerType:
      String(row.owner_type || (ownerUserId ? "user" : "dreamscape")) ===
      "user"
        ? "user"
        : "dreamscape",
    status,
    imageUrl: typeof row.image_url === "string" ? row.image_url : null,
    isActive: row.is_active === undefined ? true : Boolean(row.is_active),
    isDemo: false,
  };
}

function ScrollStyles() {
  return (
    <style>{`
      .milo-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(132, 218, 255, 0.45) rgba(255,255,255,0.12);
      }

      .milo-scrollbar::-webkit-scrollbar {
        height: 8px;
        width: 8px;
      }

      .milo-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(132, 218, 255, 0.45);
        border-radius: 999px;
      }

      .district-shape {
        transition: fill 220ms ease, opacity 220ms ease, transform 220ms ease,
          filter 220ms ease, stroke 220ms ease;
        transform-box: fill-box;
        transform-origin: center;
      }

      .district-group:hover .district-shape,
      .district-group:focus .district-shape {
        transform: scale(1.018);
      }

      .property-card {
        transition: transform 220ms ease, border-color 220ms ease,
          box-shadow 220ms ease, background 220ms ease;
      }

      .property-card:hover {
        transform: translateY(-4px);
      }
    `}</style>
  );
}

function DistrictMap({
  selectedDistrictId,
  hoveredDistrictId,
  onHover,
  onSelect,
}: {
  selectedDistrictId: string;
  hoveredDistrictId: string | null;
  onHover: (districtId: string | null) => void;
  onSelect: (district: District) => void;
}) {
  function handleKeyDown(
    event: KeyboardEvent<SVGGElement>,
    district: District
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(district);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        borderRadius: "28px",
        overflow: "hidden",
        border: "1px solid rgba(132,218,255,0.18)",
        background:
          "radial-gradient(circle at 50% 38%, rgba(83,215,255,0.12), rgba(3,10,25,0.82) 72%)",
        boxShadow: "inset 0 0 70px rgba(0,0,0,0.38)",
      }}
    >
      <svg
        viewBox="0 0 1000 650"
        width="100%"
        role="img"
        aria-label="Interactive map of eight Dreamscape property districts"
        style={{ display: "block" }}
      >
        <defs>
          <filter id="districtGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="13" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern
            id="mapGrid"
            width="42"
            height="42"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 42 0 L 0 0 0 42"
              fill="none"
              stroke="rgba(142,232,255,0.045)"
              strokeWidth="1"
            />
          </pattern>

          <linearGradient id="mapEdge" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(142,232,255,0.10)" />
            <stop offset="100%" stopColor="rgba(255,209,138,0.05)" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="1000" height="650" fill="#030a19" />
        <rect x="0" y="0" width="1000" height="650" fill="url(#mapGrid)" />
        <ellipse
          cx="510"
          cy="330"
          rx="475"
          ry="285"
          fill="url(#mapEdge)"
          stroke="rgba(142,232,255,0.10)"
          strokeWidth="2"
        />

        {DISTRICTS.map((district) => {
          const isSelected = selectedDistrictId === district.id;
          const isHovered = hoveredDistrictId === district.id;
          const isHighlighted = district.active && (isSelected || isHovered);

          return (
            <g
              key={district.id}
              className="district-group"
              role="button"
              tabIndex={0}
              aria-label={`${district.name}. ${
                district.active ? "District open" : "Coming soon"
              }`}
              aria-pressed={isSelected}
              onMouseEnter={() => onHover(district.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(district.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(district)}
              onKeyDown={(event) => handleKeyDown(event, district)}
              style={{ cursor: district.active ? "pointer" : "not-allowed" }}
            >
              <path
                d={district.path}
                className="district-shape"
                fill={district.active ? district.fill : "#121a29"}
                opacity={district.active ? (isHighlighted ? 1 : 0.82) : 0.56}
                stroke={
                  isHighlighted
                    ? district.accent
                    : district.active
                    ? "rgba(255,255,255,0.25)"
                    : "rgba(255,255,255,0.09)"
                }
                strokeWidth={isHighlighted ? 5 : 2}
                filter={isHighlighted ? "url(#districtGlow)" : undefined}
              />

              {!district.active && (
                <path
                  d={district.path}
                  fill="rgba(0,0,0,0.28)"
                  stroke="none"
                  pointerEvents="none"
                />
              )}

              <text
                x={district.labelX}
                y={district.labelY - 10}
                textAnchor="middle"
                fill={district.active ? "white" : "rgba(255,255,255,0.36)"}
                fontSize={district.shortName.length > 16 ? "18" : "21"}
                fontWeight="900"
                pointerEvents="none"
                style={{
                  textShadow: "0 4px 16px rgba(0,0,0,0.72)",
                }}
              >
                {district.shortName}
              </text>

              <text
                x={district.labelX}
                y={district.labelY + 20}
                textAnchor="middle"
                fill={district.active ? district.accent : "rgba(255,255,255,0.28)"}
                fontSize="13"
                fontWeight="900"
                letterSpacing="1.8"
                pointerEvents="none"
              >
                {district.active ? "OPEN" : "COMING SOON"}
              </text>
            </g>
          );
        })}

        <g transform="translate(54 594)">
          <circle cx="8" cy="8" r="7" fill="#8ee8ff" />
          <text x="24" y="13" fill="rgba(255,255,255,0.7)" fontSize="14">
            Open district
          </text>
          <circle cx="160" cy="8" r="7" fill="#182133" stroke="rgba(255,255,255,0.18)" />
          <text x="176" y="13" fill="rgba(255,255,255,0.48)" fontSize="14">
            Future release
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function MiloPropertyExchangePage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dreamTokens, setDreamTokens] = useState(0);

  const [properties, setProperties] = useState<PropertyRecord[]>(
    FALLBACK_PROPERTIES
  );
  const [holdings, setHoldings] = useState<PropertyHolding[]>([]);
  const [recentTrades, setRecentTrades] = useState<PropertyTrade[]>([]);
  const [marketReady, setMarketReady] = useState(false);
  const [marketMessage, setMarketMessage] = useState("");

  const [selectedDistrictId, setSelectedDistrictId] = useState(
    DISTRICTS.find((district) => district.active)?.id || DISTRICTS[0].id
  );
  const [hoveredDistrictId, setHoveredDistrictId] = useState<string | null>(
    null
  );
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyRecord | null>(null);
  const [propertyFilter, setPropertyFilter] = useState<
    "all" | "platform" | "resale"
  >("all");

  const [dob, setDob] = useState("");
  const [confirmAge, setConfirmAge] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [gateError, setGateError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [purchaseMessage, setPurchaseMessage] = useState("");

  const selectedDistrict =
    DISTRICTS.find((district) => district.id === selectedDistrictId) ||
    DISTRICTS[0];

  const ownedPropertyIds = useMemo(
    () => new Set(holdings.map((holding) => holding.property_id)),
    [holdings]
  );

  const districtProperties = useMemo(() => {
    return properties
      .filter(
        (property) =>
          property.isActive && property.district === selectedDistrict.name
      )
      .filter((property) => {
        if (propertyFilter === "platform") {
          return property.ownerType === "dreamscape";
        }

        if (propertyFilter === "resale") {
          return property.ownerType === "user" || property.status === "listed";
        }

        return true;
      })
      .sort((a, b) => a.listingPrice - b.listingPrice);
  }, [properties, selectedDistrict.name, propertyFilter]);

  const ownedProperties = useMemo(() => {
    return properties.filter(
      (property) =>
        property.ownerUserId === userId || ownedPropertyIds.has(property.id)
    );
  }, [properties, userId, ownedPropertyIds]);

  const propertyPortfolioValue = useMemo(() => {
    return ownedProperties.reduce(
      (total, property) => total + property.currentValue,
      0
    );
  }, [ownedProperties]);

  const selectedDistrictAverage = useMemo(() => {
    const relevant = properties.filter(
      (property) => property.district === selectedDistrict.name
    );

    if (relevant.length === 0) return 0;

    return Math.round(
      relevant.reduce((total, property) => total + property.currentValue, 0) /
        relevant.length
    );
  }, [properties, selectedDistrict.name]);

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

  useEffect(() => {
    loadPage();
  }, []);

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
        `
        id,
        email,
        role,
        tier,
        milo_exchange_age_band,
        milo_exchange_unlocked,
        milo_exchange_locked_until,
        milo_exchange_age_verified_at,
        milo_exchange_age_verification_method,
        milo_exchange_terms_accepted_at
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.warn("Could not load profile:", error.message);
      setPageMessage("Could not load your Dreamscape profile.");
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

    const total =
      data?.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;
    setDreamTokens(total);
  }

  async function loadPropertyMarket(id: string) {
    setMarketMessage("");

    const propertiesResult = await supabase
      .from("milo_exchange_properties")
      .select("*")
      .eq("is_active", true);

    if (propertiesResult.error) {
      console.warn(
        "Could not load property market:",
        propertiesResult.error.message
      );
      setProperties(FALLBACK_PROPERTIES);
      setHoldings([]);
      setRecentTrades([]);
      setMarketReady(false);
      setMarketMessage(
        "Preview data is being shown. Connect the property tables and purchase function in Supabase to activate live ownership and purchases."
      );
      return;
    }

    const nextProperties = (propertiesResult.data || [])
      .map((row) => normaliseProperty(row as Record<string, unknown>))
      .filter((property) => property.id && property.isActive);

    const holdingsResult = await supabase
      .from("milo_exchange_property_holdings")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    const tradesResult = await supabase
      .from("milo_exchange_property_trades")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12);

    setProperties(
      nextProperties.length > 0 ? nextProperties : FALLBACK_PROPERTIES
    );

    if (holdingsResult.error) {
      console.warn(
        "Could not load property holdings:",
        holdingsResult.error.message
      );
      setHoldings([]);
      setMarketReady(false);
      setMarketMessage(
        "Properties were loaded, but the holdings table or its access policy is not ready yet."
      );
    } else {
      setHoldings((holdingsResult.data || []) as PropertyHolding[]);
      setMarketReady(true);
    }

    if (tradesResult.error) {
      setRecentTrades([]);
    } else {
      setRecentTrades((tradesResult.data || []) as PropertyTrade[]);
    }
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
        "Please confirm that you understand this is a fictional market simulator."
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
        setGateError(
          "Could not save your age check. Check the profiles update policy."
        );
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
      setGateError(
        "Could not unlock Milo’s Property Exchange. Check the profiles update policy."
      );
      return;
    }

    await loadProfile(userId);
  }

  function selectDistrict(district: District) {
    if (!district.active) {
      setMarketMessage(
        `${district.name} is darkened because it has not been released yet.`
      );
      return;
    }

    setSelectedDistrictId(district.id);
    setSelectedProperty(null);
    setPurchaseMessage("");
    setMarketMessage("");
  }

  async function buyProperty(property: PropertyRecord) {
    if (!userId || !canEnterExchange) return;

    setPurchaseMessage("");

    if (property.isDemo || !marketReady) {
      setPurchaseMessage(
        "This is preview property data. Add the property market SQL and buy_milo_exchange_property function before live purchases are enabled."
      );
      return;
    }

    if (ownedProperties.length >= 3) {
      setPurchaseMessage(
        "The starter market allows each user to own up to 3 properties."
      );
      return;
    }

    if (property.ownerUserId === userId || ownedPropertyIds.has(property.id)) {
      setPurchaseMessage("You already own this property.");
      return;
    }

    if (!["available", "listed"].includes(property.status)) {
      setPurchaseMessage("This property is not currently available for sale.");
      return;
    }

    if (property.listingPrice > dreamTokens) {
      setPurchaseMessage(
        `You need ${formatNumber(
          property.listingPrice - dreamTokens
        )} more Dreamscape Tokens to buy this property.`
      );
      return;
    }

    setActionLoading(true);

    const { error } = await supabase.rpc("buy_milo_exchange_property", {
      p_property_id: property.id,
    });

    setActionLoading(false);

    if (error) {
      console.warn("Property purchase failed:", error.message);
      setPurchaseMessage(
        `Purchase could not be completed: ${error.message}. Check that the atomic property purchase SQL function and policies are installed.`
      );
      return;
    }

    setPurchaseMessage(`You purchased ${property.name}.`);
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshMarket();
  }

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
    width: "min(1540px, calc(100% - 36px))",
    margin: "0 auto",
    padding: isMobile ? "18px 0 190px" : "28px 0 170px",
  };

  const glassPanel: CSSProperties = {
    borderRadius: isMobile ? "22px" : "30px",
    border: "1px solid rgba(132,218,255,0.2)",
    background: "rgba(5, 13, 28, 0.72)",
    boxShadow:
      "0 30px 90px rgba(0,0,0,0.46), inset 0 0 42px rgba(83,215,255,0.04)",
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
    gap: "10px",
    color: "rgba(255,255,255,0.9)",
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: isMobile ? "0.07em" : "0.13em",
    fontSize: isMobile ? "10px" : "12px",
    fontWeight: 850,
    border: "1px solid rgba(132,218,255,0.22)",
    background: "rgba(5,13,28,0.66)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
  };

  const primaryButton: CSSProperties = {
    minHeight: "48px",
    padding: "0 24px",
    borderRadius: "999px",
    border: "1px solid rgba(132,218,255,0.32)",
    background: "rgba(83,215,255,0.16)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 24px rgba(83,215,255,0.12)",
    fontFamily: "inherit",
  };

  const secondaryButton: CSSProperties = {
    ...primaryButton,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "none",
  };

  const inputStyle: CSSProperties = {
    height: "48px",
    borderRadius: "14px",
    border: "1px solid rgba(132,218,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    padding: "0 16px",
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
  };

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
              "linear-gradient(to bottom, rgba(2,8,23,0.28), rgba(2,8,23,0.58) 44%, rgba(2,8,23,0.94)), linear-gradient(to right, rgba(2,8,23,0.48), transparent 50%, rgba(2,8,23,0.38))",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            boxShadow: "inset 0 0 190px rgba(0,0,0,0.8)",
          }}
        />
      </>
    );
  }

  function CenterPanel({
    eyebrow,
    title,
    children,
  }: {
    eyebrow: string;
    title: string;
    children: ReactNode;
  }) {
    return (
      <main style={pageShell}>
        <ScrollStyles />
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
              ...glassPanel,
              width: "min(760px, 100%)",
              padding: isMobile ? "24px" : "38px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "13px",
                letterSpacing: "0.24em",
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
                color: "white",
              }}
            >
              {title}
            </h1>

            <div
              style={{
                marginTop: "22px",
                color: "rgba(255,255,255,0.78)",
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

  if (loading) {
    return (
      <CenterPanel eyebrow="Milo’s Property Exchange" title="Loading...">
        <p>Preparing the Dreamscape district map and property market.</p>
      </CenterPanel>
    );
  }

  if (!userId) {
    return (
      <CenterPanel
        eyebrow="16+ Feature"
        title="Log in to enter Milo’s Property Exchange"
      >
        <p>
          This feature uses your Dreamscape profile to save virtual property
          ownership and market transactions.
        </p>

        <div
          style={{
            marginTop: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <Link href="/login" style={primaryButton}>
            Log In
          </Link>

          <Link href="/milo-world/exchange" style={secondaryButton}>
            Back to Milo’s Exchange
          </Link>
        </div>
      </CenterPanel>
    );
  }

  if (isLockedUnder16) {
    return (
      <CenterPanel
        eyebrow="Locked Feature"
        title="Milo’s Property Exchange is for users aged 16 and above."
      >
        <p>
          This market is locked for your account. You can continue earning
          Dreamscape Tokens through the Activity Lab and other Dreamscape
          features.
        </p>

        {profile?.milo_exchange_locked_until && (
          <p style={{ color: "rgba(255,255,255,0.58)", fontSize: "14px" }}>
            This feature can be reviewed again from{" "}
            {profile.milo_exchange_locked_until}.
          </p>
        )}

        <div style={{ marginTop: "24px" }}>
          <Link href="/milo-world/exchange" style={primaryButton}>
            Back to Milo’s Exchange
          </Link>
        </div>
      </CenterPanel>
    );
  }

  if (!canEnterExchange) {
    return (
      <CenterPanel
        eyebrow="Age Check Required"
        title="Milo’s Property Exchange is for users aged 16 and above."
      >
        <p>
          Please verify your age before entering. This is a fictional property
          market using earned Dreamscape Tokens only.
        </p>

        <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span
              style={{
                color: "rgba(255,255,255,0.72)",
                fontSize: "12px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Date of birth
            </span>

            <input
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label
            style={{
              display: "grid",
              gridTemplateColumns: "20px 1fr",
              gap: "12px",
              alignItems: "start",
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.55,
            }}
          >
            <input
              type="checkbox"
              checked={confirmAge}
              onChange={(event) => setConfirmAge(event.target.checked)}
              style={{ marginTop: "4px" }}
            />
            <span>I confirm that my date of birth is accurate.</span>
          </label>

          <label
            style={{
              display: "grid",
              gridTemplateColumns: "20px 1fr",
              gap: "12px",
              alignItems: "start",
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.55,
            }}
          >
            <input
              type="checkbox"
              checked={confirmTerms}
              onChange={(event) => setConfirmTerms(event.target.checked)}
              style={{ marginTop: "4px" }}
            />
            <span>
              I understand this is a fictional property simulator. Dreamscape
              Tokens and properties have no real-world cash value and cannot be
              cashed out.
            </span>
          </label>

          {gateError && (
            <p style={{ color: "#ffb0b0", fontWeight: 800 }}>{gateError}</p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <button
              type="button"
              onClick={handleAgeVerification}
              disabled={actionLoading}
              style={{
                ...primaryButton,
                opacity: actionLoading ? 0.6 : 1,
                cursor: actionLoading ? "not-allowed" : "pointer",
              }}
            >
              {actionLoading ? "Checking..." : "Continue"}
            </button>

            <Link href="/milo-world/exchange" style={secondaryButton}>
              Back to Milo’s Exchange
            </Link>
          </div>
        </div>
      </CenterPanel>
    );
  }

  return (
    <main className="milo-scrollbar" style={pageShell}>
      <ScrollStyles />
      <Background />

      {selectedProperty && (
        <div
          onClick={() => setSelectedProperty(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            display: "grid",
            placeItems: "center",
            padding: isMobile ? "14px" : "28px",
            background: "rgba(0,0,0,0.66)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className="milo-scrollbar"
            style={{
              ...glassPanel,
              width: "min(850px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: isMobile ? "20px" : "30px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "18px",
                alignItems: "flex-start",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: selectedDistrict.accent,
                    fontSize: "12px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  {selectedProperty.district} · {selectedProperty.propertyType}
                </p>

                <h2
                  style={{
                    margin: "12px 0 0",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: isMobile ? "34px" : "46px",
                    fontWeight: 500,
                    lineHeight: 1.04,
                  }}
                >
                  {selectedProperty.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProperty(null)}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop: "24px",
                minHeight: isMobile ? "180px" : "250px",
                borderRadius: "24px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                background: selectedProperty.imageUrl
                  ? `url('${selectedProperty.imageUrl}') center / cover no-repeat`
                  : `radial-gradient(circle at 50% 38%, ${selectedDistrict.accent}2c, rgba(5,13,28,0.92) 70%)`,
                display: "grid",
                placeItems: "center",
              }}
            >
              {!selectedProperty.imageUrl && (
                <div
                  style={{
                    textAlign: "center",
                    color: selectedDistrict.accent,
                  }}
                >
                  <div style={{ fontSize: "64px" }}>⌂</div>
                  <p
                    style={{
                      margin: "10px 0 0",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      fontWeight: 900,
                      fontSize: "12px",
                    }}
                  >
                    Property preview image
                  </p>
                </div>
              )}
            </div>

            <p
              style={{
                margin: "22px 0 0",
                color: "rgba(255,255,255,0.68)",
                fontSize: "16px",
                lineHeight: 1.7,
              }}
            >
              {selectedProperty.description}
            </p>

            <p
              style={{
                margin: "12px 0 0",
                color: "rgba(255,255,255,0.48)",
                fontSize: "14px",
              }}
            >
              {selectedProperty.address}
            </p>

            <div
              style={{
                marginTop: "24px",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr 1fr"
                  : "repeat(4, minmax(0, 1fr))",
                gap: "12px",
              }}
            >
              {[
                ["Listing Price", `${formatNumber(selectedProperty.listingPrice)} DT`],
                ["Weekly Rent", `${formatNumber(selectedProperty.weeklyRent)} DT`],
                ["Floor Area", `${formatNumber(selectedProperty.areaSqm)} sqm`],
                ["Upgrade Level", `Level ${selectedProperty.upgradeLevel}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: "18px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.055)",
                    padding: "16px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.45)",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontWeight: 900,
                    }}
                  >
                    {label}
                  </span>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "8px",
                      fontSize: "18px",
                      color: label === "Listing Price" ? "#ffd18a" : "white",
                    }}
                  >
                    {value}
                  </strong>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "24px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "12px",
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <button
                type="button"
                onClick={() => buyProperty(selectedProperty)}
                disabled={
                  actionLoading ||
                  selectedProperty.ownerUserId === userId ||
                  ownedPropertyIds.has(selectedProperty.id)
                }
                style={{
                  ...primaryButton,
                  minWidth: isMobile ? "100%" : "240px",
                  opacity:
                    actionLoading ||
                    selectedProperty.ownerUserId === userId ||
                    ownedPropertyIds.has(selectedProperty.id)
                      ? 0.55
                      : 1,
                  cursor:
                    actionLoading ||
                    selectedProperty.ownerUserId === userId ||
                    ownedPropertyIds.has(selectedProperty.id)
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {selectedProperty.ownerUserId === userId ||
                ownedPropertyIds.has(selectedProperty.id)
                  ? "Owned by You"
                  : actionLoading
                  ? "Processing..."
                  : `Buy for ${formatNumber(selectedProperty.listingPrice)} DT`}
              </button>

              <span
                style={{
                  color: "rgba(255,255,255,0.56)",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                Available balance: {formatNumber(dreamTokens)} DT
              </span>
            </div>

            {purchaseMessage && (
              <p
                style={{
                  margin: "16px 0 0",
                  color: "#ffd18a",
                  fontWeight: 800,
                  lineHeight: 1.55,
                }}
              >
                {purchaseMessage}
              </p>
            )}
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
            marginBottom: isMobile ? "24px" : "30px",
          }}
        >
          <Link href="/milo-world/exchange" style={navButtonStyle}>
            ← Exchange Home
          </Link>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: isMobile ? "flex-start" : "flex-end",
            }}
          >
            <Link href="/milo-world/exchange/stocks" style={navButtonStyle}>
              Stock Exchange
            </Link>

            <span
              style={{
                ...navButtonStyle,
                color: "#ffd18a",
                border: "1px solid rgba(255,209,138,0.28)",
                background: "rgba(255,209,138,0.10)",
              }}
            >
              Property Exchange
            </span>

            <Link href="/profile" style={navButtonStyle}>
              {formatNumber(dreamTokens)} DT
            </Link>
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "1fr auto" : "1fr",
            gap: "20px",
            alignItems: "end",
            marginBottom: "20px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "13px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Milo’s Exchange
            </p>

            <h1
              style={{
                margin: "14px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "44px" : isCompact ? "60px" : "72px",
                fontWeight: 500,
                lineHeight: 0.96,
                color: "white",
                textShadow: "0 18px 60px rgba(0,0,0,0.46)",
              }}
            >
              Milo’s Property Exchange
            </h1>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, auto)",
              gap: "10px",
            }}
          >
            {[
              ["Cash", `${formatNumber(dreamTokens)} DT`],
              ["Properties", String(ownedProperties.length)],
              ["Property Value", `${formatNumber(propertyPortfolioValue)} DT`],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  minWidth: isMobile ? 0 : "150px",
                  borderRadius: "18px",
                  border: "1px solid rgba(132,218,255,0.16)",
                  background: "rgba(5,13,28,0.66)",
                  padding: "14px 16px",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                }}
              >
                <span
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.44)",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 900,
                  }}
                >
                  {label}
                </span>
                <strong
                  style={{
                    display: "block",
                    marginTop: "6px",
                    fontSize: isMobile ? "17px" : "20px",
                    color: label === "Cash" ? "#ffd18a" : "white",
                  }}
                >
                  {value}
                </strong>
              </div>
            ))}
          </div>
        </section>

        {pageMessage && (
          <p
            style={{
              margin: "0 0 16px",
              color: "#ffb0b0",
              fontWeight: 800,
            }}
          >
            {pageMessage}
          </p>
        )}

        {marketMessage && (
          <div
            style={{
              marginBottom: "18px",
              borderRadius: "18px",
              border: "1px solid rgba(255,209,138,0.18)",
              background: "rgba(255,209,138,0.08)",
              padding: "14px 16px",
              color: "#ffe0ae",
              lineHeight: 1.55,
              fontSize: "14px",
            }}
          >
            {marketMessage}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "minmax(0, 1.42fr) 390px" : "1fr",
            gap: "18px",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              ...glassPanel,
              padding: isMobile ? "16px" : "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: isMobile ? "flex-start" : "center",
                marginBottom: "18px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#8ee8ff",
                    fontSize: "12px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  Dreamscape District Map
                </p>
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "rgba(255,255,255,0.52)",
                    fontSize: "14px",
                  }}
                >
                  Hover over a district to make it glow. Select an open district
                  to view its properties.
                </p>
              </div>

              <span
                style={{
                  borderRadius: "999px",
                  border: "1px solid rgba(134,255,215,0.22)",
                  background: "rgba(134,255,215,0.08)",
                  color: "#86ffd7",
                  padding: "9px 14px",
                  fontSize: "12px",
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                3 of 8 districts open
              </span>
            </div>

            <DistrictMap
              selectedDistrictId={selectedDistrictId}
              hoveredDistrictId={hoveredDistrictId}
              onHover={setHoveredDistrictId}
              onSelect={selectDistrict}
            />
          </div>

          <aside
            style={{
              ...glassPanel,
              padding: isMobile ? "22px" : "28px",
              display: "flex",
              flexDirection: "column",
              border: `1px solid ${selectedDistrict.accent}42`,
              boxShadow: `0 30px 90px rgba(0,0,0,0.46), inset 0 0 52px ${selectedDistrict.accent}12`,
            }}
          >
            <p
              style={{
                margin: 0,
                color: selectedDistrict.accent,
                fontSize: "12px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Selected District
            </p>

            <h2
              style={{
                margin: "12px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "34px" : "42px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {selectedDistrict.name}
            </h2>

            <p
              style={{
                margin: "12px 0 0",
                color: selectedDistrict.accent,
                fontWeight: 800,
                lineHeight: 1.4,
              }}
            >
              {selectedDistrict.subtitle}
            </p>

            <p
              style={{
                margin: "18px 0 0",
                color: "rgba(255,255,255,0.64)",
                fontSize: "15px",
                lineHeight: 1.65,
              }}
            >
              {selectedDistrict.description}
            </p>

            <div
              style={{
                marginTop: "24px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              {[
                ["Listings", districtProperties.length],
                ["Average Value", `${formatNumber(selectedDistrictAverage)} DT`],
                ["Platform Sales", properties.filter((property) => property.district === selectedDistrict.name && property.ownerType === "dreamscape").length],
                ["Resale Listings", properties.filter((property) => property.district === selectedDistrict.name && property.ownerType === "user").length],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.05)",
                    padding: "14px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.42)",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontWeight: 900,
                    }}
                  >
                    {label}
                  </span>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "7px",
                      color: "white",
                      fontSize: "17px",
                    }}
                  >
                    {value}
                  </strong>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "auto",
                paddingTop: "24px",
              }}
            >
              <div
                style={{
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "16px",
                }}
              >
                <strong style={{ color: "white" }}>Starter ownership rule</strong>
                <p
                  style={{
                    margin: "7px 0 0",
                    color: "rgba(255,255,255,0.54)",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  Each user may own up to 3 properties during the first market
                  release.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section
          style={{
            ...glassPanel,
            marginTop: "18px",
            padding: isMobile ? "20px" : "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: isMobile ? "stretch" : "flex-end",
              marginBottom: "22px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: selectedDistrict.accent,
                  fontSize: "12px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontWeight: 900,
                }}
              >
                Available Property List
              </p>

              <h2
                style={{
                  margin: "10px 0 0",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: isMobile ? "34px" : "44px",
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                Properties in {selectedDistrict.name}
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "8px",
              }}
            >
              {[
                ["all", "All"],
                ["platform", "Dreamscape"],
                ["resale", "Resale"],
              ].map(([value, label]) => {
                const isSelected = propertyFilter === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setPropertyFilter(value as "all" | "platform" | "resale")
                    }
                    style={{
                      minHeight: "40px",
                      padding: "0 14px",
                      borderRadius: "999px",
                      border: isSelected
                        ? `1px solid ${selectedDistrict.accent}66`
                        : "1px solid rgba(255,255,255,0.12)",
                      background: isSelected
                        ? `${selectedDistrict.accent}20`
                        : "rgba(255,255,255,0.05)",
                      color: isSelected ? selectedDistrict.accent : "white",
                      fontWeight: 900,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {districtProperties.length === 0 ? (
            <div
              style={{
                minHeight: "220px",
                borderRadius: "22px",
                border: "1px dashed rgba(132,218,255,0.2)",
                background: "rgba(5,13,28,0.42)",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: "24px",
                color: "rgba(255,255,255,0.58)",
              }}
            >
              No matching properties are currently available in this district.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(3, minmax(0, 1fr))",
                gap: "16px",
              }}
            >
              {districtProperties.map((property) => {
                const isOwned =
                  property.ownerUserId === userId ||
                  ownedPropertyIds.has(property.id);

                return (
                  <article
                    key={property.id}
                    className="property-card"
                    style={{
                      overflow: "hidden",
                      borderRadius: "24px",
                      border: isOwned
                        ? "1px solid rgba(134,255,215,0.48)"
                        : "1px solid rgba(132,218,255,0.15)",
                      background: isOwned
                        ? "rgba(31,113,87,0.22)"
                        : "rgba(5,13,28,0.56)",
                      boxShadow: isOwned
                        ? "0 0 32px rgba(134,255,215,0.08)"
                        : "none",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        height: "172px",
                        background: property.imageUrl
                          ? `url('${property.imageUrl}') center / cover no-repeat`
                          : `radial-gradient(circle at 50% 42%, ${selectedDistrict.accent}2c, rgba(5,13,28,0.94) 72%)`,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                      }}
                    >
                      {!property.imageUrl && (
                        <span
                          style={{
                            color: selectedDistrict.accent,
                            fontSize: "52px",
                            filter: "drop-shadow(0 12px 30px rgba(0,0,0,0.46))",
                          }}
                        >
                          ⌂
                        </span>
                      )}

                      <span
                        style={{
                          position: "absolute",
                          top: "12px",
                          left: "12px",
                          borderRadius: "999px",
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "rgba(3,10,25,0.72)",
                          color:
                            property.ownerType === "dreamscape"
                              ? "#ffd18a"
                              : "#8ee8ff",
                          padding: "7px 10px",
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          fontWeight: 900,
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                        }}
                      >
                        {property.ownerType === "dreamscape"
                          ? "Dreamscape Release"
                          : "Player Resale"}
                      </span>

                      {isOwned && (
                        <span
                          style={{
                            position: "absolute",
                            top: "12px",
                            right: "12px",
                            borderRadius: "999px",
                            border: "1px solid rgba(134,255,215,0.34)",
                            background: "rgba(31,113,87,0.72)",
                            color: "#b8ffe5",
                            padding: "7px 10px",
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            fontWeight: 900,
                          }}
                        >
                          Owned
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: selectedDistrict.accent,
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.14em",
                          fontWeight: 900,
                        }}
                      >
                        {property.propertyType}
                      </p>

                      <h3
                        style={{
                          margin: "10px 0 0",
                          fontSize: "22px",
                          lineHeight: 1.18,
                        }}
                      >
                        {property.name}
                      </h3>

                      <p
                        style={{
                          margin: "9px 0 0",
                          color: "rgba(255,255,255,0.48)",
                          fontSize: "13px",
                          lineHeight: 1.45,
                        }}
                      >
                        {property.address}
                      </p>

                      <div
                        style={{
                          marginTop: "18px",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "9px",
                        }}
                      >
                        <div
                          style={{
                            borderRadius: "14px",
                            background: "rgba(255,255,255,0.055)",
                            padding: "12px",
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              color: "rgba(255,255,255,0.42)",
                              fontSize: "10px",
                              textTransform: "uppercase",
                              fontWeight: 900,
                            }}
                          >
                            Price
                          </span>
                          <strong
                            style={{
                              display: "block",
                              marginTop: "5px",
                              color: "#ffd18a",
                            }}
                          >
                            {formatNumber(property.listingPrice)} DT
                          </strong>
                        </div>

                        <div
                          style={{
                            borderRadius: "14px",
                            background: "rgba(255,255,255,0.055)",
                            padding: "12px",
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              color: "rgba(255,255,255,0.42)",
                              fontSize: "10px",
                              textTransform: "uppercase",
                              fontWeight: 900,
                            }}
                          >
                            Weekly Rent
                          </span>
                          <strong
                            style={{
                              display: "block",
                              marginTop: "5px",
                              color: "white",
                            }}
                          >
                            {formatNumber(property.weeklyRent)} DT
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProperty(property);
                          setPurchaseMessage("");
                        }}
                        style={{
                          marginTop: "18px",
                          minHeight: "46px",
                          borderRadius: "14px",
                          border: `1px solid ${selectedDistrict.accent}46`,
                          background: `${selectedDistrict.accent}18`,
                          color: "white",
                          fontWeight: 900,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {isOwned ? "View Owned Property" : "View Property"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
            gap: "18px",
          }}
        >
          <section
            style={{
              ...glassPanel,
              padding: isMobile ? "20px" : "26px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#86ffd7",
                fontSize: "12px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Your Portfolio
            </p>

            <h2
              style={{
                margin: "10px 0 20px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "32px" : "40px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              My Properties
            </h2>

            {ownedProperties.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.58)",
                  lineHeight: 1.6,
                }}
              >
                You do not own any Dreamscape properties yet. Select one of the
                three open districts to explore the first market release.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {ownedProperties.map((property) => (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => setSelectedProperty(property)}
                    style={{
                      width: "100%",
                      borderRadius: "17px",
                      border: "1px solid rgba(134,255,215,0.18)",
                      background: "rgba(134,255,215,0.07)",
                      padding: "14px",
                      color: "white",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "12px",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      <strong style={{ display: "block" }}>{property.name}</strong>
                      <small
                        style={{
                          display: "block",
                          marginTop: "5px",
                          color: "rgba(255,255,255,0.48)",
                        }}
                      >
                        {property.district} · {property.propertyType}
                      </small>
                    </span>

                    <strong style={{ color: "#86ffd7" }}>
                      {formatNumber(property.currentValue)} DT
                    </strong>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section
            style={{
              ...glassPanel,
              padding: isMobile ? "20px" : "26px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "12px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Market Activity
            </p>

            <h2
              style={{
                margin: "10px 0 20px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "32px" : "40px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              Recent Property Sales
            </h2>

            {recentTrades.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.58)",
                  lineHeight: 1.6,
                }}
              >
                No completed property sales are available yet. Recent market
                transactions will appear here after the live property tables are
                connected.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {recentTrades.map((trade) => {
                  const property = properties.find(
                    (item) => item.id === trade.property_id
                  );

                  return (
                    <div
                      key={trade.id}
                      style={{
                        borderRadius: "17px",
                        border: "1px solid rgba(255,255,255,0.09)",
                        background: "rgba(255,255,255,0.045)",
                        padding: "14px",
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <span>
                        <strong style={{ display: "block" }}>
                          {property?.name || "Dreamscape Property"}
                        </strong>
                        <small
                          style={{
                            display: "block",
                            marginTop: "5px",
                            color: "rgba(255,255,255,0.44)",
                          }}
                        >
                          {formatDateTime(trade.created_at)}
                        </small>
                      </span>

                      <strong style={{ color: "#ffd18a" }}>
                        {formatNumber(trade.price)} DT
                      </strong>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>

        <section
          style={{
            ...glassPanel,
            marginTop: "18px",
            padding: isMobile ? "20px" : "26px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "30px" : "38px",
              fontWeight: 500,
            }}
          >
            Virtual Property Notice
          </h2>

          <p
            style={{
              margin: "12px 0 0",
              color: "rgba(255,255,255,0.66)",
              lineHeight: 1.65,
            }}
          >
            Properties in Milo’s Property Exchange are fictional digital assets
            used only inside Dreamscape. They are not real land, do not grant
            legal ownership rights, have no cash value and cannot be exchanged
            for real money.
          </p>
        </section>
      </div>

      <div
        style={{
          position: "fixed",
          right: isMobile ? "12px" : "28px",
          bottom: isMobile ? "12px" : "20px",
          left: isMobile ? "12px" : "auto",
          zIndex: 25,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: isMobile ? "calc(100% - 92px)" : "360px",
            marginRight: isMobile ? "-10px" : "-14px",
            marginBottom: isMobile ? "80px" : "70px",
            borderRadius: "20px 20px 6px 20px",
            border: "1px solid rgba(255,209,138,0.24)",
            background: "rgba(5,13,28,0.9)",
            padding: isMobile ? "14px 16px" : "17px 19px",
            color: "rgba(255,255,255,0.76)",
            fontSize: isMobile ? "12px" : "13px",
            lineHeight: 1.55,
            boxShadow: "0 20px 50px rgba(0,0,0,0.42)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        >
          <strong
            style={{
              display: "block",
              marginBottom: "5px",
              color: "#ffd18a",
              fontSize: "13px",
            }}
          >
            Milo says
          </strong>
          Choose one of the three glowing districts, then open a property card
          to inspect its price, weekly rent and details.
        </div>

        <img
          src="/milo-world/milo-character.png"
          alt="Milo"
          style={{
            width: "auto",
            height: isMobile ? "104px" : "150px",
            objectFit: "contain",
            filter: "drop-shadow(0 18px 34px rgba(0,0,0,0.58))",
          }}
        />
      </div>
    </main>
  );
}
