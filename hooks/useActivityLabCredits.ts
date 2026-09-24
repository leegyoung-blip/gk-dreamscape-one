"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createActivityLabCreditCheckout,
  createCreditRedemptionId,
  getActivityLabCreditPacks,
  getActivityLabCredits,
  redeemActivityLabCredits,
  type ActivityLabCreditPack,
  type ActivityLabCreditState,
} from "@/lib/activity-lab/credits";

export function useActivityLabCredits(userId?: string | null) {
  const [wallet, setWallet] = useState<ActivityLabCreditState | null>(null);
  const [packs, setPacks] = useState<ActivityLabCreditPack[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [redeeming, setRedeeming] = useState(false);
  const [buyingPackKey, setBuyingPackKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) { setWallet(null); setPacks([]); setLoading(false); setError(null); return; }
    setLoading(true);
    try {
      const [nextWallet, nextPacks] = await Promise.all([getActivityLabCredits(), getActivityLabCreditPacks()]);
      setWallet(nextWallet); setPacks(nextPacks); setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Play Credits.");
    } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const redeem = useCallback(async (credits: number) => {
    if (!userId || redeeming) return null;
    setRedeeming(true); setError(null);
    try {
      const result = await redeemActivityLabCredits(credits, createCreditRedemptionId());
      setWallet((current) => current ? { ...current, balanceCredits: result.creditBalance, lifetimeRedeemedCredits: current.lifetimeRedeemedCredits + (result.accepted ? result.creditsSpent : 0) } : current);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add purchased playtime."); return null;
    } finally { setRedeeming(false); }
  }, [redeeming, userId]);

  const buyPack = useCallback(async (packKey: string) => {
    if (!userId || buyingPackKey) return;
    setBuyingPackKey(packKey); setError(null);
    try {
      const url = await createActivityLabCreditCheckout(packKey);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open checkout."); setBuyingPackKey(null);
    }
  }, [buyingPackKey, userId]);

  return { wallet, packs, loading, redeeming, buyingPackKey, error, refresh, redeem, buyPack };
}
