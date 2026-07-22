"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ViewName =
  | "storefronts"
  | "businesses"
  | "funding"
  | "setup"
  | "analytics";

type SlotStatus = "empty" | "setup" | "running";
type TierId = "budget" | "balanced" | "premium";
type SimulationSpeed = 0 | 1 | 24 | 168 | 1440;
type FundingStep = "milo" | "personal";
type CycleStatus = "running" | "awaiting-allocation" | "settled";
type SetupCategoryId =
  | "location"
  | "equipment"
  | "stock"
  | "staff"
  | "marketing";

type SetupSelections = Record<SetupCategoryId, TierId>;

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

type BusinessOption = {
  id: string;
  title: string;
  category: string;
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
  selections: SetupSelections;
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

const STORAGE_VERSION = "milo-business-builder-v2";
const BUSINESS_PROGRESS_TABLE = "milo_business_builder_progress";
const CYCLE_DAYS = 30;
const CYCLE_MINUTES = CYCLE_DAYS * 1440;
const MIN_MILO_OWNERSHIP = 0.2;
const MAX_MILO_OWNERSHIP = 0.5;

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
    miloOwnership: MIN_MILO_OWNERSHIP,
    userOwnership: 1 - MIN_MILO_OWNERSHIP,
    selections: { ...DEFAULT_SELECTIONS },
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

function getOwnershipForInvestment(
  business: BusinessOption,
  investment: number,
) {
  const range = Math.max(1, business.maxCapital - business.minCapital);
  const progress = Math.max(
    0,
    Math.min(1, (investment - business.minCapital) / range),
  );
  const miloOwnership =
    MIN_MILO_OWNERSHIP +
    (MAX_MILO_OWNERSHIP - MIN_MILO_OWNERSHIP) * progress;

  return {
    miloOwnership,
    userOwnership: 1 - miloOwnership,
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
  const business = getBusiness(savedSlot.businessTypeId || null);
  const calculatedOwnership = business
    ? getOwnershipForInvestment(business, miloInvestment)
    : {
        miloOwnership: MIN_MILO_OWNERSHIP,
        userOwnership: 1 - MIN_MILO_OWNERSHIP,
      };

  return {
    ...base,
    ...savedSlot,
    id,
    approvedBudget,
    miloInvestment,
    personalContribution: Number(savedSlot.personalContribution || 0),
    miloOwnership: Number(
      savedSlot.miloOwnership ?? calculatedOwnership.miloOwnership,
    ),
    userOwnership: Number(
      savedSlot.userOwnership ?? calculatedOwnership.userOwnership,
    ),
    selections: {
      ...DEFAULT_SELECTIONS,
      ...(savedSlot.selections || {}),
    },
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
  const costBasis = slot.miloInvestment || slot.approvedBudget;
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
      satisfactionTarget: 50,
      monthlyFixedCosts: 0,
    };
  }

  const q = summary.qualityScores;
  const demandMultiplier =
    0.48 +
    q.location * 0.13 +
    q.marketing * 0.1 +
    q.stock * 0.05 +
    q.staff * 0.035;
  const capacityMultiplier =
    0.56 + q.equipment * 0.12 + q.staff * 0.09 + q.stock * 0.035;
  const operationalMultiplier = Math.min(demandMultiplier, capacityMultiplier);

  const dailyRevenue =
    costBasis * business.dailyRevenueRate * operationalMultiplier;
  const costOfSalesRate = Math.max(0.31, 0.47 - q.stock * 0.035);
  const dailyVariableCosts = dailyRevenue * costOfSalesRate;
  const dailyFixedCosts = summary.monthlyFixedCosts / 30;
  const equipmentRiskCost =
    q.equipment === 1 ? costBasis * 0.0007 : 0;
  const dailyExpenses =
    dailyVariableCosts + dailyFixedCosts + equipmentRiskCost;
  const dailyProfit = dailyRevenue - dailyExpenses;
  const dailyOrders = dailyRevenue / Math.max(1, business.averageOrderValue);
  const budgetPressure = summary.setupSpend / slot.approvedBudget;
  const satisfactionTarget = Math.max(
    40,
    Math.min(
      96,
      42 +
        q.staff * 9 +
        q.equipment * 7 +
        q.stock * 5 +
        q.location * 3 -
        (budgetPressure > 0.94 ? 6 : 0),
    ),
  );

  return {
    dailyRevenue,
    dailyExpenses,
    dailyProfit,
    dailyOrders,
    satisfactionTarget,
    monthlyFixedCosts: summary.monthlyFixedCosts,
  };
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

  return {
    ...slot,
    cycleNumber: slot.cycleNumber + 1,
    cycleSimulatedMinutes: 0,
    cycleRevenue: 0,
    cycleExpenses: 0,
    cycleProfit: 0,
    cycleStatus: "running",
    simulationSpeed: 1,
    lastUpdatedAt: new Date().toISOString(),
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
  const simulatedDays = simulatedMinutes / 1440;
  const forecast = getPerformanceForecast(slot);
  const revenueAdded = forecast.dailyRevenue * simulatedDays;
  const expensesAdded = forecast.dailyExpenses * simulatedDays;
  const satisfactionMovement = Math.min(1, simulatedDays / 4);
  const nextSatisfaction =
    slot.customerSatisfaction +
    (forecast.satisfactionTarget - slot.customerSatisfaction) *
      satisfactionMovement;
  const nextCycleMinutes = slot.cycleSimulatedMinutes + simulatedMinutes;
  const nextCycleRevenue = slot.cycleRevenue + revenueAdded;
  const nextCycleExpenses = slot.cycleExpenses + expensesAdded;
  const cycleComplete = nextCycleMinutes >= CYCLE_MINUTES - 0.0001;

  return {
    ...slot,
    simulatedMinutes: slot.simulatedMinutes + simulatedMinutes,
    cycleSimulatedMinutes: nextCycleMinutes,
    revenue: slot.revenue + revenueAdded,
    expenses: slot.expenses + expensesAdded,
    cycleRevenue: nextCycleRevenue,
    cycleExpenses: nextCycleExpenses,
    cycleProfit: nextCycleRevenue - nextCycleExpenses,
    cash: slot.cash + revenueAdded - expensesAdded,
    sales: slot.sales + forecast.dailyOrders * simulatedDays,
    customerSatisfaction: nextSatisfaction,
    cycleStatus: cycleComplete ? "awaiting-allocation" : "running",
    simulationSpeed: cycleComplete ? 0 : slot.simulationSpeed,
    lastCycleCompletedDateSg: cycleComplete
      ? getSingaporeDateString()
      : slot.lastCycleCompletedDateSg,
    lastUpdatedAt: new Date().toISOString(),
  };
}

function catchUpSlot(slot: BusinessSlot): BusinessSlot {
  const prepared = prepareNextCycleIfAvailable(slot);

  if (prepared.status !== "running" || !prepared.lastUpdatedAt) {
    return {
      ...prepared,
      simulationSpeed:
        prepared.status === "running" && prepared.cycleStatus === "running"
          ? 1
          : 0,
    };
  }

  const elapsedSeconds = Math.max(
    0,
    (Date.now() - new Date(prepared.lastUpdatedAt).getTime()) / 1000,
  );

  const caughtUp = simulateSlot(prepared, elapsedSeconds, 1);

  return {
    ...caughtUp,
    simulationSpeed: caughtUp.cycleStatus === "running" ? 1 : 0,
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

export default function MiloBusinessBuilderPage() {
  const { width } = useViewport();
  const mobile = width <= 760;
  const compact = width < 1160;

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profileNetWorth, setProfileNetWorth] = useState(0);
  const [dreamTokenBalance, setDreamTokenBalance] = useState(0);
  const [netWorthLoading, setNetWorthLoading] = useState(true);
  const [slots, setSlots] = useState<BusinessSlot[]>(createDefaultSlots);
  const [storageReady, setStorageReady] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<1 | 2 | 3 | null>(null);
  const [view, setView] = useState<ViewName>("storefronts");
  const [hoveredSlotId, setHoveredSlotId] = useState<number | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    null,
  );
  const [requestedBudget, setRequestedBudget] = useState(0);
  const [fundingStep, setFundingStep] = useState<FundingStep>("milo");
  const [personalContribution, setPersonalContribution] = useState(0);
  const [fundingSubmitting, setFundingSubmitting] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSetupCategory, setActiveSetupCategory] =
    useState<SetupCategoryId>("location");
  const [draftSelections, setDraftSelections] =
    useState<SetupSelections>(DEFAULT_SELECTIONS);
  const [businessNameDraft, setBusinessNameDraft] = useState("");
  const [reinvestmentPercent, setReinvestmentPercent] = useState(50);
  const [cycleSubmitting, setCycleSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastCloudSavedAt, setLastCloudSavedAt] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState("");

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
        setAuthLoading(false);
        setNetWorthLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");
      setAuthLoading(false);

      const [
        tokensResult,
        stocksResult,
        stockHoldingsResult,
        propertiesResult,
        propertyHoldingsResult,
      ] = await Promise.all([
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

      setProfileNetWorth(tokenBalance + stockValue + propertyValue);
      setNetWorthLoading(false);
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
    if (authLoading || !userId) return;

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
  }, [authLoading, legacyStorageKey, storageKey, userId]);

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
          return simulateSlot(slot, elapsedSeconds);
        });
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [storageReady]);

  useEffect(() => {
    if (!activeSlot) return;
    setDraftSelections({ ...activeSlot.selections });
    setBusinessNameDraft(activeSlot.businessName);
  }, [activeSlot?.id, activeSlot?.businessName, activeSlot?.status]);

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
    setFundingStep("milo");
    setPersonalContribution(0);
    setPageMessage("");
    setView("funding");
  }

  function approveFunding() {
    if (!activeSlotId || !selectedBusiness) return;

    const requiresAssets = requestedBudget > 50000;
    const requiredAssets = requestedBudget * 0.1;

    if (requiresAssets && profileNetWorth < requiredAssets) {
      setPageMessage(
        `You need at least ${formatMoney(requiredAssets)} in profile assets for this investment tier.`,
      );
      return;
    }

    setPersonalContribution(0);
    setFundingStep("personal");
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

    const ownership = getOwnershipForInvestment(
      selectedBusiness,
      requestedBudget,
    );
    const totalBudget = requestedBudget + cleanContribution;
    const defaultName = `My ${selectedBusiness.title}`;
    const summary = getSetupSummary(
      requestedBudget,
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
      activeSlot.miloInvestment || activeSlot.approvedBudget,
      draftSelections,
      activeSlot.approvedBudget,
    );

    if (!cleanName) {
      setPageMessage("Give your business a name before continuing.");
      return;
    }

    if (summary.setupSpend > activeSlot.approvedBudget) {
      setPageMessage(
        "This setup is over Milo’s approved budget. Choose a less expensive option in at least one category.",
      );
      return;
    }

    const now = new Date().toISOString();

    setSlots((current) =>
      current.map((slot) =>
        slot.id === activeSlot.id
          ? {
              ...slot,
              status: "running",
              businessName: cleanName,
              selections: { ...draftSelections },
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

    const cleanName = businessNameDraft.trim();
    const newSummary = getSetupSummary(
      activeSlot.miloInvestment || activeSlot.approvedBudget,
      draftSelections,
      activeSlot.approvedBudget,
    );
    const difference = newSummary.setupSpend - activeSlot.setupSpend;
    const requiredCash = Math.max(0, difference);

    if (!cleanName) {
      setPageMessage("Give your business a name before saving changes.");
      return;
    }

    if (newSummary.setupSpend > activeSlot.approvedBudget) {
      setPageMessage("The revised setup exceeds the approved investment.");
      return;
    }

    if (requiredCash > activeSlot.cash) {
      setPageMessage(
        `The upgrade needs ${formatMoney(requiredCash)}, but the business only has ${formatMoney(activeSlot.cash)} available.`,
      );
      return;
    }

    const cashAdjustment =
      difference >= 0 ? -difference : Math.abs(difference) * 0.5;

    setSlots((current) =>
      current.map((slot) =>
        slot.id === activeSlot.id
          ? {
              ...slot,
              businessName: cleanName,
              selections: { ...draftSelections },
              setupSpend: newSummary.setupSpend,
              cash: slot.cash + cashAdjustment,
              lastUpdatedAt: new Date().toISOString(),
            }
          : slot,
      ),
    );

    setPageMessage(
      difference < 0
        ? "Changes saved. The business recovered 50% of the value removed from its setup."
        : "Changes saved and paid from the business’s available cash.",
    );
  }

  async function saveProgressToAccount(
    progressSlots: BusinessSlot[] = slots,
    progressActiveSlotId: 1 | 2 | 3 | null = activeSlotId,
  ) {
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
        </div>
      </div>
    </aside>
  );

  if (authLoading) {
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
        activeSlot.miloInvestment || activeSlot.approvedBudget,
        draftSelections,
        activeSlot.approvedBudget,
      )
    : null;
  const operatingForecast = activeSlot
    ? getPerformanceForecast({
        ...activeSlot,
        selections: draftSelections,
      })
    : {
        dailyRevenue: 0,
        dailyExpenses: 0,
        dailyProfit: 0,
        dailyOrders: 0,
        satisfactionTarget: 50,
        monthlyFixedCosts: 0,
      };
  const profit = activeSlot ? activeSlot.revenue - activeSlot.expenses : 0;
  const simulatedDays = activeSlot ? activeSlot.simulatedMinutes / 1440 : 0;
  const cycleDays = activeSlot
    ? Math.min(CYCLE_DAYS, activeSlot.cycleSimulatedMinutes / 1440)
    : 0;
  const cycleProgress = Math.min(100, (cycleDays / CYCLE_DAYS) * 100);
  const fundingOwnership = selectedBusiness
    ? getOwnershipForInvestment(selectedBusiness, requestedBudget)
    : {
        miloOwnership: MIN_MILO_OWNERSHIP,
        userOwnership: 1 - MIN_MILO_OWNERSHIP,
      };
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
          gridTemplateColumns: mobile ? "auto 1fr auto" : "1fr auto 1fr",
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
          {!mobile && (
            <div
              style={{
                minHeight: "44px",
                borderRadius: "999px",
                border: "1px solid rgba(218,151,74,0.22)",
                background: "rgba(31,18,11,0.68)",
                padding: "7px 15px",
                textAlign: "right",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Profile assets
              </span>
              <strong
                style={{
                  display: "block",
                  marginTop: "3px",
                  color: "#f1c17b",
                  fontSize: "15px",
                }}
              >
                {netWorthLoading ? "Loading" : formatMoney(profileNetWorth)}
              </strong>
            </div>
          )}
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

          <Link href="/profile" style={{ ...navButtonStyle, padding: mobile ? "0 13px" : "0 17px" }}>
            {mobile ? "Account" : userEmail || "My Account"}
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
              {fundingStep === "milo" ? (
                <>
                  <MiloPanel
                    eyebrow="Investment review"
                    title={
                      requestedBudget <= 50000
                        ? "I’m happy to invest."
                        : profileNetWorth >= requestedBudget * 0.1
                          ? "Your profile supports this investment."
                          : "This tier needs stronger assets first."
                    }
                    text={
                      requestedBudget <= 50000
                        ? "Choose how much funding you want from me. The more I invest, the larger my ownership share and the higher my expectations. Even at the maximum investment, we remain equal 50/50 partners."
                        : profileNetWorth >= requestedBudget * 0.1
                          ? "This is a higher-risk business. Your profile meets the 10% asset requirement, so choose the amount you want me to invest."
                          : `Before I can approve this amount, you need profile assets equal to at least 10% of the investment. You currently have ${formatMoney(profileNetWorth)} in eligible assets.`
                    }
                    compact={compact}
                  />

                  <div
                    style={{
                      marginTop: "24px",
                      display: "grid",
                      gridTemplateColumns: compact ? "1fr" : "0.88fr 1.12fr",
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
                      <p
                        style={{
                          margin: 0,
                          color: "#eab36b",
                          fontSize: "15px",
                          fontWeight: 900,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                        }}
                      >
                        Selected business
                      </p>
                      <h2
                        style={{
                          margin: "12px 0 0",
                          fontSize: "36px",
                          lineHeight: 1.05,
                        }}
                      >
                        {selectedBusiness.title}
                      </h2>
                      <p
                        style={{
                          margin: "16px 0 0",
                          color: "rgba(255,255,255,0.62)",
                          fontSize: "19px",
                          lineHeight: 1.65,
                        }}
                      >
                        {selectedBusiness.description}
                      </p>

                      <div
                        style={{
                          marginTop: "22px",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                        }}
                      >
                        <MetricCard
                          label="Difficulty"
                          value={`${selectedBusiness.difficulty}/5`}
                          note="More categories and operating pressure"
                        />
                        <MetricCard
                          label="Main risk"
                          value={selectedBusiness.mainRisk}
                          note="Watch this area after launch"
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: "24px",
                        border: "1px solid rgba(218,151,74,0.24)",
                        background: "rgba(6,10,18,0.88)",
                        padding: "24px",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          color: "rgba(255,255,255,0.54)",
                          fontSize: "16px",
                          fontWeight: 900,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                        }}
                      >
                        Milo’s proposed investment
                      </label>
                      <strong
                        style={{
                          display: "block",
                          marginTop: "12px",
                          color: "#f4c782",
                          fontSize: mobile ? "44px" : "56px",
                          letterSpacing: "-0.05em",
                        }}
                      >
                        {formatMoney(requestedBudget)}
                      </strong>

                      <input
                        type="range"
                        min={selectedBusiness.minCapital}
                        max={selectedBusiness.maxCapital}
                        step={1000}
                        value={requestedBudget}
                        onChange={(event) => {
                          setRequestedBudget(Number(event.target.value));
                          setPageMessage("");
                        }}
                        style={{ width: "100%", marginTop: "24px" }}
                      />

                      <div
                        style={{
                          marginTop: "9px",
                          display: "flex",
                          justifyContent: "space-between",
                          color: "rgba(255,255,255,0.46)",
                          fontSize: "16px",
                        }}
                      >
                        <span>{formatMoney(selectedBusiness.minCapital)}</span>
                        <span>{formatMoney(selectedBusiness.maxCapital)}</span>
                      </div>

                      <div
                        style={{
                          marginTop: "24px",
                          borderRadius: "18px",
                          border: "1px solid rgba(235,179,103,0.22)",
                          background: "rgba(255,255,255,0.035)",
                          padding: "18px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "14px",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                display: "block",
                                color: "#efbc73",
                                fontSize: "16px",
                                fontWeight: 900,
                              }}
                            >
                              Milo {Math.round(fundingOwnership.miloOwnership * 100)}%
                            </span>
                            <span
                              style={{
                                display: "block",
                                marginTop: "4px",
                                color: "rgba(255,255,255,0.48)",
                                fontSize: "15px",
                              }}
                            >
                              Investor ownership
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span
                              style={{
                                display: "block",
                                color: "#9ff0bd",
                                fontSize: "16px",
                                fontWeight: 900,
                              }}
                            >
                              You {Math.round(fundingOwnership.userOwnership * 100)}%
                            </span>
                            <span
                              style={{
                                display: "block",
                                marginTop: "4px",
                                color: "rgba(255,255,255,0.48)",
                                fontSize: "15px",
                              }}
                            >
                              Founder ownership
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            height: "12px",
                            marginTop: "15px",
                            borderRadius: "999px",
                            overflow: "hidden",
                            background: "rgba(255,255,255,0.08)",
                            display: "flex",
                          }}
                        >
                          <span
                            style={{
                              width: `${fundingOwnership.miloOwnership * 100}%`,
                              background:
                                "linear-gradient(90deg, #8d4b21, #e0a257)",
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              background:
                                "linear-gradient(90deg, #4c8768, #8dd5a9)",
                            }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "22px",
                          display: "grid",
                          gridTemplateColumns: mobile
                            ? "1fr"
                            : "repeat(3, 1fr)",
                          gap: "10px",
                        }}
                      >
                        <MetricCard
                          label="Milo’s objective"
                          value={`${formatMoney(requestedBudget * 0.04)}/cycle`}
                          note="Indicative 30-day profit expectation"
                        />
                        <MetricCard
                          label="Suggested reserve"
                          value={formatMoney(requestedBudget * 0.15)}
                          note="Cash to protect the launch"
                        />
                        <MetricCard
                          label="Assets required"
                          value={
                            requestedBudget > 50000
                              ? formatMoney(requestedBudget * 0.1)
                              : "None"
                          }
                          note="Only applies above 50,000 DT"
                        />
                      </div>

                      <p
                        style={{
                          margin: "21px 0 0",
                          color: "rgba(255,255,255,0.58)",
                          fontSize: "18px",
                          lineHeight: 1.65,
                        }}
                      >
                        A more expensive business does not automatically earn
                        more. Strong cost control can make a smaller business
                        outperform a larger one.
                      </p>

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
                          onClick={() => setView("businesses")}
                          style={{
                            minHeight: "54px",
                            flex: 1,
                            borderRadius: "14px",
                            border: "1px solid rgba(218,151,74,0.2)",
                            background: "rgba(255,255,255,0.04)",
                            color: "white",
                            fontSize: "18px",
                            fontWeight: 850,
                            cursor: "pointer",
                          }}
                        >
                          Choose Another Business
                        </button>
                        <button
                          type="button"
                          onClick={approveFunding}
                          disabled={
                            requestedBudget > 50000 &&
                            profileNetWorth < requestedBudget * 0.1
                          }
                          style={{
                            minHeight: "54px",
                            flex: 1.2,
                            borderRadius: "14px",
                            border: "none",
                            background:
                              requestedBudget > 50000 &&
                              profileNetWorth < requestedBudget * 0.1
                                ? "rgba(255,255,255,0.12)"
                                : "linear-gradient(135deg, #d99548, #8d4b21)",
                            color:
                              requestedBudget > 50000 &&
                              profileNetWorth < requestedBudget * 0.1
                                ? "rgba(255,255,255,0.38)"
                                : "white",
                            fontSize: "18px",
                            fontWeight: 900,
                            cursor:
                              requestedBudget > 50000 &&
                              profileNetWorth < requestedBudget * 0.1
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          Approve Milo’s Investment
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <MiloPanel
                    eyebrow="Optional founder funding"
                    title="Would you like to add your own DT?"
                    text="There is no minimum and no product limit. You can add any amount up to your available Dream Token balance, or continue using only my investment. Your personal funds increase the business’s available cash but do not change the ownership agreement we just made."
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
                      <p
                        style={{
                          margin: 0,
                          color: "#eab36b",
                          fontSize: "15px",
                          fontWeight: 900,
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                        }}
                      >
                        Agreed ownership
                      </p>
                      <h2
                        style={{
                          margin: "12px 0 0",
                          fontSize: "35px",
                          lineHeight: 1.05,
                        }}
                      >
                        Milo {Math.round(fundingOwnership.miloOwnership * 100)}%
                        <br />
                        You {Math.round(fundingOwnership.userOwnership * 100)}%
                      </h2>
                      <p
                        style={{
                          margin: "16px 0 0",
                          color: "rgba(255,255,255,0.58)",
                          fontSize: "18px",
                          lineHeight: 1.65,
                        }}
                      >
                        At the end of each 30-day cycle, any dividend payout is
                        divided using these ownership percentages.
                      </p>

                      <div
                        style={{
                          marginTop: "22px",
                          display: "grid",
                          gap: "10px",
                        }}
                      >
                        <MetricCard
                          label="Milo’s investment"
                          value={formatMoney(requestedBudget)}
                          note="Approved investor funding"
                        />
                        <MetricCard
                          label="Your available balance"
                          value={formatMoney(dreamTokenBalance)}
                          note="Maximum currently available from your account"
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        borderRadius: "24px",
                        border: "1px solid rgba(218,151,74,0.24)",
                        background: "rgba(6,10,18,0.88)",
                        padding: "24px",
                      }}
                    >
                      <label
                        style={{
                          display: "block",
                          color: "rgba(255,255,255,0.54)",
                          fontSize: "16px",
                          fontWeight: 900,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                        }}
                      >
                        Your personal contribution
                      </label>

                      <div
                        style={{
                          marginTop: "13px",
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "10px",
                        }}
                      >
                        <input
                          type="number"
                          min={0}
                          max={dreamTokenBalance}
                          step={100}
                          value={personalContribution}
                          onChange={(event) => {
                            const value = Math.max(
                              0,
                              Math.min(
                                dreamTokenBalance,
                                Number(event.target.value || 0),
                              ),
                            );
                            setPersonalContribution(value);
                            setPageMessage("");
                          }}
                          style={{
                            minWidth: 0,
                            height: "58px",
                            borderRadius: "15px",
                            border: "1px solid rgba(235,179,103,0.28)",
                            background: "rgba(255,255,255,0.055)",
                            color: "white",
                            padding: "0 17px",
                            fontSize: "23px",
                            fontWeight: 900,
                            outline: "none",
                          }}
                        />
                        <div
                          style={{
                            minWidth: "70px",
                            borderRadius: "15px",
                            border: "1px solid rgba(235,179,103,0.2)",
                            background: "rgba(95,52,24,0.7)",
                            display: "grid",
                            placeItems: "center",
                            color: "#f4c782",
                            fontSize: "19px",
                            fontWeight: 900,
                          }}
                        >
                          DT
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "12px",
                          display: "grid",
                          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                          gap: "8px",
                        }}
                      >
                        {[
                          [0, "None"],
                          [Math.floor(dreamTokenBalance * 0.25), "25%"],
                          [Math.floor(dreamTokenBalance * 0.5), "50%"],
                          [dreamTokenBalance, "All"],
                        ].map(([amount, label]) => (
                          <button
                            key={String(label)}
                            type="button"
                            onClick={() =>
                              setPersonalContribution(Number(amount))
                            }
                            style={{
                              minHeight: "44px",
                              borderRadius: "12px",
                              border:
                                personalContribution === Number(amount)
                                  ? "1px solid rgba(241,195,122,0.72)"
                                  : "1px solid rgba(218,151,74,0.16)",
                              background:
                                personalContribution === Number(amount)
                                  ? "rgba(157,86,35,0.7)"
                                  : "rgba(255,255,255,0.035)",
                              color: "white",
                              fontSize: "17px",
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div
                        style={{
                          marginTop: "22px",
                          display: "grid",
                          gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
                          gap: "10px",
                        }}
                      >
                        <MetricCard
                          label="Total business budget"
                          value={formatMoney(
                            requestedBudget + personalContribution,
                          )}
                          note="Milo’s investment plus your contribution"
                        />
                        <MetricCard
                          label="Balance after transfer"
                          value={formatMoney(
                            dreamTokenBalance - personalContribution,
                          )}
                          note="Dream Tokens remaining in your account"
                        />
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
                          onClick={() => setFundingStep("milo")}
                          disabled={fundingSubmitting}
                          style={{
                            minHeight: "54px",
                            flex: 1,
                            borderRadius: "14px",
                            border: "1px solid rgba(218,151,74,0.2)",
                            background: "rgba(255,255,255,0.04)",
                            color: "white",
                            fontSize: "18px",
                            fontWeight: 850,
                            cursor: "pointer",
                          }}
                        >
                          Back to Investment
                        </button>
                        <button
                          type="button"
                          onClick={confirmFunding}
                          disabled={fundingSubmitting}
                          style={{
                            minHeight: "54px",
                            flex: 1.25,
                            borderRadius: "14px",
                            border: "none",
                            background: fundingSubmitting
                              ? "rgba(255,255,255,0.12)"
                              : "linear-gradient(135deg, #d99548, #8d4b21)",
                            color: fundingSubmitting
                              ? "rgba(255,255,255,0.45)"
                              : "white",
                            fontSize: "18px",
                            fontWeight: 900,
                            cursor: fundingSubmitting ? "wait" : "pointer",
                          }}
                        >
                          {fundingSubmitting
                            ? "Confirming..."
                            : personalContribution > 0
                              ? "Transfer DT & Continue"
                              : "Continue Without Personal Funds"}
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
                    Build within Milo’s budget.
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
                        (activeSlot.miloInvestment || activeSlot.approvedBudget) *
                        option.setupFraction;
                      const monthlyCost =
                        (activeSlot.miloInvestment || activeSlot.approvedBudget) *
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
                      every real minute.
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
                    padding: mobile ? "20px" : "24px",
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
                        Running-cost controls
                      </p>
                      <h3
                        style={{
                          margin: "10px 0 0",
                          fontFamily: 'Georgia, "Times New Roman", serif',
                          fontSize: mobile ? "36px" : "46px",
                          lineHeight: 1,
                          fontWeight: 500,
                        }}
                      >
                        Adjust the operating business
                      </h3>
                      <p
                        style={{
                          margin: "13px 0 0",
                          color: "rgba(255,255,255,0.58)",
                          fontSize: "18px",
                          lineHeight: 1.65,
                        }}
                      >
                        Location and major equipment are fixed after launch. You
                        can still change stock levels, staffing and marketing.
                        Upgrades use business cash; downgrades recover 50% of the
                        removed setup value.
                      </p>
                    </div>
                    <div style={{ textAlign: compact ? "left" : "right" }}>
                      <span
                        style={{
                          display: "block",
                          color: "rgba(255,255,255,0.45)",
                          fontSize: "15px",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                        }}
                      >
                        Forecast daily profit
                      </span>
                      <strong
                        style={{
                          display: "block",
                          marginTop: "6px",
                          color:
                            operatingForecast.dailyProfit >= 0
                              ? "#9ff0bd"
                              : "#ffb497",
                          fontSize: "35px",
                        }}
                      >
                        {formatMoney(operatingForecast.dailyProfit)}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "22px",
                      display: "grid",
                      gridTemplateColumns: compact
                        ? "1fr"
                        : "repeat(3, minmax(0, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {SETUP_CATEGORIES.filter((category) =>
                      ["stock", "staff", "marketing"].includes(category.id),
                    ).map((category) => (
                      <div
                        key={category.id}
                        style={{
                          borderRadius: "21px",
                          border: "1px solid rgba(218,151,74,0.18)",
                          background: "rgba(255,255,255,0.025)",
                          padding: "18px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "11px",
                          }}
                        >
                          <span
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "13px",
                              border: "1px solid rgba(239,187,112,0.28)",
                              background: "rgba(218,151,74,0.09)",
                              color: "#f3c47c",
                              display: "grid",
                              placeItems: "center",
                              fontSize: "21px",
                            }}
                          >
                            {category.icon}
                          </span>
                          <div>
                            <strong
                              style={{ display: "block", fontSize: "22px" }}
                            >
                              {category.shortLabel}
                            </strong>
                            <span
                              style={{
                                display: "block",
                                marginTop: "3px",
                                color: "rgba(255,255,255,0.45)",
                                fontSize: "15px",
                              }}
                            >
                              Current: {getTierOption(category, draftSelections[category.id]).label}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: "16px",
                            display: "grid",
                            gap: "9px",
                          }}
                        >
                          {category.options.map((option) => {
                            const selected =
                              draftSelections[category.id] === option.id;
                            const setupCost =
                              (activeSlot.miloInvestment ||
                                activeSlot.approvedBudget) *
                              option.setupFraction;
                            const monthlyCost =
                              (activeSlot.miloInvestment ||
                                activeSlot.approvedBudget) *
                              option.monthlyFraction;

                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() =>
                                  setDraftSelections((current) => ({
                                    ...current,
                                    [category.id]: option.id,
                                  }))
                                }
                                style={{
                                  minHeight: "92px",
                                  borderRadius: "15px",
                                  border: selected
                                    ? "1px solid rgba(241,195,122,0.7)"
                                    : "1px solid rgba(218,151,74,0.13)",
                                  background: selected
                                    ? "rgba(111,60,27,0.62)"
                                    : "rgba(255,255,255,0.025)",
                                  color: "white",
                                  padding: "13px 14px",
                                  textAlign: "left",
                                  cursor: "pointer",
                                }}
                              >
                                <span
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "10px",
                                    alignItems: "start",
                                  }}
                                >
                                  <strong style={{ fontSize: "18px" }}>
                                    {option.label}
                                  </strong>
                                  {selected && (
                                    <span
                                      style={{
                                        color: "#f4c782",
                                        fontSize: "18px",
                                        fontWeight: 900,
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    marginTop: "7px",
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: "15px",
                                    lineHeight: 1.45,
                                  }}
                                >
                                  Setup value {formatMoney(setupCost)} · Monthly {monthlyCost > 0 ? formatMoney(monthlyCost) : "Variable"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: "20px",
                      display: "grid",
                      gridTemplateColumns: compact ? "1fr" : "1fr auto",
                      gap: "14px",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: "17px",
                        border: "1px solid rgba(218,151,74,0.14)",
                        background: "rgba(255,255,255,0.025)",
                        padding: "15px 17px",
                      }}
                    >
                      <strong style={{ display: "block", fontSize: "19px" }}>
                        Estimated monthly fixed costs: {formatMoney(operatingForecast.monthlyFixedCosts)}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          marginTop: "6px",
                          color: "rgba(255,255,255,0.48)",
                          fontSize: "16px",
                        }}
                      >
                        Available business cash: {formatMoney(activeSlot.cash)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={saveOperatingChanges}
                      style={{
                        minHeight: "54px",
                        borderRadius: "14px",
                        border: "none",
                        background: "linear-gradient(135deg, #d99548, #8d4b21)",
                        color: "white",
                        padding: "0 24px",
                        fontSize: "19px",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Save Running-Cost Changes
                    </button>
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
