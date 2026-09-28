export type SavingsGoalStatus = "active" | "completed" | "archived";

export type SavingsGoalLinkedType =
  | "custom"
  | "rover"
  | "property"
  | "upgrade"
  | "business";

export type SavingsMovementType = "deposit" | "withdrawal" | "interest";

export type SavingsGoal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  icon: string;
  linkedType: SavingsGoalLinkedType;
  linkedId: string | null;
  status: SavingsGoalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type SavingsMovement = {
  id: string;
  userId: string;
  savingsGoalId: string;
  movementType: SavingsMovementType;
  amount: number;
  balanceAfter: number;
  title: string;
  createdAt: string;
};

export type SavingsInterestSummary = {
  annualRateBps: number;
  annualRatePercent: number;
  calculationMethod: "daily_closing_balance";
  creditFrequency: "monthly";
  yearToDateInterest: number;
  lifetimeInterest: number;
  lastCreditedAt: string | null;
};

export type SavingsInterestSettlement = {
  creditedInterest: number;
  creditedPeriods: number;
};

export type CreateSavingsGoalInput = {
  name: string;
  targetAmount: number;
  icon?: string;
  linkedType?: SavingsGoalLinkedType;
  linkedId?: string | null;
};

export type UpdateSavingsGoalInput = {
  goalId: string;
  name: string;
  targetAmount: number;
  icon?: string;
  linkedType?: SavingsGoalLinkedType;
  linkedId?: string | null;
};
