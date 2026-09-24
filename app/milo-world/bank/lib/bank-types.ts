export type BankScreenMode = "desktop" | "compact" | "mobile";

export type BankSection = "learn" | "practise" | "money" | "progress";

export type MyMoneyTab = "wallet" | "savings" | "bonds" | "statement";

export type TokenPackage = {
  name: string;
  tokens: number;
  price: number;
  badge?: string;
  description: string;
  variantId: string;
};

export type BankTransactionCategory =
  | "earned"
  | "purchased"
  | "spent"
  | "other";

export type BankTransaction = {
  id: string;
  amount: number;
  type: string | null;
  title: string | null;
  createdAt: string | null;
  category: BankTransactionCategory;
};

export type BankAccountSnapshot = {
  available: number;
  savings: number;
  bonds: number;
  interestEarned: number;
  total: number;
  monthEarned: number;
  monthPurchased: number;
  monthSpent: number;
  monthNet: number;
  transactions: BankTransaction[];
};
