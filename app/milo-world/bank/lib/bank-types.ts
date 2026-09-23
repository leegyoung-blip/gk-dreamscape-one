export type BankScreenMode = "desktop" | "compact" | "mobile";

export type BankTab = "wallet" | "savings" | "bonds" | "learn";

export type TokenPackage = {
  name: string;
  tokens: number;
  price: number;
  badge?: string;
  description: string;
  variantId: string;
};

export type BankTransaction = {
  id: string;
  amount: number;
  type: string | null;
  title: string | null;
  createdAt: string | null;
};

export type BankAccountSnapshot = {
  available: number;
  savings: number;
  bonds: number;
  interestEarned: number;
  total: number;
  monthEarned: number;
  monthSpent: number;
  monthNet: number;
  transactions: BankTransaction[];
};
