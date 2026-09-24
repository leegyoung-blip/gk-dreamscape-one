export type MiloFinanceAccessTier = "free" | "milo_finance";

export type MiloFinanceAccessSnapshot = {
  hasAccess: boolean;
  source: string | null;
  status: string | null;
  endsAt: string | null;
  isStaff: boolean;
};

export const FREE_MILO_FINANCE_ACCESS: MiloFinanceAccessSnapshot = {
  hasAccess: false,
  source: null,
  status: null,
  endsAt: null,
  isStaff: false,
};

// Milo World already opens Membership through this query string.
export const MILO_FINANCE_MEMBERSHIP_HREF = "/milo-world?open=membership";

export function requiresMiloFinance(tier: MiloFinanceAccessTier) {
  return tier === "milo_finance";
}

export function accessLabel(tier: MiloFinanceAccessTier) {
  return tier === "milo_finance" ? "Milo Finance" : "Free";
}
