"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getBondEligibility,
  listBondEvents,
  listBondHoldings,
  listBondProducts,
  purchaseBond,
  refreshBondMaturities,
  settleBond,
} from "../lib/bond-api";
import type {
  BondEligibilitySnapshot,
  BondEvent,
  BondHolding,
  BondProduct,
} from "../lib/bond-types";

const EMPTY_ELIGIBILITY: BondEligibilitySnapshot = {
  eligibleDt: 0,
  activePrincipal: 0,
  pendingInterest: 0,
  settledInterest: 0,
};

export type UseBankBondsResult = {
  products: BondProduct[];
  holdings: BondHolding[];
  events: BondEvent[];
  eligibility: BondEligibilitySnapshot;
  loading: boolean;
  actionLoading: boolean;
  isLoggedIn: boolean;
  error: string | null;
  buyBond: (bondProductId: string, principal: number) => Promise<BondHolding>;
  settleBond: (bondHoldingId: string) => Promise<BondHolding>;
  refresh: () => Promise<void>;
};

export function useBankBonds(): UseBankBondsResult {
  const [products, setProducts] = useState<BondProduct[]>([]);
  const [holdings, setHoldings] = useState<BondHolding[]>([]);
  const [events, setEvents] = useState<BondEvent[]>([]);
  const [eligibility, setEligibility] =
    useState<BondEligibilitySnapshot>(EMPTY_ELIGIBILITY);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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
        setEvents([]);
        setEligibility(EMPTY_ELIGIBILITY);
        return;
      }

      setIsLoggedIn(true);

      // No scheduler is required for the user-facing lifecycle. This lightweight
      // RPC promotes any due active holdings before the current data are read.
      await refreshBondMaturities();

      const [bondHoldings, bondEvents, bondEligibility] = await Promise.all([
        listBondHoldings(),
        listBondEvents(),
        getBondEligibility(),
      ]);

      setHoldings(bondHoldings);
      setEvents(bondEvents);
      setEligibility(bondEligibility);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Bank Bonds.");
    } finally {
      setLoading(false);
    }
  }, []);

  const buyBond = useCallback(
    async (bondProductId: string, principal: number) => {
      setActionLoading(true);
      setError(null);

      try {
        const holding = await purchaseBond(bondProductId, principal);
        // One event refreshes this hook plus the Bank account summary. Purchase
        // changes locked/available DT but does not change the master ledger.
        window.dispatchEvent(new Event("milo-bank-bonds-updated"));
        return holding;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Could not purchase this Bond.";
        setError(message);
        throw caught;
      } finally {
        setActionLoading(false);
      }
    },
    [load],
  );

  const settle = useCallback(
    async (bondHoldingId: string) => {
      setActionLoading(true);
      setError(null);

      try {
        const holding = await settleBond(bondHoldingId);
        // Settlement changes both Bond locks and the master DT ledger. The
        // existing dream-tokens event is enough to refresh Bank + global DT UI.
        window.dispatchEvent(new Event("dream-tokens-updated"));
        return holding;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Could not settle this Bond.";
        setError(message);
        throw caught;
      } finally {
        setActionLoading(false);
      }
    },
    [load],
  );

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
    events,
    eligibility,
    loading,
    actionLoading,
    isLoggedIn,
    error,
    buyBond,
    settleBond: settle,
    refresh: load,
  };
}
