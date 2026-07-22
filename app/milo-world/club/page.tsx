"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ViewName =
  | "storefronts"
  | "businesses"
  | "funding"
  | "setup"
  | "analytics"
  | "market"
  | "sell"
  | "talk";

type SlotStatus = "empty" | "setup" | "running";
type TierId = "budget" | "balanced" | "premium";
type SimulationSpeed = 0 | 1 | 24 | 168 | 1440;
type FundingStep = "personal" | "milo";
type CycleStatus = "running" | "awaiting-allocation" | "settled";
type SetupCategoryId =
  | "location"
  | "equipment"
  | "stock"
  | "staff"
  | "marketing";

type SetupSelections = Record<SetupCategoryId, TierId>;

type OperatingControls = {
  stockUnits: number;
  staffCount: number;
  averageMonthlySalary: number;
  onlineMarketingBudget: number;
  offlineMarketingBudget: number;
};

type SimulationEventRecord = {
  id: string;
  day: number;
  title: string;
  description: string;
  impact: string;
  tone: "positive" | "negative" | "neutral";
  createdAt: string;
};

type ScheduledBusinessEvent = {
  id: string;
  day: number;
  kind: "market" | "supply" | "staff-review" | "marketing-review";
};

type CycleHistoryRecord = {
  cycleNumber: number;
  completedDateSg: string;
  revenue: number;
  expenses: number;
  profit: number;
  reinvested: number;
  dividendPool: number;
  userDividend: number;
  miloDividend: number;
};

type IndustryId =
  | "retail"
  | "ecommerce"
  | "food"
  | "entertainment"
  | "hospitality"
  | "auto-services"
  | "auto-sales";

type MarketPoint = {
  monthIndex: number;
  label: string;
  demand: number;
  supply: number;
  outlook: number;
};

type MarketSnapshot = {
  industryId: IndustryId;
  industryName: string;
  demandIndex: number;
  supplyIndex: number;
  marketBalance: number;
  annualGrowth: number;
  outlookScore: number;
  outlookLabel: "Weak" | "Cautious" | "Stable" | "Positive" | "Strong";
  volatility: "Low" | "Moderate" | "High";
  driver: string;
  risk: string;
  points: MarketPoint[];
};

type AnalystReport = {
  id: string;
  createdAt: string;
  cycleNumber: number;
  analystFee: number;
  valuation: number;
  assetValue: number;
  earningsValue: number;
  brandValue: number;
  annualizedRevenue: number;
  annualizedProfit: number;
  earningsMultiple: number;
  marketMultiplier: number;
  marketOutlook: MarketSnapshot["outlookLabel"];
  summary: string;
};

type SaleOffer = {
  id: string;
  buyerName: string;
  amount: number;
  cycleNumber: number;
  createdAt: string;
  outlookLabel: MarketSnapshot["outlookLabel"];
  note: string;
};

type SaleListing = {
  status: "unlisted" | "listed";
  listedPrice: number;
  listedAt: string | null;
  listedCycle: number | null;
  analystReport: AnalystReport | null;
  offers: SaleOffer[];
  offersGeneratedCycle: number | null;
};

type BusinessOption = {
  id: string;
  title: string;
  category: string;
  industryId: IndustryId;
  icon: string;
  minCapital: number;
  maxCapital: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  description: string;
  mainRisk: string;
  dailyRevenueRate: number;
  averageOrderValue: number;
};

type TierDefinition = {
  id: TierId;
  label: string;
  shortLabel: string;
  setupFraction: number;
  monthlyFraction: number;
  qualityScore: number;
  description: string;
  benefit: string;
  tradeOff: string;
};

type SetupCategory = {
  id: SetupCategoryId;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  options: TierDefinition[];
};

type BusinessSlot = {
  id: 1 | 2 | 3;
  status: SlotStatus;
  businessTypeId: string | null;
  businessName: string;
  approvedBudget: number;
  miloInvestment: number;
  personalContribution: number;
  miloOwnership: number;
  userOwnership: number;
  ownershipTransferred: boolean;
  selections: SetupSelections;
  stockUnits: number;
  staffCount: number;
  averageMonthlySalary: number;
  onlineMarketingBudget: number;
  offlineMarketingBudget: number;
  demandMomentum: number;
  eventLog: SimulationEventRecord[];
  appliedEventIds: string[];
  setupSpend: number;
  cash: number;
  launchedAt: string | null;
  simulatedMinutes: number;
  simulationSpeed: SimulationSpeed;
  revenue: number;
  expenses: number;
  sales: number;
  customerSatisfaction: number;
  cycleNumber: number;
  cycleSimulatedMinutes: number;
  cycleRevenue: number;
  cycleExpenses: number;
  cycleProfit: number;
  cycleStatus: CycleStatus;
  lastCycleCompletedDateSg: string | null;
  cycleHistory: CycleHistoryRecord[];
  saleListing: SaleListing;
  lastUpdatedAt: string | null;
};

type StockRow = {
  symbol: string;
  current_price: number;
};

type StockHoldingRow = {
  symbol: string;
  quantity: number;
};

type PropertyRow = {
  id: string;
  current_value: number;
};

type PropertyHoldingRow = {
  property_id: string;
  quantity: number;
};

type ProfileAssetBreakdown = {
  cash: number;
  property: number;
  stocks: number;
};

type MiloClubProfile = {
  role: string | null;
  milos_club_member: boolean | null;
  milos_club_welcome_offer_claimed: boolean | null;
  milos_club_welcome_offer_seen_at: string | null;
};

const STORAGE_VERSION = "milo-business-builder-v2";
const BUSINESS_PROGRESS_TABLE = "milo_business_builder_progress";
const CYCLE_DAYS = 30;
const CYCLE_MINUTES = CYCLE_DAYS * 1440;
const OFFLINE_SIMULATION_SPEED: SimulationSpeed = 168;
const ANALYST_FEE = 100;
const EVENT_TIMELINE_DAYS = 3650;
const DREAM_SHOP_TOKEN_URL = "/milo-world/dream-shop?popup=token-packs";
const WELCOME_TOKEN_OFFER_URL =
  "https://gurukidspro.com/products/milos-business-builder-welcome-offer";

const DEFAULT_SELECTIONS: SetupSelections = {
  location: "balanced",
  equipment: "balanced",
  stock: "balanced",
  staff: "balanced",
  marketing: "balanced",
};

const BUSINESS_OPTIONS: BusinessOption[] = [
  {
    id: "popup-retail",
    industryId: "retail",
    title: "Pop-up Retail Shop",
    category: "Starter Retail",
    icon: "▤",
    minCapital: 8000,
    maxCapital: 15000,
    difficulty: 1,
    description:
      "Sell a focused range of affordable products from a compact storefront.",
    mainRisk: "Slow-moving stock",
    dailyRevenueRate: 0.012,
    averageOrderValue: 28,
  },
  {
    id: "specialty-retail",
    industryId: "retail",
    title: "Specialty Retail Store",
    category: "Retail",
    icon: "◇",
    minCapital: 15000,
    maxCapital: 25000,
    difficulty: 2,
    description:
      "Build a stronger brand around a carefully selected product category.",
    mainRisk: "Overbuying premium inventory",
    dailyRevenueRate: 0.011,
    averageOrderValue: 46,
  },
  {
    id: "online-merch",
    industryId: "ecommerce",
    title: "Online Merchandise Studio",
    category: "E-commerce",
    icon: "⌘",
    minCapital: 20000,
    maxCapital: 35000,
    difficulty: 2,
    description:
      "Manage products, fulfilment, advertising and customer orders online.",
    mainRisk: "High marketing spend",
    dailyRevenueRate: 0.0105,
    averageOrderValue: 52,
  },
  {
    id: "snack-bar",
    industryId: "food",
    title: "Snack Bar",
    category: "Food & Beverage",
    icon: "◒",
    minCapital: 25000,
    maxCapital: 40000,
    difficulty: 2,
    description:
      "Balance food costs, service speed, waste and customer demand.",
    mainRisk: "Food waste and low margins",
    dailyRevenueRate: 0.0115,
    averageOrderValue: 14,
  },
  {
    id: "cafe",
    industryId: "food",
    title: "Neighbourhood Café",
    category: "Food & Beverage",
    icon: "◉",
    minCapital: 35000,
    maxCapital: 50000,
    difficulty: 3,
    description:
      "Run a welcoming café with equipment, staff and repeat customers.",
    mainRisk: "Rent and staffing costs",
    dailyRevenueRate: 0.0102,
    averageOrderValue: 19,
  },
  {
    id: "gaming-lounge",
    industryId: "entertainment",
    title: "Gaming Lounge",
    category: "Entertainment",
    icon: "⌁",
    minCapital: 50000,
    maxCapital: 70000,
    difficulty: 3,
    description:
      "Manage equipment capacity, hourly pricing and customer experience.",
    mainRisk: "Equipment and utility costs",
    dailyRevenueRate: 0.0095,
    averageOrderValue: 32,
  },
  {
    id: "restaurant",
    industryId: "hospitality",
    title: "Full-service Restaurant",
    category: "Hospitality",
    icon: "✦",
    minCapital: 70000,
    maxCapital: 120000,
    difficulty: 4,
    description:
      "Coordinate a larger premises, kitchen, team and service operation.",
    mainRisk: "High fixed operating costs",
    dailyRevenueRate: 0.0087,
    averageOrderValue: 38,
  },
  {
    id: "auto-workshop",
    industryId: "auto-services",
    title: "Automobile Workshop",
    category: "Automobile Services",
    icon: "⚙",
    minCapital: 100000,
    maxCapital: 150000,
    difficulty: 4,
    description:
      "Invest in specialist equipment, skilled staff and workshop capacity.",
    mainRisk: "Expensive equipment and payroll",
    dailyRevenueRate: 0.0078,
    averageOrderValue: 240,
  },
  {
    id: "car-dealership",
    industryId: "auto-sales",
    title: "Car Dealership",
    category: "Automobile Sales",
    icon: "◆",
    minCapital: 150000,
    maxCapital: 200000,
    difficulty: 5,
    description:
      "Manage high-value inventory, facilities, sales staff and financing risk.",
    mainRisk: "Capital tied up in inventory",
    dailyRevenueRate: 0.0068,
    averageOrderValue: 1800,
  },
];

type IndustryMarketDefinition = {
  name: string;
  baseDemand: number;
  baseSupply: number;
  annualGrowth: number;
  volatility: number;
  earningsMultiple: number;
  driver: string;
  risk: string;
};

const INDUSTRY_MARKETS: Record<IndustryId, IndustryMarketDefinition> = {
  retail: {
    name: "Local Retail",
    baseDemand: 63,
    baseSupply: 58,
    annualGrowth: 2.4,
    volatility: 5,
    earningsMultiple: 1.55,
    driver: "Footfall, product relevance and repeat customers",
    risk: "Crowded competition and slow-moving inventory",
  },
  ecommerce: {
    name: "Online Commerce",
    baseDemand: 70,
    baseSupply: 66,
    annualGrowth: 6.8,
    volatility: 8,
    earningsMultiple: 1.9,
    driver: "Digital demand, fulfilment speed and advertising efficiency",
    risk: "Rising advertising costs and easy market entry",
  },
  food: {
    name: "Food & Beverage",
    baseDemand: 72,
    baseSupply: 69,
    annualGrowth: 3.2,
    volatility: 7,
    earningsMultiple: 1.45,
    driver: "Repeat visits, menu appeal and service consistency",
    risk: "Food waste, labour costs and intense local competition",
  },
  entertainment: {
    name: "Leisure & Entertainment",
    baseDemand: 61,
    baseSupply: 52,
    annualGrowth: 5.1,
    volatility: 10,
    earningsMultiple: 1.75,
    driver: "Trends, community interest and customer experience",
    risk: "Fast-changing preferences and expensive equipment",
  },
  hospitality: {
    name: "Hospitality & Dining",
    baseDemand: 66,
    baseSupply: 63,
    annualGrowth: 3.7,
    volatility: 9,
    earningsMultiple: 1.5,
    driver: "Location, service quality and special occasions",
    risk: "High fixed costs and demand swings",
  },
  "auto-services": {
    name: "Automobile Services",
    baseDemand: 59,
    baseSupply: 48,
    annualGrowth: 2.1,
    volatility: 5,
    earningsMultiple: 1.7,
    driver: "Vehicle servicing needs, trust and technical capability",
    risk: "Specialist labour and equipment replacement costs",
  },
  "auto-sales": {
    name: "Automobile Sales",
    baseDemand: 54,
    baseSupply: 57,
    annualGrowth: 1.4,
    volatility: 12,
    earningsMultiple: 1.25,
    driver: "Consumer confidence, financing conditions and inventory mix",
    risk: "Large amounts of capital tied up in vehicles",
  },
};

const MARKET_BUYERS: Record<IndustryId, string[]> = {
  retail: ["Cedar Street Retail", "Northstar Brands", "Harbourfront Holdings"],
  ecommerce: ["Orbit Commerce Group", "Cloudcart Ventures", "Nova Fulfilment Partners"],
  food: ["Ember Dining Group", "Golden Spoon Ventures", "Neighbourhood Foods"],
  entertainment: ["Arcade District Co.", "Pulse Leisure Group", "Level Up Holdings"],
  hospitality: ["Grand Table Partners", "Hearthstone Hospitality", "Crescent Dining Group"],
  "auto-services": ["TorqueWorks Group", "RoadReady Partners", "Precision Motor Holdings"],
  "auto-sales": ["Velocity Auto Group", "Summit Motors", "Apex Mobility Holdings"],
};

const SETUP_CATEGORIES: SetupCategory[] = [
  {
    id: "location",
    label: "Location, Rent & Utilities",
    shortLabel: "Location",
    icon: "⌂",
    description:
      "A better location can attract more customers, but rent and utilities continue every month.",
    options: [
      {
        id: "budget",
        label: "Basic Site",
        shortLabel: "Budget",
        setupFraction: 0.14,
        monthlyFraction: 0.025,
        qualityScore: 1,
        description: "A smaller unit in a quieter area with basic utilities.",
        benefit: "Preserves more opening cash",
        tradeOff: "Lower walk-in demand",
      },
      {
        id: "balanced",
        label: "Standard Site",
        shortLabel: "Balanced",
        setupFraction: 0.2,
        monthlyFraction: 0.04,
        qualityScore: 2,
        description: "A visible, practical location with reliable facilities.",
        benefit: "Balanced demand and rent",
        tradeOff: "Moderate monthly commitment",
      },
      {
        id: "premium",
        label: "Prime Site",
        shortLabel: "Premium",
        setupFraction: 0.29,
        monthlyFraction: 0.06,
        qualityScore: 3,
        description: "A high-traffic location with stronger visibility and utilities.",
        benefit: "Higher customer traffic",
        tradeOff: "Expensive rent every month",
      },
    ],
  },
  {
    id: "equipment",
    label: "Equipment",
    shortLabel: "Equipment",
    icon: "⚙",
    description:
      "Better equipment can improve capacity and reliability, but it uses more of the starting budget.",
    options: [
      {
        id: "budget",
        label: "Entry Equipment",
        shortLabel: "Budget",
        setupFraction: 0.13,
        monthlyFraction: 0.003,
        qualityScore: 1,
        description: "Basic equipment that can begin operating immediately.",
        benefit: "Low initial spending",
        tradeOff: "More breakdown risk",
      },
      {
        id: "balanced",
        label: "Reliable Equipment",
        shortLabel: "Balanced",
        setupFraction: 0.2,
        monthlyFraction: 0.005,
        qualityScore: 2,
        description: "Reliable equipment with reasonable capacity and lifespan.",
        benefit: "Steady performance",
        tradeOff: "Moderate upfront cost",
      },
      {
        id: "premium",
        label: "Professional Equipment",
        shortLabel: "Premium",
        setupFraction: 0.29,
        monthlyFraction: 0.008,
        qualityScore: 3,
        description: "High-capacity equipment built for stronger operations.",
        benefit: "Higher capacity and reliability",
        tradeOff: "Large initial investment",
      },
    ],
  },
  {
    id: "stock",
    label: "Opening Stock & Supplies",
    shortLabel: "Stock",
    icon: "▦",
    description:
      "More stock can support sales, but unsold stock leaves less cash available for the business.",
    options: [
      {
        id: "budget",
        label: "Lean Opening Stock",
        shortLabel: "Budget",
        setupFraction: 0.1,
        monthlyFraction: 0,
        qualityScore: 1,
        description: "A smaller range with careful purchasing and limited backup stock.",
        benefit: "Less cash tied up",
        tradeOff: "Stock may run out",
      },
      {
        id: "balanced",
        label: "Planned Opening Stock",
        shortLabel: "Balanced",
        setupFraction: 0.15,
        monthlyFraction: 0,
        qualityScore: 2,
        description: "A balanced range with enough stock for a normal launch.",
        benefit: "Good product availability",
        tradeOff: "Requires demand planning",
      },
      {
        id: "premium",
        label: "Extensive Opening Stock",
        shortLabel: "Premium",
        setupFraction: 0.22,
        monthlyFraction: 0,
        qualityScore: 3,
        description: "A broad range with higher-quality supplies and more backup stock.",
        benefit: "Strong availability and choice",
        tradeOff: "More money trapped in stock",
      },
    ],
  },
  {
    id: "staff",
    label: "Staff",
    shortLabel: "Staff",
    icon: "◌",
    description:
      "More experienced staff improve service and capacity, but wages are paid even during quiet periods.",
    options: [
      {
        id: "budget",
        label: "Small Starter Team",
        shortLabel: "Budget",
        setupFraction: 0.08,
        monthlyFraction: 0.02,
        qualityScore: 1,
        description: "A small team with limited coverage and basic training.",
        benefit: "Lower monthly payroll",
        tradeOff: "Slower service at busy times",
      },
      {
        id: "balanced",
        label: "Core Team",
        shortLabel: "Balanced",
        setupFraction: 0.14,
        monthlyFraction: 0.04,
        qualityScore: 2,
        description: "A practical team with enough coverage for normal demand.",
        benefit: "Reliable service capacity",
        tradeOff: "Regular payroll commitment",
      },
      {
        id: "premium",
        label: "Experienced Team",
        shortLabel: "Premium",
        setupFraction: 0.2,
        monthlyFraction: 0.07,
        qualityScore: 3,
        description: "A larger, experienced team ready to handle stronger demand.",
        benefit: "Faster service and satisfaction",
        tradeOff: "High monthly wages",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    shortLabel: "Marketing",
    icon: "↗",
    description:
      "Marketing can attract customers, but spending too much before the business is ready can waste cash.",
    options: [
      {
        id: "budget",
        label: "Local Launch",
        shortLabel: "Budget",
        setupFraction: 0.05,
        monthlyFraction: 0.006,
        qualityScore: 1,
        description: "A simple launch using local and organic promotion.",
        benefit: "Low marketing cost",
        tradeOff: "Slower customer growth",
      },
      {
        id: "balanced",
        label: "Focused Campaign",
        shortLabel: "Balanced",
        setupFraction: 0.1,
        monthlyFraction: 0.014,
        qualityScore: 2,
        description: "A targeted campaign across a few suitable channels.",
        benefit: "Steady customer awareness",
        tradeOff: "Needs regular review",
      },
      {
        id: "premium",
        label: "Major Launch Campaign",
        shortLabel: "Premium",
        setupFraction: 0.17,
        monthlyFraction: 0.025,
        qualityScore: 3,
        description: "A large launch campaign designed to build awareness quickly.",
        benefit: "Faster demand growth",
        tradeOff: "High cost before results are proven",
      },
    ],
  },
];

function createEmptySlot(id: 1 | 2 | 3): BusinessSlot {
  return {
    id,
    status: "empty",
    businessTypeId: null,
    businessName: "",
    approvedBudget: 0,
    miloInvestment: 0,
    personalContribution: 0,
    miloOwnership: 0,
    userOwnership: 0,
    ownershipTransferred: false,
    selections: { ...DEFAULT_SELECTIONS },
    stockUnits: 0,
    staffCount: 0,
    averageMonthlySalary: 0,
    onlineMarketingBudget: 0,
    offlineMarketingBudget: 0,
    demandMomentum: 0,
    eventLog: [],
    appliedEventIds: [],
    setupSpend: 0,
    cash: 0,
    launchedAt: null,
    simulatedMinutes: 0,
    simulationSpeed: 1,
    revenue: 0,
    expenses: 0,
    sales: 0,
    customerSatisfaction: 68,
    cycleNumber: 1,
    cycleSimulatedMinutes: 0,
    cycleRevenue: 0,
    cycleExpenses: 0,
    cycleProfit: 0,
    cycleStatus: "running",
    lastCycleCompletedDateSg: null,
    cycleHistory: [],
    saleListing: {
      status: "unlisted",
      listedPrice: 0,
      listedAt: null,
      listedCycle: null,
      analystReport: null,
      offers: [],
      offersGeneratedCycle: null,
    },
    lastUpdatedAt: null,
  };
}

function createDefaultSlots(): BusinessSlot[] {
  return [createEmptySlot(1), createEmptySlot(2), createEmptySlot(3)];
}

function getBusiness(businessTypeId: string | null) {
  return BUSINESS_OPTIONS.find((business) => business.id === businessTypeId);
}

function getTierOption(category: SetupCategory, tierId: TierId) {
  return category.options.find((option) => option.id === tierId)!;
}

function formatMoney(value: number) {
  const formatted = new Intl.NumberFormat("en-SG", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));

  return `${formatted} DT`;
}

function formatCompactMoney(value: number) {
  return new Intl.NumberFormat("en-SG", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.round(value));
}

function formatDate(value: string | null) {
  if (!value) return "Not launched";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getSingaporeDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

function getNextSingaporeDayStartIso(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return new Date().toISOString();

  const nextSingaporeMidnightUtc =
    Date.UTC(year, month - 1, day + 1, 0, 0, 0) - 8 * 60 * 60 * 1000;
  return new Date(nextSingaporeMidnightUtc).toISOString();
}

function getOwnershipForContributions(
  personalContribution: number,
  miloInvestment: number,
) {
  const personal = Math.max(0, personalContribution);
  const milo = Math.max(0, miloInvestment);
  const total = personal + milo;

  if (total <= 0) {
    return { miloOwnership: 0, userOwnership: 0 };
  }

  return {
    miloOwnership: milo / total,
    userOwnership: personal / total,
  };
}

function getSetupCostBasis(slot: Pick<BusinessSlot, "businessTypeId" | "approvedBudget">) {
  const business = getBusiness(slot.businessTypeId);
  if (!business) return Math.max(0, slot.approvedBudget);
  return clamp(slot.approvedBudget, business.minCapital, business.maxCapital);
}

function getRecommendedSalary(slot: Pick<BusinessSlot, "businessTypeId">) {
  const business = getBusiness(slot.businessTypeId);
  return 1800 + (business?.difficulty || 1) * 260;
}

function getRecommendedMarketingBudget(
  slot: Pick<BusinessSlot, "businessTypeId" | "approvedBudget">,
) {
  const business = getBusiness(slot.businessTypeId);
  const basis = business
    ? clamp(slot.approvedBudget, business.minCapital, business.maxCapital)
    : slot.approvedBudget;
  return Math.max(150, basis * (0.012 + (business?.difficulty || 1) * 0.002));
}

function getStockPrices(slot: Pick<BusinessSlot, "businessTypeId" | "cycleNumber">) {
  const business = getBusiness(slot.businessTypeId);
  const base = Math.max(2, (business?.averageOrderValue || 20) * 0.36);
  const marketNoise = seededNoise(
    `${business?.industryId || "retail"}-${Math.max(1, slot.cycleNumber)}-stock-price`,
  );
  const buyPrice = Math.max(1, Math.round(base * (1 + marketNoise * 0.08)));
  const sellPrice = Math.max(1, Math.round(buyPrice * 0.7));
  return { buyPrice, sellPrice };
}

function getInitialOperatingControls(
  slot: Pick<
    BusinessSlot,
    "businessTypeId" | "approvedBudget" | "selections" | "cycleNumber"
  >,
): OperatingControls {
  const business = getBusiness(slot.businessTypeId);
  const basis = getSetupCostBasis(slot);

  if (!business || basis <= 0) {
    return {
      stockUnits: 0,
      staffCount: 0,
      averageMonthlySalary: 0,
      onlineMarketingBudget: 0,
      offlineMarketingBudget: 0,
    };
  }

  const stockOption = getTierOption(
    SETUP_CATEGORIES.find((category) => category.id === "stock")!,
    slot.selections.stock,
  );
  const staffOption = getTierOption(
    SETUP_CATEGORIES.find((category) => category.id === "staff")!,
    slot.selections.staff,
  );
  const marketingOption = getTierOption(
    SETUP_CATEGORIES.find((category) => category.id === "marketing")!,
    slot.selections.marketing,
  );
  const { buyPrice } = getStockPrices(slot);
  const stockBudget = basis * stockOption.setupFraction;
  const totalMarketing = Math.max(0, basis * marketingOption.monthlyFraction);
  const staffCount = Math.max(1, Math.round((business?.difficulty || 1) * 0.6 + staffOption.qualityScore));

  return {
    stockUnits: Math.max(12, Math.floor(stockBudget / Math.max(1, buyPrice))),
    staffCount,
    averageMonthlySalary: Math.round(
      getRecommendedSalary(slot) * (0.75 + staffOption.qualityScore * 0.13),
    ),
    onlineMarketingBudget: Math.round(totalMarketing * 0.62),
    offlineMarketingBudget: Math.round(totalMarketing * 0.38),
  };
}

function normalizeSlot(
  savedSlot: Partial<BusinessSlot> | undefined,
  id: 1 | 2 | 3,
): BusinessSlot {
  const base = createEmptySlot(id);
  if (!savedSlot) return base;

  const approvedBudget = Number(savedSlot.approvedBudget || 0);
  const miloInvestment = Number(
    savedSlot.miloInvestment || approvedBudget || 0,
  );
  const personalContribution = Number(savedSlot.personalContribution || 0);
  const calculatedOwnership = getOwnershipForContributions(
    personalContribution,
    miloInvestment,
  );
  const savedUserOwnership = Number(savedSlot.userOwnership);
  const savedMiloOwnership = Number(savedSlot.miloOwnership);
  const savedOwnershipTotal = savedUserOwnership + savedMiloOwnership;
  const shouldKeepTransferredOwnership =
    Boolean(savedSlot.ownershipTransferred) &&
    Number.isFinite(savedUserOwnership) &&
    Number.isFinite(savedMiloOwnership) &&
    savedOwnershipTotal > 0;
  const normalizedSavedUserOwnership = shouldKeepTransferredOwnership
    ? clamp(savedUserOwnership / savedOwnershipTotal, 0, 1)
    : calculatedOwnership.userOwnership;
  const normalizedSavedMiloOwnership = shouldKeepTransferredOwnership
    ? clamp(savedMiloOwnership / savedOwnershipTotal, 0, 1)
    : calculatedOwnership.miloOwnership;

  const operatingDefaults = getInitialOperatingControls({
    businessTypeId: savedSlot.businessTypeId || null,
    approvedBudget,
    selections: {
      ...DEFAULT_SELECTIONS,
      ...(savedSlot.selections || {}),
    },
    cycleNumber: Math.max(1, Number(savedSlot.cycleNumber || 1)),
  });

  return {
    ...base,
    ...savedSlot,
    id,
    approvedBudget,
    miloInvestment,
    personalContribution,
    miloOwnership: normalizedSavedMiloOwnership,
    userOwnership: normalizedSavedUserOwnership,
    ownershipTransferred: Boolean(savedSlot.ownershipTransferred),
    selections: {
      ...DEFAULT_SELECTIONS,
      ...(savedSlot.selections || {}),
    },
    stockUnits: Math.max(0, Number(savedSlot.stockUnits ?? operatingDefaults.stockUnits)),
    staffCount: Math.max(0, Math.round(Number(savedSlot.staffCount ?? operatingDefaults.staffCount))),
    averageMonthlySalary: Math.max(0, Number(savedSlot.averageMonthlySalary ?? operatingDefaults.averageMonthlySalary)),
    onlineMarketingBudget: Math.max(0, Number(savedSlot.onlineMarketingBudget ?? operatingDefaults.onlineMarketingBudget)),
    offlineMarketingBudget: Math.max(0, Number(savedSlot.offlineMarketingBudget ?? operatingDefaults.offlineMarketingBudget)),
    demandMomentum: clamp(Number(savedSlot.demandMomentum || 0), -0.45, 0.45),
    eventLog: Array.isArray(savedSlot.eventLog) ? savedSlot.eventLog : [],
    appliedEventIds: Array.isArray(savedSlot.appliedEventIds) ? savedSlot.appliedEventIds : [],
    cycleNumber: Math.max(1, Number(savedSlot.cycleNumber || 1)),
    cycleSimulatedMinutes: Math.min(
      CYCLE_MINUTES,
      Math.max(
        0,
        Number(
          savedSlot.cycleSimulatedMinutes ??
            Math.min(Number(savedSlot.simulatedMinutes || 0), CYCLE_MINUTES),
        ),
      ),
    ),
    cycleRevenue: Number(savedSlot.cycleRevenue ?? savedSlot.revenue ?? 0),
    cycleExpenses: Number(savedSlot.cycleExpenses ?? savedSlot.expenses ?? 0),
    cycleProfit: Number(
      savedSlot.cycleProfit ??
        Number(savedSlot.cycleRevenue ?? savedSlot.revenue ?? 0) -
          Number(savedSlot.cycleExpenses ?? savedSlot.expenses ?? 0),
    ),
    cycleStatus: savedSlot.cycleStatus || "running",
    cycleHistory: Array.isArray(savedSlot.cycleHistory)
      ? savedSlot.cycleHistory
      : [],
    saleListing: {
      ...base.saleListing,
      ...(savedSlot.saleListing || {}),
      analystReport: savedSlot.saleListing?.analystReport || null,
      offers: Array.isArray(savedSlot.saleListing?.offers)
        ? savedSlot.saleListing?.offers || []
        : [],
    },
  };
}

function getSetupSummary(
  costBasis: number,
  selections: SetupSelections,
  availableBudget = costBasis,
): {
  setupSpend: number;
  monthlyFixedCosts: number;
  remainingCash: number;
  qualityScores: Record<SetupCategoryId, number>;
} {
  let setupSpend = 0;
  let monthlyFixedCosts = 0;
  const qualityScores = {} as Record<SetupCategoryId, number>;

  SETUP_CATEGORIES.forEach((category) => {
    const option = getTierOption(category, selections[category.id]);
    setupSpend += costBasis * option.setupFraction;
    monthlyFixedCosts += costBasis * option.monthlyFraction;
    qualityScores[category.id] = option.qualityScore;
  });

  return {
    setupSpend,
    monthlyFixedCosts,
    remainingCash: availableBudget - setupSpend,
    qualityScores,
  };
}

function getPerformanceForecast(slot: BusinessSlot) {
  const business = getBusiness(slot.businessTypeId);
  const costBasis = getSetupCostBasis(slot);
  const summary = getSetupSummary(
    costBasis,
    slot.selections,
    slot.approvedBudget,
  );

  if (!business || slot.approvedBudget <= 0) {
    return {
      dailyRevenue: 0,
      dailyExpenses: 0,
      dailyProfit: 0,
      dailyOrders: 0,
      dailyStockUnitsUsed: 0,
      dailyCashOperatingCosts: 0,
      dailyVariableCosts: 0,
      satisfactionTarget: 50,
      monthlyFixedCosts: 0,
      recommendedSalary: 0,
      recommendedMarketingBudget: 0,
    };
  }

  const q = summary.qualityScores;
  const defaults = getInitialOperatingControls(slot);
  const stockUnits = slot.status === "running" ? slot.stockUnits : defaults.stockUnits;
  const staffCount = slot.status === "running" ? slot.staffCount : defaults.staffCount;
  const averageMonthlySalary =
    slot.status === "running"
      ? slot.averageMonthlySalary
      : defaults.averageMonthlySalary;
  const onlineMarketingBudget =
    slot.status === "running"
      ? slot.onlineMarketingBudget
      : defaults.onlineMarketingBudget;
  const offlineMarketingBudget =
    slot.status === "running"
      ? slot.offlineMarketingBudget
      : defaults.offlineMarketingBudget;
  const recommendedSalary = getRecommendedSalary(slot);
  const recommendedMarketingBudget = getRecommendedMarketingBudget(slot);
  const totalMarketing = onlineMarketingBudget + offlineMarketingBudget;
  const salaryEffect = clamp(averageMonthlySalary / Math.max(1, recommendedSalary), 0.45, 1.35);
  const staffingTarget = Math.max(1, business.difficulty + 1);
  const staffingCapacity = clamp(staffCount / staffingTarget, 0.2, 1.45);
  const onlineEffect = clamp(onlineMarketingBudget / Math.max(1, recommendedMarketingBudget * 0.6), 0, 1.8);
  const offlineEffect = clamp(offlineMarketingBudget / Math.max(1, recommendedMarketingBudget * 0.4), 0, 1.8);
  const marketingEffect = 0.58 + onlineEffect * 0.2 + offlineEffect * 0.14;
  const demandMultiplier = clamp(
    0.46 +
      q.location * 0.13 +
      marketingEffect * 0.22 +
      slot.demandMomentum +
      Math.min(0.08, totalMarketing / Math.max(1, costBasis) * 1.6),
    0.22,
    1.85,
  );
  const capacityMultiplier = clamp(
    0.48 + q.equipment * 0.11 + staffingCapacity * 0.3 + salaryEffect * 0.1,
    0.25,
    1.65,
  );
  const baseDailyRevenue = costBasis * business.dailyRevenueRate;
  const unconstrainedRevenue =
    baseDailyRevenue * Math.min(demandMultiplier, capacityMultiplier);
  const unconstrainedOrders =
    unconstrainedRevenue / Math.max(1, business.averageOrderValue);
  const inventoryCoverage = clamp(
    stockUnits / Math.max(1, unconstrainedOrders * 3),
    0,
    1,
  );
  const dailyOrders = unconstrainedOrders * inventoryCoverage;
  const dailyRevenue = dailyOrders * business.averageOrderValue;
  const { buyPrice } = getStockPrices(slot);
  const dailyVariableCosts = dailyOrders * buyPrice;
  const locationCategory = SETUP_CATEGORIES.find((category) => category.id === "location")!;
  const equipmentCategory = SETUP_CATEGORIES.find((category) => category.id === "equipment")!;
  const locationOption = getTierOption(locationCategory, slot.selections.location);
  const equipmentOption = getTierOption(equipmentCategory, slot.selections.equipment);
  const dailyRentUtilities = (costBasis * locationOption.monthlyFraction) / 30;
  const dailyEquipmentCosts = (costBasis * equipmentOption.monthlyFraction) / 30;
  const dailyWages = (staffCount * averageMonthlySalary) / 30;
  const dailyMarketing = totalMarketing / 30;
  const dailyCashOperatingCosts =
    dailyRentUtilities + dailyEquipmentCosts + dailyWages + dailyMarketing;
  const dailyExpenses = dailyVariableCosts + dailyCashOperatingCosts;
  const dailyProfit = dailyRevenue - dailyExpenses;
  const satisfactionTarget = clamp(
    42 +
      q.equipment * 7 +
      q.location * 3 +
      staffingCapacity * 14 +
      salaryEffect * 9 +
      inventoryCoverage * 12,
    35,
    96,
  );

  return {
    dailyRevenue,
    dailyExpenses,
    dailyProfit,
    dailyOrders,
    dailyStockUnitsUsed: dailyOrders,
    dailyCashOperatingCosts,
    dailyVariableCosts,
    satisfactionTarget,
    monthlyFixedCosts: dailyCashOperatingCosts * 30,
    recommendedSalary,
    recommendedMarketingBudget,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function seededNoise(seed: string) {
  const x = Math.sin(hashString(seed) * 0.000001) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function getMonthLabel(offset: number) {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + offset);
  return new Intl.DateTimeFormat("en-SG", {
    month: "short",
    timeZone: "Asia/Singapore",
  }).format(date);
}

function getUniformEventSchedule(industryId: IndustryId): ScheduledBusinessEvent[] {
  const events: ScheduledBusinessEvent[] = [];

  for (let day = 30; day <= EVENT_TIMELINE_DAYS; day += 90) {
    events.push({
      id: `${industryId}-marketing-${day}`,
      day,
      kind: "marketing-review",
    });
  }

  for (let day = 60; day <= EVENT_TIMELINE_DAYS; day += 120) {
    events.push({
      id: `${industryId}-staff-${day}`,
      day,
      kind: "staff-review",
    });
  }

  for (let day = 90; day <= EVENT_TIMELINE_DAYS; day += 180) {
    events.push({
      id: `${industryId}-supply-${day}`,
      day,
      kind: "supply",
    });
  }

  for (let day = 120; day <= EVENT_TIMELINE_DAYS; day += 150) {
    events.push({
      id: `${industryId}-market-${day}`,
      day,
      kind: "market",
    });
  }

  return events.sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
}

function applyScheduledEvents(
  sourceSlot: BusinessSlot,
  startDay: number,
  endDay: number,
): BusinessSlot {
  const business = getBusiness(sourceSlot.businessTypeId);
  if (!business || endDay <= startDay) return sourceSlot;

  let slot = { ...sourceSlot };
  const applied = new Set(slot.appliedEventIds);
  const eventLog = [...slot.eventLog];
  const schedule = getUniformEventSchedule(business.industryId).filter(
    (event) => event.day > startDay && event.day <= endDay && !applied.has(event.id),
  );

  schedule.forEach((event) => {
    let title = "Business review";
    let description = "Milo reviewed the latest operating conditions.";
    let impact = "No material change";
    let tone: SimulationEventRecord["tone"] = "neutral";

    if (event.kind === "marketing-review") {
      const totalMarketing =
        slot.onlineMarketingBudget + slot.offlineMarketingBudget;
      const recommended = getRecommendedMarketingBudget(slot);

      if (totalMarketing < recommended * 0.6) {
        slot.demandMomentum = clamp(slot.demandMomentum - 0.045, -0.45, 0.45);
        title = "Marketing visibility declined";
        description =
          "Customers are seeing the business less often because the monthly marketing budget has stayed below the industry benchmark.";
        impact = "Long-term demand reduced";
        tone = "negative";
      } else if (totalMarketing > recommended * 1.2) {
        slot.demandMomentum = clamp(slot.demandMomentum + 0.025, -0.45, 0.45);
        title = "Campaign reach improved";
        description =
          "Consistent online and offline promotion strengthened awareness in the local market.";
        impact = "Long-term demand improved";
        tone = "positive";
      } else {
        title = "Marketing review completed";
        description =
          "The current channel mix is maintaining awareness without creating an unusual change in demand.";
        impact = "Demand remains stable";
      }
    }

    if (event.kind === "staff-review") {
      const recommendedSalary = getRecommendedSalary(slot);

      if (
        slot.staffCount > 0 &&
        slot.averageMonthlySalary < recommendedSalary * 0.82
      ) {
        slot.staffCount = Math.max(0, slot.staffCount - 1);
        slot.customerSatisfaction = clamp(
          slot.customerSatisfaction - 5,
          0,
          100,
        );
        title = "A staff member resigned";
        description =
          "Average pay remained well below the market benchmark, so one employee left the business.";
        impact = "Staff count reduced by 1";
        tone = "negative";
      } else if (slot.averageMonthlySalary > recommendedSalary * 1.12) {
        slot.customerSatisfaction = clamp(
          slot.customerSatisfaction + 2,
          0,
          100,
        );
        title = "Staff retention improved";
        description =
          "Competitive pay helped the team remain stable and improved service consistency.";
        impact = "Customer satisfaction improved";
        tone = "positive";
      } else {
        title = "Staff review completed";
        description =
          "Pay and staffing levels are close to the current industry benchmark.";
        impact = "No staffing change";
      }
    }

    if (event.kind === "supply") {
      const noise = seededNoise(`${business.industryId}-supply-${event.day}`);
      const { buyPrice } = getStockPrices(slot);

      if (noise < 0.2) {
        const lostUnits = Math.min(
          slot.stockUnits,
          Math.max(3, Math.round(slot.stockUnits * (0.08 + Math.abs(noise) * 0.08))),
        );
        const lossValue = lostUnits * buyPrice;
        slot.stockUnits = Math.max(0, slot.stockUnits - lostUnits);
        slot.expenses += lossValue;
        slot.cycleExpenses += lossValue;
        slot.cycleProfit = slot.cycleRevenue - slot.cycleExpenses;
        title = "Inventory loss reported";
        description =
          "A supply and handling problem caused part of the available inventory to become unusable.";
        impact = `${Math.round(lostUnits)} units lost`;
        tone = "negative";
      } else if (noise < 0.55) {
        slot.demandMomentum = clamp(slot.demandMomentum - 0.025, -0.45, 0.45);
        title = "Shipment delay";
        description =
          "A delayed supplier shipment reduced product availability and weakened short-term customer demand.";
        impact = "Demand momentum reduced";
        tone = "negative";
      } else {
        const bonusUnits = Math.max(2, Math.round(slot.stockUnits * 0.04));
        slot.stockUnits += bonusUnits;
        title = "Supplier bonus allocation";
        description =
          "The supplier included extra units after meeting a fulfilment target.";
        impact = `${bonusUnits} bonus stock units`;
        tone = "positive";
      }
    }

    if (event.kind === "market") {
      const noise = seededNoise(`${business.industryId}-market-${event.day}`);
      const movement = 0.035 + Math.abs(noise) * 0.045;

      if (noise >= 0) {
        slot.demandMomentum = clamp(
          slot.demandMomentum + movement,
          -0.45,
          0.45,
        );
        title = "Local demand strengthened";
        description =
          "A favourable industry trend increased interest in businesses in this category.";
        impact = "Demand forecast improved";
        tone = "positive";
      } else {
        slot.demandMomentum = clamp(
          slot.demandMomentum - movement,
          -0.45,
          0.45,
        );
        title = "Local demand softened";
        description =
          "A weaker industry trend reduced customer interest across this business category.";
        impact = "Demand forecast weakened";
        tone = "negative";
      }
    }

    applied.add(event.id);
    eventLog.push({
      id: event.id,
      day: event.day,
      title,
      description,
      impact,
      tone,
      createdAt: new Date().toISOString(),
    });
  });

  return {
    ...slot,
    demandMomentum: clamp(slot.demandMomentum, -0.45, 0.45),
    eventLog: eventLog.slice(-80),
    appliedEventIds: Array.from(applied),
  };
}

function getMarketSnapshot(slot: BusinessSlot): MarketSnapshot {
  const business = getBusiness(slot.businessTypeId);
  const industryId = business?.industryId || "retail";
  const definition = INDUSTRY_MARKETS[industryId];
  const cycleSeed = Math.max(1, slot.cycleNumber);
  const points: MarketPoint[] = Array.from({ length: 12 }).map((_, index) => {
    const trend = (definition.annualGrowth / 12) * index;
    const seasonality = Math.sin((index / 12) * Math.PI * 2 + cycleSeed * 0.47);
    const demandNoise = seededNoise(`${industryId}-${cycleSeed}-${index}-demand`);
    const supplyNoise = seededNoise(`${industryId}-${cycleSeed}-${index}-supply`);
    const demand = clamp(
      definition.baseDemand + trend + seasonality * definition.volatility + demandNoise * definition.volatility * 0.75,
      25,
      95,
    );
    const supply = clamp(
      definition.baseSupply + trend * 0.45 - seasonality * definition.volatility * 0.35 + supplyNoise * definition.volatility * 0.62,
      25,
      95,
    );
    return {
      monthIndex: index,
      label: getMonthLabel(index),
      demand,
      supply,
      outlook: clamp((demand - supply) / 28 + definition.annualGrowth / 12, -1, 1),
    };
  });

  const current = points[0];
  const future = points[11];
  const marketBalance = current.demand - current.supply;
  const momentum = (future.demand - future.supply - marketBalance) / 30;
  const outlookScore = clamp(
    marketBalance / 30 + definition.annualGrowth / 10 + momentum * 0.45,
    -1,
    1,
  );
  const outlookLabel: MarketSnapshot["outlookLabel"] =
    outlookScore <= -0.45
      ? "Weak"
      : outlookScore <= -0.12
        ? "Cautious"
        : outlookScore < 0.2
          ? "Stable"
          : outlookScore < 0.55
            ? "Positive"
            : "Strong";
  const volatility: MarketSnapshot["volatility"] =
    definition.volatility >= 10
      ? "High"
      : definition.volatility >= 7
        ? "Moderate"
        : "Low";

  return {
    industryId,
    industryName: definition.name,
    demandIndex: current.demand,
    supplyIndex: current.supply,
    marketBalance,
    annualGrowth: definition.annualGrowth,
    outlookScore,
    outlookLabel,
    volatility,
    driver: definition.driver,
    risk: definition.risk,
    points,
  };
}

function getAnalystFee() {
  return ANALYST_FEE;
}

function calculateBusinessValuation(slot: BusinessSlot): AnalystReport {
  const business = getBusiness(slot.businessTypeId);
  const market = getMarketSnapshot(slot);
  const forecast = getPerformanceForecast(slot);
  const recentCycles = slot.cycleHistory.slice(-3);
  const monthlyRevenue =
    recentCycles.length > 0
      ? recentCycles.reduce((total, cycle) => total + cycle.revenue, 0) / recentCycles.length
      : forecast.dailyRevenue * 30;
  const monthlyProfit =
    recentCycles.length > 0
      ? recentCycles.reduce((total, cycle) => total + cycle.profit, 0) / recentCycles.length
      : forecast.dailyProfit * 30;
  const annualizedRevenue = Math.max(0, monthlyRevenue * 12);
  const annualizedProfit = monthlyProfit * 12;
  const summary = getSetupSummary(
    getSetupCostBasis(slot),
    slot.selections,
    slot.approvedBudget,
  );
  const equipmentQuality = summary.qualityScores.equipment;
  const stockQuality = summary.qualityScores.stock;
  const assetRecoveryRate = 0.28 + equipmentQuality * 0.09 + stockQuality * 0.035;
  const assetValue = Math.max(0, slot.cash) + slot.setupSpend * assetRecoveryRate;
  const businessAgeDays = Math.max(0, slot.simulatedMinutes / 1440);
  const maturityFactor = 0.25 + 0.75 * Math.min(1, businessAgeDays / 360);
  const marketDefinition = INDUSTRY_MARKETS[business?.industryId || "retail"];
  const earningsMultiple = clamp(
    marketDefinition.earningsMultiple + market.outlookScore * 0.65 + (slot.customerSatisfaction - 65) / 100,
    0.8,
    3.25,
  );
  const earningsValue = Math.max(0, annualizedProfit) * earningsMultiple * maturityFactor;
  const brandValue =
    annualizedRevenue * Math.max(0, slot.customerSatisfaction - 55) * 0.0016 * maturityFactor;
  const marketMultiplier = clamp(
    0.88 + market.outlookScore * 0.18 + market.marketBalance / 220,
    0.7,
    1.28,
  );
  const distressMultiplier =
    slot.cash < 0 ? 0.68 : slot.customerSatisfaction < 50 ? 0.82 : 1;
  const rawValuation =
    (assetValue + earningsValue + brandValue) * marketMultiplier * distressMultiplier;
  const valuationFloor = Math.max(0, slot.approvedBudget * 0.28 + Math.max(0, slot.cash) * 0.5);
  const valuation = Math.max(0, Math.round(Math.max(rawValuation, valuationFloor) / 50) * 50);
  const summaryText =
    annualizedProfit <= 0
      ? "The valuation is supported mainly by recoverable assets and available cash because recent profit is weak."
      : market.outlookScore >= 0.25
        ? "Profitable operations and a favourable market outlook are supporting a stronger valuation."
        : market.outlookScore <= -0.25
          ? "The business is profitable, but a weaker industry outlook is reducing what buyers may pay."
          : "The valuation balances current earnings, recoverable assets, customer strength and a stable market outlook.";

  return {
    id: `report-${slot.id}-${slot.cycleNumber}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    cycleNumber: slot.cycleNumber,
    analystFee: getAnalystFee(),
    valuation,
    assetValue,
    earningsValue,
    brandValue,
    annualizedRevenue,
    annualizedProfit,
    earningsMultiple,
    marketMultiplier,
    marketOutlook: market.outlookLabel,
    summary: summaryText,
  };
}

function generateSaleOffers(slot: BusinessSlot): SaleOffer[] {
  const listing = slot.saleListing;
  if (listing.status !== "listed" || listing.listedPrice <= 0) return [];

  const market = getMarketSnapshot(slot);
  const liveReport = calculateBusinessValuation(slot);
  const fairValue = Math.max(1, liveReport.valuation);
  const listRatio = listing.listedPrice / fairValue;
  const listingAge = Math.max(0, slot.cycleNumber - (listing.listedCycle || slot.cycleNumber));
  const stalePenalty = market.outlookScore < 0
    ? Math.max(0.76, 1 - listingAge * 0.045)
    : Math.max(0.9, 1 - listingAge * 0.012);
  const competition = clamp(
    market.outlookScore + (market.demandIndex - market.supplyIndex) / 45,
    -1,
    1,
  );
  const anchor = fairValue * 0.78 + listing.listedPrice * 0.22;
  const buyerNames = MARKET_BUYERS[market.industryId];
  const baseFactors = [0.88, 0.97, 1.06];

  return baseFactors.map((factor, index) => {
    const noise = seededNoise(`${slot.id}-${slot.cycleNumber}-${listing.listedPrice}-${index}-offer`) * 0.045;
    const competitiveBoost = competition * (0.055 + index * 0.025);
    const overpricingPenalty = listRatio > 1.2 ? Math.min(0.18, (listRatio - 1.2) * 0.22) : 0;
    const amount = Math.max(
      50,
      Math.round(
        (anchor * (factor + noise + competitiveBoost - overpricingPenalty) * stalePenalty) / 50,
      ) * 50,
    );
    const note =
      amount >= listing.listedPrice * 1.03
        ? "Competitive bid above your asking price"
        : amount >= listing.listedPrice * 0.97
          ? "Bid close to your asking price"
          : market.outlookScore < -0.2
            ? "Buyer has discounted the bid for a weaker outlook"
            : "Buyer is negotiating below your asking price";

    return {
      id: `offer-${slot.id}-${slot.cycleNumber}-${index}-${Date.now()}`,
      buyerName: buyerNames[index % buyerNames.length],
      amount,
      cycleNumber: slot.cycleNumber,
      createdAt: new Date().toISOString(),
      outlookLabel: market.outlookLabel,
      note,
    };
  });
}

function prepareNextCycleIfAvailable(slot: BusinessSlot): BusinessSlot {
  if (
    slot.status !== "running" ||
    slot.cycleStatus !== "settled" ||
    !slot.lastCycleCompletedDateSg ||
    slot.lastCycleCompletedDateSg === getSingaporeDateString()
  ) {
    return slot;
  }

  const unlockedAt = getNextSingaporeDayStartIso(
    slot.lastCycleCompletedDateSg,
  );

  return {
    ...slot,
    cycleNumber: slot.cycleNumber + 1,
    cycleSimulatedMinutes: 0,
    cycleRevenue: 0,
    cycleExpenses: 0,
    cycleProfit: 0,
    cycleStatus: "running",
    simulationSpeed: 1,
    lastUpdatedAt: unlockedAt,
  };
}

function simulateSlot(
  originalSlot: BusinessSlot,
  realSeconds: number,
  speedOverride?: SimulationSpeed,
): BusinessSlot {
  const slot = prepareNextCycleIfAvailable(originalSlot);

  if (slot.status !== "running" || slot.cycleStatus !== "running") {
    return slot;
  }

  const speed = speedOverride ?? slot.simulationSpeed;
  if (speed <= 0) {
    return { ...slot, lastUpdatedAt: new Date().toISOString() };
  }

  const requestedMinutes = Math.max(0, (realSeconds * speed) / 60);
  const remainingCycleMinutes = Math.max(
    0,
    CYCLE_MINUTES - slot.cycleSimulatedMinutes,
  );
  const simulatedMinutes = Math.min(requestedMinutes, remainingCycleMinutes);
  if (simulatedMinutes <= 0) {
    return { ...slot, lastUpdatedAt: new Date().toISOString() };
  }

  const simulatedDays = simulatedMinutes / 1440;
  const forecast = getPerformanceForecast(slot);
  const requestedStockUnits = forecast.dailyStockUnitsUsed * simulatedDays;
  const usedStockUnits = Math.min(slot.stockUnits, requestedStockUnits);
  const fulfilmentRatio =
    requestedStockUnits > 0 ? usedStockUnits / requestedStockUnits : 1;
  const revenueAdded = forecast.dailyRevenue * simulatedDays * fulfilmentRatio;
  const { buyPrice } = getStockPrices(slot);
  const variableCostsAdded = usedStockUnits * buyPrice;
  const cashOperatingCostsAdded =
    forecast.dailyCashOperatingCosts * simulatedDays;
  const expensesAdded = variableCostsAdded + cashOperatingCostsAdded;
  const satisfactionMovement = Math.min(1, simulatedDays / 4);
  const stockoutPenalty = fulfilmentRatio < 0.95 ? (1 - fulfilmentRatio) * 12 : 0;
  const nextSatisfaction =
    slot.customerSatisfaction +
    (forecast.satisfactionTarget - slot.customerSatisfaction) *
      satisfactionMovement -
    stockoutPenalty;
  const nextCycleMinutes = slot.cycleSimulatedMinutes + simulatedMinutes;
  const nextCycleRevenue = slot.cycleRevenue + revenueAdded;
  const nextCycleExpenses = slot.cycleExpenses + expensesAdded;
  const cycleComplete = nextCycleMinutes >= CYCLE_MINUTES - 0.0001;
  const startDay = Math.floor(slot.simulatedMinutes / 1440);
  const endDay = Math.floor((slot.simulatedMinutes + simulatedMinutes + 0.0001) / 1440);

  let updatedSlot: BusinessSlot = {
    ...slot,
    simulatedMinutes: slot.simulatedMinutes + simulatedMinutes,
    cycleSimulatedMinutes: nextCycleMinutes,
    revenue: slot.revenue + revenueAdded,
    expenses: slot.expenses + expensesAdded,
    cycleRevenue: nextCycleRevenue,
    cycleExpenses: nextCycleExpenses,
    cycleProfit: nextCycleRevenue - nextCycleExpenses,
    cash: slot.cash + revenueAdded - cashOperatingCostsAdded,
    stockUnits: Math.max(0, slot.stockUnits - usedStockUnits),
    sales: slot.sales + usedStockUnits,
    customerSatisfaction: clamp(nextSatisfaction, 0, 100),
    cycleStatus: cycleComplete ? "awaiting-allocation" : "running",
    simulationSpeed: cycleComplete ? 0 : slot.simulationSpeed,
    lastCycleCompletedDateSg: cycleComplete
      ? getSingaporeDateString()
      : slot.lastCycleCompletedDateSg,
    lastUpdatedAt: new Date().toISOString(),
  };

  updatedSlot = applyScheduledEvents(updatedSlot, startDay, endDay);
  updatedSlot = {
    ...updatedSlot,
    cycleProfit: updatedSlot.cycleRevenue - updatedSlot.cycleExpenses,
  };

  if (
    cycleComplete &&
    updatedSlot.saleListing.status === "listed" &&
    updatedSlot.saleListing.offersGeneratedCycle !== updatedSlot.cycleNumber
  ) {
    return {
      ...updatedSlot,
      saleListing: {
        ...updatedSlot.saleListing,
        offers: generateSaleOffers(updatedSlot),
        offersGeneratedCycle: updatedSlot.cycleNumber,
      },
    };
  }

  return updatedSlot;
}

function catchUpSlot(
  slot: BusinessSlot,
  offlineSpeed: SimulationSpeed = OFFLINE_SIMULATION_SPEED,
): BusinessSlot {
  const prepared = prepareNextCycleIfAvailable(slot);
  const selectedOnlineSpeed = prepared.simulationSpeed;

  if (prepared.status !== "running" || !prepared.lastUpdatedAt) {
    return {
      ...prepared,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  const elapsedSeconds = Math.max(
    0,
    (Date.now() - new Date(prepared.lastUpdatedAt).getTime()) / 1000,
  );
  const caughtUp = simulateSlot(prepared, elapsedSeconds, offlineSpeed);

  return {
    ...caughtUp,
    simulationSpeed:
      caughtUp.cycleStatus === "running" ? selectedOnlineSpeed : 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

function useViewport() {
  const [viewport, setViewport] = useState({ width: 1440, height: 900 });

  useEffect(() => {
    function update() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return viewport;
}

function MiloPanel({
  eyebrow,
  title,
  text,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: compact ? "170px" : "220px",
        borderRadius: "26px",
        border: "1px solid rgba(210,145,67,0.38)",
        background:
          "linear-gradient(145deg, rgba(67,35,17,0.95), rgba(8,12,23,0.96))",
        boxShadow:
          "0 28px 72px rgba(0,0,0,0.34), inset 0 0 60px rgba(224,153,72,0.05)",
        padding: compact ? "22px 22px 22px 148px" : "28px 32px 28px 190px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 12% 55%, rgba(221,147,63,0.22), transparent 28%)",
          pointerEvents: "none",
        }}
      />

      <img
        src="/milo-world/milo-character.png"
        alt="Milo"
        style={{
          position: "absolute",
          left: compact ? "10px" : "18px",
          bottom: compact ? "-20px" : "-28px",
          height: compact ? "185px" : "245px",
          width: "auto",
          objectFit: "contain",
          filter: "drop-shadow(0 18px 32px rgba(0,0,0,0.5))",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 2 }}>
        <p
          style={{
            margin: 0,
            color: "#f0bd70",
            fontSize: "13px",
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </p>
        <h2
          style={{
            margin: "9px 0 0",
            color: "white",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: compact ? "27px" : "36px",
            lineHeight: 1.04,
            fontWeight: 500,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "13px 0 0",
            color: "rgba(255,255,255,0.72)",
            fontSize: compact ? "13px" : "15px",
            lineHeight: 1.65,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

function StorefrontCard({
  slot,
  hovered,
  onHover,
  onLeave,
  onSelect,
  mobile,
}: {
  slot: BusinessSlot;
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
  mobile: boolean;
}) {
  const business = getBusiness(slot.businessTypeId);
  const isEmpty = slot.status === "empty";
  const statusText =
    slot.status === "running" ? "Open for business" : "Setup in progress";

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onSelect}
      style={{
        position: "relative",
        minWidth: 0,
        minHeight: mobile ? "420px" : "500px",
        overflow: "hidden",
        borderRadius: "22px 22px 12px 12px",
        border: hovered
          ? "1px solid rgba(241,190,111,0.72)"
          : "1px solid rgba(194,125,52,0.34)",
        background:
          "linear-gradient(180deg, #3b2214 0%, #23140d 20%, #100b09 100%)",
        boxShadow: hovered
          ? "0 30px 72px rgba(0,0,0,0.52), 0 0 36px rgba(215,144,61,0.17)"
          : "0 22px 54px rgba(0,0,0,0.34)",
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        transition:
          "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
        cursor: "pointer",
        padding: 0,
        color: "white",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.25,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "7%",
          right: "7%",
          top: "5%",
          height: "13%",
          borderRadius: "12px",
          border: "1px solid rgba(238,190,118,0.32)",
          background:
            "linear-gradient(180deg, rgba(65,36,17,0.96), rgba(31,17,10,0.98))",
          boxShadow: "inset 0 0 20px rgba(237,177,91,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            color: isEmpty ? "rgba(255,238,210,0.52)" : "#fff4df",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: mobile ? "20px" : "23px",
            lineHeight: 1.1,
            fontWeight: 700,
            letterSpacing: "0.03em",
          }}
        >
          {isEmpty ? `STOREFRONT ${slot.id}` : slot.businessName}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: "4%",
          right: "4%",
          top: "20%",
          height: "10%",
          borderRadius: "5px",
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "repeating-linear-gradient(90deg, #d69a52 0 11%, #4a2716 11% 22%)",
          boxShadow: "0 12px 18px rgba(0,0,0,0.28)",
          transform: "perspective(180px) rotateX(-12deg)",
          transformOrigin: "top",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          top: "31%",
          bottom: "13%",
          display: "grid",
          gridTemplateColumns: "1fr 0.8fr",
          gap: "4%",
        }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            border: "5px solid #2a1911",
            background:
              "linear-gradient(160deg, rgba(20,31,43,0.92), rgba(4,8,15,0.98))",
            boxShadow:
              "inset 0 0 38px rgba(115,176,210,0.08), 0 10px 25px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(112deg, transparent 15%, rgba(255,255,255,0.11) 25%, transparent 38%)",
            }}
          />
          {!isEmpty && (
            <div
              style={{
                position: "absolute",
                inset: "18% 10%",
                borderRadius: "18px",
                border: "1px solid rgba(240,187,105,0.32)",
                background: "rgba(224,150,65,0.08)",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                padding: "12px",
              }}
            >
              <span style={{ fontSize: "42px", color: "#edb96f" }}>
                {business?.icon || "◇"}
              </span>
              <strong
                style={{
                  display: "block",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "15px",
                  lineHeight: 1.4,
                }}
              >
                {business?.category}
              </strong>
            </div>
          )}
        </div>

        <div
          style={{
            position: "relative",
            overflow: "hidden",
            border: "5px solid #2a1911",
            borderBottomWidth: "10px",
            background:
              "linear-gradient(160deg, rgba(20,31,43,0.94), rgba(3,7,13,0.99))",
            boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: "1px",
              background: "rgba(255,255,255,0.1)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "14%",
              right: "14%",
              top: "47%",
              height: "2px",
              background: "rgba(228,183,115,0.38)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "15%",
              right: "15%",
              bottom: "8%",
              height: "9%",
              background: "#1e130d",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "11%",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background:
            "linear-gradient(180deg, rgba(27,16,12,0.98), rgba(11,8,7,0.99))",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          bottom: "4%",
          minHeight: "58px",
          borderRadius: "14px",
          border: hovered
            ? "1px solid rgba(240,190,111,0.52)"
            : "1px solid rgba(240,190,111,0.2)",
          background: isEmpty
            ? "rgba(16,10,7,0.86)"
            : slot.status === "running"
              ? "rgba(22,55,42,0.9)"
              : "rgba(73,43,18,0.9)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          gap: "10px",
          padding: "11px 14px",
          boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
        }}
      >
        <span>
          <strong
            style={{
              display: "block",
              color: "white",
              fontSize: "16px",
              lineHeight: 1.25,
            }}
          >
            {isEmpty ? "Available business slot" : statusText}
          </strong>
          <span
            style={{
              display: "block",
              marginTop: "4px",
              color: "rgba(255,255,255,0.52)",
              fontSize: "13px",
              lineHeight: 1.35,
            }}
          >
            {isEmpty
              ? "Choose this storefront to begin"
              : `${formatMoney(slot.cash)} available cash`}
          </span>
        </span>
        <span style={{ color: "#efbd75", fontSize: "24px" }}>→</span>
      </div>
    </button>
  );
}

function MetricCard({
  label,
  value,
  note,
  positive,
}: {
  label: string;
  value: string;
  note: string;
  positive?: boolean;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: "20px",
        border: "1px solid rgba(210,145,67,0.22)",
        background:
          "linear-gradient(145deg, rgba(40,24,15,0.82), rgba(6,10,19,0.88))",
        padding: "18px",
        boxShadow: "0 18px 44px rgba(0,0,0,0.22)",
      }}
    >
      <span
        style={{
          display: "block",
          color: "rgba(255,255,255,0.43)",
          fontSize: "13px",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <strong
        style={{
          display: "block",
          marginTop: "9px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: positive === undefined ? "white" : positive ? "#9ff0bd" : "#ffb497",
          fontSize: "32px",
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </strong>
      <span
        style={{
          display: "block",
          marginTop: "7px",
          color: "rgba(255,255,255,0.48)",
          fontSize: "14px",
          lineHeight: 1.45,
        }}
      >
        {note}
      </span>
    </div>
  );
}

function RunningBusinessSwitcher({
  slots,
  activeSlotId,
  mobile,
  onSelect,
}: {
  slots: BusinessSlot[];
  activeSlotId: 1 | 2 | 3 | null;
  mobile: boolean;
  onSelect: (slotId: 1 | 2 | 3) => void;
}) {
  const runningSlots = slots.filter((slot) => slot.status === "running");

  return (
    <div
      style={{
        marginTop: "20px",
        borderRadius: "20px",
        border: "1px solid rgba(218,151,74,0.16)",
        background: "rgba(255,255,255,0.025)",
        padding: mobile ? "12px" : "14px",
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: "10px",
          color: "rgba(255,255,255,0.46)",
          fontSize: "13px",
          fontWeight: 850,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
        }}
      >
        Selected operating business
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: mobile
            ? "1fr"
            : `repeat(${Math.max(1, Math.min(3, runningSlots.length))}, minmax(0, 1fr))`,
          gap: "9px",
        }}
      >
        {runningSlots.map((slot) => {
          const active = slot.id === activeSlotId;
          const business = getBusiness(slot.businessTypeId);
          return (
            <button
              key={slot.id}
              type="button"
              onClick={() => onSelect(slot.id)}
              style={{
                minHeight: "58px",
                borderRadius: "14px",
                border: active
                  ? "1px solid rgba(239,187,112,0.64)"
                  : "1px solid rgba(218,151,74,0.13)",
                background: active
                  ? "linear-gradient(145deg, rgba(106,57,25,0.68), rgba(8,12,20,0.9))"
                  : "rgba(255,255,255,0.025)",
                color: "white",
                padding: "10px 13px",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <strong style={{ display: "block", fontSize: "17px" }}>
                Storefront {slot.id} · {slot.businessName}
              </strong>
              <span
                style={{
                  display: "block",
                  marginTop: "5px",
                  color: "rgba(255,255,255,0.48)",
                  fontSize: "14px",
                }}
              >
                {business?.title || "Operating business"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MarketChart({
  points,
  mobile,
}: {
  points: MarketPoint[];
  mobile: boolean;
}) {
  const width = 900;
  const height = 330;
  const paddingX = 56;
  const paddingY = 38;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const x = (index: number) => paddingX + (index / Math.max(1, points.length - 1)) * chartWidth;
  const y = (value: number) => paddingY + ((100 - value) / 100) * chartHeight;
  const demandPoints = points.map((point, index) => `${x(index)},${y(point.demand)}`).join(" ");
  const supplyPoints = points.map((point, index) => `${x(index)},${y(point.supply)}`).join(" ");

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        borderRadius: "20px",
        border: "1px solid rgba(218,151,74,0.16)",
        background: "rgba(3,8,16,0.72)",
        padding: mobile ? "10px 6px" : "14px",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Twelve-month industry demand and supply forecast"
        style={{ display: "block", width: mobile ? "760px" : "100%", minWidth: mobile ? "760px" : 0 }}
      >
        {[25, 50, 75, 100].map((value) => (
          <g key={value}>
            <line
              x1={paddingX}
              y1={y(value)}
              x2={width - paddingX}
              y2={y(value)}
              stroke="rgba(255,255,255,0.09)"
              strokeWidth="1"
            />
            <text x="10" y={y(value) + 5} fill="rgba(255,255,255,0.4)" fontSize="14">
              {value}
            </text>
          </g>
        ))}
        <polyline
          points={demandPoints}
          fill="none"
          stroke="#efb96d"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={supplyPoints}
          fill="none"
          stroke="#7db9e8"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={x(index)} cy={y(point.demand)} r="5" fill="#efb96d" />
            <circle cx={x(index)} cy={y(point.supply)} r="5" fill="#7db9e8" />
            <text
              x={x(index)}
              y={height - 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.48)"
              fontSize="14"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}


function ProfileAssetsDropdown({
  assets,
  loading,
  open,
  onToggle,
  mobile,
}: {
  assets: ProfileAssetBreakdown;
  loading: boolean;
  open: boolean;
  onToggle: () => void;
  mobile: boolean;
}) {
  const total = assets.cash + assets.property + assets.stocks;

  return (
    <div style={{ position: "relative", zIndex: 70 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          minHeight: mobile ? "42px" : "48px",
          minWidth: mobile ? "96px" : "178px",
          borderRadius: "999px",
          border: "1px solid rgba(218,151,74,0.24)",
          background: "rgba(31,18,11,0.78)",
          color: "white",
          padding: mobile ? "6px 11px" : "7px 15px",
          textAlign: "right",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            display: "block",
            color: "rgba(255,255,255,0.45)",
            fontSize: mobile ? "9px" : "11px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            whiteSpace: "nowrap",
          }}
        >
          {mobile ? "Assets ▾" : "Profile assets ▾"}
        </span>
        <strong
          style={{
            display: "block",
            marginTop: "3px",
            color: "#f1c17b",
            fontSize: mobile ? "13px" : "16px",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Loading" : formatMoney(total)}
        </strong>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 9px)",
            right: 0,
            width: mobile ? "min(290px, calc(100vw - 24px))" : "290px",
            borderRadius: "18px",
            border: "1px solid rgba(218,151,74,0.28)",
            background:
              "linear-gradient(145deg, rgba(24,13,8,0.98), rgba(5,8,15,0.99))",
            boxShadow: "0 24px 65px rgba(0,0,0,0.56)",
            padding: "13px",
          }}
        >
          {[
            ["Cash", assets.cash],
            ["Property", assets.property],
            ["Stocks", assets.stocks],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                minHeight: "46px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                borderBottom:
                  label === "Stocks"
                    ? "none"
                    : "1px solid rgba(218,151,74,0.1)",
                color: "rgba(255,255,255,0.62)",
                fontSize: "14px",
              }}
            >
              <span>{label}</span>
              <strong style={{ color: "#f1c17b", fontSize: "16px" }}>
                {loading ? "—" : formatMoney(Number(value))}
              </strong>
            </div>
          ))}
          <div
            style={{
              marginTop: "8px",
              paddingTop: "10px",
              borderTop: "1px solid rgba(218,151,74,0.18)",
              display: "flex",
              justifyContent: "space-between",
              color: "white",
              fontSize: "14px",
            }}
          >
            <strong>Total assets</strong>
            <strong style={{ color: "#f5cb8d" }}>
              {loading ? "—" : formatMoney(total)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

function WelcomeTokenOffer({
  open,
  onClose,
  onPurchase,
  mobile,
}: {
  open: boolean;
  onClose: () => void;
  onPurchase: () => void;
  mobile: boolean;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "grid",
        placeItems: "center",
        padding: mobile ? "14px" : "28px",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(680px, 100%)",
          borderRadius: mobile ? "24px" : "30px",
          border: "1px solid rgba(235,179,103,0.42)",
          background:
            "radial-gradient(circle at top right, rgba(218,151,74,0.24), transparent 34%), linear-gradient(145deg, rgba(46,25,13,0.98), rgba(5,8,16,0.99))",
          boxShadow: "0 38px 110px rgba(0,0,0,0.68)",
          padding: mobile ? "26px 20px" : "38px",
          color: "white",
          position: "relative",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close welcome offer"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "38px",
            height: "38px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            color: "white",
            fontSize: "22px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <p
          style={{
            margin: 0,
            color: "#efbb70",
            fontSize: "13px",
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Milo’s one-time welcome offer
        </p>
        <h2
          style={{
            margin: "14px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: mobile ? "38px" : "52px",
            lineHeight: 1,
            fontWeight: 500,
          }}
        >
          Start with 5,000 DT for $1.
        </h2>
        <p
          style={{
            margin: "18px 0 0",
            color: "rgba(255,255,255,0.66)",
            fontSize: mobile ? "17px" : "19px",
            lineHeight: 1.65,
          }}
        >
          I’m offering this once to help you make your first personal investment.
          The tokens are credited only after the payment is successfully verified.
        </p>

        <div
          style={{
            marginTop: "24px",
            borderRadius: "20px",
            border: "1px solid rgba(235,179,103,0.22)",
            background: "rgba(255,255,255,0.035)",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "18px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                color: "rgba(255,255,255,0.44)",
                fontSize: "12px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              One-time pack
            </span>
            <strong
              style={{
                display: "block",
                marginTop: "7px",
                color: "#f5ca88",
                fontSize: "32px",
              }}
            >
              5,000 DT
            </strong>
          </div>
          <strong style={{ fontSize: "32px" }}>$1</strong>
        </div>

        <div
          style={{
            marginTop: "24px",
            display: "flex",
            flexDirection: mobile ? "column" : "row",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              minHeight: "54px",
              flex: 1,
              borderRadius: "14px",
              border: "1px solid rgba(218,151,74,0.22)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              fontSize: "17px",
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Not Now
          </button>
          <button
            type="button"
            onClick={onPurchase}
            style={{
              minHeight: "54px",
              flex: 1.3,
              borderRadius: "14px",
              border: "none",
              background: "linear-gradient(135deg, #dda252, #8d4b21)",
              color: "white",
              fontSize: "18px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Get 5,000 DT for $1
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MiloBusinessBuilderPage() {
  const { width } = useViewport();
  const mobile = width <= 760;
  const compact = width < 1160;

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profileNetWorth, setProfileNetWorth] = useState(0);
  const [profileAssets, setProfileAssets] = useState<ProfileAssetBreakdown>({
    cash: 0,
    property: 0,
    stocks: 0,
  });
  const [dreamTokenBalance, setDreamTokenBalance] = useState(0);
  const [netWorthLoading, setNetWorthLoading] = useState(true);
  const [clubAccess, setClubAccess] = useState<
    "checking" | "allowed" | "denied"
  >("checking");
  const [welcomeOfferOpen, setWelcomeOfferOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [slots, setSlots] = useState<BusinessSlot[]>(createDefaultSlots);
  const [storageReady, setStorageReady] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<1 | 2 | 3 | null>(null);
  const [view, setView] = useState<ViewName>("storefronts");
  const [hoveredSlotId, setHoveredSlotId] = useState<number | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null,
  );
  const [requestedBudget, setRequestedBudget] = useState(0);
  const [fundingStep, setFundingStep] = useState<FundingStep>("personal");
  const [personalContribution, setPersonalContribution] = useState(0);
  const [fundingSubmitting, setFundingSubmitting] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSetupCategory, setActiveSetupCategory] =
    useState<SetupCategoryId>("location");
  const [draftSelections, setDraftSelections] =
    useState<SetupSelections>(DEFAULT_SELECTIONS);
  const [businessNameDraft, setBusinessNameDraft] = useState("");
  const [operatingDraft, setOperatingDraft] = useState<OperatingControls>({
    stockUnits: 0,
    staffCount: 0,
    averageMonthlySalary: 0,
    onlineMarketingBudget: 0,
    offlineMarketingBudget: 0,
  });
  const [stockTradeUnits, setStockTradeUnits] = useState(10);
  const [reinvestmentPercent, setReinvestmentPercent] = useState(50);
  const [cycleSubmitting, setCycleSubmitting] = useState(false);
  const [listingPriceDraft, setListingPriceDraft] = useState(0);
  const [saleActionState, setSaleActionState] = useState<
    "idle" | "analysing" | "listing" | "selling"
  >("idle");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastCloudSavedAt, setLastCloudSavedAt] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState("");
  const slotsRef = useRef<BusinessSlot[]>(slots);

  const activeSlot = useMemo(
    () => slots.find((slot) => slot.id === activeSlotId) || null,
    [slots, activeSlotId],
  );

  const selectedBusiness = useMemo(
    () => getBusiness(selectedBusinessId),
    [selectedBusinessId],
  );

  const activeBusiness = useMemo(
    () => getBusiness(activeSlot?.businessTypeId || null),
    [activeSlot?.businessTypeId],
  );

  const storageKey = `${STORAGE_VERSION}:${userId || "guest"}`;
  const legacyStorageKey = `milo-business-builder-v1:${userId || "guest"}`;

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    let mounted = true;

    async function loadUserAndNetWorth() {
      setAuthLoading(true);
      setNetWorthLoading(true);

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!mounted) return;

      if (!user) {
        setUserId("");
        setUserEmail("");
        setProfileNetWorth(0);
        setDreamTokenBalance(0);
        setProfileAssets({ cash: 0, property: 0, stocks: 0 });
        setClubAccess("denied");
        setAuthLoading(false);
        setNetWorthLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const [
        profileResult,
        tokensResult,
        stocksResult,
        stockHoldingsResult,
        propertiesResult,
        propertyHoldingsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "role,milos_club_member,milos_club_welcome_offer_claimed,milos_club_welcome_offer_seen_at",
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("dream_token_transactions")
          .select("amount,token_kind")
          .eq("user_id", user.id),
        supabase
          .from("milo_exchange_stocks")
          .select("symbol,current_price")
          .eq("is_active", true),
        supabase
          .from("milo_exchange_holdings")
          .select("symbol,quantity")
          .eq("user_id", user.id),
        supabase
          .from("milo_exchange_properties")
          .select("id,current_value")
          .eq("is_active", true),
        supabase
          .from("milo_exchange_property_holdings")
          .select("property_id,quantity")
          .eq("user_id", user.id),
      ]);

      if (!mounted) return;

      if (profileResult.error || !profileResult.data) {
        console.warn(
          "Could not verify Milo’s Club access:",
          profileResult.error?.message || "Profile not found",
        );
        setClubAccess("denied");
        setAuthLoading(false);
        window.location.replace("/milo-world?open=membership");
        return;
      }

      const clubProfile = profileResult.data as MiloClubProfile;
      const isAdmin = String(clubProfile.role || "").toLowerCase() === "admin";
      const hasClubAccess = isAdmin || Boolean(clubProfile.milos_club_member);

      if (!hasClubAccess) {
        setClubAccess("denied");
        setAuthLoading(false);
        window.location.replace("/milo-world?open=membership");
        return;
      }

      setClubAccess("allowed");
      setWelcomeOfferOpen(
        !Boolean(clubProfile.milos_club_welcome_offer_claimed) &&
          !clubProfile.milos_club_welcome_offer_seen_at,
      );

      const tokenBalance = (tokensResult.data || [])
        .filter((row) => row.token_kind === "virtual")
        .reduce((total, row) => total + Number(row.amount || 0), 0);

      setDreamTokenBalance(tokenBalance);

      const stockPrices = new Map(
        ((stocksResult.data || []) as StockRow[]).map((stock) => [
          stock.symbol,
          Number(stock.current_price || 0),
        ]),
      );
      const stockValue = (
        (stockHoldingsResult.data || []) as StockHoldingRow[]
      ).reduce(
        (total, holding) =>
          total +
          Number(holding.quantity || 0) *
            Number(stockPrices.get(holding.symbol) || 0),
        0,
      );

      const propertyPrices = new Map(
        ((propertiesResult.data || []) as PropertyRow[]).map((property) => [
          property.id,
          Number(property.current_value || 0),
        ]),
      );
      const propertyValue = (
        (propertyHoldingsResult.data || []) as PropertyHoldingRow[]
      ).reduce(
        (total, holding) =>
          total +
          Number(holding.quantity || 0) *
            Number(propertyPrices.get(holding.property_id) || 0),
        0,
      );

      setProfileAssets({
        cash: tokenBalance,
        property: propertyValue,
        stocks: stockValue,
      });
      setProfileNetWorth(tokenBalance + stockValue + propertyValue);
      setNetWorthLoading(false);
      setAuthLoading(false);
    }

    loadUserAndNetWorth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUserAndNetWorth();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading || !userId || clubAccess !== "allowed") return;

    let cancelled = false;

    async function loadProgress() {
      setStorageReady(false);

      let savedSlots: Partial<BusinessSlot>[] | null = null;
      let savedActiveSlotId: 1 | 2 | 3 | null = null;

      const { data, error } = await supabase
        .from(BUSINESS_PROGRESS_TABLE)
        .select("slots,active_slot_id,updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!cancelled && !error && data && Array.isArray(data.slots)) {
        savedSlots = data.slots as Partial<BusinessSlot>[];
        const candidateId = Number(data.active_slot_id);
        savedActiveSlotId =
          candidateId === 1 || candidateId === 2 || candidateId === 3
            ? candidateId
            : null;
        setLastCloudSavedAt(data.updated_at ? String(data.updated_at) : null);
      }

      if (!savedSlots) {
        try {
          const localSaved =
            localStorage.getItem(storageKey) ||
            localStorage.getItem(legacyStorageKey);
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed)) {
              savedSlots = parsed as Partial<BusinessSlot>[];
            }
          }
        } catch (localError) {
          console.warn(
            "Could not load local Business Builder progress:",
            localError,
          );
        }
      }

      if (cancelled) return;

      const normalized = ([1, 2, 3] as const).map((id) => {
        const savedSlot = savedSlots?.find((slot) => slot.id === id);
        return catchUpSlot(normalizeSlot(savedSlot, id));
      });

      setSlots(normalized);
      if (savedActiveSlotId) setActiveSlotId(savedActiveSlotId);
      setStorageReady(true);

      if (error) {
        console.warn(
          "Cloud progress could not be loaded. Local progress is still available:",
          error.message,
        );
      }
    }

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, [authLoading, clubAccess, legacyStorageKey, storageKey, userId]);

  useEffect(() => {
    if (!storageReady || !userId) return;
    localStorage.setItem(storageKey, JSON.stringify(slots));
  }, [slots, storageKey, storageReady, userId]);

  useEffect(() => {
    if (!storageReady) return;

    const timer = window.setInterval(() => {
      setSlots((current) => {
        const now = Date.now();

        return current.map((slot) => {
          if (slot.status !== "running") return slot;

          const previousTime = slot.lastUpdatedAt
            ? new Date(slot.lastUpdatedAt).getTime()
            : now - 1000;
          const elapsedSeconds = Math.max(0, (now - previousTime) / 1000);
          const shouldUseOfflineSpeed =
            document.visibilityState !== "visible" || !navigator.onLine;
          return simulateSlot(
            slot,
            elapsedSeconds,
            shouldUseOfflineSpeed ? OFFLINE_SIMULATION_SPEED : undefined,
          );
        });
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [storageReady]);

  useEffect(() => {
    if (!storageReady) return;

    async function catchUpAndSync() {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;

      const nextSlots = slotsRef.current.map((slot) =>
        slot.status === "running"
          ? catchUpSlot(slot, OFFLINE_SIMULATION_SPEED)
          : slot,
      );
      slotsRef.current = nextSlots;
      setSlots(nextSlots);

      if (userId) {
        await saveProgressToAccount(nextSlots, activeSlotId);
      }
    }

    document.addEventListener("visibilitychange", catchUpAndSync);
    window.addEventListener("online", catchUpAndSync);
    window.addEventListener("focus", catchUpAndSync);

    return () => {
      document.removeEventListener("visibilitychange", catchUpAndSync);
      window.removeEventListener("online", catchUpAndSync);
      window.removeEventListener("focus", catchUpAndSync);
    };
  }, [activeSlotId, storageReady, userId]);

  useEffect(() => {
    if (!activeSlot) return;
    setDraftSelections({ ...activeSlot.selections });
    setBusinessNameDraft(activeSlot.businessName);
    setOperatingDraft({
      stockUnits: activeSlot.stockUnits,
      staffCount: activeSlot.staffCount,
      averageMonthlySalary: activeSlot.averageMonthlySalary,
      onlineMarketingBudget: activeSlot.onlineMarketingBudget,
      offlineMarketingBudget: activeSlot.offlineMarketingBudget,
    });
    const fallbackValuation =
      activeSlot.status === "running"
        ? calculateBusinessValuation(activeSlot).valuation
        : 0;
    setListingPriceDraft(
      activeSlot.saleListing.listedPrice ||
        activeSlot.saleListing.analystReport?.valuation ||
        fallbackValuation,
    );
  }, [
    activeSlot?.id,
    activeSlot?.businessName,
    activeSlot?.status,
    activeSlot?.staffCount,
    activeSlot?.averageMonthlySalary,
    activeSlot?.onlineMarketingBudget,
    activeSlot?.offlineMarketingBudget,
    activeSlot?.saleListing.listedPrice,
    activeSlot?.saleListing.analystReport?.valuation,
  ]);


  async function markWelcomeOfferSeen() {
    setWelcomeOfferOpen(false);
    const { error } = await supabase.rpc(
      "mark_milos_club_welcome_offer_seen",
    );
    if (error) {
      console.warn("Could not save welcome-offer state:", error.message);
    }
  }

  async function openWelcomeOfferCheckout() {
    await markWelcomeOfferSeen();
    window.location.href = WELCOME_TOKEN_OFFER_URL;
  }

  async function resetAllBusinesses() {
    if (!userId || resetting) return;

    const confirmed = window.confirm(
      "Restart all three businesses? This permanently removes every storefront, negotiation and agreement for this account. Dream Tokens already spent or earned are not reversed.",
    );
    if (!confirmed) return;

    setResetting(true);
    setPageMessage("");

    const { error } = await supabase.rpc("reset_milo_business_builder");

    if (error) {
      setResetting(false);
      setPageMessage(`Could not restart the businesses: ${error.message}`);
      return;
    }

    localStorage.removeItem(storageKey);
    localStorage.removeItem(legacyStorageKey);
    const freshSlots = createDefaultSlots();
    slotsRef.current = freshSlots;
    setSlots(freshSlots);
    setActiveSlotId(null);
    setSelectedBusinessId(null);
    setRequestedBudget(0);
    setPersonalContribution(0);
    setView("storefronts");
    setLastCloudSavedAt(null);
    setResetting(false);
    setPageMessage("All Business Builder storefronts have been restarted.");
  }

  function selectStorefront(slot: BusinessSlot) {
    setActiveSlotId(slot.id);
    setPageMessage("");

    if (slot.status === "empty") {
      setIntroOpen(true);
      return;
    }

    if (slot.status === "setup") {
      setView("setup");
      return;
    }

    setView("analytics");
  }

  function beginBusinessSelection() {
    setIntroOpen(false);
    setSelectedBusinessId(null);
    setView("businesses");
  }

  function chooseBusiness(business: BusinessOption) {
    setSelectedBusinessId(business.id);
    setRequestedBudget(business.minCapital);
    setFundingStep("personal");
    setPersonalContribution(0);
    setPageMessage("");
    setView("funding");
  }

  function approveFunding() {
    if (!activeSlotId || !selectedBusiness) return;

    const cleanContribution = Math.max(0, Math.floor(personalContribution));
    const requiresAssets = selectedBusiness.minCapital > 50000;
    const requiredAssets = selectedBusiness.minCapital * 0.1;

    if (cleanContribution > dreamTokenBalance) {
      setPageMessage(
        `You only have ${formatMoney(dreamTokenBalance)} available in your Dream Token balance.`,
      );
      return;
    }

    if (requiresAssets && profileNetWorth < requiredAssets) {
      setPageMessage(
        `This business tier requires at least ${formatMoney(requiredAssets)} in profile assets.`,
      );
      return;
    }

    setPersonalContribution(cleanContribution);
    setRequestedBudget(
      clamp(
        selectedBusiness.minCapital - cleanContribution,
        0,
        selectedBusiness.maxCapital,
      ),
    );
    setFundingStep("milo");
    setPageMessage("");
  }

  async function confirmFunding() {
    if (!activeSlotId || !selectedBusiness || fundingSubmitting) return;

    const cleanContribution = Math.max(0, Math.floor(personalContribution));

    if (cleanContribution > dreamTokenBalance) {
      setPageMessage(
        `You only have ${formatMoney(dreamTokenBalance)} available in your Dream Token balance.`,
      );
      return;
    }

    const totalBudget = requestedBudget + cleanContribution;

    if (totalBudget < selectedBusiness.minCapital) {
      setPageMessage(
        `This business needs at least ${formatMoney(selectedBusiness.minCapital)} in total start-up capital.`,
      );
      return;
    }

    setFundingSubmitting(true);

    if (cleanContribution > 0) {
      const { error } = await supabase.from("dream_token_transactions").insert({
        user_id: userId,
        amount: -cleanContribution,
        token_kind: "virtual",
        type: "spend",
        title: `Personal funding for ${selectedBusiness.title}`,
      });

      if (error) {
        setFundingSubmitting(false);
        setPageMessage(
          `Your personal funding could not be transferred: ${error.message}`,
        );
        return;
      }
    }

    const ownership = getOwnershipForContributions(
      cleanContribution,
      requestedBudget,
    );
    const defaultName = `My ${selectedBusiness.title}`;
    const setupCostBasis = clamp(
      totalBudget,
      selectedBusiness.minCapital,
      selectedBusiness.maxCapital,
    );
    const summary = getSetupSummary(
      setupCostBasis,
      DEFAULT_SELECTIONS,
      totalBudget,
    );

    const nextSlots = slots.map((slot) =>
      slot.id === activeSlotId
        ? {
            ...slot,
            status: "setup" as const,
            businessTypeId: selectedBusiness.id,
            businessName: defaultName,
            approvedBudget: totalBudget,
            miloInvestment: requestedBudget,
            personalContribution: cleanContribution,
            miloOwnership: ownership.miloOwnership,
            userOwnership: ownership.userOwnership,
            selections: { ...DEFAULT_SELECTIONS },
            stockUnits: 0,
            staffCount: 0,
            averageMonthlySalary: 0,
            onlineMarketingBudget: 0,
            offlineMarketingBudget: 0,
            demandMomentum: 0,
            eventLog: [],
            appliedEventIds: [],
            setupSpend: summary.setupSpend,
            cash: summary.remainingCash,
            launchedAt: null,
            simulatedMinutes: 0,
            simulationSpeed: 1 as SimulationSpeed,
            revenue: 0,
            expenses: 0,
            sales: 0,
            customerSatisfaction: 68,
            cycleNumber: 1,
            cycleSimulatedMinutes: 0,
            cycleRevenue: 0,
            cycleExpenses: 0,
            cycleProfit: 0,
            cycleStatus: "running" as CycleStatus,
            lastCycleCompletedDateSg: null,
            cycleHistory: [],
            lastUpdatedAt: null,
          }
        : slot,
    );

    setSlots(nextSlots);
    if (cleanContribution > 0) {
      setDreamTokenBalance((balance) => balance - cleanContribution);
      setProfileAssets((current) => ({
        ...current,
        cash: Math.max(0, current.cash - cleanContribution),
      }));
      setProfileNetWorth((current) => Math.max(0, current - cleanContribution));
      setProfileNetWorth((value) => Math.max(0, value - cleanContribution));
      window.dispatchEvent(new Event("dream-tokens-updated"));
    }

    const cloudSaved = await saveProgressToAccount(nextSlots, activeSlotId);

    setDraftSelections({ ...DEFAULT_SELECTIONS });
    setBusinessNameDraft(defaultName);
    setActiveSetupCategory("location");
    setPageMessage(
      `${
        cleanContribution > 0
          ? `${formatMoney(cleanContribution)} of your personal DT has been added to the business budget.`
          : "Milo’s investment has been approved."
      } ${
        cloudSaved
          ? "The funding agreement is saved to your account."
          : "Your browser copy is saved locally, but cloud save still needs the supplied Supabase table."
      }`,
    );
    setFundingSubmitting(false);
    setView("setup");
  }

  function saveSetupAndLaunch() {
    if (!activeSlot || !activeBusiness) return;

    const cleanName = businessNameDraft.trim();
    const summary = getSetupSummary(
      getSetupCostBasis(activeSlot),
      draftSelections,
      activeSlot.approvedBudget,
    );

    if (!cleanName) {
      setPageMessage("Give your business a name before continuing.");
      return;
    }

    if (summary.setupSpend > activeSlot.approvedBudget) {
      setPageMessage(
        "This setup is over the approved business budget. Choose a less expensive option in at least one category.",
      );
      return;
    }

    const now = new Date().toISOString();
    const initialControls = getInitialOperatingControls({
      ...activeSlot,
      selections: draftSelections,
    });

    setSlots((current) =>
      current.map((slot) =>
        slot.id === activeSlot.id
          ? {
              ...slot,
              status: "running",
              businessName: cleanName,
              selections: { ...draftSelections },
              stockUnits: initialControls.stockUnits,
              staffCount: initialControls.staffCount,
              averageMonthlySalary: initialControls.averageMonthlySalary,
              onlineMarketingBudget: initialControls.onlineMarketingBudget,
              offlineMarketingBudget: initialControls.offlineMarketingBudget,
              demandMomentum: 0,
              eventLog: [],
              appliedEventIds: [],
              setupSpend: summary.setupSpend,
              cash: summary.remainingCash,
              launchedAt: now,
              simulatedMinutes: 0,
              simulationSpeed: 1,
              revenue: 0,
              expenses: 0,
              sales: 0,
              customerSatisfaction: 68,
              cycleNumber: 1,
              cycleSimulatedMinutes: 0,
              cycleRevenue: 0,
              cycleExpenses: 0,
              cycleProfit: 0,
              cycleStatus: "running",
              lastCycleCompletedDateSg: null,
              cycleHistory: [],
              saleListing: {
                status: "unlisted",
                listedPrice: 0,
                listedAt: null,
                listedCycle: null,
                analystReport: null,
                offers: [],
                offersGeneratedCycle: null,
              },
              lastUpdatedAt: now,
            }
          : slot,
      ),
    );

    setPageMessage("");
    setView("analytics");
  }

  function saveOperatingChanges() {
    if (!activeSlot || activeSlot.status !== "running") return;

    const nextStaffCount = Math.max(0, Math.round(operatingDraft.staffCount));
    const nextSalary = Math.max(0, Math.round(operatingDraft.averageMonthlySalary));
    const nextOnlineBudget = Math.max(
      0,
      Math.round(operatingDraft.onlineMarketingBudget),
    );
    const nextOfflineBudget = Math.max(
      0,
      Math.round(operatingDraft.offlineMarketingBudget),
    );

    setSlots((current) =>
      current.map((slot) =>
        slot.id === activeSlot.id
          ? {
              ...slot,
              staffCount: nextStaffCount,
              averageMonthlySalary: nextSalary,
              onlineMarketingBudget: nextOnlineBudget,
              offlineMarketingBudget: nextOfflineBudget,
              lastUpdatedAt: new Date().toISOString(),
            }
          : slot,
      ),
    );

    setOperatingDraft((current) => ({
      ...current,
      staffCount: nextStaffCount,
      averageMonthlySalary: nextSalary,
      onlineMarketingBudget: nextOnlineBudget,
      offlineMarketingBudget: nextOfflineBudget,
    }));
    setPageMessage(
      "Staffing and marketing controls were updated. The daily profit forecast now reflects the new running costs.",
    );
  }

  function buyStockUnits() {
    if (!activeSlot || activeSlot.status !== "running") return;
    const units = Math.max(1, Math.floor(stockTradeUnits));
    const { buyPrice } = getStockPrices(activeSlot);
    const totalCost = units * buyPrice;

    if (activeSlot.cash < totalCost) {
      setPageMessage(
        `Buying ${units} units costs ${formatMoney(totalCost)}, but the business only has ${formatMoney(activeSlot.cash)} available.`,
      );
      return;
    }

    setSlots((current) =>
      current.map((slot) =>
        slot.id === activeSlot.id
          ? {
              ...slot,
              stockUnits: slot.stockUnits + units,
              cash: slot.cash - totalCost,
              lastUpdatedAt: new Date().toISOString(),
            }
          : slot,
      ),
    );
    setPageMessage(
      `${units} stock units were purchased for ${formatMoney(totalCost)}.`,
    );
  }

  function sellStockUnits() {
    if (!activeSlot || activeSlot.status !== "running") return;
    const units = Math.min(
      Math.max(1, Math.floor(stockTradeUnits)),
      Math.floor(activeSlot.stockUnits),
    );

    if (units <= 0) {
      setPageMessage("There is no stock available to sell off.");
      return;
    }

    const { sellPrice } = getStockPrices(activeSlot);
    const proceeds = units * sellPrice;
    setSlots((current) =>
      current.map((slot) =>
        slot.id === activeSlot.id
          ? {
              ...slot,
              stockUnits: Math.max(0, slot.stockUnits - units),
              cash: slot.cash + proceeds,
              lastUpdatedAt: new Date().toISOString(),
            }
          : slot,
      ),
    );
    setPageMessage(
      `${units} stock units were sold off for ${formatMoney(proceeds)}.`,
    );
  }

  function openNegotiation(
    topic: "stock-buy" | "stock-sell" | "staff" | "milo",
  ) {
    if (!activeSlot) return;
    const units = Math.max(1, Math.floor(stockTradeUnits));
    window.location.href = `/milo-world/club/negotiation?slot=${activeSlot.id}&topic=${topic}&units=${units}`;
  }

  async function saveProgressToAccount(
    progressSlots: BusinessSlot[] = slots,
    progressActiveSlotId: 1 | 2 | 3 | null = activeSlotId,
  ) {
    if (clubAccess === "denied" && userId) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          background: "#080604",
          color: "white",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          textAlign: "center",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        Returning to Milo’s Club membership…
      </main>
    );
  }

  if (!userId) {
      setPageMessage("Log in before saving your progress.");
      return false;
    }

    setSaveState("saving");

    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from(BUSINESS_PROGRESS_TABLE).upsert(
      {
        user_id: userId,
        slots: progressSlots,
        active_slot_id: progressActiveSlotId,
        updated_at: updatedAt,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.warn("Could not save Business Builder progress:", error);
      setSaveState("error");
      setPageMessage(
        `Cloud save failed: ${error.message}. Your browser copy is still saved locally.`,
      );
      return false;
    }

    setSaveState("saved");
    setLastCloudSavedAt(updatedAt);
    window.setTimeout(() => setSaveState("idle"), 2400);
    return true;
  }

  async function hireBusinessAnalyst() {
    if (!activeSlot || activeSlot.status !== "running" || saleActionState !== "idle") return;

    if (activeSlot.cycleStatus === "awaiting-allocation") {
      setPageMessage(
        "Allocate the completed cycle before ordering an analyst report so the valuation uses the final cash position.",
      );
      return;
    }

    const fee = getAnalystFee();
    if (activeSlot.cash < fee) {
      setPageMessage(
        `The analyst fee is ${formatMoney(fee)}, but the business only has ${formatMoney(activeSlot.cash)} available.`,
      );
      return;
    }

    setSaleActionState("analysing");
    const report = calculateBusinessValuation({
      ...activeSlot,
      cash: activeSlot.cash - fee,
      expenses: activeSlot.expenses + fee,
      cycleExpenses:
        activeSlot.cycleStatus === "running"
          ? activeSlot.cycleExpenses + fee
          : activeSlot.cycleExpenses,
      cycleProfit:
        activeSlot.cycleStatus === "running"
          ? activeSlot.cycleRevenue - (activeSlot.cycleExpenses + fee)
          : activeSlot.cycleProfit,
    });
    const nextSlots = slots.map((slot) =>
      slot.id === activeSlot.id
        ? {
            ...slot,
            cash: slot.cash - fee,
            expenses: slot.expenses + fee,
            cycleExpenses:
              slot.cycleStatus === "running"
                ? slot.cycleExpenses + fee
                : slot.cycleExpenses,
            cycleProfit:
              slot.cycleStatus === "running"
                ? slot.cycleRevenue - (slot.cycleExpenses + fee)
                : slot.cycleProfit,
            saleListing: {
              ...slot.saleListing,
              analystReport: report,
            },
            lastUpdatedAt: new Date().toISOString(),
          }
        : slot,
    );

    setSlots(nextSlots);
    setListingPriceDraft(report.valuation);
    setPageMessage(
      `The analyst completed a market evaluation of ${formatMoney(report.valuation)}. The ${formatMoney(fee)} fee was paid from business cash.`,
    );
    await saveProgressToAccount(nextSlots, activeSlot.id);
    setSaleActionState("idle");
  }

  async function placeOrUpdateSaleListing() {
    if (
      !activeSlot ||
      activeSlot.status !== "running" ||
      !activeSlot.saleListing.analystReport ||
      saleActionState !== "idle"
    ) {
      return;
    }

    const cleanPrice = Math.max(1, Math.round(listingPriceDraft / 50) * 50);
    setSaleActionState("listing");
    const now = new Date().toISOString();
    const nextSlots = slots.map((slot) =>
      slot.id === activeSlot.id
        ? {
            ...slot,
            saleListing: {
              ...slot.saleListing,
              status: "listed" as const,
              listedPrice: cleanPrice,
              listedAt: slot.saleListing.listedAt || now,
              listedCycle: slot.saleListing.listedCycle || slot.cycleNumber,
              offers: slot.saleListing.listedPrice === cleanPrice ? slot.saleListing.offers : [],
              offersGeneratedCycle:
                slot.saleListing.listedPrice === cleanPrice
                  ? slot.saleListing.offersGeneratedCycle
                  : null,
            },
            lastUpdatedAt: now,
          }
        : slot,
    );

    setSlots(nextSlots);
    setListingPriceDraft(cleanPrice);
    setPageMessage(
      `${activeSlot.businessName} is listed for ${formatMoney(cleanPrice)}. Complete another 30-day cycle to receive three buyer offers.`,
    );
    await saveProgressToAccount(nextSlots, activeSlot.id);
    setSaleActionState("idle");
  }

  async function withdrawSaleListing() {
    if (!activeSlot || activeSlot.status !== "running") return;

    const nextSlots = slots.map((slot) =>
      slot.id === activeSlot.id
        ? {
            ...slot,
            saleListing: {
              ...slot.saleListing,
              status: "unlisted" as const,
              listedPrice: 0,
              listedAt: null,
              listedCycle: null,
              offers: [],
              offersGeneratedCycle: null,
            },
            lastUpdatedAt: new Date().toISOString(),
          }
        : slot,
    );
    setSlots(nextSlots);
    setPageMessage("The business has been removed from the market.");
    await saveProgressToAccount(nextSlots, activeSlot.id);
  }

  async function acceptSaleOffer(offer: SaleOffer) {
    if (
      !activeSlot ||
      activeSlot.status !== "running" ||
      saleActionState !== "idle"
    ) {
      return;
    }

    if (activeSlot.cycleStatus === "awaiting-allocation") {
      setPageMessage(
        "Allocate the completed cycle before accepting a sale offer. This keeps the final business cash and valuation accurate.",
      );
      return;
    }

    setSaleActionState("selling");
    const userProceeds = Math.max(0, Math.round(offer.amount * activeSlot.userOwnership));
    const miloProceeds = Math.max(0, offer.amount - userProceeds);
    const { error } = await supabase.from("dream_token_transactions").insert({
      user_id: userId,
      amount: userProceeds,
      token_kind: "virtual",
      type: "earn",
      title: `Sale of ${activeSlot.businessName} to ${offer.buyerName}`,
    });

    if (error) {
      setSaleActionState("idle");
      setPageMessage(`The sale could not be completed: ${error.message}`);
      return;
    }

    const soldSlotId = activeSlot.id;
    const soldBusinessName = activeSlot.businessName;
    const nextSlots = slots.map((slot) =>
      slot.id === soldSlotId ? createEmptySlot(soldSlotId) : slot,
    );
    setSlots(nextSlots);
    setDreamTokenBalance((balance) => balance + userProceeds);
    setProfileAssets((current) => ({
      ...current,
      cash: current.cash + userProceeds,
    }));
    setProfileNetWorth((current) => current + userProceeds);
    setProfileNetWorth((value) => value + userProceeds);
    setActiveSlotId(null);
    setSelectedBusinessId(null);
    setView("storefronts");
    setPageMessage(
      `${soldBusinessName} was sold to ${offer.buyerName} for ${formatMoney(offer.amount)}. Your ${Math.round(activeSlot.userOwnership * 100)}% share of ${formatMoney(userProceeds)} was credited to your Dreamscape Token balance. Milo received ${formatMoney(miloProceeds)}.`,
    );
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await saveProgressToAccount(nextSlots, null);
    setSaleActionState("idle");
  }

  async function settleThirtyDayCycle() {
    if (
      !activeSlot ||
      activeSlot.status !== "running" ||
      activeSlot.cycleStatus !== "awaiting-allocation" ||
      cycleSubmitting
    ) {
      return;
    }

    setCycleSubmitting(true);

    const cycleProfit = activeSlot.cycleProfit;
    const reinvested =
      cycleProfit > 0 ? cycleProfit * (reinvestmentPercent / 100) : 0;
    const dividendPool = cycleProfit > 0 ? cycleProfit - reinvested : 0;
    const userDividend = Math.max(
      0,
      Math.round(dividendPool * activeSlot.userOwnership),
    );
    const miloDividend = Math.max(0, dividendPool - userDividend);

    if (userDividend > 0) {
      const { error } = await supabase.from("dream_token_transactions").insert({
        user_id: userId,
        amount: userDividend,
        token_kind: "virtual",
        type: "earn",
        title: `${activeSlot.businessName} cycle ${activeSlot.cycleNumber} dividend`,
      });

      if (error) {
        setCycleSubmitting(false);
        setPageMessage(
          `The dividend could not be paid to your account: ${error.message}`,
        );
        return;
      }
    }

    const completedDateSg =
      activeSlot.lastCycleCompletedDateSg || getSingaporeDateString();
    const record: CycleHistoryRecord = {
      cycleNumber: activeSlot.cycleNumber,
      completedDateSg,
      revenue: activeSlot.cycleRevenue,
      expenses: activeSlot.cycleExpenses,
      profit: cycleProfit,
      reinvested,
      dividendPool,
      userDividend,
      miloDividend,
    };

    const nextSlots = slots.map((slot) =>
      slot.id === activeSlot.id
        ? {
            ...slot,
            cash: slot.cash - dividendPool,
            cycleStatus: "settled" as CycleStatus,
            simulationSpeed: 0 as SimulationSpeed,
            lastCycleCompletedDateSg: completedDateSg,
            cycleHistory: [...slot.cycleHistory, record],
            lastUpdatedAt: new Date().toISOString(),
          }
        : slot,
    );

    setSlots(nextSlots);
    if (userDividend > 0) {
      setDreamTokenBalance((balance) => balance + userDividend);
      setProfileAssets((current) => ({
        ...current,
        cash: current.cash + userDividend,
      }));
      setProfileNetWorth((current) => current + userDividend);
      setProfileNetWorth((value) => value + userDividend);
      window.dispatchEvent(new Event("dream-tokens-updated"));
    }

    setPageMessage(
      cycleProfit > 0
        ? `Cycle ${activeSlot.cycleNumber} settled. ${formatMoney(reinvested)} remains in the business and ${formatMoney(userDividend)} was paid to your Dream Token balance.`
        : `Cycle ${activeSlot.cycleNumber} ended with a loss of ${formatMoney(Math.abs(cycleProfit))}. No dividend was available.`,
    );
    setCycleSubmitting(false);
    await saveProgressToAccount(nextSlots, activeSlot.id);
  }

  function changeSimulationSpeed(speed: SimulationSpeed) {
    if (!activeSlot || activeSlot.status !== "running") return;

    if (activeSlot.cycleStatus !== "running") {
      setPageMessage(
        activeSlot.cycleStatus === "awaiting-allocation"
          ? "Allocate the completed 30-day cycle before continuing."
          : "Your next 30-day cycle unlocks on the next Singapore calendar day.",
      );
      return;
    }

    setSlots((current) =>
      current.map((slot) =>
        slot.id === activeSlot.id
          ? {
              ...slot,
              simulationSpeed: speed,
              lastUpdatedAt: new Date().toISOString(),
            }
          : slot,
      ),
    );
  }

  function navigate(nextView: ViewName) {
    setPageMessage("");
    setMobileMenuOpen(false);

    if (nextView === "storefronts") {
      setView("storefronts");
      return;
    }

    if (nextView === "businesses") {
      if (!activeSlotId) {
        setPageMessage("Choose a storefront first.");
        setView("storefronts");
        return;
      }
      setView("businesses");
      return;
    }

    if (nextView === "setup") {
      if (!activeSlot || activeSlot.status !== "setup") return;
      setDraftSelections({ ...activeSlot.selections });
      setBusinessNameDraft(activeSlot.businessName);
      setView("setup");
      return;
    }

    if (nextView === "analytics") {
      if (!activeSlot || activeSlot.status !== "running") return;
      setView("analytics");
      return;
    }

    if (nextView === "market" || nextView === "sell") {
      if (!activeSlot || activeSlot.status !== "running") return;
      setView(nextView);
      return;
    }

    if (nextView === "talk") {
      if (!activeSlot || activeSlot.status !== "running") return;
      openNegotiation("milo");
    }
  }

  const navButtonStyle: CSSProperties = {
    minHeight: "44px",
    borderRadius: "999px",
    border: "1px solid rgba(218,151,74,0.3)",
    background: "rgba(31,18,11,0.74)",
    color: "white",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    padding: "0 17px",
    fontSize: "15px",
    fontWeight: 800,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
  };

  const menuItems: {
    id: ViewName;
    label: string;
    icon: string;
    enabled: boolean;
  }[] = [
    {
      id: "storefronts",
      label: "My Storefronts",
      icon: "▤",
      enabled: true,
    },
    {
      id: "businesses",
      label: "Business Types",
      icon: "◇",
      enabled: Boolean(activeSlotId && activeSlot?.status !== "running"),
    },
    {
      id: "setup",
      label: "Business Setup",
      icon: "⚙",
      enabled: Boolean(activeSlot && activeSlot.status === "setup"),
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: "↗",
      enabled: Boolean(activeSlot && activeSlot.status === "running"),
    },
    {
      id: "market",
      label: "Industry Market",
      icon: "⌁",
      enabled: Boolean(activeSlot && activeSlot.status === "running"),
    },
    {
      id: "sell",
      label: "Sell Business",
      icon: "◈",
      enabled: Boolean(activeSlot && activeSlot.status === "running"),
    },
    {
      id: "talk",
      label: "Talk to Milo",
      icon: "✦",
      enabled: Boolean(activeSlot && activeSlot.status === "running"),
    },
  ];

  const sidebar = (
    <aside
      style={{
        minWidth: 0,
        minHeight: 0,
        borderRight: compact ? "none" : "1px solid rgba(218,151,74,0.14)",
        background:
          "linear-gradient(180deg, rgba(26,14,9,0.94), rgba(4,7,14,0.97))",
        padding: compact ? "16px" : "18px",
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        gap: "18px",
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            color: "#efbb70",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Milo’s Club Flagship
        </p>
        <h2
          style={{
            margin: "7px 0 0",
            color: "white",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "32px",
            fontWeight: 500,
            lineHeight: 1.05,
          }}
        >
          Business Builder
        </h2>
        <p
          style={{
            margin: "9px 0 0",
            color: "rgba(255,255,255,0.48)",
            fontSize: "14px",
            lineHeight: 1.5,
          }}
        >
          Build it. Run it. Improve it.
        </p>
      </div>

      <div style={{ minHeight: 0, display: "grid", alignContent: "start", gap: "10px" }}>
        {menuItems.map((item) => {
          const active = view === item.id;

          return (
            <button
              key={item.id}
              type="button"
              disabled={!item.enabled}
              onClick={() => navigate(item.id)}
              style={{
                minHeight: "58px",
                borderRadius: "16px",
                border: active
                  ? "1px solid rgba(239,187,112,0.65)"
                  : "1px solid rgba(218,151,74,0.14)",
                background: active
                  ? "linear-gradient(145deg, rgba(110,60,25,0.78), rgba(12,15,24,0.92))"
                  : "rgba(255,255,255,0.025)",
                color: item.enabled ? "white" : "rgba(255,255,255,0.25)",
                display: "grid",
                gridTemplateColumns: "36px 1fr auto",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                textAlign: "left",
                fontFamily: "inherit",
                cursor: item.enabled ? "pointer" : "not-allowed",
                boxShadow: active ? "0 0 24px rgba(218,151,74,0.1)" : "none",
              }}
            >
              <span
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "11px",
                  border: "1px solid rgba(239,187,112,0.22)",
                  background: "rgba(218,151,74,0.08)",
                  color: active ? "#f3c47c" : "rgba(255,255,255,0.54)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "18px",
                }}
              >
                {item.icon}
              </span>
              <strong style={{ fontSize: "15px", lineHeight: 1.3 }}>
                {item.label}
              </strong>
              <span style={{ color: "#eab46a", fontSize: "20px" }}>›</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          borderRadius: "18px",
          border: "1px solid rgba(218,151,74,0.17)",
          background: "rgba(255,255,255,0.025)",
          padding: "14px",
        }}
      >
        <span
          style={{
            display: "block",
            color: "rgba(255,255,255,0.42)",
            fontSize: "12px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Profile net worth
        </span>
        <strong
          style={{
            display: "block",
            marginTop: "7px",
            color: "#f2c37d",
            fontSize: "24px",
          }}
        >
          {netWorthLoading ? "Loading..." : formatMoney(profileNetWorth)}
        </strong>
        <span
          style={{
            display: "block",
            marginTop: "6px",
            color: "rgba(255,255,255,0.38)",
            fontSize: "13px",
            lineHeight: 1.4,
          }}
        >
          Used to assess higher-tier investments.
        </span>

        <div
          style={{
            marginTop: "13px",
            paddingTop: "13px",
            borderTop: "1px solid rgba(218,151,74,0.12)",
            display: "grid",
            gap: "7px",
          }}
        >
          <span
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              color: "rgba(255,255,255,0.48)",
              fontSize: "13px",
            }}
          >
            <span>DT balance</span>
            <strong style={{ color: "#f2c37d" }}>
              {formatMoney(dreamTokenBalance)}
            </strong>
          </span>
          <span
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              color: "rgba(255,255,255,0.42)",
              fontSize: "12px",
            }}
          >
            <span>Cloud progress</span>
            <strong style={{ color: lastCloudSavedAt ? "#9ff0bd" : "rgba(255,255,255,0.48)" }}>
              {lastCloudSavedAt ? "Saved" : "Not saved yet"}
            </strong>
          </span>
          <button
            type="button"
            onClick={resetAllBusinesses}
            disabled={resetting}
            style={{
              marginTop: "7px",
              minHeight: "42px",
              borderRadius: "12px",
              border: "1px solid rgba(255,128,101,0.24)",
              background: "rgba(121,42,31,0.13)",
              color: resetting ? "rgba(255,255,255,0.38)" : "#ffc0aa",
              fontSize: "13px",
              fontWeight: 850,
              cursor: resetting ? "wait" : "pointer",
            }}
          >
            {resetting ? "Restarting..." : "Restart All Businesses"}
          </button>
        </div>
      </div>
    </aside>
  );

  if (authLoading || clubAccess === "checking") {
    return (
      <main
        style={{
          minHeight: "100dvh",
          background: "#080604",
          color: "white",
          display: "grid",
          placeItems: "center",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        Loading Milo’s Business Builder...
      </main>
    );
  }

  if (!userId) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          background:
            "radial-gradient(circle at top, rgba(112,61,25,0.35), transparent 35%), linear-gradient(180deg, #130b06, #04070e)",
          color: "white",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            width: "min(620px, 100%)",
            borderRadius: "30px",
            border: "1px solid rgba(226,157,77,0.3)",
            background: "rgba(13,10,10,0.86)",
            padding: mobile ? "28px" : "42px",
            textAlign: "center",
            boxShadow: "0 34px 90px rgba(0,0,0,0.46)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#edb970",
              fontSize: "13px",
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Milo’s World
          </p>
          <h1
            style={{
              margin: "14px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: mobile ? "40px" : "56px",
              lineHeight: 0.98,
              fontWeight: 500,
            }}
          >
            Milo’s Business Builder
          </h1>
          <p
            style={{
              margin: "20px auto 0",
              maxWidth: "470px",
              color: "rgba(255,255,255,0.62)",
              lineHeight: 1.65,
            }}
          >
            Log in to create businesses, save your storefronts and use your
            Dreamscape profile assets for higher investment tiers.
          </p>
          <Link
            href="/login"
            style={{
              marginTop: "26px",
              minHeight: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #d89445, #8b4a20)",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 28px",
              fontWeight: 900,
            }}
          >
            Log In to Begin
          </Link>
        </div>
      </main>
    );
  }

  const setupSummary = activeSlot
    ? getSetupSummary(
        getSetupCostBasis(activeSlot),
        draftSelections,
        activeSlot.approvedBudget,
      )
    : null;
  const operatingForecast = activeSlot
    ? getPerformanceForecast({
        ...activeSlot,
        selections:
          activeSlot.status === "setup" ? draftSelections : activeSlot.selections,
        staffCount:
          activeSlot.status === "running"
            ? operatingDraft.staffCount
            : activeSlot.staffCount,
        averageMonthlySalary:
          activeSlot.status === "running"
            ? operatingDraft.averageMonthlySalary
            : activeSlot.averageMonthlySalary,
        onlineMarketingBudget:
          activeSlot.status === "running"
            ? operatingDraft.onlineMarketingBudget
            : activeSlot.onlineMarketingBudget,
        offlineMarketingBudget:
          activeSlot.status === "running"
            ? operatingDraft.offlineMarketingBudget
            : activeSlot.offlineMarketingBudget,
      })
    : {
        dailyRevenue: 0,
        dailyExpenses: 0,
        dailyProfit: 0,
        dailyOrders: 0,
        dailyStockUnitsUsed: 0,
        dailyCashOperatingCosts: 0,
        dailyVariableCosts: 0,
        satisfactionTarget: 50,
        monthlyFixedCosts: 0,
        recommendedSalary: 0,
        recommendedMarketingBudget: 0,
      };
  const profit = activeSlot ? activeSlot.revenue - activeSlot.expenses : 0;
  const simulatedDays = activeSlot ? activeSlot.simulatedMinutes / 1440 : 0;
  const cycleDays = activeSlot
    ? Math.min(CYCLE_DAYS, activeSlot.cycleSimulatedMinutes / 1440)
    : 0;
  const cycleProgress = Math.min(100, (cycleDays / CYCLE_DAYS) * 100);
  const fundingOwnership = getOwnershipForContributions(
    personalContribution,
    requestedBudget,
  );
  const totalFunding = personalContribution + requestedBudget;
  const cycleDividendPool =
    activeSlot && activeSlot.cycleProfit > 0
      ? activeSlot.cycleProfit * (1 - reinvestmentPercent / 100)
      : 0;
  const projectedUserDividend = activeSlot
    ? Math.round(cycleDividendPool * activeSlot.userOwnership)
    : 0;
  const projectedMiloDividend = Math.max(
    0,
    cycleDividendPool - projectedUserDividend,
  );
  const activeMarket = activeSlot ? getMarketSnapshot(activeSlot) : null;
  const liveValuation = activeSlot ? calculateBusinessValuation(activeSlot) : null;
  const saleReport = activeSlot?.saleListing.analystReport || null;
  const projectedSaleUserShare = activeSlot
    ? Math.round(listingPriceDraft * activeSlot.userOwnership)
    : 0;
  const activeStockPrices = activeSlot
    ? getStockPrices(activeSlot)
    : { buyPrice: 0, sellPrice: 0 };
  const upcomingEvents =
    activeSlot && activeBusiness
      ? getUniformEventSchedule(activeBusiness.industryId)
          .filter(
            (event) =>
              event.day > Math.floor(activeSlot.simulatedMinutes / 1440) &&
              !activeSlot.appliedEventIds.includes(event.id),
          )
          .slice(0, 4)
      : [];

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        overflowX: "hidden",
        background: "#080604",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .milo-business-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(212,145,65,0.5) rgba(255,255,255,0.04); }
        .milo-business-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .milo-business-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,145,65,0.5); border-radius: 999px; }
        input[type="range"] { accent-color: #d99548; }
        @media (max-width: 760px) {
          .milo-dialogue-panel { padding: 230px 22px 24px !important; }
          .milo-dialogue-panel img { left: 50% !important; transform: translateX(-50%); height: 250px !important; }
          .milo-market-scroll { margin-left: -8px; margin-right: -8px; }
          button, input, select { font-size: 16px; }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(circle at 55% -10%, rgba(125,67,27,0.42), transparent 38%), radial-gradient(circle at 95% 70%, rgba(19,42,72,0.2), transparent 34%), linear-gradient(180deg, #140c07 0%, #080707 45%, #040812 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(224,153,72,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(224,153,72,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to bottom, black, transparent 88%)",
          pointerEvents: "none",
        }}
      />

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          minHeight: mobile ? "58px" : "70px",
          borderBottom: "1px solid rgba(218,151,74,0.14)",
          background: "rgba(10,7,6,0.82)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          display: "grid",
          gridTemplateColumns: mobile ? "1fr auto" : "1fr auto 1fr",
          alignItems: "center",
          gap: "12px",
          padding: mobile ? "7px 9px" : "10px 18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {compact && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Business Builder menu"
              style={{ ...navButtonStyle, width: "42px", padding: 0, cursor: "pointer" }}
            >
              ☰
            </button>
          )}
          <Link href="/milo-world" style={navButtonStyle}>
            ← {mobile ? "Milo" : "Milo’s World"}
          </Link>
        </div>

        {!mobile && (
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                margin: 0,
                color: "#efba6f",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Interactive Business Simulation · Ages 13+
            </p>
            <h1
              style={{
                margin: "4px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "30px",
                lineHeight: 1,
                fontWeight: 500,
              }}
            >
              Milo’s Business Builder
            </h1>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <ProfileAssetsDropdown
            assets={profileAssets}
            loading={netWorthLoading}
            open={assetsOpen}
            onToggle={() => setAssetsOpen((current) => !current)}
            mobile={mobile}
          />
          <button
            type="button"
            onClick={() => saveProgressToAccount()}
            disabled={saveState === "saving"}
            style={{
              ...navButtonStyle,
              padding: mobile ? "0 13px" : "0 17px",
              cursor: saveState === "saving" ? "wait" : "pointer",
              background:
                saveState === "saved"
                  ? "rgba(38,113,76,0.78)"
                  : saveState === "error"
                    ? "rgba(125,48,32,0.78)"
                    : "rgba(69,38,18,0.78)",
            }}
          >
            {saveState === "saving"
              ? "Saving..."
              : saveState === "saved"
                ? "Saved ✓"
                : mobile
                  ? "Save"
                  : "Save Progress"}
          </button>

          <Link
            href="/profile"
            aria-label="Open profile"
            style={{
              ...navButtonStyle,
              width: mobile ? "40px" : undefined,
              padding: mobile ? 0 : "0 17px",
            }}
          >
            {mobile ? "◉" : userEmail || "My Account"}
          </Link>
        </div>
      </header>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "calc(100dvh - 70px)",
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "270px minmax(0, 1fr)",
        }}
      >
        {!compact && sidebar}

        <section
          className="milo-business-scrollbar"
          style={{
            minWidth: 0,
            minHeight: 0,
            padding: mobile ? "18px 14px 40px" : compact ? "24px" : "28px 34px 48px",
          }}
        >
          {pageMessage && (
            <div
              style={{
                width: "min(980px, 100%)",
                margin: "0 auto 18px",
                borderRadius: "16px",
                border: "1px solid rgba(237,177,96,0.34)",
                background: "rgba(91,51,22,0.72)",
                color: "#ffe1b4",
                padding: "13px 16px",
                fontSize: "15px",
                lineHeight: 1.5,
              }}
            >
              {pageMessage}
            </div>
          )}

          {view === "storefronts" && (
            <div style={{ width: "min(1420px, 100%)", margin: "0 auto" }}>
              <section style={{ textAlign: "center" }}>
                <p
                  style={{
                    margin: 0,
                    color: "#efbc73",
                    fontSize: "13px",
                    fontWeight: 900,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                  }}
                >
                  Your Business Street
                </p>
                <h2
                  style={{
                    margin: "14px 0 0",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: mobile ? "42px" : "clamp(52px, 5vw, 76px)",
                    fontWeight: 500,
                    lineHeight: 0.98,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Choose a storefront.
                </h2>
                <p
                  style={{
                    margin: "18px auto 0",
                    maxWidth: "740px",
                    color: "rgba(255,255,255,0.58)",
                    fontSize: mobile ? "14px" : "16px",
                    lineHeight: 1.65,
                  }}
                >
                  Begin with one empty unit and build a portfolio of up to three
                  operating businesses. Hover over a storefront and select a
                  slot to continue.
                </p>
              </section>

              <div
                style={{
                  marginTop: mobile ? "30px" : "42px",
                  display: "grid",
                  gridTemplateColumns: mobile
                    ? "1fr"
                    : compact
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(3, minmax(0, 1fr))",
                  gap: mobile ? "22px" : "18px",
                  alignItems: "stretch",
                }}
              >
                {slots.map((slot) => (
                  <StorefrontCard
                    key={slot.id}
                    slot={slot}
                    mobile={mobile}
                    hovered={hoveredSlotId === slot.id}
                    onHover={() => setHoveredSlotId(slot.id)}
                    onLeave={() => setHoveredSlotId(null)}
                    onSelect={() => selectStorefront(slot)}
                  />
                ))}
              </div>
            </div>
          )}

          {view === "businesses" && (
            <div style={{ width: "min(1320px, 100%)", margin: "0 auto" }}>
              <MiloPanel
                eyebrow="Choose carefully"
                title="What kind of business should we fund?"
                text="Start-up cost affects the choices available to you, but a larger business does not automatically earn more. A well-run smaller business can outperform an expensive business with poor cost control."
                compact={compact}
              />

              <div
                style={{
                  marginTop: "24px",
                  display: "grid",
                  gridTemplateColumns: mobile
                    ? "1fr"
                    : compact
                      ? "repeat(2, minmax(0, 1fr))"
                      : "repeat(3, minmax(0, 1fr))",
                  gap: "16px",
                }}
              >
                {BUSINESS_OPTIONS.map((business, index) => {
                  const highTier = business.minCapital > 50000;
                  const minimumAssets = business.minCapital * 0.1;
                  const profileEligible = profileNetWorth >= minimumAssets;

                  return (
                    <button
                      key={business.id}
                      type="button"
                      onClick={() => chooseBusiness(business)}
                      style={{
                        minWidth: 0,
                        minHeight: "280px",
                        borderRadius: "24px",
                        border: highTier && !profileEligible
                          ? "1px solid rgba(255,171,126,0.24)"
                          : "1px solid rgba(218,151,74,0.24)",
                        background:
                          "linear-gradient(145deg, rgba(52,29,16,0.9), rgba(5,10,19,0.94))",
                        color: "white",
                        padding: "20px",
                        textAlign: "left",
                        fontFamily: "inherit",
                        cursor: "pointer",
                        boxShadow: "0 20px 48px rgba(0,0,0,0.24)",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <span
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "15px",
                            border: "1px solid rgba(239,187,112,0.28)",
                            background: "rgba(218,151,74,0.1)",
                            color: "#efbd74",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "24px",
                          }}
                        >
                          {business.icon}
                        </span>
                        <span
                          style={{
                            minHeight: "28px",
                            borderRadius: "999px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.04)",
                            color: "rgba(255,255,255,0.62)",
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0 10px",
                            fontSize: "12px",
                            fontWeight: 900,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          Tier {index + 1}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "18px 0 0",
                          color: "#eab36a",
                          fontSize: "12px",
                          fontWeight: 900,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                        }}
                      >
                        {business.category}
                      </p>
                      <h3
                        style={{
                          margin: "8px 0 0",
                          fontSize: "28px",
                          lineHeight: 1.05,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {business.title}
                      </h3>
                      <p
                        style={{
                          margin: "12px 0 0",
                          color: "rgba(255,255,255,0.54)",
                          fontSize: "15px",
                          lineHeight: 1.55,
                        }}
                      >
                        {business.description}
                      </p>

                      <div style={{ marginTop: "auto", paddingTop: "18px" }}>
                        <strong
                          style={{
                            display: "block",
                            color: "white",
                            fontSize: "20px",
                          }}
                        >
                          {formatMoney(business.minCapital)} – {formatMoney(business.maxCapital)}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            marginTop: "7px",
                            color: highTier && !profileEligible
                              ? "#ffb38f"
                              : "rgba(255,255,255,0.44)",
                            fontSize: "13px",
                            lineHeight: 1.4,
                          }}
                        >
                          {highTier
                            ? `Requires at least ${formatMoney(minimumAssets)} in profile assets`
                            : `Difficulty ${business.difficulty}/5 · Main risk: ${business.mainRisk}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === "funding" && selectedBusiness && (
            <div style={{ width: "min(1120px, 100%)", margin: "0 auto" }}>
              {fundingStep === "personal" ? (
                <>
                  <MiloPanel
                    eyebrow="Founder contribution"
                    title="How much would you like to invest first?"
                    text="Your contribution comes from your Dream Token balance and directly determines your ownership. After this, choose how much funding you want from me. If you invest 1,000 DT and I invest 9,000 DT, you own 10% and I own 90%."
                    compact={compact}
                  />

                  <div
                    style={{
                      marginTop: "24px",
                      display: "grid",
                      gridTemplateColumns: compact ? "1fr" : "0.9fr 1.1fr",
                      gap: "18px",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: "24px",
                        border: "1px solid rgba(218,151,74,0.24)",
                        background:
                          "linear-gradient(145deg, rgba(55,31,17,0.88), rgba(6,10,19,0.92))",
                        padding: "24px",
                      }}
                    >
                      <p style={{ margin: 0, color: "#eab36b", fontSize: "15px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                        Selected business
                      </p>
                      <h2 style={{ margin: "12px 0 0", fontSize: "38px", lineHeight: 1.05 }}>
                        {selectedBusiness.title}
                      </h2>
                      <p style={{ margin: "16px 0 0", color: "rgba(255,255,255,0.62)", fontSize: "19px", lineHeight: 1.65 }}>
                        {selectedBusiness.description}
                      </p>
                      <div style={{ marginTop: "22px", display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                        <MetricCard label="Typical start-up range" value={`${formatMoney(selectedBusiness.minCapital)} – ${formatMoney(selectedBusiness.maxCapital)}`} note="Your total capital must meet the minimum" />
                        <MetricCard label="Your DT balance" value={formatMoney(dreamTokenBalance)} note="Maximum available personal contribution" />
                      </div>
                    </div>

                    <div style={{ borderRadius: "24px", border: "1px solid rgba(218,151,74,0.24)", background: "rgba(6,10,18,0.88)", padding: "24px" }}>
                      <label style={{ display: "block", color: "rgba(255,255,255,0.54)", fontSize: "16px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                        Your personal investment
                      </label>
                      <div style={{ marginTop: "13px", display: "grid", gridTemplateColumns: "1fr auto", gap: "10px" }}>
                        <input
                          type="number"
                          min={0}
                          max={dreamTokenBalance}
                          step={100}
                          value={personalContribution}
                          onChange={(event) => {
                            setPersonalContribution(
                              clamp(Number(event.target.value || 0), 0, dreamTokenBalance),
                            );
                            setPageMessage("");
                          }}
                          style={{ minWidth: 0, height: "60px", borderRadius: "15px", border: "1px solid rgba(235,179,103,0.28)", background: "rgba(255,255,255,0.055)", color: "white", padding: "0 17px", fontSize: "24px", fontWeight: 900, outline: "none" }}
                        />
                        <div style={{ minWidth: "72px", borderRadius: "15px", border: "1px solid rgba(235,179,103,0.2)", background: "rgba(95,52,24,0.7)", display: "grid", placeItems: "center", color: "#f4c782", fontSize: "19px", fontWeight: 900 }}>DT</div>
                      </div>
                      <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: mobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))", gap: "8px" }}>
                        {[
                          [0, "None"],
                          [Math.floor(dreamTokenBalance * 0.25), "25%"],
                          [Math.floor(dreamTokenBalance * 0.5), "50%"],
                          [dreamTokenBalance, "All"],
                        ].map(([amount, label]) => (
                          <button key={String(label)} type="button" onClick={() => setPersonalContribution(Number(amount))} style={{ minHeight: "46px", borderRadius: "12px", border: personalContribution === Number(amount) ? "1px solid rgba(241,195,122,0.72)" : "1px solid rgba(218,151,74,0.16)", background: personalContribution === Number(amount) ? "rgba(157,86,35,0.7)" : "rgba(255,255,255,0.035)", color: "white", fontSize: "17px", fontWeight: 900, cursor: "pointer" }}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <Link
                        href={DREAM_SHOP_TOKEN_URL}
                        style={{
                          marginTop: "12px",
                          minHeight: "48px",
                          borderRadius: "13px",
                          border: "1px solid rgba(127,184,232,0.26)",
                          background: "rgba(70,121,169,0.1)",
                          color: "#cfe9ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textDecoration: "none",
                          fontSize: "17px",
                          fontWeight: 900,
                        }}
                      >
                        Add More DT in the Dream Shop →
                      </Link>
                      {selectedBusiness.minCapital > 50000 && (
                        <p style={{ margin: "18px 0 0", color: profileNetWorth >= selectedBusiness.minCapital * 0.1 ? "#9ff0bd" : "#ffb497", fontSize: "17px", lineHeight: 1.55 }}>
                          Higher-tier requirement: {formatMoney(selectedBusiness.minCapital * 0.1)} in profile assets. You currently have {formatMoney(profileNetWorth)}.
                        </p>
                      )}
                      <div style={{ marginTop: "24px", display: "flex", flexDirection: mobile ? "column" : "row", gap: "10px" }}>
                        <button type="button" onClick={() => setView("businesses")} style={{ minHeight: "54px", flex: 1, borderRadius: "14px", border: "1px solid rgba(218,151,74,0.2)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: "18px", fontWeight: 850, cursor: "pointer" }}>Choose Another Business</button>
                        <button type="button" onClick={approveFunding} style={{ minHeight: "54px", flex: 1.2, borderRadius: "14px", border: "none", background: "linear-gradient(135deg, #d99548, #8d4b21)", color: "white", fontSize: "18px", fontWeight: 900, cursor: "pointer" }}>Continue to Milo’s Investment</button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <MiloPanel
                    eyebrow="Milo’s investment"
                    title="Choose how much you want me to fund."
                    text="Ownership now follows the actual capital contributed by each of us. More funding gives the business more room to operate, but it also gives the investor who contributes it a larger share of dividends and any future sale."
                    compact={compact}
                  />
                  <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: compact ? "1fr" : "0.82fr 1.18fr", gap: "18px" }}>
                    <div style={{ borderRadius: "24px", border: "1px solid rgba(218,151,74,0.24)", background: "linear-gradient(145deg, rgba(55,31,17,0.88), rgba(6,10,19,0.92))", padding: "24px" }}>
                      <p style={{ margin: 0, color: "#eab36b", fontSize: "15px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>Funding agreement</p>
                      <div style={{ marginTop: "18px", display: "grid", gap: "11px" }}>
                        <MetricCard label="Your investment" value={formatMoney(personalContribution)} note={`${Math.round(fundingOwnership.userOwnership * 100)}% founder ownership`} positive />
                        <MetricCard label="Milo’s investment" value={formatMoney(requestedBudget)} note={`${Math.round(fundingOwnership.miloOwnership * 100)}% investor ownership`} />
                        <MetricCard label="Total start-up capital" value={formatMoney(totalFunding)} note={`Minimum required: ${formatMoney(selectedBusiness.minCapital)}`} positive={totalFunding >= selectedBusiness.minCapital} />
                      </div>
                      <div style={{ height: "14px", marginTop: "18px", borderRadius: "999px", overflow: "hidden", background: "rgba(255,255,255,0.08)", display: "flex" }}>
                        <span style={{ width: `${fundingOwnership.userOwnership * 100}%`, background: "linear-gradient(90deg, #4c8768, #8dd5a9)" }} />
                        <span style={{ flex: 1, background: "linear-gradient(90deg, #8d4b21, #e0a257)" }} />
                      </div>
                    </div>
                    <div style={{ borderRadius: "24px", border: "1px solid rgba(218,151,74,0.24)", background: "rgba(6,10,18,0.88)", padding: "24px" }}>
                      <label style={{ display: "block", color: "rgba(255,255,255,0.54)", fontSize: "16px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Milo’s investment</label>
                      <strong style={{ display: "block", marginTop: "12px", color: "#f4c782", fontSize: mobile ? "46px" : "58px", letterSpacing: "-0.05em" }}>{formatMoney(requestedBudget)}</strong>
                      <input type="range" min={0} max={selectedBusiness.maxCapital} step={1000} value={requestedBudget} onChange={(event) => { setRequestedBudget(Number(event.target.value)); setPageMessage(""); }} style={{ width: "100%", marginTop: "24px" }} />
                      <div style={{ marginTop: "9px", display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.46)", fontSize: "16px" }}>
                        <span>0 DT</span><span>{formatMoney(selectedBusiness.maxCapital)}</span>
                      </div>
                      <p style={{ margin: "20px 0 0", color: totalFunding >= selectedBusiness.minCapital ? "rgba(255,255,255,0.58)" : "#ffb497", fontSize: "18px", lineHeight: 1.65 }}>
                        {totalFunding >= selectedBusiness.minCapital
                          ? "The ownership split above will apply to dividends, Milo share buyouts and the eventual sale of the business."
                          : `Add at least ${formatMoney(selectedBusiness.minCapital - totalFunding)} more capital before launch.`}
                      </p>
                      <div style={{ marginTop: "24px", display: "flex", flexDirection: mobile ? "column" : "row", gap: "10px" }}>
                        <button type="button" onClick={() => setFundingStep("personal")} disabled={fundingSubmitting} style={{ minHeight: "54px", flex: 1, borderRadius: "14px", border: "1px solid rgba(218,151,74,0.2)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: "18px", fontWeight: 850, cursor: "pointer" }}>Back to Your Investment</button>
                        <button type="button" onClick={confirmFunding} disabled={fundingSubmitting || totalFunding < selectedBusiness.minCapital} style={{ minHeight: "54px", flex: 1.25, borderRadius: "14px", border: "none", background: fundingSubmitting || totalFunding < selectedBusiness.minCapital ? "rgba(255,255,255,0.12)" : "linear-gradient(135deg, #d99548, #8d4b21)", color: fundingSubmitting || totalFunding < selectedBusiness.minCapital ? "rgba(255,255,255,0.4)" : "white", fontSize: "18px", fontWeight: 900, cursor: fundingSubmitting ? "wait" : totalFunding < selectedBusiness.minCapital ? "not-allowed" : "pointer" }}>
                          {fundingSubmitting ? "Confirming..." : "Confirm Funding Agreement"}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {view === "setup" &&
            activeSlot &&
            activeBusiness &&
            setupSummary &&
            activeSlot.status === "setup" && (
            <div style={{ width: "min(1380px, 100%)", margin: "0 auto" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: compact ? "1fr" : "1fr auto",
                  gap: "16px",
                  alignItems: "end",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#efbc73",
                      fontSize: "13px",
                      fontWeight: 900,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    Guided setup
                  </p>
                  <h2
                    style={{
                      margin: "10px 0 0",
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: mobile ? "39px" : "54px",
                      lineHeight: 1,
                      fontWeight: 500,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    Build within the approved budget.
                  </h2>
                  <p
                    style={{
                      margin: "14px 0 0",
                      maxWidth: "760px",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: "16px",
                      lineHeight: 1.6,
                    }}
                  >
                    Higher-cost choices usually improve quality or capacity, but
                    choosing premium options everywhere can leave the business
                    without enough cash to operate.
                  </p>
                </div>

                <div
                  style={{
                    minWidth: compact ? 0 : "330px",
                    borderRadius: "20px",
                    border: setupSummary.remainingCash < 0
                      ? "1px solid rgba(255,142,108,0.46)"
                      : "1px solid rgba(218,151,74,0.24)",
                    background: "rgba(8,10,16,0.82)",
                    padding: "16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                    <span style={{ color: "rgba(255,255,255,0.43)", fontSize: "13px" }}>
                      Total business budget
                    </span>
                    <strong>{formatMoney(activeSlot.approvedBudget)}</strong>
                  </div>
                  <div style={{ marginTop: "9px", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                    <span style={{ color: "rgba(255,255,255,0.43)", fontSize: "13px" }}>
                      Setup allocated
                    </span>
                    <strong>{formatMoney(setupSummary.setupSpend)}</strong>
                  </div>
                  <div style={{ marginTop: "9px", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                    <span style={{ color: "rgba(255,255,255,0.43)", fontSize: "13px" }}>
                      Cash remaining
                    </span>
                    <strong style={{ color: setupSummary.remainingCash >= 0 ? "#9ff0bd" : "#ffaf91" }}>
                      {formatMoney(setupSummary.remainingCash)}
                    </strong>
                  </div>
                  <div
                    style={{
                      marginTop: "13px",
                      height: "7px",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.07)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, (setupSummary.setupSpend / activeSlot.approvedBudget) * 100)}%`,
                        height: "100%",
                        background:
                          setupSummary.remainingCash < 0
                            ? "#dc7255"
                            : "linear-gradient(90deg, #b76c2f, #e7ad61)",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="milo-business-scrollbar"
                style={{
                  marginTop: "24px",
                  display: "flex",
                  gap: "9px",
                  overflowX: "auto",
                  paddingBottom: "8px",
                }}
              >
                {SETUP_CATEGORIES.map((category) => {
                  const active = activeSetupCategory === category.id;
                  const selectedTier = getTierOption(
                    category,
                    draftSelections[category.id],
                  );

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setActiveSetupCategory(category.id)}
                      style={{
                        flex: mobile ? "0 0 170px" : "1 1 0",
                        minWidth: mobile ? "170px" : "150px",
                        minHeight: "72px",
                        borderRadius: "16px",
                        border: active
                          ? "1px solid rgba(239,187,112,0.7)"
                          : "1px solid rgba(218,151,74,0.17)",
                        background: active
                          ? "linear-gradient(145deg, rgba(109,60,27,0.78), rgba(9,13,22,0.94))"
                          : "rgba(255,255,255,0.025)",
                        color: "white",
                        padding: "12px",
                        textAlign: "left",
                        fontFamily: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ color: "#edb86e", fontSize: "18px" }}>{category.icon}</span>
                      <strong style={{ display: "block", marginTop: "7px", fontSize: "14px" }}>
                        {category.shortLabel}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          marginTop: "4px",
                          color: "rgba(255,255,255,0.42)",
                          fontSize: "12px",
                        }}
                      >
                        {selectedTier.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {SETUP_CATEGORIES.filter((category) => category.id === activeSetupCategory).map((category) => (
                <div
                  key={category.id}
                  style={{
                    marginTop: "16px",
                    display: "grid",
                    gridTemplateColumns: compact ? "1fr" : "0.72fr 1.28fr",
                    gap: "16px",
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: "14px" }}>
                    <MiloPanel
                      eyebrow={`Setup category · ${category.shortLabel}`}
                      title={category.label}
                      text={category.description}
                      compact
                    />

                    <div
                      style={{
                        borderRadius: "22px",
                        border: "1px solid rgba(218,151,74,0.2)",
                        background: "rgba(7,10,17,0.84)",
                        padding: "18px",
                      }}
                    >
                      <label
                        style={{
                          color: "rgba(255,255,255,0.45)",
                          fontSize: "12px",
                          fontWeight: 900,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                        }}
                      >
                        Business name
                      </label>
                      <input
                        value={businessNameDraft}
                        onChange={(event) => setBusinessNameDraft(event.target.value)}
                        maxLength={40}
                        style={{
                          width: "100%",
                          height: "50px",
                          marginTop: "9px",
                          borderRadius: "13px",
                          border: "1px solid rgba(218,151,74,0.2)",
                          background: "rgba(255,255,255,0.05)",
                          color: "white",
                          padding: "0 14px",
                          fontSize: "18px",
                          fontWeight: 800,
                          outline: "none",
                        }}
                      />

                      <div
                        style={{
                          marginTop: "16px",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px",
                        }}
                      >
                        <MetricCard
                          label="Monthly fixed costs"
                          value={formatMoney(setupSummary.monthlyFixedCosts)}
                          note="Paid even when sales are low"
                        />
                        <MetricCard
                          label="Forecast daily profit"
                          value={formatMoney(operatingForecast.dailyProfit)}
                          note="Estimate based on current choices"
                          positive={operatingForecast.dailyProfit >= 0}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: mobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                      gap: "14px",
                    }}
                  >
                    {category.options.map((option) => {
                      const selected = draftSelections[category.id] === option.id;
                      const setupCost =
                        getSetupCostBasis(activeSlot) *
                        option.setupFraction;
                      const monthlyCost =
                        getSetupCostBasis(activeSlot) *
                        option.monthlyFraction;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setDraftSelections((current) => ({
                              ...current,
                              [category.id]: option.id,
                            }));
                            setPageMessage("");
                          }}
                          style={{
                            minWidth: 0,
                            minHeight: "350px",
                            borderRadius: "22px",
                            border: selected
                              ? "1px solid rgba(240,192,119,0.74)"
                              : "1px solid rgba(218,151,74,0.18)",
                            background: selected
                              ? "linear-gradient(145deg, rgba(103,57,26,0.82), rgba(7,11,20,0.95))"
                              : "linear-gradient(145deg, rgba(43,25,16,0.72), rgba(6,10,18,0.9))",
                            color: "white",
                            padding: "20px",
                            textAlign: "left",
                            fontFamily: "inherit",
                            cursor: "pointer",
                            boxShadow: selected
                              ? "0 0 30px rgba(218,151,74,0.12)"
                              : "0 18px 38px rgba(0,0,0,0.2)",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <span
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "999px",
                              border: selected
                                ? "1px solid rgba(244,201,133,0.7)"
                                : "1px solid rgba(255,255,255,0.12)",
                              background: selected
                                ? "rgba(218,151,74,0.16)"
                                : "rgba(255,255,255,0.04)",
                              color: selected ? "#f5cb8a" : "rgba(255,255,255,0.48)",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 900,
                            }}
                          >
                            {selected ? "✓" : option.qualityScore}
                          </span>
                          <p
                            style={{
                              margin: "18px 0 0",
                              color: "#eab36a",
                              fontSize: "12px",
                              fontWeight: 900,
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                            }}
                          >
                            {option.shortLabel} choice
                          </p>
                          <h3 style={{ margin: "8px 0 0", fontSize: "26px", lineHeight: 1.05 }}>
                            {option.label}
                          </h3>
                          <p
                            style={{
                              margin: "12px 0 0",
                              color: "rgba(255,255,255,0.54)",
                              fontSize: "15px",
                              lineHeight: 1.55,
                            }}
                          >
                            {option.description}
                          </p>

                          <div style={{ marginTop: "18px", display: "grid", gap: "9px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                              <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "13px" }}>
                                Setup cost
                              </span>
                              <strong style={{ fontSize: "15px" }}>{formatMoney(setupCost)}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                              <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "13px" }}>
                                Monthly cost
                              </span>
                              <strong style={{ fontSize: "15px" }}>
                                {monthlyCost > 0 ? formatMoney(monthlyCost) : "Variable"}
                              </strong>
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: "auto",
                              paddingTop: "18px",
                              display: "grid",
                              gap: "8px",
                            }}
                          >
                            <span style={{ color: "#9fe3b8", fontSize: "14px", lineHeight: 1.4 }}>
                              + {option.benefit}
                            </span>
                            <span style={{ color: "#ffbd9e", fontSize: "14px", lineHeight: 1.4 }}>
                              – {option.tradeOff}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div
                style={{
                  marginTop: "20px",
                  borderRadius: "22px",
                  border: "1px solid rgba(218,151,74,0.2)",
                  background: "rgba(7,10,17,0.86)",
                  padding: "18px",
                  display: "flex",
                  flexDirection: mobile ? "column" : "row",
                  alignItems: mobile ? "stretch" : "center",
                  justifyContent: "space-between",
                  gap: "14px",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "18px" }}>
                    Milo’s review
                  </strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: "6px",
                      color: setupSummary.remainingCash < activeSlot.approvedBudget * 0.08
                        ? "#ffb596"
                        : "rgba(255,255,255,0.5)",
                      fontSize: "14px",
                      lineHeight: 1.5,
                    }}
                  >
                    {setupSummary.remainingCash < 0
                      ? "This plan is over budget and cannot be approved."
                      : setupSummary.remainingCash < activeSlot.approvedBudget * 0.08
                        ? "You are leaving very little cash for the first weeks of operation."
                        : "This plan remains within budget and keeps some opening cash available."}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={saveSetupAndLaunch}
                    disabled={setupSummary.remainingCash < 0}
                    style={{
                      minHeight: "50px",
                      borderRadius: "14px",
                      border: "none",
                      background:
                        setupSummary.remainingCash < 0
                          ? "rgba(255,255,255,0.12)"
                          : "linear-gradient(135deg, #d99548, #8d4b21)",
                      color:
                        setupSummary.remainingCash < 0
                          ? "rgba(255,255,255,0.34)"
                          : "white",
                      padding: "0 24px",
                      fontWeight: 900,
                      cursor:
                        setupSummary.remainingCash < 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    Launch Business
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === "analytics" &&
            activeSlot &&
            activeBusiness &&
            activeSlot.status === "running" && (
              <div style={{ width: "min(1420px, 100%)", margin: "0 auto" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: compact ? "1fr" : "1fr auto",
                    gap: "18px",
                    alignItems: "end",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "#efbc73",
                        fontSize: "16px",
                        fontWeight: 900,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                      }}
                    >
                      Business analytics
                    </p>
                    <h2
                      style={{
                        margin: "11px 0 0",
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: mobile ? "46px" : "64px",
                        lineHeight: 0.98,
                        fontWeight: 500,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {activeSlot.businessName}
                    </h2>
                    <p
                      style={{
                        margin: "16px 0 0",
                        color: "rgba(255,255,255,0.62)",
                        fontSize: "19px",
                        lineHeight: 1.65,
                      }}
                    >
                      {activeBusiness.title} · Launched {formatDate(activeSlot.launchedAt)} ·
                      Cycle {activeSlot.cycleNumber}
                    </p>
                  </div>

                  <div
                    style={{
                      minWidth: mobile ? 0 : "290px",
                      borderRadius: "18px",
                      border: "1px solid rgba(218,151,74,0.24)",
                      background: "rgba(45,25,14,0.82)",
                      padding: "16px 18px",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        color: "rgba(255,255,255,0.48)",
                        fontSize: "15px",
                        letterSpacing: "0.13em",
                        textTransform: "uppercase",
                      }}
                    >
                      Business ownership
                    </span>
                    <strong
                      style={{
                        display: "block",
                        marginTop: "8px",
                        color: "#f3c47c",
                        fontSize: "22px",
                      }}
                    >
                      You {Math.round(activeSlot.userOwnership * 100)}% · Milo {Math.round(activeSlot.miloOwnership * 100)}%
                    </strong>
                    <span
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: "rgba(255,255,255,0.44)",
                        fontSize: "16px",
                      }}
                    >
                      Dividends follow this split.
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "24px",
                    display: "grid",
                    gridTemplateColumns: mobile
                      ? "1fr"
                      : compact
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(5, minmax(0, 1fr))",
                    gap: "13px",
                  }}
                >
                  <MetricCard
                    label="Available cash"
                    value={formatMoney(activeSlot.cash)}
                    note="Cash available for operations and changes"
                    positive={activeSlot.cash >= 0}
                  />
                  <MetricCard
                    label="Total revenue"
                    value={formatMoney(activeSlot.revenue)}
                    note={`${Math.floor(activeSlot.sales)} estimated customer orders`}
                  />
                  <MetricCard
                    label="Total costs"
                    value={formatMoney(activeSlot.expenses)}
                    note="Stock, rent, wages, marketing and maintenance"
                  />
                  <MetricCard
                    label="Lifetime profit / loss"
                    value={formatMoney(profit)}
                    note="Revenue minus all operating costs"
                    positive={profit >= 0}
                  />
                  <MetricCard
                    label="Customer satisfaction"
                    value={`${Math.round(activeSlot.customerSatisfaction)}%`}
                    note="Affected by staff, equipment and availability"
                    positive={activeSlot.customerSatisfaction >= 65}
                  />
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    display: "grid",
                    gridTemplateColumns: compact ? "1fr" : "0.85fr 1.15fr",
                    gap: "18px",
                  }}
                >
                  <div
                    style={{
                      borderRadius: "24px",
                      border: "1px solid rgba(218,151,74,0.22)",
                      background:
                        "linear-gradient(145deg, rgba(54,30,17,0.86), rgba(6,10,18,0.92))",
                      padding: "22px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#eab36a",
                        fontSize: "15px",
                        fontWeight: 900,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      Simulation timeline
                    </p>
                    <h3 style={{ margin: "10px 0 0", fontSize: "37px" }}>
                      Run one 30-day cycle per day
                    </h3>
                    <p
                      style={{
                        margin: "12px 0 0",
                        color: "rgba(255,255,255,0.58)",
                        fontSize: "18px",
                        lineHeight: 1.62,
                      }}
                    >
                      Speed changes how quickly this cycle finishes, but it never
                      allows more than one complete 30-day cycle on the same
                      Singapore calendar day. At 1,440×, one simulated day passes
                      every real minute. While you are away or offline, the
                      current cycle continues at 168× until day 30 and catches up when you return.
                    </p>

                    <div
                      style={{
                        marginTop: "20px",
                        display: "grid",
                        gridTemplateColumns: mobile
                          ? "repeat(2, 1fr)"
                          : "repeat(5, 1fr)",
                        gap: "9px",
                      }}
                    >
                      {([
                        [0, "Pause"],
                        [1, "1×"],
                        [24, "24×"],
                        [168, "168×"],
                        [1440, "1,440×"],
                      ] as [SimulationSpeed, string][]).map(([speed, label]) => {
                        const active = activeSlot.simulationSpeed === speed;
                        const disabled = activeSlot.cycleStatus !== "running";

                        return (
                          <button
                            key={speed}
                            type="button"
                            disabled={disabled}
                            onClick={() => changeSimulationSpeed(speed)}
                            style={{
                              minHeight: "52px",
                              borderRadius: "13px",
                              border: active
                                ? "1px solid rgba(241,195,122,0.72)"
                                : "1px solid rgba(218,151,74,0.16)",
                              background: disabled
                                ? "rgba(255,255,255,0.025)"
                                : active
                                  ? "rgba(157,86,35,0.7)"
                                  : "rgba(255,255,255,0.035)",
                              color: disabled
                                ? "rgba(255,255,255,0.3)"
                                : "white",
                              fontSize: "18px",
                              fontWeight: 900,
                              cursor: disabled ? "not-allowed" : "pointer",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        marginTop: "19px",
                        borderRadius: "16px",
                        border: "1px solid rgba(218,151,74,0.16)",
                        background: "rgba(255,255,255,0.025)",
                        padding: "16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: "end",
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(255,255,255,0.46)",
                            fontSize: "15px",
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                          }}
                        >
                          Cycle progress
                        </span>
                        <strong style={{ color: "#f2c37d", fontSize: "21px" }}>
                          Day {Math.min(CYCLE_DAYS, Math.floor(cycleDays) + 1)} / {CYCLE_DAYS}
                        </strong>
                      </div>
                      <div
                        style={{
                          height: "10px",
                          marginTop: "12px",
                          borderRadius: "999px",
                          background: "rgba(255,255,255,0.08)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${cycleProgress}%`,
                            height: "100%",
                            borderRadius: "999px",
                            background:
                              "linear-gradient(90deg, #8d4b21, #efbc73)",
                            transition: "width 250ms ease",
                          }}
                        />
                      </div>
                      <strong
                        style={{
                          display: "block",
                          marginTop: "14px",
                          color: "white",
                          fontSize: "30px",
                        }}
                      >
                        {activeSlot.cycleStatus === "running"
                          ? `${(CYCLE_DAYS - cycleDays).toFixed(1)} simulated days remaining`
                          : activeSlot.cycleStatus === "awaiting-allocation"
                            ? "Cycle complete — allocate the result"
                            : "Cycle settled for today"}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: "24px",
                      border: "1px solid rgba(218,151,74,0.22)",
                      background: "rgba(6,10,18,0.88)",
                      padding: "22px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#eab36a",
                        fontSize: "15px",
                        fontWeight: 900,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      Milo’s operating review
                    </p>
                    <h3
                      style={{
                        margin: "10px 0 0",
                        fontSize: "38px",
                        lineHeight: 1.08,
                      }}
                    >
                      {activeSlot.cycleStatus === "awaiting-allocation"
                        ? "Your 30-day result is ready."
                        : profit >= 0
                          ? "The business is moving in the right direction."
                          : "The business needs a cost adjustment."}
                    </h3>

                    <div
                      style={{
                        marginTop: "19px",
                        display: "grid",
                        gridTemplateColumns: mobile
                          ? "1fr"
                          : "repeat(2, minmax(0, 1fr))",
                        gap: "11px",
                      }}
                    >
                      {[
                        {
                          title:
                            activeSlot.cash < activeSlot.approvedBudget * 0.05
                              ? "Cash reserve is low"
                              : "Cash reserve is stable",
                          text:
                            activeSlot.cash < activeSlot.approvedBudget * 0.05
                              ? "Reduce running costs before the business runs out of operating cash."
                              : "The business still has room to handle short-term costs.",
                        },
                        {
                          title:
                            operatingForecast.dailyProfit >= 0
                              ? "Current plan forecasts profit"
                              : "Fixed costs are too heavy",
                          text:
                            operatingForecast.dailyProfit >= 0
                              ? `The current operating choices forecast about ${formatMoney(operatingForecast.dailyProfit)} per simulated day.`
                              : "Reduce staff or marketing costs, or improve stock availability and sales capacity.",
                        },
                        {
                          title:
                            activeSlot.customerSatisfaction >= 70
                              ? "Customers are responding well"
                              : "Customer experience can improve",
                          text:
                            activeSlot.customerSatisfaction >= 70
                              ? "Service, equipment and stock availability are supporting repeat demand."
                              : "Review staff and stock levels below to improve the experience.",
                        },
                        {
                          title: "Next management decision",
                          text:
                            activeSlot.cycleStatus === "awaiting-allocation"
                              ? "Choose how much profit stays in the business and how much is paid as dividends."
                              : "Change one running-cost category at a time, then watch the next results.",
                        },
                      ].map((item) => (
                        <div
                          key={item.title}
                          style={{
                            borderRadius: "17px",
                            border: "1px solid rgba(218,151,74,0.15)",
                            background: "rgba(255,255,255,0.025)",
                            padding: "16px",
                          }}
                        >
                          <strong
                            style={{ display: "block", fontSize: "19px" }}
                          >
                            {item.title}
                          </strong>
                          <span
                            style={{
                              display: "block",
                              marginTop: "8px",
                              color: "rgba(255,255,255,0.54)",
                              fontSize: "17px",
                              lineHeight: 1.55,
                            }}
                          >
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    borderRadius: "26px",
                    border:
                      activeSlot.cycleStatus === "awaiting-allocation"
                        ? "1px solid rgba(241,195,122,0.55)"
                        : "1px solid rgba(218,151,74,0.22)",
                    background:
                      activeSlot.cycleStatus === "awaiting-allocation"
                        ? "linear-gradient(145deg, rgba(76,41,20,0.94), rgba(6,10,18,0.96))"
                        : "rgba(6,10,18,0.9)",
                    padding: mobile ? "20px" : "24px",
                    boxShadow:
                      activeSlot.cycleStatus === "awaiting-allocation"
                        ? "0 0 34px rgba(218,151,74,0.12)"
                        : "none",
                  }}
                >
                  {activeSlot.cycleStatus === "awaiting-allocation" ? (
                    <>
                      <p
                        style={{
                          margin: 0,
                          color: "#efbc73",
                          fontSize: "15px",
                          fontWeight: 900,
                          letterSpacing: "0.17em",
                          textTransform: "uppercase",
                        }}
                      >
                        Cycle {activeSlot.cycleNumber} allocation
                      </p>
                      <h3
                        style={{
                          margin: "10px 0 0",
                          fontFamily: 'Georgia, "Times New Roman", serif',
                          fontSize: mobile ? "38px" : "48px",
                          lineHeight: 1,
                          fontWeight: 500,
                        }}
                      >
                        {activeSlot.cycleProfit >= 0
                          ? `${formatMoney(activeSlot.cycleProfit)} profit`
                          : `${formatMoney(Math.abs(activeSlot.cycleProfit))} loss`}
                      </h3>

                      <div
                        style={{
                          marginTop: "20px",
                          display: "grid",
                          gridTemplateColumns: mobile
                            ? "1fr"
                            : "repeat(3, minmax(0, 1fr))",
                          gap: "12px",
                        }}
                      >
                        <MetricCard
                          label="30-day revenue"
                          value={formatMoney(activeSlot.cycleRevenue)}
                          note="Revenue generated during this cycle"
                        />
                        <MetricCard
                          label="30-day costs"
                          value={formatMoney(activeSlot.cycleExpenses)}
                          note="All operating costs during this cycle"
                        />
                        <MetricCard
                          label="Cycle result"
                          value={formatMoney(activeSlot.cycleProfit)}
                          note="Revenue minus costs"
                          positive={activeSlot.cycleProfit >= 0}
                        />
                      </div>

                      {activeSlot.cycleProfit > 0 ? (
                        <div
                          style={{
                            marginTop: "22px",
                            display: "grid",
                            gridTemplateColumns: compact ? "1fr" : "1.1fr 0.9fr",
                            gap: "18px",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: "block",
                                color: "rgba(255,255,255,0.55)",
                                fontSize: "16px",
                                fontWeight: 900,
                                letterSpacing: "0.13em",
                                textTransform: "uppercase",
                              }}
                            >
                              Reinvest in the business: {reinvestmentPercent}%
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={reinvestmentPercent}
                              onChange={(event) =>
                                setReinvestmentPercent(Number(event.target.value))
                              }
                              style={{ width: "100%", marginTop: "18px" }}
                            />
                            <div
                              style={{
                                marginTop: "13px",
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "10px",
                              }}
                            >
                              <MetricCard
                                label="Reinvestment"
                                value={formatMoney(
                                  activeSlot.cycleProfit *
                                    (reinvestmentPercent / 100),
                                )}
                                note="Remains as business cash"
                              />
                              <MetricCard
                                label="Dividend pool"
                                value={formatMoney(cycleDividendPool)}
                                note="Removed from the business and distributed"
                              />
                            </div>
                          </div>

                          <div
                            style={{
                              borderRadius: "20px",
                              border: "1px solid rgba(218,151,74,0.18)",
                              background: "rgba(255,255,255,0.025)",
                              padding: "18px",
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                color: "#eab36a",
                                fontSize: "15px",
                                fontWeight: 900,
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                              }}
                            >
                              Dividend split
                            </p>
                            <div
                              style={{
                                marginTop: "14px",
                                display: "grid",
                                gap: "11px",
                              }}
                            >
                              <MetricCard
                                label={`Your ${Math.round(activeSlot.userOwnership * 100)}% share`}
                                value={formatMoney(projectedUserDividend)}
                                note="Paid to your Dream Token balance"
                                positive
                              />
                              <MetricCard
                                label={`Milo’s ${Math.round(activeSlot.miloOwnership * 100)}% share`}
                                value={formatMoney(projectedMiloDividend)}
                                note="Paid to Milo as the investor"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p
                          style={{
                            margin: "20px 0 0",
                            color: "rgba(255,255,255,0.62)",
                            fontSize: "19px",
                            lineHeight: 1.65,
                          }}
                        >
                          A loss cannot be distributed as dividends. Confirm the
                          result, then review the running-cost controls before the
                          next cycle becomes available.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={settleThirtyDayCycle}
                        disabled={cycleSubmitting}
                        style={{
                          width: "100%",
                          minHeight: "56px",
                          marginTop: "22px",
                          borderRadius: "15px",
                          border: "none",
                          background: cycleSubmitting
                            ? "rgba(255,255,255,0.12)"
                            : "linear-gradient(135deg, #d99548, #8d4b21)",
                          color: cycleSubmitting
                            ? "rgba(255,255,255,0.45)"
                            : "white",
                          fontSize: "19px",
                          fontWeight: 900,
                          cursor: cycleSubmitting ? "wait" : "pointer",
                        }}
                      >
                        {cycleSubmitting
                          ? "Settling Cycle..."
                          : activeSlot.cycleProfit > 0
                            ? "Confirm Reinvestment & Dividend Payout"
                            : "Confirm Cycle Loss"}
                      </button>
                    </>
                  ) : activeSlot.cycleStatus === "settled" ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: compact ? "1fr" : "1fr auto",
                        gap: "18px",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: "#9ff0bd",
                            fontSize: "15px",
                            fontWeight: 900,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                          }}
                        >
                          Cycle settled
                        </p>
                        <h3
                          style={{
                            margin: "10px 0 0",
                            fontSize: "37px",
                            lineHeight: 1.1,
                          }}
                        >
                          Your next 30-day cycle unlocks tomorrow.
                        </h3>
                        <p
                          style={{
                            margin: "10px 0 0",
                            color: "rgba(255,255,255,0.56)",
                            fontSize: "18px",
                            lineHeight: 1.6,
                          }}
                        >
                          The daily limit follows Singapore calendar time. You can
                          still review analytics, adjust running costs and save
                          progress now.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => saveProgressToAccount()}
                        style={{
                          minHeight: "52px",
                          borderRadius: "14px",
                          border: "1px solid rgba(218,151,74,0.25)",
                          background: "rgba(255,255,255,0.04)",
                          color: "white",
                          padding: "0 22px",
                          fontSize: "18px",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        Save Progress
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: compact ? "1fr" : "1fr auto",
                        gap: "18px",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: "#efbc73",
                            fontSize: "15px",
                            fontWeight: 900,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                          }}
                        >
                          Current 30-day cycle
                        </p>
                        <h3
                          style={{
                            margin: "10px 0 0",
                            fontSize: "37px",
                            lineHeight: 1.1,
                          }}
                        >
                          Current cycle profit: {formatMoney(activeSlot.cycleProfit)}
                        </h3>
                        <p
                          style={{
                            margin: "10px 0 0",
                            color: "rgba(255,255,255,0.56)",
                            fontSize: "18px",
                            lineHeight: 1.6,
                          }}
                        >
                          The allocation panel will open automatically after day
                          30. The simulation pauses until you settle the result.
                        </p>
                      </div>
                      <strong
                        style={{
                          color:
                            activeSlot.cycleProfit >= 0 ? "#9ff0bd" : "#ffb497",
                          fontSize: "33px",
                        }}
                      >
                        {cycleProgress.toFixed(0)}%
                      </strong>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    borderRadius: "26px",
                    border: "1px solid rgba(218,151,74,0.22)",
                    background:
                      "linear-gradient(145deg, rgba(39,23,14,0.9), rgba(5,9,17,0.94))",
                    padding: mobile ? "18px" : "24px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: compact ? "1fr" : "1fr auto",
                      gap: "16px",
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, color: "#efbc73", fontSize: "15px", fontWeight: 900, letterSpacing: "0.17em", textTransform: "uppercase" }}>
                        Running-cost controls
                      </p>
                      <h3 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? "36px" : "46px", lineHeight: 1, fontWeight: 500 }}>
                        Manage the operating business
                      </h3>
                      <p style={{ margin: "13px 0 0", color: "rgba(255,255,255,0.58)", fontSize: "18px", lineHeight: 1.65 }}>
                        Stock falls as customers buy products. Staffing and marketing are recurring monthly costs. Every change directly updates the profit forecast and may affect future simulation events.
                      </p>
                    </div>
                    <div style={{ textAlign: compact ? "left" : "right" }}>
                      <span style={{ display: "block", color: "rgba(255,255,255,0.45)", fontSize: "15px", textTransform: "uppercase", letterSpacing: "0.12em" }}>Forecast daily profit</span>
                      <strong style={{ display: "block", marginTop: "6px", color: operatingForecast.dailyProfit >= 0 ? "#9ff0bd" : "#ffb497", fontSize: "35px" }}>
                        {formatMoney(operatingForecast.dailyProfit)}
                      </strong>
                    </div>
                  </div>

                  <div style={{ marginTop: "22px", display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
                    <section style={{ borderRadius: "21px", border: "1px solid rgba(218,151,74,0.18)", background: "rgba(255,255,255,0.025)", padding: "18px" }}>
                      <p style={{ margin: 0, color: "#efbc73", fontSize: "14px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Stock inventory</p>
                      <strong style={{ display: "block", marginTop: "10px", fontSize: "40px", color: activeSlot.stockUnits < operatingForecast.dailyStockUnitsUsed * 3 ? "#ffb497" : "white" }}>
                        {Math.floor(activeSlot.stockUnits)} units
                      </strong>
                      <span style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,0.48)", fontSize: "16px", lineHeight: 1.5 }}>
                        Forecast usage: {operatingForecast.dailyStockUnitsUsed.toFixed(1)} units per simulated day
                      </span>
                      <div style={{ marginTop: "15px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
                        <MetricCard label="Buy price" value={`${formatMoney(activeStockPrices.buyPrice)}/unit`} note="Paid from business cash" />
                        <MetricCard label="Sell-off price" value={`${formatMoney(activeStockPrices.sellPrice)}/unit`} note="Lower liquidation price" />
                      </div>
                      <label style={{ display: "block", marginTop: "15px", color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 800 }}>Units to trade</label>
                      <input type="number" min={1} step={1} value={stockTradeUnits} onChange={(event) => setStockTradeUnits(Math.max(1, Number(event.target.value || 1)))} style={{ width: "100%", height: "50px", marginTop: "7px", borderRadius: "13px", border: "1px solid rgba(218,151,74,0.2)", background: "rgba(255,255,255,0.04)", color: "white", padding: "0 14px", fontSize: "18px", fontWeight: 850 }} />
                      <div style={{ marginTop: "11px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <button type="button" onClick={buyStockUnits} style={{ minHeight: "48px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #d99548, #8d4b21)", color: "white", fontSize: "16px", fontWeight: 900, cursor: "pointer" }}>Add Stock</button>
                        <button type="button" onClick={sellStockUnits} style={{ minHeight: "48px", borderRadius: "12px", border: "1px solid rgba(218,151,74,0.22)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: "16px", fontWeight: 900, cursor: "pointer" }}>Sell Off Stock</button>
                      </div>
                      <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <button type="button" onClick={() => openNegotiation("stock-buy")} style={{ minHeight: "44px", borderRadius: "12px", border: "1px solid rgba(127,184,232,0.25)", background: "rgba(76,126,174,0.1)", color: "#cfe9ff", fontSize: "14px", fontWeight: 850, cursor: "pointer" }}>Negotiate Purchase</button>
                        <button type="button" onClick={() => openNegotiation("stock-sell")} style={{ minHeight: "44px", borderRadius: "12px", border: "1px solid rgba(127,184,232,0.25)", background: "rgba(76,126,174,0.1)", color: "#cfe9ff", fontSize: "14px", fontWeight: 850, cursor: "pointer" }}>Negotiate Sale</button>
                      </div>
                    </section>

                    <section style={{ borderRadius: "21px", border: "1px solid rgba(218,151,74,0.18)", background: "rgba(255,255,255,0.025)", padding: "18px" }}>
                      <p style={{ margin: 0, color: "#efbc73", fontSize: "14px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Staff controls</p>
                      <label style={{ display: "block", marginTop: "16px", color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 800 }}>Number of staff</label>
                      <input type="number" min={0} step={1} value={operatingDraft.staffCount} onChange={(event) => setOperatingDraft((current) => ({ ...current, staffCount: Math.max(0, Number(event.target.value || 0)) }))} style={{ width: "100%", height: "52px", marginTop: "7px", borderRadius: "13px", border: "1px solid rgba(218,151,74,0.2)", background: "rgba(255,255,255,0.04)", color: "white", padding: "0 14px", fontSize: "19px", fontWeight: 850 }} />
                      <label style={{ display: "block", marginTop: "15px", color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 800 }}>Average monthly salary per staff</label>
                      <input type="number" min={0} step={50} value={operatingDraft.averageMonthlySalary} onChange={(event) => setOperatingDraft((current) => ({ ...current, averageMonthlySalary: Math.max(0, Number(event.target.value || 0)) }))} style={{ width: "100%", height: "52px", marginTop: "7px", borderRadius: "13px", border: "1px solid rgba(218,151,74,0.2)", background: "rgba(255,255,255,0.04)", color: "white", padding: "0 14px", fontSize: "19px", fontWeight: 850 }} />
                      <div style={{ marginTop: "15px" }}>
                        <MetricCard label="Monthly payroll" value={formatMoney(operatingDraft.staffCount * operatingDraft.averageMonthlySalary)} note={`Market salary benchmark: ${formatMoney(operatingForecast.recommendedSalary)} per staff`} positive={operatingDraft.averageMonthlySalary >= operatingForecast.recommendedSalary * 0.82} />
                      </div>
                      <p style={{ margin: "13px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: 1.5 }}>Low pay may cause staff to leave during a scheduled staff review.</p>
                      <button type="button" onClick={() => openNegotiation("staff")} style={{ width: "100%", minHeight: "44px", marginTop: "12px", borderRadius: "12px", border: "1px solid rgba(127,184,232,0.25)", background: "rgba(76,126,174,0.1)", color: "#cfe9ff", fontSize: "14px", fontWeight: 850, cursor: "pointer" }}>Negotiate with Dennis</button>
                    </section>

                    <section style={{ borderRadius: "21px", border: "1px solid rgba(218,151,74,0.18)", background: "rgba(255,255,255,0.025)", padding: "18px" }}>
                      <p style={{ margin: 0, color: "#efbc73", fontSize: "14px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Monthly marketing</p>
                      <label style={{ display: "block", marginTop: "16px", color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 800 }}>Online channels</label>
                      <input type="number" min={0} step={50} value={operatingDraft.onlineMarketingBudget} onChange={(event) => setOperatingDraft((current) => ({ ...current, onlineMarketingBudget: Math.max(0, Number(event.target.value || 0)) }))} style={{ width: "100%", height: "52px", marginTop: "7px", borderRadius: "13px", border: "1px solid rgba(218,151,74,0.2)", background: "rgba(255,255,255,0.04)", color: "white", padding: "0 14px", fontSize: "19px", fontWeight: 850 }} />
                      <label style={{ display: "block", marginTop: "15px", color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 800 }}>Offline channels</label>
                      <input type="number" min={0} step={50} value={operatingDraft.offlineMarketingBudget} onChange={(event) => setOperatingDraft((current) => ({ ...current, offlineMarketingBudget: Math.max(0, Number(event.target.value || 0)) }))} style={{ width: "100%", height: "52px", marginTop: "7px", borderRadius: "13px", border: "1px solid rgba(218,151,74,0.2)", background: "rgba(255,255,255,0.04)", color: "white", padding: "0 14px", fontSize: "19px", fontWeight: 850 }} />
                      <div style={{ marginTop: "15px" }}>
                        <MetricCard label="Total monthly marketing" value={formatMoney(operatingDraft.onlineMarketingBudget + operatingDraft.offlineMarketingBudget)} note={`Industry benchmark: ${formatMoney(operatingForecast.recommendedMarketingBudget)}`} positive={operatingDraft.onlineMarketingBudget + operatingDraft.offlineMarketingBudget >= operatingForecast.recommendedMarketingBudget * 0.6} />
                      </div>
                      <p style={{ margin: "13px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: 1.5 }}>Low marketing budgets can reduce long-term demand during scheduled market reviews.</p>
                    </section>
                  </div>

                  <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr auto", gap: "14px", alignItems: "center" }}>
                    <div style={{ borderRadius: "17px", border: "1px solid rgba(218,151,74,0.14)", background: "rgba(255,255,255,0.025)", padding: "15px 17px" }}>
                      <strong style={{ display: "block", fontSize: "19px" }}>Forecast monthly operating costs: {formatMoney(operatingForecast.monthlyFixedCosts)}</strong>
                      <span style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,0.48)", fontSize: "16px" }}>Available business cash: {formatMoney(activeSlot.cash)}</span>
                    </div>
                    <button type="button" onClick={saveOperatingChanges} style={{ minHeight: "54px", borderRadius: "14px", border: "none", background: "linear-gradient(135deg, #d99548, #8d4b21)", color: "white", padding: "0 24px", fontSize: "19px", fontWeight: 900, cursor: "pointer" }}>Save Staff & Marketing Changes</button>
                  </div>
                </div>

                <div style={{ marginTop: "18px", borderRadius: "26px", border: "1px solid rgba(218,151,74,0.22)", background: "rgba(6,10,18,0.9)", padding: mobile ? "18px" : "24px" }}>
                  <p style={{ margin: 0, color: "#efbc73", fontSize: "15px", fontWeight: 900, letterSpacing: "0.17em", textTransform: "uppercase" }}>Uniform 10-year event timeline</p>
                  <h3 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? "34px" : "43px", fontWeight: 500 }}>Industry events and operating consequences</h3>
                  <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.58)", fontSize: "18px", lineHeight: 1.6 }}>Every user running a {activeMarket?.industryName || activeBusiness.category} business encounters the same scheduled event checkpoints across the 10-year simulation. Your staffing, salary, stock and marketing choices determine how some events affect you.</p>
                  <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: compact ? "1fr" : "1fr 1fr", gap: "16px" }}>
                    <section style={{ borderRadius: "19px", border: "1px solid rgba(218,151,74,0.16)", background: "rgba(255,255,255,0.025)", padding: "17px" }}>
                      <strong style={{ display: "block", fontSize: "21px" }}>Recent events</strong>
                      <div style={{ marginTop: "13px", display: "grid", gap: "10px" }}>
                        {activeSlot.eventLog.length === 0 ? (
                          <span style={{ color: "rgba(255,255,255,0.48)", fontSize: "16px" }}>No event checkpoint has been reached yet.</span>
                        ) : activeSlot.eventLog.slice(-5).reverse().map((event) => (
                          <div key={event.id} style={{ borderRadius: "15px", border: `1px solid ${event.tone === "positive" ? "rgba(96,218,143,0.24)" : event.tone === "negative" ? "rgba(255,142,108,0.24)" : "rgba(218,151,74,0.16)"}`, background: "rgba(255,255,255,0.025)", padding: "13px" }}>
                            <span style={{ color: event.tone === "positive" ? "#9ff0bd" : event.tone === "negative" ? "#ffb497" : "#efbc73", fontSize: "13px", fontWeight: 900 }}>DAY {event.day}</span>
                            <strong style={{ display: "block", marginTop: "5px", fontSize: "18px" }}>{event.title}</strong>
                            <span style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: 1.45 }}>{event.description}</span>
                            <span style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,0.72)", fontSize: "14px", fontWeight: 800 }}>{event.impact}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section style={{ borderRadius: "19px", border: "1px solid rgba(218,151,74,0.16)", background: "rgba(255,255,255,0.025)", padding: "17px" }}>
                      <strong style={{ display: "block", fontSize: "21px" }}>Upcoming checkpoints</strong>
                      <div style={{ marginTop: "13px", display: "grid", gap: "10px" }}>
                        {upcomingEvents.map((event) => (
                          <div key={event.id} style={{ borderRadius: "15px", border: "1px solid rgba(218,151,74,0.14)", background: "rgba(255,255,255,0.02)", padding: "13px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "11px", alignItems: "center" }}>
                            <span style={{ minWidth: "72px", color: "#efbc73", fontSize: "14px", fontWeight: 900 }}>DAY {event.day}</span>
                            <span style={{ color: "rgba(255,255,255,0.68)", fontSize: "16px" }}>{event.kind === "staff-review" ? "Staff and salary review" : event.kind === "marketing-review" ? "Marketing demand review" : event.kind === "supply" ? "Supplier and inventory event" : "Industry demand event"}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                {activeSlot.cycleHistory.length > 0 && (
                  <div
                    style={{
                      marginTop: "18px",
                      borderRadius: "24px",
                      border: "1px solid rgba(218,151,74,0.18)",
                      background: "rgba(6,10,18,0.82)",
                      padding: "22px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#efbc73",
                        fontSize: "15px",
                        fontWeight: 900,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      Cycle history
                    </p>
                    <div
                      style={{
                        marginTop: "15px",
                        display: "grid",
                        gap: "9px",
                      }}
                    >
                      {activeSlot.cycleHistory
                        .slice(-5)
                        .reverse()
                        .map((record) => (
                          <div
                            key={`${record.cycleNumber}-${record.completedDateSg}`}
                            style={{
                              minHeight: "62px",
                              borderRadius: "15px",
                              border: "1px solid rgba(218,151,74,0.12)",
                              background: "rgba(255,255,255,0.025)",
                              display: "grid",
                              gridTemplateColumns: mobile
                                ? "1fr"
                                : "auto 1fr repeat(3, auto)",
                              alignItems: "center",
                              gap: "14px",
                              padding: "12px 14px",
                            }}
                          >
                            <strong style={{ fontSize: "18px" }}>
                              Cycle {record.cycleNumber}
                            </strong>
                            <span
                              style={{
                                color: "rgba(255,255,255,0.45)",
                                fontSize: "16px",
                              }}
                            >
                              {record.completedDateSg}
                            </span>
                            <span style={{ fontSize: "17px" }}>
                              Profit {formatMoney(record.profit)}
                            </span>
                            <span style={{ fontSize: "17px" }}>
                              Reinvested {formatMoney(record.reinvested)}
                            </span>
                            <span style={{ fontSize: "17px", color: "#9ff0bd" }}>
                              Your dividend {formatMoney(record.userDividend)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          {view === "market" &&
            activeSlot &&
            activeBusiness &&
            activeMarket &&
            activeSlot.status === "running" && (
              <div style={{ width: "min(1420px, 100%)", margin: "0 auto" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: compact ? "1fr" : "1fr auto",
                    gap: "18px",
                    alignItems: "end",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "#efbc73",
                        fontSize: "16px",
                        fontWeight: 900,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                      }}
                    >
                      Industry market
                    </p>
                    <h2
                      style={{
                        margin: "11px 0 0",
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: mobile ? "43px" : "64px",
                        lineHeight: 0.98,
                        fontWeight: 500,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {activeMarket.industryName}
                    </h2>
                    <p
                      style={{
                        margin: "16px 0 0",
                        maxWidth: "800px",
                        color: "rgba(255,255,255,0.62)",
                        fontSize: mobile ? "17px" : "19px",
                        lineHeight: 1.65,
                      }}
                    >
                      This market forecast is specific to {activeBusiness.title}. Demand,
                      supply and the twelve-month outlook affect business valuations and
                      the offers buyers make.
                    </p>
                  </div>

                  <div
                    style={{
                      borderRadius: "18px",
                      border: "1px solid rgba(218,151,74,0.24)",
                      background: "rgba(45,25,14,0.82)",
                      padding: "16px 18px",
                      minWidth: compact ? 0 : "260px",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        color: "rgba(255,255,255,0.48)",
                        fontSize: "14px",
                        letterSpacing: "0.13em",
                        textTransform: "uppercase",
                      }}
                    >
                      One-year outlook
                    </span>
                    <strong
                      style={{
                        display: "block",
                        marginTop: "8px",
                        color:
                          activeMarket.outlookScore >= 0.2
                            ? "#9ff0bd"
                            : activeMarket.outlookScore <= -0.2
                              ? "#ffb497"
                              : "#f3c47c",
                        fontSize: "28px",
                      }}
                    >
                      {activeMarket.outlookLabel}
                    </strong>
                    <span
                      style={{
                        display: "block",
                        marginTop: "5px",
                        color: "rgba(255,255,255,0.46)",
                        fontSize: "15px",
                      }}
                    >
                      Forecast growth {activeMarket.annualGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <RunningBusinessSwitcher
                  slots={slots}
                  activeSlotId={activeSlotId}
                  mobile={mobile}
                  onSelect={(slotId) => {
                    setActiveSlotId(slotId);
                    setView("market");
                  }}
                />

                <div
                  style={{
                    marginTop: "24px",
                    display: "grid",
                    gridTemplateColumns: mobile
                      ? "1fr"
                      : compact
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(4, minmax(0, 1fr))",
                    gap: "13px",
                  }}
                >
                  <MetricCard
                    label="Demand index"
                    value={`${Math.round(activeMarket.demandIndex)} / 100`}
                    note="Higher demand can strengthen sales and buyer interest"
                    positive={activeMarket.demandIndex >= activeMarket.supplyIndex}
                  />
                  <MetricCard
                    label="Supply index"
                    value={`${Math.round(activeMarket.supplyIndex)} / 100`}
                    note="Higher supply means more competing businesses"
                    positive={activeMarket.supplyIndex <= activeMarket.demandIndex}
                  />
                  <MetricCard
                    label="Demand minus supply"
                    value={`${activeMarket.marketBalance >= 0 ? "+" : ""}${activeMarket.marketBalance.toFixed(1)}`}
                    note="Positive values usually improve seller bargaining power"
                    positive={activeMarket.marketBalance >= 0}
                  />
                  <MetricCard
                    label="Market volatility"
                    value={activeMarket.volatility}
                    note="Higher volatility creates faster changes in valuation"
                    positive={activeMarket.volatility === "Low"}
                  />
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    display: "grid",
                    gridTemplateColumns: compact ? "1fr" : "1.4fr 0.6fr",
                    gap: "18px",
                  }}
                >
                  <div
                    className="milo-market-scroll"
                    style={{
                      borderRadius: "24px",
                      border: "1px solid rgba(218,151,74,0.2)",
                      background: "rgba(6,10,18,0.86)",
                      padding: mobile ? "16px 12px" : "22px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: mobile ? "column" : "row",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: mobile ? "flex-start" : "center",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: "#efbc73",
                            fontSize: "15px",
                            fontWeight: 900,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                          }}
                        >
                          Local demand and supply forecast
                        </p>
                        <h3 style={{ margin: "8px 0 0", fontSize: mobile ? "28px" : "34px" }}>
                          Next twelve months
                        </h3>
                      </div>
                      <div style={{ display: "flex", gap: "14px", fontSize: "15px" }}>
                        <span style={{ color: "#efb96d" }}>● Demand</span>
                        <span style={{ color: "#7db9e8" }}>● Supply</span>
                      </div>
                    </div>
                    <div style={{ marginTop: "16px" }}>
                      <MarketChart points={activeMarket.points} mobile={mobile} />
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: "24px",
                      border: "1px solid rgba(218,151,74,0.22)",
                      background:
                        "linear-gradient(145deg, rgba(73,39,20,0.88), rgba(7,10,18,0.94))",
                      padding: "22px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: "#efbc73",
                        fontSize: "15px",
                        fontWeight: 900,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      Milo’s market guide
                    </p>
                    <h3 style={{ margin: "10px 0 0", fontSize: mobile ? "29px" : "34px" }}>
                      Should you hold or sell?
                    </h3>
                    <p
                      style={{
                        margin: "13px 0 0",
                        color: "rgba(255,255,255,0.62)",
                        fontSize: "17px",
                        lineHeight: 1.62,
                      }}
                    >
                      {activeMarket.outlookScore >= 0.35
                        ? "Demand is expected to remain stronger than supply. Holding the business may allow earnings and competitive bids to improve, although forecasts can change."
                        : activeMarket.outlookScore <= -0.25
                          ? "The outlook is weakening. Buyers may reduce their offers over future cycles unless the business improves its profit, cash and customer strength."
                          : "The market is broadly balanced. Your own profit, cash reserves and customer satisfaction may matter more than waiting for a major market change."}
                    </p>
                    <div
                      style={{
                        marginTop: "17px",
                        display: "grid",
                        gap: "11px",
                      }}
                    >
                      <div
                        style={{
                          borderRadius: "15px",
                          border: "1px solid rgba(218,151,74,0.14)",
                          background: "rgba(255,255,255,0.035)",
                          padding: "13px 14px",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "17px" }}>Main demand driver</strong>
                        <span style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,0.52)", fontSize: "15px", lineHeight: 1.5 }}>
                          {activeMarket.driver}
                        </span>
                      </div>
                      <div
                        style={{
                          borderRadius: "15px",
                          border: "1px solid rgba(218,151,74,0.14)",
                          background: "rgba(255,255,255,0.035)",
                          padding: "13px 14px",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "17px" }}>Main market risk</strong>
                        <span style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,0.52)", fontSize: "15px", lineHeight: 1.5 }}>
                          {activeMarket.risk}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("sell")}
                      style={{
                        width: "100%",
                        minHeight: "52px",
                        marginTop: "18px",
                        borderRadius: "14px",
                        border: "none",
                        background: "linear-gradient(135deg, #d99548, #8d4b21)",
                        color: "white",
                        fontSize: "18px",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Review Sale Options
                    </button>
                  </div>
                </div>
              </div>
            )}

          {view === "sell" &&
            activeSlot &&
            activeBusiness &&
            activeMarket &&
            liveValuation &&
            activeSlot.status === "running" && (
              <div style={{ width: "min(1420px, 100%)", margin: "0 auto" }}>
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#efbc73",
                      fontSize: "16px",
                      fontWeight: 900,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    Sell your business
                  </p>
                  <h2
                    style={{
                      margin: "11px 0 0",
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: mobile ? "43px" : "64px",
                      lineHeight: 0.98,
                      fontWeight: 500,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    Evaluate. List. Negotiate.
                  </h2>
                  <p
                    style={{
                      margin: "16px 0 0",
                      maxWidth: "850px",
                      color: "rgba(255,255,255,0.62)",
                      fontSize: mobile ? "17px" : "19px",
                      lineHeight: 1.65,
                    }}
                  >
                    Hire an analyst to estimate fair market value, choose your asking
                    price and continue running 30-day cycles. Every completed cycle
                    while listed produces three new offers based on business
                    performance and the live {activeMarket.industryName} outlook.
                  </p>
                </div>

                <RunningBusinessSwitcher
                  slots={slots}
                  activeSlotId={activeSlotId}
                  mobile={mobile}
                  onSelect={(slotId) => {
                    setActiveSlotId(slotId);
                    setView("sell");
                  }}
                />

                <div
                  style={{
                    marginTop: "24px",
                    display: "grid",
                    gridTemplateColumns: compact ? "1fr" : "0.85fr 1.15fr",
                    gap: "18px",
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: "18px" }}>
                    <div
                      style={{
                        borderRadius: "24px",
                        border: "1px solid rgba(218,151,74,0.22)",
                        background:
                          "linear-gradient(145deg, rgba(65,35,18,0.9), rgba(6,10,18,0.94))",
                        padding: mobile ? "18px" : "22px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: "#efbc73",
                          fontSize: "15px",
                          fontWeight: 900,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                        }}
                      >
                        Step 1 · Analyst evaluation
                      </p>
                      <h3 style={{ margin: "10px 0 0", fontSize: mobile ? "29px" : "36px" }}>
                        What is the business worth?
                      </h3>
                      <p
                        style={{
                          margin: "12px 0 0",
                          color: "rgba(255,255,255,0.58)",
                          fontSize: "17px",
                          lineHeight: 1.58,
                        }}
                      >
                        The formula combines recoverable assets and cash, annualised
                        operating profit, customer-based brand value, business maturity
                        and the current industry market multiplier.
                      </p>

                      {saleReport ? (
                        <div style={{ marginTop: "18px", display: "grid", gap: "10px" }}>
                          <MetricCard
                            label="Analyst valuation"
                            value={formatMoney(saleReport.valuation)}
                            note={`Completed during cycle ${saleReport.cycleNumber} · ${saleReport.marketOutlook} market`}
                            positive={saleReport.marketOutlook === "Positive" || saleReport.marketOutlook === "Strong"}
                          />
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: mobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                              gap: "10px",
                            }}
                          >
                            <MetricCard label="Assets & cash" value={formatMoney(saleReport.assetValue)} note="Recoverable setup value plus business cash" />
                            <MetricCard label="Earnings value" value={formatMoney(saleReport.earningsValue)} note={`${saleReport.earningsMultiple.toFixed(2)}× earnings multiple`} positive={saleReport.earningsValue > 0} />
                            <MetricCard label="Brand value" value={formatMoney(saleReport.brandValue)} note="Customer strength and revenue contribution" positive={saleReport.brandValue > 0} />
                          </div>
                          <p
                            style={{
                              margin: 0,
                              borderRadius: "15px",
                              border: "1px solid rgba(218,151,74,0.14)",
                              background: "rgba(255,255,255,0.035)",
                              padding: "13px 14px",
                              color: "rgba(255,255,255,0.58)",
                              fontSize: "15px",
                              lineHeight: 1.55,
                            }}
                          >
                            {saleReport.summary}
                          </p>
                        </div>
                      ) : (
                        <div
                          style={{
                            marginTop: "18px",
                            borderRadius: "17px",
                            border: "1px dashed rgba(239,187,112,0.28)",
                            background: "rgba(255,255,255,0.025)",
                            padding: "16px",
                          }}
                        >
                          <strong style={{ display: "block", fontSize: "18px" }}>
                            Analyst fee: {formatMoney(getAnalystFee())}
                          </strong>
                          <span style={{ display: "block", marginTop: "6px", color: "rgba(255,255,255,0.48)", fontSize: "15px", lineHeight: 1.5 }}>
                            Paid once from business cash. Available cash: {formatMoney(activeSlot.cash)}.
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={hireBusinessAnalyst}
                        disabled={saleActionState !== "idle" || activeSlot.cash < getAnalystFee()}
                        style={{
                          width: "100%",
                          minHeight: "52px",
                          marginTop: "18px",
                          borderRadius: "14px",
                          border: "none",
                          background:
                            saleActionState !== "idle" || activeSlot.cash < getAnalystFee()
                              ? "rgba(255,255,255,0.12)"
                              : "linear-gradient(135deg, #d99548, #8d4b21)",
                          color:
                            saleActionState !== "idle" || activeSlot.cash < getAnalystFee()
                              ? "rgba(255,255,255,0.38)"
                              : "white",
                          fontSize: "18px",
                          fontWeight: 900,
                          cursor: saleActionState !== "idle" ? "wait" : "pointer",
                        }}
                      >
                        {saleActionState === "analysing"
                          ? "Analysing..."
                          : saleReport
                            ? "Order Updated Evaluation"
                            : "Hire Market Analyst"}
                      </button>
                    </div>

                    <div
                      style={{
                        borderRadius: "24px",
                        border: "1px solid rgba(218,151,74,0.2)",
                        background: "rgba(6,10,18,0.88)",
                        padding: mobile ? "18px" : "22px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          color: "#efbc73",
                          fontSize: "15px",
                          fontWeight: 900,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                        }}
                      >
                        Step 2 · Set asking price
                      </p>
                      <h3 style={{ margin: "10px 0 0", fontSize: mobile ? "29px" : "36px" }}>
                        Place the business for sale
                      </h3>
                      <label style={{ display: "grid", gap: "8px", marginTop: "18px" }}>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                          Asking price in DT
                        </span>
                        <input
                          type="number"
                          min={1}
                          step={50}
                          value={listingPriceDraft}
                          onChange={(event) => setListingPriceDraft(Math.max(0, Number(event.target.value) || 0))}
                          disabled={!saleReport}
                          style={{
                            width: "100%",
                            height: "58px",
                            borderRadius: "14px",
                            border: "1px solid rgba(218,151,74,0.25)",
                            background: "rgba(255,255,255,0.05)",
                            color: "white",
                            padding: "0 16px",
                            fontSize: "22px",
                            fontWeight: 900,
                            outline: "none",
                          }}
                        />
                      </label>

                      <div
                        style={{
                          marginTop: "14px",
                          display: "grid",
                          gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
                          gap: "10px",
                        }}
                      >
                        <MetricCard
                          label="Your projected share"
                          value={formatMoney(projectedSaleUserShare)}
                          note={`${Math.round(activeSlot.userOwnership * 100)}% ownership`}
                          positive
                        />
                        <MetricCard
                          label="Milo’s projected share"
                          value={formatMoney(Math.max(0, listingPriceDraft - projectedSaleUserShare))}
                          note={`${Math.round(activeSlot.miloOwnership * 100)}% ownership`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={placeOrUpdateSaleListing}
                        disabled={!saleReport || listingPriceDraft <= 0 || saleActionState !== "idle"}
                        style={{
                          width: "100%",
                          minHeight: "52px",
                          marginTop: "18px",
                          borderRadius: "14px",
                          border: "none",
                          background:
                            !saleReport || listingPriceDraft <= 0 || saleActionState !== "idle"
                              ? "rgba(255,255,255,0.12)"
                              : "linear-gradient(135deg, #d99548, #8d4b21)",
                          color:
                            !saleReport || listingPriceDraft <= 0 || saleActionState !== "idle"
                              ? "rgba(255,255,255,0.38)"
                              : "white",
                          fontSize: "18px",
                          fontWeight: 900,
                          cursor: saleActionState !== "idle" ? "wait" : "pointer",
                        }}
                      >
                        {saleActionState === "listing"
                          ? "Saving Listing..."
                          : activeSlot.saleListing.status === "listed"
                            ? "Update Asking Price"
                            : "List Business for Sale"}
                      </button>

                      {activeSlot.saleListing.status === "listed" && (
                        <button
                          type="button"
                          onClick={withdrawSaleListing}
                          style={{
                            width: "100%",
                            minHeight: "48px",
                            marginTop: "10px",
                            borderRadius: "14px",
                            border: "1px solid rgba(255,180,151,0.3)",
                            background: "rgba(116,42,27,0.24)",
                            color: "#ffbea6",
                            fontSize: "16px",
                            fontWeight: 850,
                            cursor: "pointer",
                          }}
                        >
                          Withdraw Listing
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: "24px",
                      border: "1px solid rgba(218,151,74,0.22)",
                      background:
                        "linear-gradient(145deg, rgba(47,25,14,0.88), rgba(4,8,16,0.96))",
                      padding: mobile ? "18px" : "22px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: mobile ? "column" : "row",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: mobile ? "flex-start" : "center",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            color: "#efbc73",
                            fontSize: "15px",
                            fontWeight: 900,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                          }}
                        >
                          Buyer offers
                        </p>
                        <h3 style={{ margin: "9px 0 0", fontSize: mobile ? "31px" : "39px" }}>
                          Three bids per completed cycle
                        </h3>
                      </div>
                      {activeSlot.saleListing.status === "listed" && (
                        <span
                          style={{
                            borderRadius: "999px",
                            border: "1px solid rgba(159,240,189,0.28)",
                            background: "rgba(37,112,76,0.2)",
                            color: "#9ff0bd",
                            padding: "9px 13px",
                            fontSize: "14px",
                            fontWeight: 900,
                          }}
                        >
                          Listed at {formatMoney(activeSlot.saleListing.listedPrice)}
                        </span>
                      )}
                    </div>

                    {activeSlot.saleListing.status !== "listed" ? (
                      <div
                        style={{
                          marginTop: "18px",
                          minHeight: "230px",
                          borderRadius: "18px",
                          border: "1px dashed rgba(218,151,74,0.22)",
                          background: "rgba(255,255,255,0.02)",
                          display: "grid",
                          placeItems: "center",
                          padding: "24px",
                          textAlign: "center",
                        }}
                      >
                        <div>
                          <strong style={{ display: "block", fontSize: "24px" }}>Not listed yet</strong>
                          <span style={{ display: "block", marginTop: "8px", color: "rgba(255,255,255,0.48)", fontSize: "16px", lineHeight: 1.55 }}>
                            Complete an analyst evaluation and choose an asking price first.
                          </span>
                        </div>
                      </div>
                    ) : activeSlot.saleListing.offers.length === 0 ? (
                      <div
                        style={{
                          marginTop: "18px",
                          minHeight: "230px",
                          borderRadius: "18px",
                          border: "1px dashed rgba(218,151,74,0.22)",
                          background: "rgba(255,255,255,0.02)",
                          display: "grid",
                          placeItems: "center",
                          padding: "24px",
                          textAlign: "center",
                        }}
                      >
                        <div>
                          <strong style={{ display: "block", fontSize: "24px" }}>Run the next 30-day cycle</strong>
                          <span style={{ display: "block", marginTop: "8px", color: "rgba(255,255,255,0.48)", fontSize: "16px", lineHeight: 1.55 }}>
                            Buyer interest is reviewed only after a complete cycle. Better profit and a positive market forecast can create stronger competition.
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate("analytics")}
                            style={{
                              minHeight: "48px",
                              marginTop: "16px",
                              borderRadius: "13px",
                              border: "1px solid rgba(218,151,74,0.25)",
                              background: "rgba(92,49,23,0.5)",
                              color: "white",
                              padding: "0 20px",
                              fontSize: "17px",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            Continue Simulation
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
                        {activeSlot.saleListing.offers.map((offer, index) => {
                          const userShare = Math.round(offer.amount * activeSlot.userOwnership);
                          const aboveList = offer.amount >= activeSlot.saleListing.listedPrice;
                          const cannotSell = activeSlot.cycleStatus === "awaiting-allocation";

                          return (
                            <article
                              key={offer.id}
                              style={{
                                borderRadius: "18px",
                                border: aboveList
                                  ? "1px solid rgba(159,240,189,0.35)"
                                  : "1px solid rgba(218,151,74,0.16)",
                                background: aboveList
                                  ? "linear-gradient(145deg, rgba(28,91,61,0.25), rgba(255,255,255,0.025))"
                                  : "rgba(255,255,255,0.025)",
                                padding: mobile ? "16px" : "18px",
                              }}
                            >
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: mobile ? "1fr" : "1fr auto",
                                  gap: "12px",
                                  alignItems: "start",
                                }}
                              >
                                <div>
                                  <span style={{ color: "#efbc73", fontSize: "13px", fontWeight: 900, letterSpacing: "0.13em", textTransform: "uppercase" }}>
                                    Offer {index + 1} · Cycle {offer.cycleNumber}
                                  </span>
                                  <h4 style={{ margin: "8px 0 0", fontSize: mobile ? "24px" : "28px" }}>
                                    {offer.buyerName}
                                  </h4>
                                  <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: 1.5 }}>
                                    {offer.note} · {offer.outlookLabel} market outlook
                                  </p>
                                </div>
                                <strong
                                  style={{
                                    color: aboveList ? "#9ff0bd" : "#f3c47c",
                                    fontSize: mobile ? "29px" : "34px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatMoney(offer.amount)}
                                </strong>
                              </div>

                              <div
                                style={{
                                  marginTop: "14px",
                                  display: "grid",
                                  gridTemplateColumns: mobile ? "1fr" : "1fr auto",
                                  gap: "12px",
                                  alignItems: "center",
                                }}
                              >
                                <span style={{ color: "rgba(255,255,255,0.54)", fontSize: "16px" }}>
                                  Your share: <strong style={{ color: "#9ff0bd" }}>{formatMoney(userShare)}</strong> · Milo: {formatMoney(offer.amount - userShare)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => acceptSaleOffer(offer)}
                                  disabled={cannotSell || saleActionState !== "idle"}
                                  style={{
                                    minHeight: "48px",
                                    borderRadius: "13px",
                                    border: "none",
                                    background:
                                      cannotSell || saleActionState !== "idle"
                                        ? "rgba(255,255,255,0.12)"
                                        : "linear-gradient(135deg, #d99548, #8d4b21)",
                                    color:
                                      cannotSell || saleActionState !== "idle"
                                        ? "rgba(255,255,255,0.38)"
                                        : "white",
                                    padding: "0 20px",
                                    fontSize: "17px",
                                    fontWeight: 900,
                                    cursor: cannotSell ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {saleActionState === "selling" ? "Completing Sale..." : "Accept Offer"}
                                </button>
                              </div>
                              {cannotSell && (
                                <p style={{ margin: "10px 0 0", color: "#ffbf9f", fontSize: "14px", lineHeight: 1.45 }}>
                                  Allocate the completed cycle in Analytics before accepting an offer.
                                </p>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: "18px",
                        borderRadius: "16px",
                        border: "1px solid rgba(218,151,74,0.14)",
                        background: "rgba(255,255,255,0.025)",
                        padding: "14px 15px",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "15px",
                        lineHeight: 1.55,
                      }}
                    >
                      New bids replace the previous cycle’s bids. A weak forecast can
                      push offers lower over time, while improving profit and a sudden
                      positive outlook can create bids above the listed price.
                    </div>
                  </div>
                </div>
              </div>
            )}

        </section>
      </div>

      {introOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            padding: "18px",
            background: "rgba(0,0,0,0.64)",
            backdropFilter: "blur(7px)",
            WebkitBackdropFilter: "blur(7px)",
          }}
          onClick={() => setIntroOpen(false)}
        >
          <div
            className="milo-dialogue-panel"
            style={{
              position: "relative",
              overflow: "hidden",
              width: "min(860px, 100%)",
              minHeight: "390px",
              borderRadius: "30px",
              border: "1px solid rgba(231,169,91,0.4)",
              background:
                "linear-gradient(145deg, rgba(66,34,16,0.98), rgba(5,10,20,0.99))",
              boxShadow: "0 40px 110px rgba(0,0,0,0.6)",
              padding: mobile ? "230px 22px 24px" : "42px 42px 36px 330px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src="/milo-world/milo-character.png"
              alt="Milo"
              style={{
                position: "absolute",
                left: "28px",
                bottom: "-36px",
                height: "410px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 20px 38px rgba(0,0,0,0.56))",
              }}
            />

            <button
              type="button"
              onClick={() => setIntroOpen(false)}
              style={{
                position: "absolute",
                top: "17px",
                right: "17px",
                width: "40px",
                height: "40px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <p
              style={{
                margin: 0,
                color: "#f0bc70",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Milo says
            </p>
            <h2
              style={{
                margin: "12px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: mobile ? "35px" : "46px",
                lineHeight: 1,
                fontWeight: 500,
              }}
            >
              Let’s build something worth investing in.
            </h2>
            <p
              style={{
                margin: "20px 0 0",
                color: "rgba(255,255,255,0.7)",
                fontSize: "18px",
                lineHeight: 1.7,
              }}
            >
              I’ve accumulated quite a bit of wealth during my time in
              Dreamscape, and I’m using part of it to fund promising new
              businesses. I’ll provide the virtual starting capital. You will
              decide how the business is built, control its costs and show me
              whether it can grow.
            </p>
            <button
              type="button"
              onClick={beginBusinessSelection}
              style={{
                width: "100%",
                minHeight: "52px",
                marginTop: "24px",
                borderRadius: "14px",
                border: "none",
                background: "linear-gradient(135deg, #dc9a4d, #8f4a20)",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Choose a Business
            </button>
          </div>
        </div>
      )}

      <WelcomeTokenOffer
        open={welcomeOfferOpen}
        onClose={markWelcomeOfferSeen}
        onPurchase={openWelcomeOfferCheckout}
        mobile={mobile}
      />

      {compact && mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(0,0,0,0.62)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              width: "min(340px, calc(100vw - 30px))",
              height: "100dvh",
              boxShadow: "30px 0 80px rgba(0,0,0,0.58)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {sidebar}
          </div>
        </div>
      )}
    </main>
  );
}
