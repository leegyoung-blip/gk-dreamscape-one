"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FREE_MILO_FINANCE_ACCESS,
  type MiloFinanceAccessSnapshot,
} from "../lib/milo-finance-access";

type AccessRow = {
  has_access: boolean;
  source: string | null;
  status: string | null;
  ends_at: string | null;
  is_staff: boolean;
};

function messageFrom(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message;
    if (/get_milo_finance_access|milo_finance_entitlements/i.test(message)) {
      return "Milo Finance access setup is missing. Run PHASE-1E-MILO-FINANCE-ACCESS.sql.";
    }
    return message;
  }
  return "Could not check Milo Finance access.";
}

function toSnapshot(row: AccessRow | null | undefined): MiloFinanceAccessSnapshot {
  if (!row) return FREE_MILO_FINANCE_ACCESS;
  return {
    hasAccess: Boolean(row.has_access),
    source: row.source ?? null,
    status: row.status ?? null,
    endsAt: row.ends_at ?? null,
    isStaff: Boolean(row.is_staff),
  };
}

export function useMiloFinanceAccess(isLoggedIn: boolean) {
  const [access, setAccess] = useState<MiloFinanceAccessSnapshot>(
    FREE_MILO_FINANCE_ACCESS,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setAccess(FREE_MILO_FINANCE_ACCESS);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_milo_finance_access");
      if (rpcError) throw rpcError;
      const raw = Array.isArray(data) ? data[0] : data;
      setAccess(toSnapshot(raw as AccessRow | null));
    } catch (caught) {
      setAccess(FREE_MILO_FINANCE_ACCESS);
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => refresh());

    window.addEventListener("milo-finance-access-updated", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("milo-finance-access-updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  return {
    ...access,
    loading,
    error,
    refresh,
  };
}
