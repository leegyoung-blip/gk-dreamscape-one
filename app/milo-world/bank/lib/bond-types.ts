export type BondStatus = "active" | "matured" | "settled" | "cancelled";
export type BondEventType = "purchased" | "matured" | "settled";

export type BondProduct = {
  id: string;
  code: string;
  name: string;
  description: string;
  termDays: number;
  returnRateBps: number;
  minInvestment: number;
  maxInvestment: number;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type BondHolding = {
  id: string;
  userId: string;
  bondProductId: string;
  productCode: string;
  bondName: string;
  termDays: number;
  returnRateBps: number;
  principal: number;
  interestAmount: number;
  payoutAmount: number;
  status: BondStatus;
  purchasedAt: string;
  maturesAt: string;
  settledAt: string | null;
  settlementRequestId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BondEvent = {
  id: string;
  userId: string;
  bondHoldingId: string;
  eventType: BondEventType;
  principal: number;
  interestAmount: number;
  title: string;
  requestId: string | null;
  createdAt: string;
};

export type BondEligibilitySnapshot = {
  eligibleDt: number;
  activePrincipal: number;
  pendingInterest: number;
  settledInterest: number;
};
