"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
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

      .district-map-control:focus-visible {
        outline: 3px solid rgba(142,232,255,0.9);
        outline-offset: 6px;
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

  function handleKeyDown(
    event: KeyboardEvent<SVGGElement>,
    id: DistrictId
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  }

  const forestTrees = Array.from({ length: 48 }, (_, index) => ({
    x: 48 + ((index * 137) % 900),
    y: 48 + ((index * 89) % 500),
    scale: 0.75 + ((index * 17) % 35) / 100,
  }));

  return (
    <div
      style={{
        borderRadius: isMobile ? "24px" : "30px",
        overflow: "hidden",
        border: "1px solid rgba(126,232,255,0.2)",
        background:
          "linear-gradient(145deg, rgba(3,18,24,0.96), rgba(2,9,18,0.98))",
        boxShadow: "inset 0 0 70px rgba(0,0,0,0.4)",
      }}
    >
      <svg
        viewBox="0 0 1000 600"
        width="100%"
        role="img"
        aria-label="Map of Milo's world showing the Residential Hub and Commercial Hub surrounded by undeveloped forest"
        style={{ display: "block", minHeight: isMobile ? "330px" : "520px" }}
      >
        <defs>
          <linearGradient id="worldGround" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0c2a25" />
            <stop offset="45%" stopColor="#081e1e" />
            <stop offset="100%" stopColor="#07131b" />
          </linearGradient>
          <linearGradient id="riverGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#173b4c" />
            <stop offset="100%" stopColor="#0d2739" />
          </linearGradient>
          <filter id="residentialGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="16" floodColor="#79f2ce" floodOpacity="0.7" />
          </filter>
          <filter id="commercialGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="0" stdDeviation="16" floodColor="#ffd18a" floodOpacity="0.7" />
          </filter>
          <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#000000" floodOpacity="0.55" />
          </filter>
        </defs>

        <rect width="1000" height="600" fill="url(#worldGround)" />

        <path
          d="M0 430 C160 350 235 520 390 448 C535 382 600 302 730 342 C850 380 908 320 1000 262 L1000 600 L0 600 Z"
          fill="#06151c"
          opacity="0.76"
        />

        <path
          d="M28 44 C170 10 260 74 366 52 C485 26 560 78 660 46 C778 10 870 64 980 34 L1000 0 L0 0 Z"
          fill="#102f28"
          opacity="0.72"
        />

        <path
          d="M482 -20 C445 88 520 132 492 230 C470 308 410 358 440 438 C466 506 538 548 516 630"
          fill="none"
          stroke="url(#riverGlow)"
          strokeWidth="70"
          strokeLinecap="round"
          opacity="0.92"
        />
        <path
          d="M482 -20 C445 88 520 132 492 230 C470 308 410 358 440 438 C466 506 538 548 516 630"
          fill="none"
          stroke="rgba(126,232,255,0.13)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {forestTrees.map((tree, index) => (
          <g
            key={index}
            transform={`translate(${tree.x} ${tree.y}) scale(${tree.scale})`}
            opacity={
              (tree.x > 150 && tree.x < 425 && tree.y > 150 && tree.y < 425) ||
              (tree.x > 575 && tree.x < 860 && tree.y > 145 && tree.y < 425)
                ? 0.12
                : 0.56
            }
          >
            <rect x="-2" y="10" width="4" height="10" rx="2" fill="#17352c" />
            <path d="M0 -16 L-12 8 L12 8 Z" fill="#1a4638" />
            <path d="M0 -6 L-15 14 L15 14 Z" fill="#12382f" />
          </g>
        ))}

        <path
          d="M132 174 L196 118 L350 128 L420 205 L388 370 L286 435 L160 393 L102 292 Z"
          fill={districtIsActive("residential-hub") ? "#1f9a81" : "#187c69"}
          stroke={districtIsActive("residential-hub") ? "#9affdf" : "rgba(121,242,206,0.56)"}
          strokeWidth={districtIsActive("residential-hub") ? 7 : 4}
          filter={districtIsActive("residential-hub") ? "url(#residentialGlow)" : "url(#softShadow)"}
          opacity={districtIsActive("residential-hub") ? 1 : 0.84}
        />

        <path
          d="M600 158 L744 112 L878 180 L900 310 L836 414 L674 430 L580 342 L566 242 Z"
          fill={districtIsActive("commercial-hub") ? "#cf7e2f" : "#a95f21"}
          stroke={districtIsActive("commercial-hub") ? "#ffe0aa" : "rgba(255,209,138,0.58)"}
          strokeWidth={districtIsActive("commercial-hub") ? 7 : 4}
          filter={districtIsActive("commercial-hub") ? "url(#commercialGlow)" : "url(#softShadow)"}
          opacity={districtIsActive("commercial-hub") ? 1 : 0.84}
        />

        <path
          d="M380 283 C438 266 520 270 594 282"
          fill="none"
          stroke="#9a8e78"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.72"
        />
        <path
          d="M380 283 C438 266 520 270 594 282"
          fill="none"
          stroke="rgba(255,255,255,0.34)"
          strokeWidth="2"
          strokeDasharray="12 12"
        />

        <g opacity="0.96" pointerEvents="none">
          <rect x="158" y="190" width="48" height="88" rx="7" fill="#d9f1e8" />
          <rect x="217" y="174" width="58" height="104" rx="7" fill="#c6e8dc" />
          <rect x="290" y="196" width="48" height="82" rx="7" fill="#d9f1e8" />
          <path d="M145 330 L170 307 L195 330 V360 H145 Z" fill="#f2e8d1" />
          <path d="M215 348 L240 325 L265 348 V378 H215 Z" fill="#e8ddc4" />
          <path d="M292 330 L317 307 L342 330 V360 H292 Z" fill="#f2e8d1" />
          <circle cx="250" cy="306" r="22" fill="#7fca95" opacity="0.8" />
        </g>

        <g opacity="0.96" pointerEvents="none">
          <rect x="628" y="184" width="66" height="152" rx="8" fill="#d8e7ee" />
          <rect x="708" y="152" width="72" height="184" rx="8" fill="#c6dce7" />
          <rect x="798" y="208" width="58" height="128" rx="8" fill="#d8e7ee" />
          <path d="M642 360 H842 L820 402 H664 Z" fill="#f3d7a8" />
          <rect x="676" y="370" width="44" height="20" rx="4" fill="#a8642b" />
          <rect x="734" y="370" width="44" height="20" rx="4" fill="#a8642b" />
          <rect x="792" y="370" width="30" height="20" rx="4" fill="#a8642b" />
        </g>

        <g
          className="district-map-control"
          role="button"
          tabIndex={0}
          aria-label="Open Residential Hub"
          onMouseEnter={() => onHover("residential-hub")}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover("residential-hub")}
          onBlur={() => onHover(null)}
          onClick={() => onSelect("residential-hub")}
          onKeyDown={(event) => handleKeyDown(event, "residential-hub")}
          style={{ cursor: "pointer" }}
        >
          <rect x="102" y="112" width="320" height="326" rx="34" fill="transparent" />
          <rect
            x="162"
            y="244"
            width="198"
            height="68"
            rx="18"
            fill="rgba(2,12,18,0.82)"
            stroke="rgba(154,255,223,0.6)"
          />
          <text x="261" y="270" fill="#dffff4" fontSize="21" fontWeight="900" textAnchor="middle">
            RESIDENTIAL HUB
          </text>
          <text x="261" y="293" fill="rgba(223,255,244,0.66)" fontSize="12" fontWeight="700" textAnchor="middle">
            APARTMENTS + LANDED HOMES
          </text>
        </g>

        <g
          className="district-map-control"
          role="button"
          tabIndex={0}
          aria-label="Open Commercial Hub"
          onMouseEnter={() => onHover("commercial-hub")}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover("commercial-hub")}
          onBlur={() => onHover(null)}
          onClick={() => onSelect("commercial-hub")}
          onKeyDown={(event) => handleKeyDown(event, "commercial-hub")}
          style={{ cursor: "pointer" }}
        >
          <rect x="564" y="108" width="338" height="326" rx="34" fill="transparent" />
          <rect
            x="638"
            y="244"
            width="198"
            height="68"
            rx="18"
            fill="rgba(2,12,18,0.82)"
            stroke="rgba(255,224,170,0.6)"
          />
          <text x="737" y="270" fill="#fff1d8" fontSize="21" fontWeight="900" textAnchor="middle">
            COMMERCIAL HUB
          </text>
          <text x="737" y="293" fill="rgba(255,241,216,0.66)" fontSize="12" fontWeight="700" textAnchor="middle">
            OFFICES + RETAIL UNITS
          </text>
        </g>

        <text x="78" y="540" fill="rgba(180,221,205,0.38)" fontSize="15" fontWeight="800" letterSpacing="3">
          UNDEVELOPED FOREST
        </text>
        <text x="712" y="548" fill="rgba(180,221,205,0.38)" fontSize="15" fontWeight="800" letterSpacing="3">
          FUTURE EXPANSION
        </text>
      </svg>
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

  function isActive(type: PropertyType) {
    return activeType === "all" || activeType === type;
  }

  return (
    <div
      style={{
        borderRadius: "24px",
        border: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden",
        background: "rgba(3,15,25,0.82)",
      }}
    >
      <svg
        viewBox="0 0 900 430"
        width="100%"
        role="img"
        aria-label={`${isResidential ? "Residential" : "Commercial"} district detail map`}
        style={{ display: "block", minHeight: isMobile ? "270px" : "380px" }}
      >
        <defs>
          <linearGradient id="detailGround" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isResidential ? "#173b35" : "#3d2b1d"} />
            <stop offset="100%" stopColor="#08131c" />
          </linearGradient>
          <filter id="detailGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="10"
              floodColor={isResidential ? "#79f2ce" : "#ffd18a"}
              floodOpacity="0.54"
            />
          </filter>
        </defs>

        <rect width="900" height="430" fill="url(#detailGround)" />
        <path d="M0 202 H900" stroke="#787c73" strokeWidth="34" opacity="0.72" />
        <path d="M448 0 V430" stroke="#787c73" strokeWidth="30" opacity="0.72" />
        <path d="M0 202 H900" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="14 14" />
        <path d="M448 0 V430" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="14 14" />

        {isResidential ? (
          <>
            <g
              role="button"
              tabIndex={0}
              onClick={() => onChooseType("apartment")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onChooseType("apartment");
              }}
              style={{ cursor: "pointer" }}
              opacity={isActive("apartment") ? 1 : 0.34}
              filter={activeType === "apartment" ? "url(#detailGlow)" : undefined}
            >
              <rect x="70" y="48" width="126" height="118" rx="12" fill="#d5ece4" />
              <rect x="216" y="28" width="142" height="138" rx="12" fill="#c5e2d8" />
              <rect x="510" y="38" width="132" height="128" rx="12" fill="#d5ece4" />
              <rect x="664" y="58" width="146" height="108" rx="12" fill="#c5e2d8" />
              {[92, 122, 152].map((y) => (
                <g key={y}>
                  <rect x="90" y={y} width="18" height="12" rx="2" fill="#4d7880" />
                  <rect x="124" y={y} width="18" height="12" rx="2" fill="#4d7880" />
                  <rect x="158" y={y} width="18" height="12" rx="2" fill="#4d7880" />
                </g>
              ))}
              <rect x="97" y="174" width="234" height="38" rx="14" fill="rgba(3,13,20,0.88)" stroke="rgba(121,242,206,0.5)" />
              <text x="214" y="198" fill="#dffff4" fontSize="18" fontWeight="900" textAnchor="middle">
                APARTMENT DEVELOPMENTS
              </text>
            </g>

            <g
              role="button"
              tabIndex={0}
              onClick={() => onChooseType("landed")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onChooseType("landed");
              }}
              style={{ cursor: "pointer" }}
              opacity={isActive("landed") ? 1 : 0.34}
              filter={activeType === "landed" ? "url(#detailGlow)" : undefined}
            >
              {[
                [72, 270],
                [178, 282],
                [290, 264],
                [538, 276],
                [650, 262],
                [758, 284],
              ].map(([x, y], index) => (
                <g key={index} transform={`translate(${x} ${y})`}>
                  <path d="M0 36 L34 4 L68 36 V82 H0 Z" fill={index % 2 === 0 ? "#f0dfbf" : "#e3cfad"} />
                  <path d="M-5 37 L34 -1 L73 37" fill="none" stroke="#a86748" strokeWidth="10" strokeLinejoin="round" />
                  <rect x="26" y="50" width="16" height="32" fill="#8b6b50" />
                </g>
              ))}
              <rect x="286" y="354" width="328" height="40" rx="14" fill="rgba(3,13,20,0.88)" stroke="rgba(121,242,206,0.5)" />
              <text x="450" y="379" fill="#dffff4" fontSize="18" fontWeight="900" textAnchor="middle">
                LANDED HOME ESTATES
              </text>
            </g>

            <circle cx="450" cy="204" r="60" fill="#4e9b70" opacity="0.68" />
            <circle cx="450" cy="204" r="34" fill="#71bd85" opacity="0.72" />
            <text x="450" y="209" fill="white" fontSize="14" fontWeight="900" textAnchor="middle">
              CENTRAL PARK
            </text>
          </>
        ) : (
          <>
            <g
              role="button"
              tabIndex={0}
              onClick={() => onChooseType("office")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onChooseType("office");
              }}
              style={{ cursor: "pointer" }}
              opacity={isActive("office") ? 1 : 0.34}
              filter={activeType === "office" ? "url(#detailGlow)" : undefined}
            >
              <rect x="70" y="38" width="120" height="140" rx="10" fill="#d7e7ee" />
              <rect x="218" y="20" width="136" height="158" rx="10" fill="#bdd7e3" />
              <rect x="548" y="26" width="128" height="152" rx="10" fill="#d7e7ee" />
              <rect x="704" y="54" width="118" height="124" rx="10" fill="#bdd7e3" />
              {[72, 104, 136].map((y) => (
                <g key={y} fill="#4e7889">
                  <rect x="92" y={y} width="22" height="14" rx="2" />
                  <rect x="128" y={y} width="22" height="14" rx="2" />
                  <rect x="242" y={y - 18} width="24" height="14" rx="2" />
                  <rect x="282" y={y - 18} width="24" height="14" rx="2" />
                </g>
              ))}
              <rect x="102" y="174" width="238" height="40" rx="14" fill="rgba(3,13,20,0.88)" stroke="rgba(255,209,138,0.52)" />
              <text x="221" y="199" fill="#fff1d8" fontSize="18" fontWeight="900" textAnchor="middle">
                OFFICE TOWERS
              </text>
            </g>

            <g
              role="button"
              tabIndex={0}
              onClick={() => onChooseType("retail")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onChooseType("retail");
              }}
              style={{ cursor: "pointer" }}
              opacity={isActive("retail") ? 1 : 0.34}
              filter={activeType === "retail" ? "url(#detailGlow)" : undefined}
            >
              <path d="M106 270 H794 L752 376 H148 Z" fill="#e7c691" />
              <rect x="164" y="292" width="104" height="52" rx="7" fill="#a7612a" />
              <rect x="290" y="292" width="104" height="52" rx="7" fill="#9f5828" />
              <rect x="416" y="292" width="104" height="52" rx="7" fill="#a7612a" />
              <rect x="542" y="292" width="104" height="52" rx="7" fill="#9f5828" />
              <rect x="668" y="292" width="70" height="52" rx="7" fill="#a7612a" />
              <rect x="284" y="368" width="332" height="40" rx="14" fill="rgba(3,13,20,0.88)" stroke="rgba(255,209,138,0.52)" />
              <text x="450" y="393" fill="#fff1d8" fontSize="18" fontWeight="900" textAnchor="middle">
                CENTRAL MALL RETAIL UNITS
              </text>
            </g>

            <circle cx="450" cy="202" r="52" fill="#c1873d" opacity="0.74" />
            <text x="450" y="207" fill="white" fontSize="14" fontWeight="900" textAnchor="middle">
              BUSINESS PLAZA
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

function UnitPreviewIllustration({ property }: { property: PropertyOffering }) {
  const isResidential = property.district_slug === "residential-hub";
  const isTower = property.property_type === "apartment" || property.property_type === "office";

  if (property.preview_image_url) {
    return (
      <img
        src={property.preview_image_url}
        alt={`${property.name} preview`}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "300px",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: isResidential
          ? "linear-gradient(180deg, #bfe8ef 0%, #dff1dc 48%, #7db88c 49%, #4f7e60 100%)"
          : "linear-gradient(180deg, #aecfe2 0%, #d7e1e5 48%, #a98b67 49%, #66584b 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "26px",
          right: "34px",
          width: "58px",
          height: "58px",
          borderRadius: "999px",
          background: "rgba(255,244,177,0.82)",
          boxShadow: "0 0 36px rgba(255,244,177,0.52)",
        }}
      />

      {isTower ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "52px",
            transform: "translateX(-50%)",
            width: property.property_type === "office" ? "210px" : "240px",
            height: property.property_type === "office" ? "230px" : "210px",
            borderRadius: "16px 16px 4px 4px",
            background: property.property_type === "office" ? "#d8e7ee" : "#f0eee7",
            border: "1px solid rgba(14,39,54,0.2)",
            boxShadow: "0 28px 52px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
              padding: "22px",
            }}
          >
            {Array.from({ length: 20 }).map((_, index) => (
              <span
                key={index}
                style={{
                  height: "18px",
                  borderRadius: "3px",
                  background: index % 3 === 0 ? "#ffd18a" : "#5e8999",
                  boxShadow: index % 3 === 0 ? "0 0 12px rgba(255,209,138,0.35)" : "none",
                }}
              />
            ))}
          </div>
        </div>
      ) : property.property_type === "landed" ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "52px",
            transform: "translateX(-50%)",
            width: "330px",
            height: "180px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "48px 18px 0",
              borderRadius: "8px 8px 2px 2px",
              background: "#f3e5ce",
              boxShadow: "0 26px 48px rgba(0,0,0,0.24)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "0",
              right: "0",
              top: "12px",
              height: "74px",
              background: "#9d5e42",
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "142px",
              bottom: 0,
              width: "46px",
              height: "74px",
              background: "#765945",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "64px",
              bottom: "66px",
              width: "48px",
              height: "34px",
              background: "#6ca1b4",
              border: "6px solid #fff4e2",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "64px",
              bottom: "66px",
              width: "48px",
              height: "34px",
              background: "#6ca1b4",
              border: "6px solid #fff4e2",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "52px",
            transform: "translateX(-50%)",
            width: "370px",
            height: "170px",
            borderRadius: "18px 18px 4px 4px",
            background: "#e8c995",
            boxShadow: "0 26px 48px rgba(0,0,0,0.24)",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            padding: "42px 22px 20px",
          }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={index}
              style={{
                borderRadius: "7px",
                background: index % 2 === 0 ? "#a65f2e" : "#86573a",
                border: "4px solid rgba(255,255,255,0.36)",
              }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: "24px",
          bottom: "20px",
          right: "24px",
          padding: "12px 16px",
          borderRadius: "14px",
          background: "rgba(2,10,18,0.74)",
          border: "1px solid rgba(255,255,255,0.18)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "white",
        }}
      >
        <strong>{property.building_name}</strong>
        <span style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.62)", fontSize: "12px" }}>
          Digital preview — final unit appearance may vary
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
              gridTemplateColumns: isCompact ? "1fr" : "1.05fr 0.95fr",
              overflowX: "hidden",
            }}
          >
            <div style={{ minHeight: isMobile ? "280px" : "560px" }}>
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
                      background: isSelected
                        ? `${district.fill}55`
                        : "rgba(255,255,255,0.045)",
                      boxShadow: isSelected ? `0 0 30px ${district.accent}24` : "none",
                    }}
                  >
                    <span style={{ color: district.accent, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900 }}>
                      Built District
                    </span>
                    <strong style={{ display: "block", marginTop: "10px", fontSize: "23px" }}>
                      {district.name}
                    </strong>
                    <span style={{ display: "block", marginTop: "8px", color: "rgba(255,255,255,0.58)", fontSize: "13px", lineHeight: 1.5 }}>
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
                      <div style={{ height: "164px", overflow: "hidden" }}>
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
