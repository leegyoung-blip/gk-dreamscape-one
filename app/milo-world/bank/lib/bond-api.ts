import { supabase } from "@/lib/supabase";
import type {
  BondEligibilitySnapshot,
  BondEvent,
  BondEventType,
  BondHolding,
  BondProduct,
  BondStatus,
} from "./bond-types";

type BondProductRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  term_days: number | string;
  return_rate_bps: number | string;
  min_investment: number | string;
  max_investment: number | string;
  badge: string | null;
  sort_order: number | string;
  is_active: boolean;
};

type BondHoldingRow = {
  id: string;
  user_id: string;
  bond_product_id: string;
  product_code: string;
  bond_name: string;
  term_days: number | string;
  return_rate_bps: number | string;
  principal: number | string;
  interest_amount: number | string;
  payout_amount: number | string;
  status: string;
  purchased_at: string;
  matures_at: string;
  settled_at: string | null;
  settlement_request_id: string | null;
  created_at: string;
  updated_at: string;
};

type BondEventRow = {
  id: string;
  user_id: string;
  bond_holding_id: string;
  event_type: string;
  principal: number | string;
  interest_amount: number | string;
  title: string;
  request_id: string | null;
  created_at: string;
};

type BondEligibilityRow = {
  eligible_dt: number | string;
  active_principal: number | string;
  pending_interest: number | string;
  settled_interest: number | string;
};

function toBondProduct(row: BondProductRow): BondProduct {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    termDays: Number(row.term_days || 0),
    returnRateBps: Number(row.return_rate_bps || 0),
    minInvestment: Number(row.min_investment || 0),
    maxInvestment: Number(row.max_investment || 0),
    badge: row.badge,
    sortOrder: Number(row.sort_order || 0),
    isActive: Boolean(row.is_active),
  };
}

function toBondHolding(row: BondHoldingRow): BondHolding {
  return {
    id: row.id,
    userId: row.user_id,
    bondProductId: row.bond_product_id,
    productCode: row.product_code,
    bondName: row.bond_name,
    termDays: Number(row.term_days || 0),
    returnRateBps: Number(row.return_rate_bps || 0),
    principal: Number(row.principal || 0),
    interestAmount: Number(row.interest_amount || 0),
    payoutAmount: Number(row.payout_amount || 0),
    status: row.status as BondStatus,
    purchasedAt: row.purchased_at,
    maturesAt: row.matures_at,
    settledAt: row.settled_at,
    settlementRequestId: row.settlement_request_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBondEvent(row: BondEventRow): BondEvent {
  return {
    id: row.id,
    userId: row.user_id,
    bondHoldingId: row.bond_holding_id,
    eventType: row.event_type as BondEventType,
    principal: Number(row.principal || 0),
    interestAmount: Number(row.interest_amount || 0),
    title: row.title,
    requestId: row.request_id,
    createdAt: row.created_at,
  };
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 shape for older test environments.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

const HOLDING_SELECT =
  "id,user_id,bond_product_id,product_code,bond_name,term_days,return_rate_bps,principal,interest_amount,payout_amount,status,purchased_at,matures_at,settled_at,settlement_request_id,created_at,updated_at";

export async function listBondProducts(includeInactive = false) {
  let query = supabase
    .from("milo_bank_bond_products")
    .select(
      "id,code,name,description,term_days,return_rate_bps,min_investment,max_investment,badge,sort_order,is_active",
    )
    .order("sort_order", { ascending: true })
    .order("term_days", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data || []) as BondProductRow[]).map(toBondProduct);
}

export async function listBondHoldings(limit = 100) {
  const { data, error } = await supabase
    .from("milo_bank_bond_holdings")
    .select(HOLDING_SELECT)
    .order("purchased_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data || []) as BondHoldingRow[]).map(toBondHolding);
}

export async function listBondEvents(limit = 100) {
  const { data, error } = await supabase
    .from("milo_bank_bond_events")
    .select(
      "id,user_id,bond_holding_id,event_type,principal,interest_amount,title,request_id,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data || []) as BondEventRow[]).map(toBondEvent);
}

export async function getBondEligibility(): Promise<BondEligibilitySnapshot> {
  const { data, error } = await supabase.rpc("get_milo_bank_bond_eligibility");
  if (error) throw error;

  const raw = Array.isArray(data) ? data[0] : data;
  const row = raw as BondEligibilityRow | undefined;

  return {
    eligibleDt: Number(row?.eligible_dt || 0),
    activePrincipal: Number(row?.active_principal || 0),
    pendingInterest: Number(row?.pending_interest || 0),
    settledInterest: Number(row?.settled_interest || 0),
  };
}

export async function purchaseBond(
  bondProductId: string,
  principal: number,
  requestId = createRequestId(),
) {
  const { data, error } = await supabase.rpc("purchase_milo_bank_bond", {
    p_bond_product_id: bondProductId,
    p_principal: Math.floor(principal),
    p_request_id: requestId,
  });

  if (error) throw error;
  return toBondHolding(data as BondHoldingRow);
}

export async function refreshBondMaturities() {
  const { data, error } = await supabase.rpc("refresh_milo_bank_bond_maturities");
  if (error) throw error;
  return Number(data || 0);
}

export async function settleBond(
  bondHoldingId: string,
  requestId = createRequestId(),
) {
  const { data, error } = await supabase.rpc("settle_milo_bank_bond", {
    p_bond_holding_id: bondHoldingId,
    p_request_id: requestId,
  });

  if (error) throw error;
  return toBondHolding(data as BondHoldingRow);
}

export function bondReturnPercent(returnRateBps: number) {
  return Number(returnRateBps || 0) / 100;
}

export function calculateBondInterest(principal: number, returnRateBps: number) {
  return Math.floor((Math.max(0, principal) * Math.max(0, returnRateBps)) / 10000);
}
