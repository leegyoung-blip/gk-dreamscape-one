import type {
  BankTransaction,
  BankTransactionCategory,
} from "./bank-types";

type ClassifiableTransaction = Pick<BankTransaction, "amount" | "type" | "title">;

const PURCHASE_MARKERS = [
  "purchase",
  "purchased",
  "shopify",
  "top up",
  "top-up",
  "topup",
  "token pack",
  "token_pack",
  "buy tokens",
  "bought tokens",
];

const EARN_MARKERS = [
  "reward",
  "earned",
  "earn",
  "quiz",
  "game",
  "objective",
  "mission",
  "referral",
  "bonus",
  "achievement",
];

const SPEND_MARKERS = [
  "spend",
  "spent",
  "purchase item",
  "upgrade",
  "entry",
  "buy item",
  "bought item",
];

function searchableText(transaction: ClassifiableTransaction) {
  return `${transaction.type || ""} ${transaction.title || ""}`
    .trim()
    .toLowerCase();
}

function containsAny(value: string, markers: string[]) {
  return markers.some((marker) => value.includes(marker));
}

export function classifyBankTransaction(
  transaction: ClassifiableTransaction,
): BankTransactionCategory {
  const text = searchableText(transaction);

  // Purchased DT must be detected before the generic positive-amount rule,
  // otherwise paid top-ups would incorrectly appear as gameplay earnings.
  if (transaction.amount > 0 && containsAny(text, PURCHASE_MARKERS)) {
    return "purchased";
  }

  if (transaction.amount < 0) {
    if (containsAny(text, SPEND_MARKERS) || transaction.amount < 0) {
      return "spent";
    }
  }

  if (transaction.amount > 0) {
    if (containsAny(text, EARN_MARKERS) || transaction.amount > 0) {
      return "earned";
    }
  }

  return "other";
}

export function categoryLabel(category: BankTransactionCategory) {
  switch (category) {
    case "earned":
      return "Earned";
    case "purchased":
      return "Purchased";
    case "spent":
      return "Spent";
    default:
      return "Other";
  }
}

export function transactionFallbackTitle(transaction: BankTransaction) {
  switch (transaction.category) {
    case "earned":
      return "Dream Token reward";
    case "purchased":
      return "Dream Token top-up";
    case "spent":
      return "Dream Token spend";
    default:
      return "Dream Token adjustment";
  }
}
