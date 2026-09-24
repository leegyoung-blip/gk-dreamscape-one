"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getBondEligibility,
  listBondHoldings,
  listBondProducts,
} from "../lib/bond-api";
import type {
  BondEligibilitySnapshot,
  BondHolding,
  BondProduct,
} from "../lib/bond-types";

const EMPTY_ELIGIBILITY: BondEligibilitySnapshot = {
  eligibleDt: 0,
  activePrincipal: 0,
  pendingInterest: 0,
  settledInterest: 0,
};

export function useBankBonds() {
  const [products, setProducts] = useState<BondProduct[]>([]);
  const [holdings, setHoldings] = useState<BondHolding[]>([]);
  const [eligibility, setEligibility] =
    useState<BondEligibilitySnapshot>(EMPTY_ELIGIBILITY);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const bondProducts = await listBondProducts();
      setProducts(bondProducts);

      if (!user) {
        setIsLoggedIn(false);
        setHoldings([]);
        setEligibility(EMPTY_ELIGIBILITY);
        return;
      }

      setIsLoggedIn(true);
      const [bondHoldings, bondEligibility] = await Promise.all([
        listBondHoldings(),
        getBondEligibility(),
      ]);

      setHoldings(bondHoldings);
      setEligibility(bondEligibility);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Bank Bonds.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load());

    window.addEventListener("focus", load);
    window.addEventListener("dream-tokens-updated", load);
    window.addEventListener("milo-bank-savings-updated", load);
    window.addEventListener("milo-bank-bonds-updated", load);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", load);
      window.removeEventListener("dream-tokens-updated", load);
      window.removeEventListener("milo-bank-savings-updated", load);
      window.removeEventListener("milo-bank-bonds-updated", load);
    };
  }, [load]);

  return {
    products,
    holdings,
    eligibility,
    loading,
    isLoggedIn,
    error,
    refresh: load,
  };
}
