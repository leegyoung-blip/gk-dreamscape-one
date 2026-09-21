import type { CSSProperties } from "react";

export type DistrictId = "residential-hub" | "commercial-hub";
export type PropertyType = "apartment" | "landed" | "office" | "retail";

export type DistrictDefinition = {
  id: DistrictId;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  fill: string;
  propertyTypes: PropertyType[];
};

export type PropertyOffering = {
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

export type PropertyHolding = {
  id: string;
  user_id: string;
  property_id: string;
  quantity: number;
  purchase_price: number;
  created_at: string;
  updated_at: string;
};

export type RecentPropertySale = {
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

export type PropertyRentPayout = {
  week_start: string;
  amount: number;
  paid_at: string;
};

export type PropertyResaleListing = {
  listing_id: string;
  property_id: string;
  property_name: string;
  district: string;
  property_type: string;
  seller_name: string;
  asking_price: number;
  current_value: number;
  primary_listing_price: number;
  expires_at: string;
};

export type MyPropertyListing = {
  listing_id: string;
  property_id: string;
  property_name: string;
  district: string;
  property_type: string;
  asking_price: number;
  current_value: number;
  primary_listing_price: number;
  status: "active" | "sold" | "cancelled" | "expired" | string;
  created_at: string;
  expires_at: string;
  sold_at: string | null;
  buyer_name: string | null;
};

export const DISTRICTS: DistrictDefinition[] = [
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

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Apartment Units",
  landed: "Landed Properties",
  office: "Office Units",
  retail: "Retail Units",
};

const PROPERTY_ASSET_BASE = "/milo-world/property-exchange";

export const PROPERTY_MAP_IMAGES: Record<"full" | DistrictId, string> = {
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

export function getDistrictImage(districtId: DistrictId) {
  return PROPERTY_MAP_IMAGES[districtId];
}

export function getPropertyPreviewImage(property: PropertyOffering | undefined) {
  if (!property) return null;

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
  if (searchValue.includes("garden terrace")) return PROPERTY_PREVIEW_IMAGES.gardenTerrace;
  if (searchValue.includes("lakeview")) return PROPERTY_PREVIEW_IMAGES.lakeview;
  if (searchValue.includes("commerce tower")) return PROPERTY_PREVIEW_IMAGES.commerceTower;
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

export function formatNumber(value: number) {
  return Math.round(Number(value || 0)).toLocaleString();
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-SG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type PropertyTabStyles = {
  glassPanel: CSSProperties;
  primaryButton: CSSProperties;
  secondaryButton: CSSProperties;
};
