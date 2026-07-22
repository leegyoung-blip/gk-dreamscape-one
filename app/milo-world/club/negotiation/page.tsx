"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type IndustryId =
  | "retail"
  | "ecommerce"
  | "food"
  | "entertainment"
  | "hospitality"
  | "auto-services"
  | "auto-sales";

type NegotiationTopic =
  | "stock-buy"
  | "stock-sell"
  | "staff"
  | "milo"
  | "rent"
  | "equipment"
  | "marketing"
  | "analyst"
  | "business-sale";

type ContactCategory =
  | "investor"
  | "staffing"
  | "supplier"
  | "inventory-buyer"
  | "property"
  | "equipment"
  | "marketing"
  | "analyst"
  | "business-buyer";

type Contact = {
  id: string;
  first_name: string;
  role: string;
  category: ContactCategory;
  industries: IndustryId[];
  topics: NegotiationTopic[];
  description: string;
  personality: string;
  accent: string;
  sort_order: number;
  is_active?: boolean;
};

type BusinessOption = {
  id: string;
  industryId: IndustryId;
  title: string;
  minCapital: number;
  maxCapital: number;
  difficulty: number;
  averageOrderValue: number;
};

type AnalystReport = {
  valuation?: number;
};

type SaleOffer = {
  id: string;
  buyerName: string;
  amount: number;
};

type SaleListing = {
  status?: "unlisted" | "listed";
  listedPrice?: number;
  analystReport?: AnalystReport | null;
  offers?: SaleOffer[];
};

type BusinessSlot = {
  id: 1 | 2 | 3;
  status: "empty" | "setup" | "running";
  businessTypeId: string | null;
  businessName: string;
  approvedBudget: number;
  miloInvestment: number;
  personalContribution: number;
  miloOwnership: number;
  userOwnership: number;
  stockUnits: number;
  staffCount: number;
  averageMonthlySalary: number;
  cash: number;
  setupSpend: number;
  cycleNumber: number;
  cycleProfit: number;
  revenue: number;
  expenses: number;
  customerSatisfaction: number;
  simulatedMinutes: number;
  saleListing?: SaleListing;
  lastUpdatedAt?: string | null;
  [key: string]: unknown;
};

type SessionStatus = "open" | "agreed" | "ended";

type NegotiationSession = {
  id: string;
  user_id: string;
  slot_id: number;
  contact_id: string;
  topic: NegotiationTopic;
  status: SessionStatus;
  round_number: number;
  patience_remaining: number;
  relationship_score: number;
  quantity: number;
  listed_price: number;
  target_price: number;
  walkaway_price: number;
  last_user_offer: number | null;
  last_counter_offer: number | null;
  accepted_price: number | null;
  approach: string;
  terms: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type NegotiationMessage = {
  id: number | string;
  session_id: string;
  user_id: string;
  sender: "user" | "contact" | "system";
  message_kind:
    | "text"
    | "offer"
    | "counter"
    | "accepted"
    | "rejected"
    | "closed";
  body: string;
  offer_amount: number | null;
  metadata?: Record<string, unknown>;
  created_at: string;
};

type NegotiationProfile = {
  listPrice: number;
  targetPrice: number;
  walkawayPrice: number;
  direction: "lower" | "higher";
  maxRounds: number;
  startingPatience: number;
  marketSignal: number;
  label: string;
  unitLabel: string;
  explanation: string;
};

type Approach = {
  id: string;
  label: string;
  message: string;
  modifier: number;
};

type ProfileAssetBreakdown = {
  cash: number;
  property: number;
  stocks: number;
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

type MiloClubProfile = {
  role: string | null;
  milos_club_member: boolean | null;
};

const BUSINESS_PROGRESS_TABLE = "milo_business_builder_progress";
const NEGOTIATION_SESSIONS_TABLE = "milo_negotiation_sessions";
const NEGOTIATION_MESSAGES_TABLE = "milo_negotiation_messages";
const NEGOTIATION_AGREEMENTS_TABLE = "milo_business_agreements";
const CONTACTS_TABLE = "milo_business_contacts";
const STORAGE_VERSION = "milo-business-builder-v2";

const BUSINESS_OPTIONS: BusinessOption[] = [
  {
    id: "popup-retail",
    industryId: "retail",
    title: "Pop-up Retail Shop",
    minCapital: 8000,
    maxCapital: 15000,
    difficulty: 1,
    averageOrderValue: 28,
  },
  {
    id: "specialty-retail",
    industryId: "retail",
    title: "Specialty Retail Store",
    minCapital: 15000,
    maxCapital: 25000,
    difficulty: 2,
    averageOrderValue: 46,
  },
  {
    id: "online-merch",
    industryId: "ecommerce",
    title: "Online Merchandise Studio",
    minCapital: 20000,
    maxCapital: 35000,
    difficulty: 2,
    averageOrderValue: 52,
  },
  {
    id: "snack-bar",
    industryId: "food",
    title: "Snack Bar",
    minCapital: 25000,
    maxCapital: 40000,
    difficulty: 2,
    averageOrderValue: 14,
  },
  {
    id: "cafe",
    industryId: "food",
    title: "Neighbourhood Café",
    minCapital: 35000,
    maxCapital: 50000,
    difficulty: 3,
    averageOrderValue: 19,
  },
  {
    id: "gaming-lounge",
    industryId: "entertainment",
    title: "Gaming Lounge",
    minCapital: 50000,
    maxCapital: 70000,
    difficulty: 3,
    averageOrderValue: 32,
  },
  {
    id: "restaurant",
    industryId: "hospitality",
    title: "Full-service Restaurant",
    minCapital: 70000,
    maxCapital: 120000,
    difficulty: 4,
    averageOrderValue: 38,
  },
  {
    id: "auto-workshop",
    industryId: "auto-services",
    title: "Automobile Workshop",
    minCapital: 100000,
    maxCapital: 150000,
    difficulty: 4,
    averageOrderValue: 240,
  },
  {
    id: "car-dealership",
    industryId: "auto-sales",
    title: "Car Dealership",
    minCapital: 150000,
    maxCapital: 200000,
    difficulty: 5,
    averageOrderValue: 1800,
  },
];

const FALLBACK_CONTACTS: Contact[] = [
  {
    id: "milo",
    first_name: "Milo",
    role: "Investor and co-owner",
    category: "investor",
    industries: [],
    topics: ["milo"],
    description:
      "Discuss ownership, additional investment, dividends and buying part of Milo’s stake.",
    personality: "Patient, confident and commercially realistic.",
    accent: "#d99a4d",
    sort_order: 1,
  },
  {
    id: "dennis",
    first_name: "Dennis",
    role: "HR and recruitment manager",
    category: "staffing",
    industries: [],
    topics: ["staff"],
    description:
      "Helps businesses recruit staff and negotiate realistic salary packages.",
    personality: "Direct, fair and focused on staff retention.",
    accent: "#73b7de",
    sort_order: 2,
  },
  {
    id: "grace",
    first_name: "Grace",
    role: "Business analyst",
    category: "analyst",
    industries: [],
    topics: ["analyst"],
    description:
      "Provides market evaluations, business valuations and sale-readiness advice.",
    personality: "Measured, evidence-led and careful with assumptions.",
    accent: "#b795d9",
    sort_order: 3,
  },
  {
    id: "elena",
    first_name: "Elena",
    role: "Commercial property adviser",
    category: "property",
    industries: [],
    topics: ["rent"],
    description:
      "Handles leases, site changes, renewals and commercial property discussions.",
    personality: "Warm but firm on market rates.",
    accent: "#d5aa75",
    sort_order: 4,
  },
  {
    id: "maya",
    first_name: "Maya",
    role: "Marketing strategist",
    category: "marketing",
    industries: [],
    topics: ["marketing"],
    description:
      "Advises on online and offline campaign packages and marketing contracts.",
    personality: "Energetic, persuasive and trend-aware.",
    accent: "#e48e9e",
    sort_order: 5,
  },
  {
    id: "omar",
    first_name: "Omar",
    role: "Equipment distributor",
    category: "equipment",
    industries: [],
    topics: ["equipment"],
    description:
      "Supplies general equipment, maintenance plans and replacement packages.",
    personality: "Technical, practical and willing to bundle services.",
    accent: "#7eb8a2",
    sort_order: 6,
  },
  {
    id: "alex",
    first_name: "Alex",
    role: "Retail inventory supplier",
    category: "supplier",
    industries: ["retail"],
    topics: ["stock-buy"],
    description:
      "Supplies general and specialty retail stock, including bulk orders and flexible delivery.",
    personality: "Pragmatic and responsive to sensible volume orders.",
    accent: "#e0a45d",
    sort_order: 10,
  },
  {
    id: "sofia",
    first_name: "Sofia",
    role: "E-commerce fulfilment supplier",
    category: "supplier",
    industries: ["ecommerce"],
    topics: ["stock-buy"],
    description:
      "Provides merchandise stock, packaging and fulfilment support for online businesses.",
    personality: "Precise and more flexible when orders are well planned.",
    accent: "#9f9ee8",
    sort_order: 11,
  },
  {
    id: "mateo",
    first_name: "Mateo",
    role: "Food ingredients wholesaler",
    category: "supplier",
    industries: ["food"],
    topics: ["stock-buy"],
    description:
      "Supplies ingredients and consumables to snack bars and cafés.",
    personality: "Relationship-focused and open to recurring orders.",
    accent: "#d9b45d",
    sort_order: 12,
  },
  {
    id: "hana",
    first_name: "Hana",
    role: "Hospitality supply partner",
    category: "supplier",
    industries: ["hospitality"],
    topics: ["stock-buy"],
    description:
      "Coordinates restaurant ingredients, service supplies and higher-volume deliveries.",
    personality: "Professional and strict about quality and delivery timing.",
    accent: "#dc8e73",
    sort_order: 13,
  },
  {
    id: "ethan",
    first_name: "Ethan",
    role: "Gaming technology supplier",
    category: "supplier",
    industries: ["entertainment"],
    topics: ["stock-buy"],
    description:
      "Supplies gaming accessories, licences and replacement technology stock.",
    personality: "Fast-moving and sensitive to technology shortages.",
    accent: "#6eb7de",
    sort_order: 14,
  },
  {
    id: "raj",
    first_name: "Raj",
    role: "Automobile parts supplier",
    category: "supplier",
    industries: ["auto-services"],
    topics: ["stock-buy"],
    description:
      "Supplies workshop parts, consumables and urgent replacement orders.",
    personality: "Reliable, technical and more flexible on planned bulk orders.",
    accent: "#80aa8b",
    sort_order: 15,
  },
  {
    id: "vivian",
    first_name: "Vivian",
    role: "Vehicle inventory broker",
    category: "supplier",
    industries: ["auto-sales"],
    topics: ["stock-buy"],
    description:
      "Sources vehicle inventory and negotiates bundles, timing and older-stock discounts.",
    personality: "Confident and highly aware of current market demand.",
    accent: "#c59dce",
    sort_order: 16,
  },
  {
    id: "nora",
    first_name: "Nora",
    role: "Retail and e-commerce stock buyer",
    category: "inventory-buyer",
    industries: ["retail", "ecommerce"],
    topics: ["stock-sell"],
    description:
      "Buys excess retail and online merchandise stock for resale through secondary channels.",
    personality: "Cautious and willing to pay more for easy-to-resell stock.",
    accent: "#cf8ea0",
    sort_order: 20,
  },
  {
    id: "luca",
    first_name: "Luca",
    role: "Food and hospitality surplus buyer",
    category: "inventory-buyer",
    industries: ["food", "hospitality"],
    topics: ["stock-sell"],
    description:
      "Purchases usable surplus supplies and time-sensitive hospitality inventory.",
    personality: "Quick to decide but discounts stock with short usable life.",
    accent: "#c9a165",
    sort_order: 21,
  },
  {
    id: "zoe",
    first_name: "Zoe",
    role: "Entertainment stock buyer",
    category: "inventory-buyer",
    industries: ["entertainment"],
    topics: ["stock-sell"],
    description:
      "Buys gaming accessories, replacement technology and excess entertainment stock.",
    personality: "Trend-sensitive and competitive when demand is rising.",
    accent: "#70add9",
    sort_order: 22,
  },
  {
    id: "karim",
    first_name: "Karim",
    role: "Automobile inventory buyer",
    category: "inventory-buyer",
    industries: ["auto-services", "auto-sales"],
    topics: ["stock-sell"],
    description:
      "Buys excess parts, workshop stock and selected vehicle inventory.",
    personality: "Detail-focused and strict about condition and marketability.",
    accent: "#7da78d",
    sort_order: 23,
  },
  {
    id: "rachel",
    first_name: "Rachel",
    role: "Stable-business buyer",
    category: "business-buyer",
    industries: [],
    topics: ["business-sale"],
    description:
      "Prefers established businesses with steady profit and manageable risk.",
    personality: "Cautious, dependable and unlikely to overpay.",
    accent: "#c99b77",
    sort_order: 30,
  },
  {
    id: "marcus",
    first_name: "Marcus",
    role: "Growth investor",
    category: "business-buyer",
    industries: [],
    topics: ["business-sale"],
    description:
      "Looks for businesses with strong demand, growth momentum and expansion potential.",
    personality: "Competitive when the forecast is positive.",
    accent: "#799ed7",
    sort_order: 31,
  },
  {
    id: "aisha",
    first_name: "Aisha",
    role: "Strategic business buyer",
    category: "business-buyer",
    industries: [],
    topics: ["business-sale"],
    description:
      "May pay more for a business that fits a wider portfolio or industry strategy.",
    personality: "Selective and willing to negotiate seriously for the right fit.",
    accent: "#c78cc1",
    sort_order: 32,
  },
  {
    id: "victor",
    first_name: "Victor",
    role: "Turnaround buyer",
    category: "business-buyer",
    industries: [],
    topics: ["business-sale"],
    description:
      "Targets businesses under pressure and remains interested when other buyers withdraw.",
    personality: "Patient, opportunistic and aggressive on price.",
    accent: "#a48975",
    sort_order: 33,
  },
];

const INDUSTRY_LABELS: Record<IndustryId, string> = {
  retail: "Retail",
  ecommerce: "E-commerce",
  food: "Food & Beverage",
  entertainment: "Entertainment",
  hospitality: "Hospitality",
  "auto-services": "Automobile Services",
  "auto-sales": "Automobile Sales",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundTo(value: number, step = 1) {
  return Math.max(step, Math.round(value / step) * step);
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

function formatDT(value: number) {
  return `${new Intl.NumberFormat("en-SG", {
    maximumFractionDigits: 0,
  }).format(Math.round(value))} DT`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getBusiness(businessTypeId: string | null) {
  return BUSINESS_OPTIONS.find((business) => business.id === businessTypeId);
}

function getRecommendedSalary(slot: BusinessSlot) {
  const business = getBusiness(slot.businessTypeId);
  return 1800 + (business?.difficulty || 1) * 260;
}

function getStockPrices(slot: BusinessSlot) {
  const business = getBusiness(slot.businessTypeId);
  const base = Math.max(2, (business?.averageOrderValue || 20) * 0.36);
  const marketNoise = seededNoise(
    `${business?.industryId || "retail"}-${Math.max(1, slot.cycleNumber)}-stock-price`,
  );
  const buyPrice = Math.max(1, Math.round(base * (1 + marketNoise * 0.08)));
  const sellPrice = Math.max(1, Math.round(buyPrice * 0.7));
  return { buyPrice, sellPrice };
}

function getMarketSignal(slot: BusinessSlot) {
  const business = getBusiness(slot.businessTypeId);
  const industry = business?.industryId || "retail";
  const cycleSignal = seededNoise(`${industry}-${slot.cycleNumber}-negotiation-market`);
  const satisfactionSignal = (Number(slot.customerSatisfaction || 65) - 65) / 100;
  const profitSignal =
    Number(slot.cycleProfit || 0) === 0
      ? 0
      : clamp(Number(slot.cycleProfit || 0) / Math.max(1, slot.approvedBudget), -0.2, 0.2);
  return clamp(cycleSignal * 0.55 + satisfactionSignal + profitSignal, -1, 1);
}

function getEstimatedBusinessValue(slot: BusinessSlot) {
  const reportValue = Number(slot.saleListing?.analystReport?.valuation || 0);
  if (reportValue > 0) return reportValue;

  const recentProfit = Number(slot.cycleProfit || 0) || Number(slot.revenue || 0) - Number(slot.expenses || 0);
  const annualizedProfit = Math.max(0, recentProfit) * 12;
  const recoverableAssets = Math.max(0, Number(slot.cash || 0)) + Number(slot.setupSpend || 0) * 0.42;
  const maturity = clamp(Number(slot.simulatedMinutes || 0) / (360 * 1440), 0.25, 1);
  return roundTo(
    Math.max(
      Number(slot.approvedBudget || 0) * 0.3,
      recoverableAssets + annualizedProfit * (1.1 + maturity * 0.8),
    ),
    50,
  );
}

function topicForContact(contact: Contact): NegotiationTopic {
  return contact.topics[0] || "analyst";
}

function getSuggestedContactId(topic: NegotiationTopic, industry: IndustryId) {
  if (topic === "milo") return "milo";
  if (topic === "staff") return "dennis";
  if (topic === "analyst") return "grace";
  if (topic === "rent") return "elena";
  if (topic === "equipment") return "omar";
  if (topic === "marketing") return "maya";

  if (topic === "stock-buy") {
    const supplierMap: Record<IndustryId, string> = {
      retail: "alex",
      ecommerce: "sofia",
      food: "mateo",
      entertainment: "ethan",
      hospitality: "hana",
      "auto-services": "raj",
      "auto-sales": "vivian",
    };
    return supplierMap[industry];
  }

  if (topic === "stock-sell") {
    const buyerMap: Record<IndustryId, string> = {
      retail: "nora",
      ecommerce: "nora",
      food: "luca",
      entertainment: "zoe",
      hospitality: "luca",
      "auto-services": "karim",
      "auto-sales": "karim",
    };
    return buyerMap[industry];
  }

  return "rachel";
}

function getApproaches(topic: NegotiationTopic): Approach[] {
  if (topic === "stock-buy") {
    return [
      {
        id: "standard",
        label: "Straight offer",
        message: "I would like to make a straightforward unit-price offer.",
        modifier: 0,
      },
      {
        id: "bulk",
        label: "Use order volume",
        message: "Can you offer a better unit price because I am ordering in volume?",
        modifier: 0.04,
      },
      {
        id: "flexible-delivery",
        label: "Accept slower delivery",
        message: "I can accept a slower delivery schedule in exchange for a lower price.",
        modifier: 0.035,
      },
    ];
  }

  if (topic === "stock-sell") {
    return [
      {
        id: "standard",
        label: "Straight offer",
        message: "I would like to agree a fair unit price for this stock.",
        modifier: 0,
      },
      {
        id: "immediate-pickup",
        label: "Offer immediate pickup",
        message: "The stock is ready for immediate collection if you can improve the price.",
        modifier: 0.035,
      },
      {
        id: "full-lot",
        label: "Sell the full lot",
        message: "I can sell the full lot in one transaction if the unit price is competitive.",
        modifier: 0.025,
      },
    ];
  }

  if (topic === "staff") {
    return [
      {
        id: "standard",
        label: "Standard recruitment",
        message: "I would like to agree a sustainable average salary for this team.",
        modifier: 0,
      },
      {
        id: "training",
        label: "Provide training",
        message: "We can provide structured training, which may support a lower starting salary.",
        modifier: 0.035,
      },
      {
        id: "flexible-start",
        label: "Flexible start date",
        message: "The start date is flexible if that helps us reach an agreement.",
        modifier: 0.02,
      },
    ];
  }

  if (topic === "milo") {
    return [
      {
        id: "standard",
        label: "Fair-value offer",
        message: "I would like to buy part of your ownership at a fair value.",
        modifier: 0,
      },
      {
        id: "immediate-payment",
        label: "Pay immediately",
        message: "I can complete the full DT payment immediately if we agree on the price.",
        modifier: 0.025,
      },
      {
        id: "minority-block",
        label: "Buy a smaller block",
        message: "I am asking for a smaller ownership block, which keeps you as a major partner.",
        modifier: 0.03,
      },
    ];
  }

  if (topic === "business-sale") {
    return [
      {
        id: "standard",
        label: "Discuss the listing",
        message: "I would like to discuss the current sale price for this business.",
        modifier: 0,
      },
      {
        id: "clean-close",
        label: "Offer a clean closing",
        message: "I can provide a clean and prompt handover if the price is improved.",
        modifier: 0.025,
      },
    ];
  }

  return [
    {
      id: "standard",
      label: "Start discussion",
      message: "I would like to discuss the available terms.",
      modifier: 0,
    },
  ];
}

function buildNegotiationProfile({
  contact,
  topic,
  slot,
  quantity,
  sharePercent,
  approach,
}: {
  contact: Contact;
  topic: NegotiationTopic;
  slot: BusinessSlot;
  quantity: number;
  sharePercent: number;
  approach: Approach;
}): NegotiationProfile {
  const marketSignal = getMarketSignal(slot);
  const relationship = 0.02;
  const personalityNoise = seededNoise(`${contact.id}-${slot.id}-${slot.cycleNumber}`) * 0.018;

  if (topic === "stock-buy") {
    const { buyPrice } = getStockPrices(slot);
    const volumeDiscount = clamp(Math.log10(Math.max(1, quantity) + 1) * 0.045, 0, 0.12);
    const shortagePenalty = Math.max(0, marketSignal) * 0.055;
    const oversupplyDiscount = Math.max(0, -marketSignal) * 0.055;
    const maximumDiscount = clamp(
      0.04 + volumeDiscount + relationship + approach.modifier + oversupplyDiscount - shortagePenalty + personalityNoise,
      0.02,
      0.25,
    );
    const walkaway = roundTo(buyPrice * (1 - maximumDiscount), 1);
    const target = roundTo(buyPrice * (1 - maximumDiscount * 0.36), 1);
    return {
      listPrice: buyPrice,
      targetPrice: Math.max(walkaway, target),
      walkawayPrice: walkaway,
      direction: "lower",
      maxRounds: 4,
      startingPatience: 4,
      marketSignal,
      label: "Inventory purchase",
      unitLabel: "per unit",
      explanation:
        "The acceptable range considers order size, market shortages or oversupply, the selected negotiation approach and the supplier’s flexibility.",
    };
  }

  if (topic === "stock-sell") {
    const { sellPrice } = getStockPrices(slot);
    const quantityPenalty = clamp(Math.log10(Math.max(1, quantity) + 1) * 0.018, 0, 0.055);
    const demandPremium = Math.max(0, marketSignal) * 0.09;
    const weakMarketPenalty = Math.max(0, -marketSignal) * 0.045;
    const maximumPremium = clamp(
      0.035 + relationship + approach.modifier + demandPremium - weakMarketPenalty - quantityPenalty + personalityNoise,
      0.01,
      0.22,
    );
    const ceiling = roundTo(sellPrice * (1 + maximumPremium), 1);
    const target = roundTo(sellPrice * (1 + maximumPremium * 0.3), 1);
    return {
      listPrice: sellPrice,
      targetPrice: Math.min(ceiling, target),
      walkawayPrice: ceiling,
      direction: "higher",
      maxRounds: 4,
      startingPatience: 4,
      marketSignal,
      label: "Excess-stock sale",
      unitLabel: "per unit",
      explanation:
        "The buyer’s maximum is influenced by current demand, stock quantity, collection terms and how easily the stock can be resold.",
    };
  }

  if (topic === "staff") {
    const benchmark = getRecommendedSalary(slot);
    const labourPressure = Math.max(0, marketSignal) * 0.05;
    const flexibility = clamp(0.14 + approach.modifier - labourPressure + personalityNoise, 0.06, 0.22);
    const floor = roundTo(benchmark * (1 - flexibility), 10);
    const target = roundTo(benchmark * (0.97 + Math.max(0, marketSignal) * 0.03), 10);
    return {
      listPrice: benchmark,
      targetPrice: Math.max(floor, target),
      walkawayPrice: floor,
      direction: "lower",
      maxRounds: 3,
      startingPatience: 3,
      marketSignal,
      label: "Average monthly salary",
      unitLabel: "per staff member",
      explanation:
        "Dennis considers the industry salary benchmark, staff availability, training support and the risk that underpaid employees may resign later.",
    };
  }

  if (topic === "milo") {
    const availableShare = clamp(Number(slot.miloOwnership || 0) * 100, 0, 100);
    const cleanShare = clamp(sharePercent, 1, Math.max(1, availableShare));
    const valuation = getEstimatedBusinessValue(slot);
    const fairValue = valuation * (cleanShare / 100);
    const controlPremium =
      Number(slot.userOwnership || 0) * 100 < 50 &&
      Number(slot.userOwnership || 0) * 100 + cleanShare >= 50
        ? 0.12
        : 0;
    const outlookPremium = Math.max(0, marketSignal) * 0.14;
    const downsideDiscount = Math.max(0, -marketSignal) * 0.08;
    const target = roundTo(
      fairValue * (1.08 + controlPremium + outlookPremium - approach.modifier * 0.5),
      10,
    );
    const floor = roundTo(
      fairValue * (0.9 + controlPremium * 0.5 - downsideDiscount - approach.modifier),
      10,
    );
    return {
      listPrice: roundTo(fairValue, 10),
      targetPrice: Math.max(floor, target),
      walkawayPrice: Math.max(10, floor),
      direction: "lower",
      maxRounds: 4,
      startingPatience: 4,
      marketSignal,
      label: `${cleanShare.toFixed(0)}% ownership block`,
      unitLabel: "total price",
      explanation:
        "Milo values the requested ownership using the business valuation, current outlook and any control premium created by the transfer.",
    };
  }

  if (topic === "business-sale") {
    const asking = Number(slot.saleListing?.listedPrice || 0);
    const valuation = getEstimatedBusinessValue(slot);
    const listPrice = asking > 0 ? asking : valuation;
    const ceiling = roundTo(
      listPrice * (1.02 + Math.max(0, marketSignal) * 0.12 + approach.modifier),
      50,
    );
    const target = roundTo(listPrice * (0.9 + Math.max(0, marketSignal) * 0.05), 50);
    return {
      listPrice,
      targetPrice: target,
      walkawayPrice: Math.max(target, ceiling),
      direction: "higher",
      maxRounds: 4,
      startingPatience: 4,
      marketSignal,
      label: "Business sale",
      unitLabel: "total sale price",
      explanation:
        "The buyer considers the listing, analyst valuation, market outlook, profitability and the strength of competing interest.",
    };
  }

  return {
    listPrice: 0,
    targetPrice: 0,
    walkawayPrice: 0,
    direction: "lower",
    maxRounds: 1,
    startingPatience: 1,
    marketSignal,
    label: "Advisory conversation",
    unitLabel: "",
    explanation: "This contact is available for guidance. A transactional negotiation can be connected later.",
  };
}

function getGreeting(contact: Contact, topic: NegotiationTopic, slot: BusinessSlot) {
  const businessName = slot.businessName || "your business";

  if (topic === "stock-buy") {
    return `Hi, I’m ${contact.first_name}. I can quote inventory for ${businessName}. Tell me the quantity you need and the unit price you have in mind.`;
  }
  if (topic === "stock-sell") {
    return `Hi, I’m ${contact.first_name}. I may be interested in your excess inventory. Tell me how many units you want to sell and the unit price you are asking for.`;
  }
  if (topic === "staff") {
    return `Hi, I’m Dennis. I can help set a realistic team size and average monthly salary. A very low salary may make recruitment difficult and increase resignation risk.`;
  }
  if (topic === "milo") {
    return `Let’s discuss my ownership in ${businessName}. I’m open to a sensible proposal, but I will consider the business value and what the transfer means for control.`;
  }
  if (topic === "business-sale") {
    return `I’m reviewing ${businessName}. Send me the sale price you want and I’ll decide whether to accept, counter or walk away.`;
  }
  return `Hi, I’m ${contact.first_name}. ${contact.description}`;
}

function getUserOfferMessage({
  contact,
  topic,
  offer,
  quantity,
  sharePercent,
  approach,
}: {
  contact: Contact;
  topic: NegotiationTopic;
  offer: number;
  quantity: number;
  sharePercent: number;
  approach: Approach;
}) {
  if (topic === "stock-buy") {
    return `Hi ${contact.first_name}, I would like to order ${quantity} units at ${formatDT(offer)} per unit. ${approach.message}`;
  }
  if (topic === "stock-sell") {
    return `Hi ${contact.first_name}, I would like to sell ${quantity} units at ${formatDT(offer)} per unit. ${approach.message}`;
  }
  if (topic === "staff") {
    return `Hi Dennis, I would like a team of ${quantity} staff at an average monthly salary of ${formatDT(offer)} per person. ${approach.message}`;
  }
  if (topic === "milo") {
    return `Milo, I would like to buy ${sharePercent.toFixed(0)}% of the company from you for ${formatDT(offer)} in total. ${approach.message}`;
  }
  if (topic === "business-sale") {
    return `I am asking for ${formatDT(offer)} for the business. ${approach.message}`;
  }
  return approach.message;
}

function evaluateOffer({
  sessionId,
  profile,
  offer,
  roundNumber,
  patience,
  relationshipScore,
  approach,
}: {
  sessionId: string;
  profile: NegotiationProfile;
  offer: number;
  roundNumber: number;
  patience: number;
  relationshipScore: number;
  approach: Approach;
}) {
  const lowerDirection = profile.direction === "lower";
  const target = profile.targetPrice;
  const limit = profile.walkawayPrice;
  const span = Math.max(1, Math.abs(target - limit));
  const position = lowerDirection
    ? (offer - limit) / span
    : (limit - offer) / span;
  const distanceBeyondLimit = lowerDirection
    ? Math.max(0, limit - offer) / Math.max(1, limit)
    : Math.max(0, offer - limit) / Math.max(1, limit);
  const relationshipBonus = (relationshipScore - 50) * 0.35;
  const approachBonus = approach.modifier * 130;
  const laterRoundBonus = roundNumber * 4;
  const deterministicVariation =
    seededNoise(`${sessionId}-${roundNumber}-${offer}-${profile.label}`) * 7;
  const score =
    position * 62 +
    24 +
    relationshipBonus +
    approachBonus +
    laterRoundBonus +
    deterministicVariation -
    distanceBeyondLimit * 160;

  if (
    (lowerDirection && offer >= target) ||
    (!lowerDirection && offer <= target) ||
    score >= 76
  ) {
    return {
      outcome: "accept" as const,
      counterOffer: null,
      patienceCost: 0,
      relationshipChange: 2,
    };
  }

  if (score >= 34 && patience > 1) {
    const concessionRate = clamp(
      0.3 + roundNumber * 0.11 + approach.modifier * 1.2 + Math.max(0, relationshipBonus) / 100,
      0.28,
      0.78,
    );
    const rawCounter = lowerDirection
      ? target - concessionRate * (target - offer)
      : target + concessionRate * (offer - target);
    const boundedCounter = lowerDirection
      ? clamp(rawCounter, limit, target)
      : clamp(rawCounter, target, limit);
    return {
      outcome: "counter" as const,
      counterOffer: roundTo(boundedCounter, profile.listPrice >= 1000 ? 10 : 1),
      patienceCost: 1,
      relationshipChange: 0,
    };
  }

  if (score >= 8 && patience > 1) {
    return {
      outcome: "reject" as const,
      counterOffer: null,
      patienceCost: distanceBeyondLimit > 0.18 ? 2 : 1,
      relationshipChange: distanceBeyondLimit > 0.18 ? -4 : -1,
    };
  }

  return {
    outcome: "end" as const,
    counterOffer: null,
    patienceCost: patience,
    relationshipChange: -6,
  };
}

function getResponseText({
  contact,
  profile,
  outcome,
  offer,
  counterOffer,
}: {
  contact: Contact;
  profile: NegotiationProfile;
  outcome: "accept" | "counter" | "reject" | "end";
  offer: number;
  counterOffer: number | null;
}) {
  if (outcome === "accept") {
    return `That works for me. I accept ${formatDT(offer)} ${profile.unitLabel}. I’ll confirm the agreement now.`;
  }
  if (outcome === "counter" && counterOffer !== null) {
    return `We are getting closer, but I cannot accept your current figure. I can agree to ${formatDT(counterOffer)} ${profile.unitLabel}.`;
  }
  if (outcome === "reject") {
    return `I cannot accept that offer. It is outside the range I can justify, but I am willing to hear one more serious proposal.`;
  }
  return `I do not think we can reach a workable agreement today. Let’s end this discussion for now.`;
}

function isLiveTopic(topic: NegotiationTopic) {
  return ["stock-buy", "stock-sell", "staff", "milo"].includes(topic);
}


function NegotiationAssetsDropdown({
  assets,
  open,
  onToggle,
}: {
  assets: ProfileAssetBreakdown;
  open: boolean;
  onToggle: () => void;
}) {
  const total = assets.cash + assets.property + assets.stocks;

  return (
    <div className="neg-assets-wrap">
      <button
        type="button"
        className="neg-balance-pill neg-assets-button"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>Profile assets ▾</span>
        <strong>{formatDT(total)}</strong>
      </button>

      {open && (
        <div className="neg-assets-dropdown">
          {[
            ["Cash", assets.cash],
            ["Property", assets.property],
            ["Stocks", assets.stocks],
          ].map(([label, value]) => (
            <div className="neg-assets-row" key={String(label)}>
              <span>{label}</span>
              <strong>{formatDT(Number(value))}</strong>
            </div>
          ))}
          <div className="neg-assets-row neg-assets-total">
            <span>Total assets</span>
            <strong>{formatDT(total)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MiloNegotiationPage() {
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [tokenBalance, setTokenBalance] = useState(0);
  const [profileAssets, setProfileAssets] = useState<ProfileAssetBreakdown>({
    cash: 0,
    property: 0,
    stocks: 0,
  });
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [slots, setSlots] = useState<BusinessSlot[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<1 | 2 | 3 | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(FALLBACK_CONTACTS);
  const [selectedContactId, setSelectedContactId] = useState("milo");
  const [topic, setTopic] = useState<NegotiationTopic>("milo");
  const [queryReady, setQueryReady] = useState(false);
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [sharePercent, setSharePercent] = useState(5);
  const [offer, setOffer] = useState(0);
  const [selectedApproachId, setSelectedApproachId] = useState("standard");
  const [session, setSession] = useState<NegotiationSession | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pageMessage, setPageMessage] = useState("");
  const [contactsOpen, setContactsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeSlot = useMemo(
    () => slots.find((slot) => slot.id === activeSlotId) || null,
    [slots, activeSlotId],
  );

  const activeBusiness = useMemo(
    () => getBusiness(activeSlot?.businessTypeId || null),
    [activeSlot?.businessTypeId],
  );

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) || contacts[0],
    [contacts, selectedContactId],
  );

  const approaches = useMemo(() => getApproaches(topic), [topic]);
  const selectedApproach =
    approaches.find((approach) => approach.id === selectedApproachId) || approaches[0];

  const profile = useMemo(() => {
    if (!activeSlot || !selectedContact) return null;
    return buildNegotiationProfile({
      contact: selectedContact,
      topic,
      slot: activeSlot,
      quantity,
      sharePercent,
      approach: selectedApproach,
    });
  }, [activeSlot, selectedContact, topic, quantity, sharePercent, selectedApproach]);

  const relevantContacts = useMemo(() => {
    if (!activeBusiness) return contacts;
    const industry = activeBusiness.industryId;
    return contacts
      .filter((contact) => {
        const matchesSearch = `${contact.first_name} ${contact.role} ${contact.description}`
          .toLowerCase()
          .includes(search.trim().toLowerCase());
        if (!matchesSearch) return false;
        return contact.industries.length === 0 || contact.industries.includes(industry);
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [contacts, activeBusiness, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!mounted) return;
      if (!user) {
        setLoading(false);
        setPageMessage("Log in to use Milo’s Negotiation Hub.");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const [
        profileResult,
        progressResult,
        tokenResult,
        stocksResult,
        stockHoldingsResult,
        propertiesResult,
        propertyHoldingsResult,
        contactsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,milos_club_member")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from(BUSINESS_PROGRESS_TABLE)
          .select("slots,active_slot_id")
          .eq("user_id", user.id)
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
        supabase
          .from(CONTACTS_TABLE)
          .select(
            "id,first_name,role,category,industries,topics,description,personality,accent,sort_order,is_active",
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (!mounted) return;

      if (profileResult.error || !profileResult.data) {
        setAccessDenied(true);
        setLoading(false);
        window.location.replace("/milo-world?open=membership");
        return;
      }

      const clubProfile = profileResult.data as MiloClubProfile;
      const isAdmin = String(clubProfile.role || "").toLowerCase() === "admin";
      const hasAccess = isAdmin || Boolean(clubProfile.milos_club_member);

      if (!hasAccess) {
        setAccessDenied(true);
        setLoading(false);
        window.location.replace("/milo-world?open=membership");
        return;
      }

      const balance = (tokenResult.data || [])
        .filter((row) => row.token_kind === "virtual")
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
      setTokenBalance(balance);

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
        cash: balance,
        property: propertyValue,
        stocks: stockValue,
      });

      if (!contactsResult.error && contactsResult.data?.length) {
        setContacts(
          contactsResult.data.map((contact) => ({
            ...contact,
            category: contact.category as ContactCategory,
            industries: (contact.industries || []) as IndustryId[],
            topics: (contact.topics || []) as NegotiationTopic[],
          })),
        );
      }

      const progressSlots = Array.isArray(progressResult.data?.slots)
        ? (progressResult.data?.slots as BusinessSlot[])
        : [];
      setSlots(progressSlots);

      const params = new URLSearchParams(window.location.search);
      const requestedSlot = Number(params.get("slot"));
      const requestedTopic = (params.get("topic") || "milo") as NegotiationTopic;
      const requestedUnits = Number(params.get("units") || 10);
      const validSlotId =
        requestedSlot === 1 || requestedSlot === 2 || requestedSlot === 3
          ? (requestedSlot as 1 | 2 | 3)
          : Number(progressResult.data?.active_slot_id) === 1 ||
              Number(progressResult.data?.active_slot_id) === 2 ||
              Number(progressResult.data?.active_slot_id) === 3
            ? (Number(progressResult.data?.active_slot_id) as 1 | 2 | 3)
            : ((progressSlots.find((slot) => slot.status === "running")?.id || null) as
                | 1
                | 2
                | 3
                | null);

      setActiveSlotId(validSlotId);
      setTopic(requestedTopic);
      setQuantity(Math.max(1, Math.floor(requestedUnits || 10)));

      const selectedSlot = progressSlots.find((slot) => slot.id === validSlotId);
      const business = getBusiness(selectedSlot?.businessTypeId || null);
      const industry = business?.industryId || "retail";
      const suggestedId = getSuggestedContactId(requestedTopic, industry);
      setSelectedContactId(suggestedId);
      setQueryReady(true);
      setLoading(false);
    }

    loadPage();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!queryReady || !activeSlot || !selectedContact) return;

    const contactTopic = selectedContact.topics.includes(topic)
      ? topic
      : topicForContact(selectedContact);

    if (contactTopic !== topic) {
      setTopic(contactTopic);
      setSelectedApproachId("standard");
    }

    if (contactTopic === "stock-buy") {
      const { buyPrice } = getStockPrices(activeSlot);
      setOffer(Math.max(1, Math.round(buyPrice * 0.9)));
    } else if (contactTopic === "stock-sell") {
      const { sellPrice } = getStockPrices(activeSlot);
      setOffer(Math.max(1, Math.round(sellPrice * 1.08)));
      setQuantity((current) => Math.min(Math.max(1, current), Math.max(1, Math.floor(activeSlot.stockUnits))));
    } else if (contactTopic === "staff") {
      setQuantity(Math.max(1, activeSlot.staffCount || 1));
      setOffer(Math.max(10, Math.round((activeSlot.averageMonthlySalary || getRecommendedSalary(activeSlot)) / 10) * 10));
    } else if (contactTopic === "milo") {
      const available = Math.max(1, Math.floor(Number(activeSlot.miloOwnership || 0) * 100));
      const nextShare = Math.min(5, available);
      setSharePercent(nextShare);
      setOffer(
        Math.max(
          10,
          roundTo(getEstimatedBusinessValue(activeSlot) * (nextShare / 100) * 0.95, 10),
        ),
      );
    } else if (contactTopic === "business-sale") {
      setOffer(
        Number(activeSlot.saleListing?.listedPrice || 0) || getEstimatedBusinessValue(activeSlot),
      );
    }

    loadLatestConversation(selectedContact.id, contactTopic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryReady, activeSlotId, selectedContactId]);

  async function loadLatestConversation(contactId: string, selectedTopic: NegotiationTopic) {
    if (!userId || !activeSlotId) return;
    setSession(null);
    setMessages([]);

    const { data, error } = await supabase
      .from(NEGOTIATION_SESSIONS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("slot_id", activeSlotId)
      .eq("contact_id", contactId)
      .eq("topic", selectedTopic)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setPageMessage(
        "Negotiation history could not be loaded. Run the supplied Supabase SQL before using this page.",
      );
      return;
    }

    if (!data) return;

    const loadedSession = data as NegotiationSession;
    setSession(loadedSession);
    setQuantity(Math.max(1, Number(loadedSession.quantity || quantity)));
    setSelectedApproachId(loadedSession.approach || "standard");
    if (loadedSession.last_user_offer) setOffer(Number(loadedSession.last_user_offer));
    if (loadedSession.terms?.sharePercent) {
      setSharePercent(Number(loadedSession.terms.sharePercent));
    }

    const { data: messageData } = await supabase
      .from(NEGOTIATION_MESSAGES_TABLE)
      .select("*")
      .eq("session_id", loadedSession.id)
      .order("created_at", { ascending: true });

    setMessages((messageData || []) as NegotiationMessage[]);
  }

  function chooseContact(contact: Contact) {
    setSelectedContactId(contact.id);
    setTopic(topicForContact(contact));
    setSelectedApproachId("standard");
    setSession(null);
    setMessages([]);
    setPageMessage("");
    setContactsOpen(false);
  }

  async function insertMessage(
    sessionId: string,
    sender: NegotiationMessage["sender"],
    messageKind: NegotiationMessage["message_kind"],
    body: string,
    offerAmount: number | null = null,
    metadata: Record<string, unknown> = {},
  ) {
    const { data, error } = await supabase
      .from(NEGOTIATION_MESSAGES_TABLE)
      .insert({
        session_id: sessionId,
        user_id: userId,
        sender,
        message_kind: messageKind,
        body,
        offer_amount: offerAmount,
        metadata,
      })
      .select("*")
      .single();

    if (error) throw error;
    const message = data as NegotiationMessage;
    setMessages((current) => [...current, message]);
    return message;
  }

  async function createSession(currentProfile: NegotiationProfile) {
    if (!activeSlot || !selectedContact) throw new Error("No active negotiation context.");

    const terms = {
      businessName: activeSlot.businessName,
      businessTypeId: activeSlot.businessTypeId,
      industryId: activeBusiness?.industryId || "retail",
      sharePercent: topic === "milo" ? sharePercent : null,
      maxRounds: currentProfile.maxRounds,
      unitLabel: currentProfile.unitLabel,
    };

    const { data, error } = await supabase
      .from(NEGOTIATION_SESSIONS_TABLE)
      .insert({
        user_id: userId,
        slot_id: activeSlot.id,
        contact_id: selectedContact.id,
        topic,
        status: "open",
        round_number: 0,
        patience_remaining: currentProfile.startingPatience,
        relationship_score: 50,
        quantity,
        listed_price: currentProfile.listPrice,
        target_price: currentProfile.targetPrice,
        walkaway_price: currentProfile.walkawayPrice,
        last_user_offer: null,
        last_counter_offer: null,
        accepted_price: null,
        approach: selectedApproach.id,
        terms,
      })
      .select("*")
      .single();

    if (error) throw error;

    const created = data as NegotiationSession;
    setSession(created);
    await insertMessage(
      created.id,
      "contact",
      "text",
      getGreeting(selectedContact, topic, activeSlot),
    );
    return created;
  }

  async function updateProgressSlot(
    transform: (slot: BusinessSlot) => BusinessSlot,
  ) {
    if (!userId || !activeSlotId) throw new Error("No active business selected.");

    const { data, error } = await supabase
      .from(BUSINESS_PROGRESS_TABLE)
      .select("slots,active_slot_id")
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    const currentSlots = Array.isArray(data.slots)
      ? (data.slots as BusinessSlot[])
      : [];
    const nextSlots = currentSlots.map((slot) =>
      slot.id === activeSlotId ? transform(slot) : slot,
    );
    const updatedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from(BUSINESS_PROGRESS_TABLE)
      .update({ slots: nextSlots, updated_at: updatedAt })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    setSlots(nextSlots);
    localStorage.setItem(`${STORAGE_VERSION}:${userId}`, JSON.stringify(nextSlots));
    window.dispatchEvent(new Event("milo-business-progress-updated"));
    return nextSlots.find((slot) => slot.id === activeSlotId) || null;
  }

  async function applyAcceptedDeal(
    agreedPrice: number,
    currentSession: NegotiationSession,
  ) {
    if (!activeSlot || !selectedContact) throw new Error("No business selected.");

    let totalValue = agreedPrice;
    let agreementTerms: Record<string, unknown> = {};

    if (topic === "stock-buy") {
      const units = Math.max(1, Math.floor(quantity));
      totalValue = units * agreedPrice;
      if (activeSlot.cash < totalValue) {
        throw new Error(
          `The business needs ${formatDT(totalValue)}, but only has ${formatDT(activeSlot.cash)} available.`,
        );
      }
      await updateProgressSlot((slot) => ({
        ...slot,
        stockUnits: Number(slot.stockUnits || 0) + units,
        cash: Number(slot.cash || 0) - totalValue,
        lastUpdatedAt: new Date().toISOString(),
      }));
      agreementTerms = { units, unitPrice: agreedPrice, orderType: "inventory-purchase" };
    }

    if (topic === "stock-sell") {
      const units = Math.min(
        Math.max(1, Math.floor(quantity)),
        Math.floor(Number(activeSlot.stockUnits || 0)),
      );
      if (units <= 0) throw new Error("There is no stock available to sell.");
      totalValue = units * agreedPrice;
      await updateProgressSlot((slot) => ({
        ...slot,
        stockUnits: Math.max(0, Number(slot.stockUnits || 0) - units),
        cash: Number(slot.cash || 0) + totalValue,
        lastUpdatedAt: new Date().toISOString(),
      }));
      agreementTerms = { units, unitPrice: agreedPrice, orderType: "inventory-sale" };
    }

    if (topic === "staff") {
      const staff = Math.max(1, Math.floor(quantity));
      await updateProgressSlot((slot) => ({
        ...slot,
        staffCount: staff,
        averageMonthlySalary: agreedPrice,
        lastUpdatedAt: new Date().toISOString(),
      }));
      totalValue = staff * agreedPrice;
      agreementTerms = {
        staffCount: staff,
        averageMonthlySalary: agreedPrice,
        orderType: "staff-package",
      };
    }

    if (topic === "milo") {
      const cleanSharePercent = clamp(
        sharePercent,
        1,
        Math.max(1, Number(activeSlot.miloOwnership || 0) * 100),
      );
      if (tokenBalance < agreedPrice) {
        throw new Error(
          `You need ${formatDT(agreedPrice)}, but your Dream Token balance is ${formatDT(tokenBalance)}.`,
        );
      }

      const { error: tokenError } = await supabase
        .from("dream_token_transactions")
        .insert({
          user_id: userId,
          amount: -Math.round(agreedPrice),
          token_kind: "virtual",
          type: "spend",
          title: `Purchased ${cleanSharePercent.toFixed(0)}% of ${activeSlot.businessName} from Milo`,
        });
      if (tokenError) throw tokenError;

      await updateProgressSlot((slot) => {
        const transfer = cleanSharePercent / 100;
        const nextUserOwnership = clamp(Number(slot.userOwnership || 0) + transfer, 0, 1);
        const nextMiloOwnership = clamp(1 - nextUserOwnership, 0, 1);
        return {
          ...slot,
          userOwnership: nextUserOwnership,
          miloOwnership: nextMiloOwnership,
          ownershipTransferred: true,
          lastUpdatedAt: new Date().toISOString(),
        };
      });

      setTokenBalance((balance) => balance - Math.round(agreedPrice));
      setProfileAssets((current) => ({
        ...current,
        cash: Math.max(0, current.cash - Math.round(agreedPrice)),
      }));
      window.dispatchEvent(new Event("dream-tokens-updated"));
      totalValue = agreedPrice;
      agreementTerms = {
        sharePercent: cleanSharePercent,
        totalPrice: agreedPrice,
        orderType: "ownership-transfer",
      };
    }

    if (topic === "business-sale") {
      throw new Error(
        "Business-sale closing remains in the Sell Business tab. This conversation records the negotiated price but does not close the sale yet.",
      );
    }

    const { error: agreementError } = await supabase
      .from(NEGOTIATION_AGREEMENTS_TABLE)
      .insert({
        user_id: userId,
        session_id: currentSession.id,
        slot_id: activeSlot.id,
        contact_id: selectedContact.id,
        agreement_type: topic,
        unit_price: agreedPrice,
        quantity: topic === "milo" ? sharePercent : quantity,
        total_value: totalValue,
        terms: agreementTerms,
      });

    if (agreementError) throw agreementError;
  }

  async function sendOffer() {
    if (!userId || !activeSlot || !selectedContact || !profile || sending) return;
    if (!isLiveTopic(topic)) {
      setPageMessage(
        `${selectedContact.first_name} is in the directory, but this contract type will be connected in a later Business Builder module.`,
      );
      return;
    }

    const cleanOffer = Math.max(1, Math.round(Number(offer || 0)));
    const cleanQuantity = Math.max(1, Math.floor(Number(quantity || 1)));

    if (topic === "stock-buy" && cleanOffer * cleanQuantity > activeSlot.cash) {
      setPageMessage(
        `That proposal would cost ${formatDT(cleanOffer * cleanQuantity)}, but the business only has ${formatDT(activeSlot.cash)} available.`,
      );
      return;
    }
    if (topic === "stock-sell" && cleanQuantity > activeSlot.stockUnits) {
      setPageMessage(
        `The business only has ${Math.floor(activeSlot.stockUnits)} stock units available.`,
      );
      return;
    }
    if (topic === "milo" && cleanOffer > tokenBalance) {
      setPageMessage(
        `Your offer is higher than your available Dream Token balance of ${formatDT(tokenBalance)}.`,
      );
      return;
    }

    setSending(true);
    setPageMessage("");

    try {
      let currentSession = session;
      if (!currentSession || currentSession.status !== "open") {
        currentSession = await createSession(profile);
      }

      const userText = getUserOfferMessage({
        contact: selectedContact,
        topic,
        offer: cleanOffer,
        quantity: cleanQuantity,
        sharePercent,
        approach: selectedApproach,
      });
      await insertMessage(currentSession.id, "user", "offer", userText, cleanOffer, {
        quantity: cleanQuantity,
        sharePercent: topic === "milo" ? sharePercent : null,
        approach: selectedApproach.id,
      });

      const result = evaluateOffer({
        sessionId: currentSession.id,
        profile,
        offer: cleanOffer,
        roundNumber: Number(currentSession.round_number || 0),
        patience: Number(currentSession.patience_remaining || profile.startingPatience),
        relationshipScore: Number(currentSession.relationship_score || 50),
        approach: selectedApproach,
      });

      const nextPatience = Math.max(
        0,
        Number(currentSession.patience_remaining || profile.startingPatience) - result.patienceCost,
      );
      const nextRelationship = clamp(
        Number(currentSession.relationship_score || 50) + result.relationshipChange,
        0,
        100,
      );
      const nextStatus: SessionStatus =
        result.outcome === "accept"
          ? "agreed"
          : result.outcome === "end" || nextPatience <= 0
            ? "ended"
            : "open";

      const responseText = getResponseText({
        contact: selectedContact,
        profile,
        outcome: result.outcome === "end" || nextPatience <= 0 ? "end" : result.outcome,
        offer: cleanOffer,
        counterOffer: result.counterOffer,
      });

      await insertMessage(
        currentSession.id,
        "contact",
        result.outcome === "accept"
          ? "accepted"
          : result.outcome === "counter"
            ? "counter"
            : result.outcome === "reject"
              ? "rejected"
              : "closed",
        responseText,
        result.counterOffer,
      );

      const { data: updatedSessionData, error: updateError } = await supabase
        .from(NEGOTIATION_SESSIONS_TABLE)
        .update({
          status: nextStatus,
          round_number: Number(currentSession.round_number || 0) + 1,
          patience_remaining: nextPatience,
          relationship_score: nextRelationship,
          quantity: cleanQuantity,
          listed_price: profile.listPrice,
          target_price: profile.targetPrice,
          walkaway_price: profile.walkawayPrice,
          last_user_offer: cleanOffer,
          last_counter_offer: result.counterOffer,
          accepted_price: result.outcome === "accept" ? cleanOffer : null,
          approach: selectedApproach.id,
          terms: {
            ...(currentSession.terms || {}),
            sharePercent: topic === "milo" ? sharePercent : null,
            maxRounds: profile.maxRounds,
            unitLabel: profile.unitLabel,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentSession.id)
        .select("*")
        .single();

      if (updateError) throw updateError;
      const updatedSession = updatedSessionData as NegotiationSession;
      setSession(updatedSession);

      if (result.outcome === "accept") {
        await applyAcceptedDeal(cleanOffer, updatedSession);
        await insertMessage(
          currentSession.id,
          "system",
          "accepted",
          topic === "milo"
            ? `Ownership transfer completed. ${sharePercent.toFixed(0)}% moved from Milo to you for ${formatDT(cleanOffer)}.`
            : topic === "staff"
              ? `Staffing terms applied: ${cleanQuantity} staff at an average monthly salary of ${formatDT(cleanOffer)} each.`
              : `Agreement completed at ${formatDT(cleanOffer)} per unit for ${cleanQuantity} units.`,
          cleanOffer,
        );
      }
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "The offer could not be processed.");
    } finally {
      setSending(false);
    }
  }

  async function acceptCounterOffer() {
    if (!session || !session.last_counter_offer || sending) return;
    setSending(true);
    setPageMessage("");

    try {
      const counter = Number(session.last_counter_offer);
      await insertMessage(
        session.id,
        "user",
        "accepted",
        `I accept your counteroffer of ${formatDT(counter)} ${profile?.unitLabel || ""}.`,
        counter,
      );
      await applyAcceptedDeal(counter, session);
      await insertMessage(
        session.id,
        "contact",
        "accepted",
        `Agreed. I have confirmed the deal at ${formatDT(counter)} ${profile?.unitLabel || ""}.`,
        counter,
      );
      await insertMessage(
        session.id,
        "system",
        "accepted",
        topic === "milo"
          ? `Ownership transfer completed at ${formatDT(counter)}.`
          : topic === "staff"
            ? `The agreed staffing package has been applied.`
            : `The inventory transaction has been completed.`,
        counter,
      );

      const { data, error } = await supabase
        .from(NEGOTIATION_SESSIONS_TABLE)
        .update({
          status: "agreed",
          accepted_price: counter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id)
        .select("*")
        .single();
      if (error) throw error;
      setSession(data as NegotiationSession);
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "The counteroffer could not be accepted.");
    } finally {
      setSending(false);
    }
  }

  async function walkAway() {
    if (!session || session.status !== "open" || sending) return;
    setSending(true);
    try {
      await insertMessage(
        session.id,
        "user",
        "closed",
        "Thank you. I am going to end this negotiation for now.",
      );
      await insertMessage(
        session.id,
        "contact",
        "closed",
        "Understood. Contact me again when you are ready to discuss a new proposal.",
      );
      const { data, error } = await supabase
        .from(NEGOTIATION_SESSIONS_TABLE)
        .update({ status: "ended", updated_at: new Date().toISOString() })
        .eq("id", session.id)
        .select("*")
        .single();
      if (error) throw error;
      setSession(data as NegotiationSession);
    } catch (error) {
      setPageMessage(error instanceof Error ? error.message : "The negotiation could not be closed.");
    } finally {
      setSending(false);
    }
  }

  function startNewNegotiation() {
    setSession(null);
    setMessages([]);
    setPageMessage("");
  }

  const shellStyle: CSSProperties = {
    minHeight: "100dvh",
    background:
      "radial-gradient(circle at 48% 4%, rgba(118,70,30,0.24), transparent 30%), linear-gradient(180deg, #160d08 0%, #06070d 52%, #03050b 100%)",
    color: "white",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  if (accessDenied && userId) {
    return (
      <main style={{ ...shellStyle, display: "grid", placeItems: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "17px" }}>
          Returning to Milo’s Club membership…
        </p>
        <NegotiationStyles />
      </main>
    );
  }

  if (loading) {
    return (
      <main style={{ ...shellStyle, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div className="neg-loader" />
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "17px" }}>
            Opening negotiation messages…
          </p>
        </div>
        <NegotiationStyles />
      </main>
    );
  }

  if (!userId || !activeSlot || !activeBusiness || !selectedContact) {
    return (
      <main style={{ ...shellStyle, padding: "40px 20px" }}>
        <div
          style={{
            maxWidth: "720px",
            margin: "80px auto",
            padding: "34px",
            borderRadius: "24px",
            border: "1px solid rgba(218,151,74,0.3)",
            background: "rgba(10,10,16,0.84)",
          }}
        >
          <p style={{ color: "#efbb70", fontWeight: 900, letterSpacing: "0.16em" }}>
            NEGOTIATION HUB
          </p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "44px", margin: "12px 0" }}>
            Select a running business first.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.68)", fontSize: "17px", lineHeight: 1.6 }}>
            {pageMessage || "Return to Milo’s Business Builder and open a running storefront before negotiating."}
          </p>
          <Link className="neg-primary-button" href="/milo-world/club">
            Back to Business Builder
          </Link>
        </div>
        <NegotiationStyles />
      </main>
    );
  }

  const liveTopic = isLiveTopic(topic);
  const sessionOpen = !session || session.status === "open";
  const latestCounter = session?.status === "open" ? Number(session.last_counter_offer || 0) : 0;
  const currentRound = Number(session?.round_number || 0);
  const maxRounds = Number(session?.terms?.maxRounds || profile?.maxRounds || 4);
  const marketText =
    (profile?.marketSignal || 0) >= 0.35
      ? "Strong demand"
      : (profile?.marketSignal || 0) <= -0.35
        ? "Weak demand"
        : "Balanced market";

  return (
    <main style={shellStyle}>
      <NegotiationStyles />

      <header className="neg-header">
        <div className="neg-header-left">
          <Link href="/milo-world/club" className="neg-back-button">
            ← Business Builder
          </Link>
          <button
            type="button"
            className="neg-mobile-icon-button"
            onClick={() => setContactsOpen(true)}
          >
            ☰ Contacts
          </button>
        </div>

        <div className="neg-title-wrap">
          <p>MILO’S BUSINESS BUILDER</p>
          <h1>Negotiation Hub</h1>
        </div>

        <div className="neg-header-right">
          <NegotiationAssetsDropdown
            assets={profileAssets}
            open={assetsOpen}
            onToggle={() => setAssetsOpen((current) => !current)}
          />
          <button
            type="button"
            className="neg-mobile-icon-button"
            onClick={() => setDetailsOpen(true)}
          >
            Deal details
          </button>
        </div>
      </header>

      <div className="neg-layout">
        <aside className={`neg-contacts-panel ${contactsOpen ? "is-open" : ""}`}>
          <div className="neg-panel-mobile-head">
            <strong>Contacts</strong>
            <button type="button" onClick={() => setContactsOpen(false)}>
              ×
            </button>
          </div>

          <div className="neg-contact-context">
            <p>ACTIVE BUSINESS</p>
            <strong>{activeSlot.businessName}</strong>
            <span>{INDUSTRY_LABELS[activeBusiness.industryId]}</span>
          </div>

          <div className="neg-contact-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a contact or role"
            />
          </div>

          <div className="neg-contact-list">
            {relevantContacts.map((contact) => {
              const active = contact.id === selectedContact.id;
              const topicAvailable = isLiveTopic(topicForContact(contact));
              return (
                <button
                  type="button"
                  key={contact.id}
                  onClick={() => chooseContact(contact)}
                  className={`neg-contact-card ${active ? "is-active" : ""}`}
                >
                  <span
                    className="neg-avatar"
                    style={{
                      background: `linear-gradient(145deg, ${contact.accent}, rgba(15,13,18,0.94))`,
                    }}
                  >
                    {contact.first_name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="neg-contact-copy">
                    <span className="neg-contact-name-row">
                      <strong>{contact.first_name}</strong>
                      <i className={topicAvailable ? "live" : "later"}>
                        {topicAvailable ? "Available" : "Later"}
                      </i>
                    </span>
                    <span>{contact.role}</span>
                    <small>{contact.description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="neg-conversation-panel">
          <div className="neg-conversation-head">
            <span
              className="neg-avatar neg-avatar-large"
              style={{
                background: `linear-gradient(145deg, ${selectedContact.accent}, rgba(15,13,18,0.94))`,
              }}
            >
              {selectedContact.first_name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <h2>{selectedContact.first_name}</h2>
              <p>{selectedContact.role}</p>
            </div>
            <div className="neg-status-chip">
              <span />
              {session?.status === "agreed"
                ? "Deal agreed"
                : session?.status === "ended"
                  ? "Conversation ended"
                  : "Available to negotiate"}
            </div>
          </div>

          <div className="neg-messages">
            {messages.length === 0 && (
              <div className="neg-message-row contact">
                <span
                  className="neg-avatar neg-avatar-small"
                  style={{
                    background: `linear-gradient(145deg, ${selectedContact.accent}, rgba(15,13,18,0.94))`,
                  }}
                >
                  {selectedContact.first_name.slice(0, 1).toUpperCase()}
                </span>
                <div className="neg-message-bubble contact">
                  <p>{getGreeting(selectedContact, topic, activeSlot)}</p>
                  <time>New conversation</time>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`neg-message-row ${message.sender}`}
              >
                {message.sender === "contact" && (
                  <span
                    className="neg-avatar neg-avatar-small"
                    style={{
                      background: `linear-gradient(145deg, ${selectedContact.accent}, rgba(15,13,18,0.94))`,
                    }}
                  >
                    {selectedContact.first_name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className={`neg-message-bubble ${message.sender} ${message.message_kind}`}>
                  {message.message_kind !== "text" && (
                    <span className="neg-message-label">
                      {message.message_kind === "offer"
                        ? "Your offer"
                        : message.message_kind === "counter"
                          ? "Counteroffer"
                          : message.message_kind === "accepted"
                            ? "Agreement"
                            : message.message_kind === "closed"
                              ? "Conversation closed"
                              : "Response"}
                    </span>
                  )}
                  <p>{message.body}</p>
                  <time>{formatDateTime(message.created_at)}</time>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="neg-composer">
            {pageMessage && <div className="neg-alert">{pageMessage}</div>}

            {!liveTopic ? (
              <div className="neg-coming-later">
                <strong>{selectedContact.first_name} is already in your directory.</strong>
                <p>
                  This contact’s full contract workflow will be connected when that Business Builder module is added.
                </p>
              </div>
            ) : session?.status === "agreed" || session?.status === "ended" ? (
              <div className="neg-finished-row">
                <div>
                  <strong>
                    {session.status === "agreed" ? "Agreement completed" : "Negotiation ended"}
                  </strong>
                  <p>Start a new conversation to negotiate another set of terms.</p>
                </div>
                <button type="button" onClick={startNewNegotiation}>
                  New negotiation
                </button>
              </div>
            ) : (
              <>
                <div className="neg-quick-messages">
                  {approaches.map((approach) => (
                    <button
                      type="button"
                      key={approach.id}
                      className={approach.id === selectedApproach.id ? "is-selected" : ""}
                      onClick={() => setSelectedApproachId(approach.id)}
                    >
                      “{approach.message}”
                    </button>
                  ))}
                </div>

                <div className="neg-offer-grid">
                  {(topic === "stock-buy" || topic === "stock-sell") && (
                    <label>
                      <span>Quantity</span>
                      <input
                        type="number"
                        min={1}
                        max={topic === "stock-sell" ? Math.max(1, Math.floor(activeSlot.stockUnits)) : 100000}
                        step={1}
                        value={quantity}
                        onChange={(event) => setQuantity(Math.max(1, Math.floor(Number(event.target.value || 1))))}
                      />
                    </label>
                  )}

                  {topic === "staff" && (
                    <label>
                      <span>Total staff</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        step={1}
                        value={quantity}
                        onChange={(event) => setQuantity(Math.max(1, Math.floor(Number(event.target.value || 1))))}
                      />
                    </label>
                  )}

                  {topic === "milo" && (
                    <label>
                      <span>Ownership to buy</span>
                      <div className="neg-input-with-suffix">
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, Math.floor(activeSlot.miloOwnership * 100))}
                          step={1}
                          value={sharePercent}
                          onChange={(event) =>
                            setSharePercent(
                              clamp(
                                Number(event.target.value || 1),
                                1,
                                Math.max(1, Math.floor(activeSlot.miloOwnership * 100)),
                              ),
                            )
                          }
                        />
                        <strong>%</strong>
                      </div>
                    </label>
                  )}

                  <label>
                    <span>
                      {topic === "staff"
                        ? "Salary offer per staff"
                        : topic === "milo" || topic === "business-sale"
                          ? "Total offer"
                          : "Offer per unit"}
                    </span>
                    <div className="neg-input-with-suffix">
                      <input
                        type="number"
                        min={1}
                        step={profile && profile.listPrice >= 1000 ? 10 : 1}
                        value={offer}
                        onChange={(event) => setOffer(Math.max(1, Number(event.target.value || 1)))}
                      />
                      <strong>DT</strong>
                    </div>
                  </label>

                  <div className="neg-send-actions">
                    <button
                      type="button"
                      className="neg-send-button"
                      onClick={sendOffer}
                      disabled={!sessionOpen || sending}
                    >
                      {sending ? "Sending…" : "Send offer"}
                    </button>
                    {latestCounter > 0 && (
                      <button
                        type="button"
                        className="neg-accept-button"
                        onClick={acceptCounterOffer}
                        disabled={sending}
                      >
                        Accept {formatDT(latestCounter)}
                      </button>
                    )}
                    {session && session.status === "open" && (
                      <button
                        type="button"
                        className="neg-walk-button"
                        onClick={walkAway}
                        disabled={sending}
                      >
                        Walk away
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className={`neg-details-panel ${detailsOpen ? "is-open" : ""}`}>
          <div className="neg-panel-mobile-head">
            <strong>Deal details</strong>
            <button type="button" onClick={() => setDetailsOpen(false)}>
              ×
            </button>
          </div>

          <div className="neg-detail-section">
            <p className="neg-eyebrow">CURRENT DISCUSSION</p>
            <h3>{profile?.label || "Advisory conversation"}</h3>
            <p>{profile?.explanation}</p>
          </div>

          <div className="neg-detail-cards">
            <div>
              <span>Current reference</span>
              <strong>{profile ? formatDT(profile.listPrice) : "—"}</strong>
              <small>{profile?.unitLabel}</small>
            </div>
            <div>
              <span>Your latest offer</span>
              <strong>{session?.last_user_offer ? formatDT(session.last_user_offer) : formatDT(offer)}</strong>
              <small>{profile?.unitLabel}</small>
            </div>
            <div>
              <span>Latest counter</span>
              <strong>{latestCounter > 0 ? formatDT(latestCounter) : "None"}</strong>
              <small>{latestCounter > 0 ? profile?.unitLabel : "Waiting for response"}</small>
            </div>
          </div>

          <div className="neg-detail-section">
            <p className="neg-eyebrow">NEGOTIATION POSITION</p>
            <div className="neg-progress-labels">
              <span>Round {currentRound + (session?.status === "open" ? 1 : 0)}</span>
              <span>Maximum {maxRounds}</span>
            </div>
            <div className="neg-progress-track">
              <span style={{ width: `${clamp((currentRound / Math.max(1, maxRounds)) * 100, 0, 100)}%` }} />
            </div>
            <div className="neg-detail-line">
              <span>Patience remaining</span>
              <strong>{session?.patience_remaining ?? profile?.startingPatience ?? 0}</strong>
            </div>
            <div className="neg-detail-line">
              <span>Relationship</span>
              <strong>{session?.relationship_score ?? 50}/100</strong>
            </div>
            <div className="neg-detail-line">
              <span>Market conditions</span>
              <strong>{marketText}</strong>
            </div>
          </div>

          <div className="neg-detail-section">
            <p className="neg-eyebrow">BUSINESS POSITION</p>
            <div className="neg-detail-line">
              <span>Business cash</span>
              <strong>{formatDT(activeSlot.cash)}</strong>
            </div>
            <div className="neg-detail-line">
              <span>Stock available</span>
              <strong>{Math.floor(activeSlot.stockUnits)} units</strong>
            </div>
            <div className="neg-detail-line">
              <span>Current staff</span>
              <strong>{activeSlot.staffCount}</strong>
            </div>
            <div className="neg-detail-line">
              <span>Your ownership</span>
              <strong>{Math.round(activeSlot.userOwnership * 100)}%</strong>
            </div>
            <div className="neg-detail-line">
              <span>Milo’s ownership</span>
              <strong>{Math.round(activeSlot.miloOwnership * 100)}%</strong>
            </div>
          </div>

          <div className="neg-coach-note">
            <span>✦</span>
            <div>
              <strong>Milo’s guide</strong>
              <p>
                Contacts do not respond randomly. They consider their target, walk-away limit, market leverage, relationship, your terms and how many rounds remain.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {(contactsOpen || detailsOpen) && (
        <button
          type="button"
          className="neg-mobile-backdrop"
          aria-label="Close panel"
          onClick={() => {
            setContactsOpen(false);
            setDetailsOpen(false);
          }}
        />
      )}
    </main>
  );
}

function NegotiationStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; }
      button, input { font: inherit; }

      .neg-loader {
        width: 42px;
        height: 42px;
        margin: 0 auto 18px;
        border-radius: 999px;
        border: 3px solid rgba(255,255,255,0.12);
        border-top-color: #e5aa5e;
        animation: neg-spin 0.85s linear infinite;
      }
      @keyframes neg-spin { to { transform: rotate(360deg); } }

      .neg-header {
        height: 78px;
        position: sticky;
        top: 0;
        z-index: 30;
        display: grid;
        grid-template-columns: minmax(240px, 1fr) auto minmax(240px, 1fr);
        align-items: center;
        gap: 18px;
        padding: 0 22px;
        border-bottom: 1px solid rgba(218,151,74,0.18);
        background: rgba(18,10,7,0.94);
        backdrop-filter: blur(18px);
      }
      .neg-header-left, .neg-header-right { display: flex; align-items: center; gap: 10px; }
      .neg-header-right { justify-content: flex-end; }
      .neg-title-wrap { text-align: center; }
      .neg-title-wrap p { margin: 0; color: #efbb70; font-size: 10px; font-weight: 900; letter-spacing: 0.23em; }
      .neg-title-wrap h1 { margin: 3px 0 0; font-family: Georgia, serif; font-size: 28px; font-weight: 600; }
      .neg-back-button, .neg-primary-button {
        min-height: 42px;
        padding: 0 16px;
        border-radius: 999px;
        border: 1px solid rgba(218,151,74,0.3);
        background: rgba(42,25,14,0.72);
        color: white;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        font-size: 13px;
        font-weight: 850;
      }
      .neg-primary-button { margin-top: 22px; border-radius: 13px; }
      .neg-balance-pill {
        min-width: 142px;
        min-height: 48px;
        padding: 7px 14px;
        border-radius: 999px;
        border: 1px solid rgba(218,151,74,0.22);
        background: rgba(7,8,13,0.62);
        text-align: right;
      }
      .neg-balance-pill span { display: block; color: rgba(255,255,255,0.45); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; }
      .neg-balance-pill strong { display: block; margin-top: 2px; color: #f2c27e; font-size: 15px; }
      .neg-assets-wrap { position: relative; z-index: 70; }
      .neg-assets-button { cursor: pointer; font-family: inherit; color: white; }
      .neg-assets-dropdown {
        position: absolute;
        top: calc(100% + 9px);
        right: 0;
        width: 280px;
        padding: 12px;
        border-radius: 17px;
        border: 1px solid rgba(218,151,74,0.28);
        background: linear-gradient(145deg,rgba(24,13,8,0.99),rgba(5,8,15,0.99));
        box-shadow: 0 24px 65px rgba(0,0,0,0.58);
      }
      .neg-assets-row {
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border-bottom: 1px solid rgba(218,151,74,0.1);
        color: rgba(255,255,255,0.58);
        font-size: 13px;
      }
      .neg-assets-row strong { color: #f2c27e; font-size: 15px; }
      .neg-assets-total { margin-top: 7px; padding-top: 7px; border-top: 1px solid rgba(218,151,74,0.18); border-bottom: none; color: white; }
      .neg-mobile-icon-button { display: none; }

      .neg-layout {
        height: calc(100dvh - 78px);
        display: grid;
        grid-template-columns: 330px minmax(0, 1fr) 330px;
        overflow: hidden;
      }
      .neg-contacts-panel, .neg-details-panel {
        min-width: 0;
        min-height: 0;
        background: rgba(7,8,13,0.86);
        overflow: hidden;
      }
      .neg-contacts-panel {
        border-right: 1px solid rgba(218,151,74,0.14);
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
      }
      .neg-details-panel {
        border-left: 1px solid rgba(218,151,74,0.14);
        padding: 20px;
        overflow-y: auto;
      }
      .neg-panel-mobile-head { display: none; }
      .neg-contact-context { padding: 20px 20px 14px; }
      .neg-contact-context p, .neg-eyebrow { margin: 0; color: #e3a75a; font-size: 10px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; }
      .neg-contact-context strong { display: block; margin-top: 8px; font-family: Georgia, serif; font-size: 22px; }
      .neg-contact-context span { display: block; margin-top: 5px; color: rgba(255,255,255,0.52); font-size: 12px; }
      .neg-contact-search {
        margin: 0 16px 12px;
        height: 44px;
        display: grid;
        grid-template-columns: 28px 1fr;
        align-items: center;
        padding: 0 12px;
        border-radius: 13px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.035);
      }
      .neg-contact-search span { color: #efbb70; font-size: 18px; }
      .neg-contact-search input { width: 100%; border: none; outline: none; background: transparent; color: white; font-size: 13px; }
      .neg-contact-list { overflow-y: auto; padding: 0 10px 18px; }
      .neg-contact-card {
        width: 100%;
        display: grid;
        grid-template-columns: 48px minmax(0,1fr);
        gap: 11px;
        padding: 11px;
        border: 1px solid transparent;
        border-radius: 15px;
        background: transparent;
        color: white;
        text-align: left;
        cursor: pointer;
      }
      .neg-contact-card:hover, .neg-contact-card.is-active {
        border-color: rgba(218,151,74,0.22);
        background: linear-gradient(145deg, rgba(90,50,22,0.25), rgba(255,255,255,0.025));
      }
      .neg-avatar {
        width: 48px;
        height: 48px;
        border-radius: 15px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255,255,255,0.16);
        color: white;
        font-family: Georgia, serif;
        font-size: 22px;
        font-weight: 800;
        box-shadow: inset 0 0 22px rgba(255,255,255,0.08);
        flex-shrink: 0;
      }
      .neg-avatar-large { width: 52px; height: 52px; }
      .neg-avatar-small { width: 34px; height: 34px; border-radius: 11px; font-size: 15px; }
      .neg-contact-copy { min-width: 0; }
      .neg-contact-name-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .neg-contact-name-row strong { font-size: 15px; }
      .neg-contact-name-row i { padding: 3px 6px; border-radius: 999px; font-size: 8px; font-style: normal; text-transform: uppercase; letter-spacing: 0.08em; }
      .neg-contact-name-row i.live { color: #9ff4bf; background: rgba(63,180,112,0.1); }
      .neg-contact-name-row i.later { color: rgba(255,255,255,0.38); background: rgba(255,255,255,0.05); }
      .neg-contact-copy > span:nth-child(2) { display: block; margin-top: 3px; color: #efbb70; font-size: 11px; font-weight: 750; }
      .neg-contact-copy small { display: -webkit-box; margin-top: 5px; overflow: hidden; color: rgba(255,255,255,0.45); font-size: 10px; line-height: 1.35; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

      .neg-conversation-panel { min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0,1fr) auto; background: rgba(4,5,10,0.58); }
      .neg-conversation-head {
        min-height: 78px;
        display: grid;
        grid-template-columns: 52px minmax(0,1fr) auto;
        align-items: center;
        gap: 13px;
        padding: 13px 20px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        background: rgba(11,9,12,0.72);
      }
      .neg-conversation-head h2 { margin: 0; font-family: Georgia, serif; font-size: 24px; }
      .neg-conversation-head p { margin: 4px 0 0; color: rgba(255,255,255,0.48); font-size: 12px; }
      .neg-status-chip { padding: 8px 11px; border-radius: 999px; border: 1px solid rgba(111,213,154,0.18); background: rgba(63,180,112,0.07); color: #a7e8c1; font-size: 10px; font-weight: 800; }
      .neg-status-chip span { display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 999px; background: #6fd59a; }
      .neg-messages { overflow-y: auto; padding: 26px clamp(16px, 4vw, 52px); }
      .neg-message-row { display: flex; align-items: flex-end; gap: 9px; margin-bottom: 18px; }
      .neg-message-row.user { justify-content: flex-end; }
      .neg-message-row.system { justify-content: center; }
      .neg-message-bubble { max-width: min(650px, 78%); padding: 14px 16px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); }
      .neg-message-bubble.contact { border-bottom-left-radius: 5px; background: rgba(255,255,255,0.055); }
      .neg-message-bubble.user { border-bottom-right-radius: 5px; border-color: rgba(218,151,74,0.22); background: linear-gradient(145deg, rgba(113,61,25,0.62), rgba(63,34,20,0.68)); }
      .neg-message-bubble.system { max-width: 680px; border-color: rgba(111,213,154,0.2); background: rgba(63,180,112,0.08); text-align: center; }
      .neg-message-bubble.counter { border-color: rgba(107,172,219,0.24); }
      .neg-message-bubble.rejected, .neg-message-bubble.closed { border-color: rgba(224,115,92,0.2); }
      .neg-message-bubble p { margin: 0; font-size: 14px; line-height: 1.55; }
      .neg-message-bubble time { display: block; margin-top: 8px; color: rgba(255,255,255,0.3); font-size: 9px; }
      .neg-message-label { display: block; margin-bottom: 7px; color: #efbb70; font-size: 9px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }

      .neg-composer { padding: 14px 18px 18px; border-top: 1px solid rgba(255,255,255,0.07); background: rgba(8,7,11,0.94); }
      .neg-alert { margin-bottom: 12px; padding: 11px 13px; border-radius: 12px; border: 1px solid rgba(226,153,77,0.25); background: rgba(115,65,27,0.18); color: #f2c58a; font-size: 12px; line-height: 1.45; }
      .neg-quick-messages { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 10px; }
      .neg-quick-messages button { flex: 0 0 auto; max-width: 310px; min-height: 40px; padding: 8px 12px; border-radius: 13px; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.035); color: rgba(255,255,255,0.68); font-size: 11px; text-align: left; cursor: pointer; }
      .neg-quick-messages button.is-selected { border-color: rgba(218,151,74,0.35); background: rgba(122,69,29,0.22); color: white; }
      .neg-offer-grid { display: grid; grid-template-columns: minmax(120px,0.7fr) minmax(190px,1fr) auto; gap: 10px; align-items: end; }
      .neg-offer-grid label > span { display: block; margin-bottom: 6px; color: rgba(255,255,255,0.45); font-size: 9px; font-weight: 850; letter-spacing: 0.12em; text-transform: uppercase; }
      .neg-offer-grid input { width: 100%; height: 46px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; outline: none; background: rgba(255,255,255,0.045); color: white; padding: 0 12px; font-size: 15px; font-weight: 800; }
      .neg-input-with-suffix { position: relative; }
      .neg-input-with-suffix input { padding-right: 46px; }
      .neg-input-with-suffix strong { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); color: #efbb70; font-size: 11px; }
      .neg-send-actions { display: flex; align-items: center; gap: 8px; }
      .neg-send-actions button { min-height: 46px; padding: 0 14px; border-radius: 12px; font-size: 12px; font-weight: 900; cursor: pointer; }
      .neg-send-actions button:disabled { opacity: 0.45; cursor: not-allowed; }
      .neg-send-button { border: none; background: linear-gradient(135deg,#e4a554,#b9662e); color: white; }
      .neg-accept-button { border: 1px solid rgba(111,213,154,0.25); background: rgba(63,180,112,0.12); color: #b4f0cc; }
      .neg-walk-button { border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.52); }
      .neg-coming-later, .neg-finished-row { min-height: 74px; padding: 14px 16px; border-radius: 15px; border: 1px solid rgba(218,151,74,0.18); background: rgba(255,255,255,0.025); }
      .neg-coming-later strong, .neg-finished-row strong { font-family: Georgia, serif; font-size: 17px; }
      .neg-coming-later p, .neg-finished-row p { margin: 6px 0 0; color: rgba(255,255,255,0.48); font-size: 12px; }
      .neg-finished-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
      .neg-finished-row button { min-height: 42px; padding: 0 15px; border-radius: 11px; border: none; background: #d48c42; color: white; font-weight: 850; cursor: pointer; }

      .neg-detail-section { padding: 17px 0; border-bottom: 1px solid rgba(255,255,255,0.07); }
      .neg-detail-section:first-of-type { padding-top: 0; }
      .neg-detail-section h3 { margin: 9px 0 0; font-family: Georgia, serif; font-size: 23px; }
      .neg-detail-section > p:not(.neg-eyebrow) { margin: 9px 0 0; color: rgba(255,255,255,0.5); font-size: 12px; line-height: 1.55; }
      .neg-detail-cards { display: grid; gap: 8px; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.07); }
      .neg-detail-cards > div { padding: 12px; border-radius: 13px; border: 1px solid rgba(218,151,74,0.14); background: rgba(255,255,255,0.025); }
      .neg-detail-cards span, .neg-detail-cards small { display: block; color: rgba(255,255,255,0.4); font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; }
      .neg-detail-cards strong { display: block; margin: 6px 0 3px; font-size: 20px; }
      .neg-progress-labels, .neg-detail-line { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      .neg-progress-labels { margin-top: 13px; color: rgba(255,255,255,0.48); font-size: 10px; }
      .neg-progress-track { height: 5px; margin: 8px 0 15px; border-radius: 999px; background: rgba(255,255,255,0.07); overflow: hidden; }
      .neg-progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#d98e3f,#efc176); }
      .neg-detail-line { min-height: 34px; border-top: 1px solid rgba(255,255,255,0.045); font-size: 11px; }
      .neg-detail-line span { color: rgba(255,255,255,0.45); }
      .neg-detail-line strong { text-align: right; }
      .neg-coach-note { display: grid; grid-template-columns: 34px 1fr; gap: 10px; margin-top: 17px; padding: 14px; border-radius: 15px; border: 1px solid rgba(218,151,74,0.18); background: linear-gradient(145deg,rgba(105,58,25,0.2),rgba(255,255,255,0.02)); }
      .neg-coach-note > span { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 11px; background: rgba(218,151,74,0.12); color: #efbb70; }
      .neg-coach-note strong { font-size: 12px; }
      .neg-coach-note p { margin: 6px 0 0; color: rgba(255,255,255,0.5); font-size: 10px; line-height: 1.5; }
      .neg-mobile-backdrop { display: none; }

      @media (max-width: 1180px) {
        .neg-layout { grid-template-columns: 290px minmax(0,1fr); }
        .neg-details-panel { position: fixed; top: 78px; right: 0; bottom: 0; z-index: 45; width: min(360px, 92vw); transform: translateX(102%); transition: transform 220ms ease; box-shadow: -24px 0 60px rgba(0,0,0,0.5); }
        .neg-details-panel.is-open { transform: translateX(0); }
        .neg-mobile-icon-button { display: inline-flex; min-height: 38px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(218,151,74,0.25); background: rgba(255,255,255,0.04); color: white; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
        .neg-header-left .neg-mobile-icon-button { display: none; }
        .neg-panel-mobile-head { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; }
        .neg-panel-mobile-head button { width: 34px; height: 34px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: white; font-size: 20px; }
        .neg-mobile-backdrop { display: block; position: fixed; inset: 78px 0 0; z-index: 40; border: none; background: rgba(0,0,0,0.5); }
      }

      @media (max-width: 760px) {
        .neg-header { height: 68px; grid-template-columns: 1fr auto; padding: 0 10px; }
        .neg-title-wrap { display: none; }
        .neg-header-right .neg-balance-pill { min-width: 116px; min-height: 40px; padding: 5px 10px; }
        .neg-header-right .neg-balance-pill span { font-size: 8px; }
        .neg-header-right .neg-balance-pill strong { font-size: 12px; }
        .neg-assets-dropdown { position: fixed; top: 62px; right: 10px; width: min(280px, calc(100vw - 20px)); }
        .neg-header-left .neg-mobile-icon-button { display: inline-flex; }
        .neg-back-button { min-height: 38px; width: 38px; padding: 0; font-size: 0; }
        .neg-back-button::before { content: "←"; font-size: 18px; }
        .neg-header-right { gap: 6px; }
        .neg-layout { height: calc(100dvh - 68px); display: block; }
        .neg-contacts-panel { position: fixed; top: 68px; left: 0; bottom: 0; z-index: 45; width: min(340px, 92vw); transform: translateX(-102%); transition: transform 220ms ease; box-shadow: 24px 0 60px rgba(0,0,0,0.5); }
        .neg-contacts-panel.is-open { transform: translateX(0); }
        .neg-details-panel { top: 68px; }
        .neg-mobile-backdrop { inset: 68px 0 0; }
        .neg-conversation-panel { height: 100%; }
        .neg-conversation-head { min-height: 68px; grid-template-columns: 44px minmax(0,1fr); padding: 9px 12px; }
        .neg-avatar-large { width: 44px; height: 44px; border-radius: 13px; }
        .neg-conversation-head h2 { font-size: 20px; }
        .neg-status-chip { display: none; }
        .neg-messages { padding: 18px 10px; }
        .neg-message-bubble { max-width: 86%; padding: 12px 13px; }
        .neg-message-bubble p { font-size: 13px; }
        .neg-avatar-small { display: none; }
        .neg-composer { padding: 10px; }
        .neg-quick-messages { padding-bottom: 8px; }
        .neg-quick-messages button { max-width: 250px; font-size: 10px; }
        .neg-offer-grid { grid-template-columns: 0.8fr 1.2fr; }
        .neg-send-actions { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; }
        .neg-send-actions .neg-walk-button { grid-column: 1 / -1; }
        .neg-finished-row { align-items: stretch; flex-direction: column; }
      }

      @media (max-width: 430px) {
        .neg-header-right .neg-mobile-icon-button { padding: 0 9px; font-size: 10px; }
        .neg-offer-grid { grid-template-columns: 1fr; }
        .neg-send-actions { grid-column: auto; }
      }
    `}</style>
  );
}
