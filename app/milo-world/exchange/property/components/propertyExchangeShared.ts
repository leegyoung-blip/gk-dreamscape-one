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
  market_value: number;
  market_rent: number;
  value_index_bps: number;
  rent_index_bps: number;
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

export type PropertyUnit = {
  unit_id: string;
  property_id: string;
  unit_number: number;
  property_name: string;
  district: string;
  property_type: string;
  building_name: string;
  unit_type: string;
  purchase_price: number;
  base_value: number;
  current_value: number;
  base_weekly_rent: number;
  rental_potential: number;
  area_sqm: number;
  bedrooms: number | null;
  preview_image_url: string | null;
  upgrade_spend: number;
  upgrade_level_total: number;
  appeal: number;
  quality: number;
  efficiency: number;
  condition: number;
  upgrade_levels: Record<string, number>;
  acquired_at: string;
};

export type PropertyUpgradeCatalogRow = {
  category: string;
  level: number;
  display_name: string;
  description: string;
  upgrade_cost: number;
  value_bonus_bps: number;
  rent_bonus_bps: number;
  appeal_bonus: number;
  quality_bonus: number;
  efficiency_bonus: number;
  display_order: number;
};


export type PropertyRentalListing = {
  listing_id: string;
  unit_id: string;
  asking_weekly_rent: number;
  market_rent_at_listing: number;
  status: string;
  created_at: string;
  expires_at: string;
};

export type PropertyRentalApplication = {
  application_id: string;
  listing_id: string;
  unit_id: string;
  resident_id: string;
  resident_name: string;
  resident_kind: string;
  occupation: string;
  household_size: number;
  max_weekly_rent: number;
  purchase_budget: number;
  priority_one: string | null;
  priority_two: string | null;
  bio: string;
  proposed_weekly_rent: number;
  lease_weeks: number;
  fit_score: number;
  reliability: number;
  status: string;
  applied_at: string;
  negotiation_round?: number;
  resident_target_rent?: number | null;
  resident_walkaway_rent?: number | null;
};

export type PropertyLease = {
  lease_id: string;
  unit_id: string;
  listing_id: string | null;
  resident_id: string;
  resident_name: string;
  resident_kind: string;
  occupation: string;
  priority_one: string | null;
  priority_two: string | null;
  bio: string;
  weekly_rent: number;
  lease_weeks: number;
  start_date: string;
  end_date: string;
  next_rent_due_on: string | null;
  paid_weeks: number;
  total_rent_paid: number;
  status: string;
  satisfaction: number;
  created_at: string;
};

export type PropertyPurchaseOffer = {
  offer_id: string;
  unit_id: string;
  resident_id: string;
  resident_name: string;
  resident_kind: string;
  occupation: string;
  bio: string;
  offer_amount: number;
  value_at_offer: number;
  status: string;
  created_at: string;
  expires_at: string;
  negotiation_round?: number;
  resident_target_price?: number | null;
  resident_walkaway_price?: number | null;
};

export type PropertyUnitMarketSetting = {
  unit_id: string;
  open_to_purchase_offers: boolean;
  updated_at: string;
};

export type PropertyRentPayment = {
  payment_id: string;
  lease_id: string;
  due_on: string;
  amount: number;
  paid_at: string;
};


export type PropertyMaintenanceIssue = {
  issue_id: string;
  unit_id: string;
  lease_id: string | null;
  issue_code: string;
  title: string;
  description: string;
  severity: "minor" | "moderate" | "major" | "critical" | string;
  full_repair_cost: number;
  quick_fix_cost: number;
  condition_damage: number;
  satisfaction_damage: number;
  status: "open" | "temporary" | "ignored" | "repaired" | "resolved" | string;
  reported_at: string;
  last_action_at: string | null;
  recurrence_due_on: string | null;
  resolved_at: string | null;
  resident_message: string | null;
};

export type PropertyMaintenanceAction = {
  action_id: string;
  unit_id: string;
  issue_id: string | null;
  action: "full_repair" | "quick_fix" | "ignore" | "preventive_service" | "system_resolution" | "tenant_departure" | string;
  cost: number;
  condition_change: number;
  satisfaction_change: number;
  note: string | null;
  created_at: string;
};

export type PropertyMaintenanceStats = {
  open_issues: number;
  urgent_issues: number;
  at_risk_tenants: number;
  average_condition: number;
};

export type PropertyMaintenanceDashboard = {
  issues: PropertyMaintenanceIssue[];
  actions: PropertyMaintenanceAction[];
  stats: PropertyMaintenanceStats;
};

export type PropertyResidentDashboard = {
  rental_listings: PropertyRentalListing[];
  applications: PropertyRentalApplication[];
  leases: PropertyLease[];
  purchase_offers: PropertyPurchaseOffer[];
  market_settings: PropertyUnitMarketSetting[];
  rent_payments: PropertyRentPayment[];
};


export type PropertyConversation = {
  conversation_id: string;
  resident_id: string;
  resident_name: string;
  resident_kind: string;
  occupation: string;
  unit_id: string;
  lease_id: string | null;
  property_name: string;
  unit_number: number;
  subject: string;
  status: string;
  last_message_at: string;
  unread_count: number;
};

export type PropertyMessage = {
  message_id: string;
  conversation_id: string;
  sender_type: "resident" | "landlord" | "system" | string;
  message_kind: string;
  body: string;
  source_type: string | null;
  source_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type PropertyRenewalNegotiation = {
  negotiation_id: string;
  conversation_id: string;
  lease_id: string;
  unit_id: string;
  resident_id: string;
  status: string;
  initiated_by: "resident" | "landlord" | string;
  proposed_weekly_rent: number;
  proposed_lease_weeks: number;
  round_number: number;
  expires_at: string;
  responded_at: string | null;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyLandlordReputation = {
  user_id: string | null;
  score: number;
  completed_leases: number;
  renewals: number;
  early_departures: number;
  full_repairs: number;
  ignored_issues: number;
  average_satisfaction: number;
  updated_at: string | null;
};

export type PropertyCommunicationsDashboard = {
  conversations: PropertyConversation[];
  messages: PropertyMessage[];
  renewal_negotiations: PropertyRenewalNegotiation[];
  reputation: PropertyLandlordReputation;
  unread_count: number;
};

export type PropertyResidentLifeProfile = {
  resident_id: string;
  display_name: string;
  resident_kind: string;
  occupation: string;
  household_size: number;
  monthly_income: number;
  max_weekly_rent: number;
  purchase_budget: number;
  preferred_district: string | null;
  preferred_property_type: string | null;
  reliability: number;
  priority_one: string | null;
  priority_two: string | null;
  bio: string;
  avatar_key: string | null;
  employment_status: string | null;
  employer_name: string | null;
  employer_kind: string | null;
  employer_stock_symbol: string | null;
  employment_stability: number;
  career_level: number;
  life_stage: string | null;
  savings: number;
  financial_pressure: number;
  mobility_score: number;
  move_intent: boolean;
  move_reason: string | null;
  move_intent_since: string | null;
  last_life_event_type: string | null;
  last_life_event_at: string | null;
  life_event_count: number;
  relationship_to_user: string;
  unit_id: string | null;
  lease_id: string | null;
  property_name: string | null;
  unit_number: number | null;
  current_weekly_rent: number | null;
  lease_end_date: string | null;
  satisfaction: number | null;
};

export type PropertyResidentLifeEvent = {
  event_id: string;
  resident_id: string;
  event_type: string;
  title: string;
  description: string;
  income_before: number;
  income_after: number;
  household_before: number;
  household_after: number;
  savings_before: number;
  savings_after: number;
  financial_pressure_before: number;
  financial_pressure_after: number;
  move_intent_after: boolean;
  metadata: Record<string, unknown>;
  occurred_at: string;
};

export type PropertyResidentLifeStats = {
  connected_residents: number;
  active_tenants: number;
  considering_move: number;
  financial_pressure: number;
  recent_life_events: number;
};

export type PropertyResidentLifeDashboard = {
  residents: PropertyResidentLifeProfile[];
  events: PropertyResidentLifeEvent[];
  stats: PropertyResidentLifeStats;
};


export type PropertyMarketSegment = {
  district_slug: DistrictId;
  district_name: string;
  property_type: PropertyType;
  demand_score: number;
  demand_count: number;
  available_supply: number;
  primary_available: number;
  active_rental_listings: number;
  active_resale_listings: number;
  owned_units: number;
  active_leases: number;
  occupancy_rate: number;
  avg_weekly_rent: number;
  avg_rental_ask: number;
  avg_resale_ask: number;
  recent_applications: number;
  recent_purchase_offers: number;
  recent_resale_sales: number;
  value_index_bps: number;
  rent_index_bps: number;
  value_change_30d_bps: number;
  rent_change_30d_bps: number;
  updated_at: string | null;
};

export type PropertyDistrictMarket = {
  district_slug: DistrictId;
  district_name: string;
  demand_score: number;
  demand_count: number;
  available_supply: number;
  primary_available: number;
  active_rental_listings: number;
  active_resale_listings: number;
  owned_units: number;
  active_leases: number;
  occupancy_rate: number;
  avg_weekly_rent: number;
  value_index_bps: number;
  rent_index_bps: number;
  value_change_30d_bps: number;
  rent_change_30d_bps: number;
  recent_applications: number;
  recent_purchase_offers: number;
  recent_resale_sales: number;
  updated_at: string | null;
};

export type PropertyMarketHistoryPoint = {
  snapshot_date: string;
  district_slug: DistrictId;
  district_name: string;
  property_type: PropertyType;
  demand_score: number;
  demand_count: number;
  available_supply: number;
  occupancy_rate: number;
  avg_weekly_rent: number;
  avg_rental_ask: number;
  avg_resale_ask: number;
  recent_applications: number;
  recent_purchase_offers: number;
  recent_resale_sales: number;
  value_index_bps: number;
  rent_index_bps: number;
};

export type PropertyMarketDashboard = {
  districts: PropertyDistrictMarket[];
  segments: PropertyMarketSegment[];
  history: PropertyMarketHistoryPoint[];
  updated_at: string | null;
};



export type PropertyFinanceOption = {
  plan_code: "steady" | "balanced" | "growth" | string;
  display_name: string;
  description: string;
  deposit_amount: number;
  financed_amount: number;
  annual_rate_bps: number;
  term_weeks: number;
  weekly_payment: number;
  estimated_total_interest: number;
  estimated_total_repayment: number;
};

export type PropertyFinanceLoan = {
  loan_id: string;
  unit_id: string;
  property_id: string;
  plan_code: string;
  purchase_price: number;
  deposit_paid: number;
  original_principal: number;
  principal_remaining: number;
  annual_rate_bps: number;
  term_weeks: number;
  scheduled_weekly_payment: number;
  interest_paid: number;
  payments_made: number;
  missed_payments: number;
  next_payment_due_on: string | null;
  status: string;
  created_at: string;
  paid_off_at: string | null;
  property_name: string;
  unit_number: number;
  current_value: number;
  rental_potential: number;
  equity_value: number;
  ltv_bps: number;
};

export type PropertyProtectionPolicy = {
  policy_id: string;
  unit_id: string;
  plan_code: string;
  weekly_premium: number;
  coverage_bps: number;
  next_premium_due_on: string | null;
  status: string;
  started_at: string;
  cancelled_at: string | null;
  property_name: string | null;
  unit_number: number | null;
};

export type PropertyFinancePayment = {
  payment_id: string;
  loan_id: string;
  due_on: string | null;
  amount_due: number;
  amount_paid: number;
  principal_component: number;
  interest_component: number;
  payment_kind: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type PropertyProtectionClaim = {
  claim_id: string;
  policy_id: string;
  unit_id: string;
  maintenance_action_id: string;
  maintenance_issue_id: string | null;
  repair_cost: number;
  reimbursement: number;
  created_at: string;
};

export type PropertyFinanceStats = {
  gross_property_value: number;
  debt_balance: number;
  property_equity: number;
  weekly_debt_payment: number;
  contracted_weekly_rent: number;
  active_loans: number;
  loans_behind: number;
  protected_units: number;
  portfolio_ltv_bps: number;
  finance_health: number;
};

export type PropertyFinanceDashboard = {
  loans: PropertyFinanceLoan[];
  policies: PropertyProtectionPolicy[];
  payments: PropertyFinancePayment[];
  claims: PropertyProtectionClaim[];
  stats: PropertyFinanceStats;
};

export type RecentPropertySale = {
  sale_id: string;
  unit_id: string | null;
  property_id: string;
  unit_number: number | null;
  property_name: string;
  district: string;
  property_type: string;
  buyer_name: string;
  seller_name: string | null;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  sold_at: string;
  sale_source: "primary" | "player_resale" | string;
};

export type PropertyResaleListing = {
  listing_id: string;
  unit_id: string;
  property_id: string;
  unit_number: number;
  property_name: string;
  district: string;
  property_type: string;
  seller_name: string;
  asking_price: number;
  current_value: number;
  primary_listing_price: number;
  rental_potential: number;
  upgrade_spend: number;
  upgrade_level_total: number;
  appeal: number;
  quality: number;
  efficiency: number;
  upgrade_levels: Record<string, number>;
  created_at: string;
  expires_at: string;
};

export type MyPropertyListing = {
  listing_id: string;
  unit_id: string;
  property_id: string;
  unit_number: number;
  property_name: string;
  district: string;
  property_type: string;
  asking_price: number;
  current_value: number;
  primary_listing_price: number;
  rental_potential: number;
  upgrade_spend: number;
  upgrade_level_total: number;
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

export function getPropertyUnitPreviewImage(
  unit: PropertyUnit,
  properties: PropertyOffering[]
) {
  const property = properties.find((item) => item.id === unit.property_id);
  return getPropertyPreviewImage(property) || unit.preview_image_url;
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

export function formatShortDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-SG", {
      day: "numeric",
      month: "short",
      year: "numeric",
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

export function formatPercentFromBps(bps: number) {
  const value = Number(bps || 0) / 100;
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
}

export function getResidentAvatarSrc(avatarKey: string | null | undefined) {
  const clean = String(avatarKey || "").trim().toLowerCase();
  if (!clean) return null;
  return `/milo-world/property-exchange/residents/${clean}.jpg`;
}



export type PropertyBusinessSpaceBusiness = {
  slot_id: number;
  status: string;
  business_type_id: string | null;
  business_name: string;
  approved_budget: number;
  cash: number;
  staff_count: number;
  customer_satisfaction: number;
  business_title: string | null;
  required_property_type: "office" | "retail" | null;
  minimum_area_sqm: number | null;
  target_area_sqm: number | null;
  weekly_budget: number;
  occupancy_id: string | null;
  unit_id: string | null;
  occupancy_mode: "owned" | "leased" | null;
  weekly_space_cost: number | null;
  fit_score: number | null;
  capacity_staff: number | null;
  occupancy_status: string | null;
  property_name: string | null;
  unit_number: number | null;
  district: string | null;
  current_value: number | null;
  rental_potential: number | null;
  economy_health?: number | null;
  growth_state?: string | null;
  hiring_status?: string | null;
  named_staff_count?: number | null;
  space_pressure?: boolean | null;
};

export type PropertyBusinessSpaceUnit = {
  unit_id: string;
  property_id: string;
  unit_number: number;
  property_name: string;
  district: string;
  property_type: "office" | "retail";
  area_sqm: number;
  current_value: number;
  rental_potential: number;
  appeal: number;
  quality: number;
  efficiency: number;
  occupied: boolean;
  listed: boolean;
};

export type PropertyBusinessSpaceListing = {
  listing_id: string;
  unit_id: string;
  owner_user_id: string;
  asking_weekly_rent: number;
  min_lease_weeks: number;
  max_lease_weeks: number;
  expires_at: string;
  property_name: string;
  district: string;
  property_type: "office" | "retail";
  area_sqm: number;
  appeal: number;
  quality: number;
  efficiency: number;
  rental_potential: number;
  owner_name: string;
};

export type PropertyBusinessSpaceApplication = {
  id: string;
  listing_id: string;
  unit_id: string;
  landlord_user_id: string;
  business_user_id: string;
  business_slot_id: number;
  business_name: string;
  business_type_id: string;
  proposed_weekly_rent: number;
  lease_weeks: number;
  fit_score: number;
  status: string;
  created_at: string;
  responded_at: string | null;
  property_name: string;
  district: string;
  property_type: string;
  area_sqm: number;
  asking_weekly_rent: number;
};

export type PropertyBusinessSpaceOccupancy = {
  id: string;
  unit_id: string;
  landlord_user_id: string;
  business_user_id: string;
  business_slot_id: number;
  business_name: string;
  business_type_id: string;
  occupancy_mode: "owned" | "leased";
  weekly_space_cost: number;
  lease_weeks: number;
  start_date: string;
  end_date: string | null;
  next_cost_due_on: string;
  paid_weeks: number;
  fit_score: number;
  capacity_staff: number;
  status: string;
  arrears_count: number;
  property_name: string;
  district: string;
  property_type: string;
  area_sqm: number;
};


export type PropertyNpcBusinessSpaceApplication = {
  id: string;
  listing_id: string;
  unit_id: string;
  landlord_user_id: string;
  business_resident_id: string;
  business_name: string;
  business_type_id: string;
  proposed_weekly_rent: number;
  lease_weeks: number;
  fit_score: number;
  status: string;
  created_at: string;
  responded_at: string | null;
  property_name: string;
  district: string;
  property_type: string;
  area_sqm: number;
  asking_weekly_rent: number;
  avatar_key: string | null;
  growth_state: string | null;
  health_score: number | null;
};

export type PropertyNpcBusinessSpaceOccupancy = {
  id: string;
  unit_id: string;
  landlord_user_id: string;
  business_resident_id: string;
  business_name: string;
  business_type_id: string;
  weekly_space_cost: number;
  lease_weeks: number;
  start_date: string;
  end_date: string;
  next_cost_due_on: string;
  paid_weeks: number;
  fit_score: number;
  capacity_staff: number;
  status: string;
  arrears_count: number;
  property_name: string;
  district: string;
  property_type: string;
  area_sqm: number;
  avatar_key: string | null;
  health_score: number | null;
  growth_state: string | null;
};

export type PropertyNpcBusinessSummary = {
  resident_id: string;
  business_name: string;
  business_type_id: string;
  required_property_type: string;
  health_score: number;
  growth_state: string;
  hiring_status: string;
  staff_count: number;
  named_staff_count: number;
  avatar_key: string | null;
  has_space: boolean;
  space_pressure: boolean;
};

export type PropertyBusinessSpaceStats = {
  running_businesses: number;
  businesses_with_space: number;
  commercial_units_owned: number;
  spaces_listed: number;
  incoming_applications: number;
  dreamscape_business_applications?: number;
};

export type PropertyBusinessSpaceDashboard = {
  businesses: PropertyBusinessSpaceBusiness[];
  owned_commercial_units: PropertyBusinessSpaceUnit[];
  market_listings: PropertyBusinessSpaceListing[];
  applications: PropertyBusinessSpaceApplication[];
  npc_applications: PropertyNpcBusinessSpaceApplication[];
  occupancies: PropertyBusinessSpaceOccupancy[];
  npc_occupancies: PropertyNpcBusinessSpaceOccupancy[];
  npc_businesses: PropertyNpcBusinessSummary[];
  stats: PropertyBusinessSpaceStats;
};


export type MiloEmploymentCompany = {
  symbol: string;
  company_name: string;
  sector: string;
  health_score: number;
  hiring_index: number;
  workforce_sentiment: number;
  hiring_status: string;
  salary_index_bps: number;
  base_headcount: number;
  named_employee_count: number;
  avg_named_employee_income: number;
  recent_promotions: number;
  recent_hires: number;
  recent_layoffs: number;
  latest_published_headline: string | null;
  latest_published_impact: string | null;
  current_price: number;
  previous_price: number;
  description: string;
  updated_at: string | null;
};

export type MiloEmploymentResident = {
  resident_id: string;
  slug: string;
  display_name: string;
  avatar_key: string | null;
  resident_kind: string;
  occupation: string;
  employment_status: string | null;
  employer_name: string | null;
  employer_kind: string | null;
  employer_stock_symbol: string | null;
  employment_stability: number;
  career_level: number;
  monthly_income: number;
  max_weekly_rent: number;
  purchase_budget: number;
  financial_pressure: number;
  move_intent: boolean;
  last_life_event_type: string | null;
  last_life_event_at: string | null;
};

export type MiloEmploymentEvent = {
  event_id: string;
  resident_id: string;
  display_name: string;
  avatar_key: string | null;
  event_type: string;
  title: string;
  description: string;
  income_before: number;
  income_after: number;
  metadata: Record<string, unknown>;
  occurred_at: string;
};

export type MiloEmploymentStats = {
  listed_companies: number;
  listed_company_workers: number;
  private_or_community_workers: number;
  self_employed: number;
  studying: number;
  between_jobs: number;
};

export type MiloEmploymentDashboard = {
  companies: MiloEmploymentCompany[];
  residents: MiloEmploymentResident[];
  events: MiloEmploymentEvent[];
  stats: MiloEmploymentStats;
};

export type PropertyTabStyles = {
  glassPanel: CSSProperties;
  primaryButton: CSSProperties;
  secondaryButton: CSSProperties;
};
