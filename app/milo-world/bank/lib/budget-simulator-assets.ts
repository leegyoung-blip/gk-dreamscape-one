import type {
  BudgetAllocationKey,
  BudgetLiveEvent,
} from "./budget-simulator-types";

const BASE = "/milo-world/bank/budget-simulator";

export const BUDGET_SIMULATOR_ASSETS = {
  background: `${BASE}/budget-simulator-background.png`,
  advisor: `${BASE}/milo-finance-advisor.png`,
  roverRepair: `${BASE}/rover-repair.png`,
  businessEquipment: `${BASE}/business-equipment.png`,
  exchangeInvesting: `${BASE}/exchange-investing.png`,
  emergencyShock: `${BASE}/emergency-shock.png`,
  lifestyleSpending: `${BASE}/lifestyle-spending.png`,
  savingsReserve: `${BASE}/savings-reserve.png`,
  savingsGoal: `${BASE}/savings-goal.png`,
  bondFixedReturn: `${BASE}/bond-fixed-return.png`,
} as const;

export function budgetAllocationAsset(
  key: BudgetAllocationKey,
): string | null {
  switch (key) {
    case "essentials":
      return BUDGET_SIMULATOR_ASSETS.roverRepair;
    case "savings":
      return BUDGET_SIMULATOR_ASSETS.savingsReserve;
    case "emergency":
      return BUDGET_SIMULATOR_ASSETS.emergencyShock;
    case "investing":
      return BUDGET_SIMULATOR_ASSETS.exchangeInvesting;
    case "goals":
      return BUDGET_SIMULATOR_ASSETS.savingsGoal;
    case "lifestyle":
      return BUDGET_SIMULATOR_ASSETS.lifestyleSpending;
    case "unallocated":
    default:
      return null;
  }
}

export function budgetLiveEventAsset(
  event: Pick<
    BudgetLiveEvent,
    "id" | "category" | "consequenceKind" | "linkedFrom"
  >,
): string {
  if (
    event.id.includes("rover") ||
    event.consequenceKind === "rover_follow_up" ||
    event.linkedFrom === "rover_diagnostic"
  ) {
    return BUDGET_SIMULATOR_ASSETS.roverRepair;
  }

  if (
    event.id.includes("business") ||
    event.id.includes("supplier") ||
    event.consequenceKind === "equipment_follow_up" ||
    event.linkedFrom === "business_equipment"
  ) {
    return BUDGET_SIMULATOR_ASSETS.businessEquipment;
  }

  if (event.id.includes("exchange") || event.category === "market") {
    return BUDGET_SIMULATOR_ASSETS.exchangeInvesting;
  }

  if (event.id.includes("goal") || event.category === "goal") {
    return BUDGET_SIMULATOR_ASSETS.savingsGoal;
  }

  if (event.id.includes("bonus")) {
    return BUDGET_SIMULATOR_ASSETS.savingsReserve;
  }

  if (event.category === "lifestyle") {
    return BUDGET_SIMULATOR_ASSETS.lifestyleSpending;
  }

  return BUDGET_SIMULATOR_ASSETS.emergencyShock;
}
