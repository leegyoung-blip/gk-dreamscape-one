"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";

type Profile = {
  id: string;
  email: string | null;
  role: string | null;
  tier: string | null;
  milo_exchange_age_band: string | null;
  milo_exchange_unlocked: boolean | null;
  milo_exchange_locked_until: string | null;
  milo_exchange_age_verified_at: string | null;
  milo_exchange_age_verification_method: string | null;
  milo_exchange_terms_accepted_at: string | null;
};

type Stock = {
  symbol: string;
  name: string;
  current_price: number;
  previous_price: number;
  is_active: boolean;
};

type StockHolding = {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  average_price: number;
};

type ExchangeProperty = {
  id: string;
  name: string;
  district: string;
  current_value: number;
  is_active: boolean;
};

type PropertyHolding = {
  id: string;
  user_id: string;
  property_id: string;
  purchase_price: number;
  created_at: string;
};

type TokenTransaction = {
  id: string;
  amount: number;
  type: string | null;
  title: string | null;
  created_at: string;
};

type LeaderboardRow = {
  rank_position: number;
  username: string;
  cash_value: number;
  stock_value: number;
  property_value: number;
  total_value: number;
  total_shares: number;
  is_current_user: boolean;
};

type FriendRelation = {
  id: string;
  user_id: string;
  friend_user_id: string;
  status: "pending" | "accepted" | "declined" | string;
  created_at: string;
};

type FriendProfile = {
  id: string;
  email: string | null;
};

type FriendItem = {
  relationId: string;
  profileId: string;
  email: string;
  status: FriendRelation["status"];
  direction: "incoming" | "outgoing";
  createdAt: string;
};

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1180 || isPortrait) {
        setScreenMode("tablet");
      } else {
        setScreenMode("desktop");
      }
    }

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return screenMode;
}

function calculateAge(dateString: string) {
  const today = new Date();
  const birthDate = new Date(`${dateString}T00:00:00`);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function getAgeBand(age: number) {
  if (age < 13) return "under_13";
  if (age < 16) return "13_15";
  if (age < 18) return "16_17";
  return "18_plus";
}

function getSixteenthBirthday(dateString: string) {
  const birthDate = new Date(`${dateString}T00:00:00`);
  birthDate.setFullYear(birthDate.getFullYear() + 16);
  return birthDate.toISOString().slice(0, 10);
}

function getTodayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number) {
  return Math.round(Number(value || 0)).toLocaleString();
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-SG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getTransactionCategory(title: string | null) {
  const cleanTitle = String(title || "").toLowerCase();

  if (cleanTitle.includes("stock exchange") || cleanTitle.includes("stock")) {
    return "Stock";
  }

  if (cleanTitle.includes("property") || cleanTitle.includes("district")) {
    return "Property";
  }

  if (
    cleanTitle.includes("daily code") ||
    cleanTitle.includes("mastery code") ||
    cleanTitle.includes("categories") ||
    cleanTitle.includes("reward") ||
    cleanTitle.includes("referral")
  ) {
    return "Reward";
  }

  return "Tokens";
}

function ScrollStyles() {
  return (
    <style>{`
      .milo-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(132, 218, 255, 0.45) rgba(255,255,255,0.12);
      }

      .milo-scrollbar::-webkit-scrollbar {
        height: 8px;
        width: 8px;
      }

      .milo-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(132, 218, 255, 0.45);
        border-radius: 999px;
      }
    `}</style>
  );
}

export default function MiloExchangeMainPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dreamTokens, setDreamTokens] = useState(0);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([]);
  const [properties, setProperties] = useState<ExchangeProperty[]>([]);
  const [propertyHoldings, setPropertyHoldings] = useState<PropertyHolding[]>([]);
  const [propertyMarketReady, setPropertyMarketReady] = useState(false);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);

  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardMessage, setLeaderboardMessage] = useState("");

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsFeatureReady, setFriendsFeatureReady] = useState(true);
  const [friendEmail, setFriendEmail] = useState("");
  const [friendMessage, setFriendMessage] = useState("");

  const [dob, setDob] = useState("");
  const [confirmAge, setConfirmAge] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [gateError, setGateError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const stockPortfolioValue = useMemo(() => {
    return stockHoldings.reduce((total, holding) => {
      const stock = stocks.find((item) => item.symbol === holding.symbol);
      if (!stock) return total;
      return total + Number(holding.quantity || 0) * Number(stock.current_price || 0);
    }, 0);
  }, [stockHoldings, stocks]);

  const propertyPortfolioValue = useMemo(() => {
    return propertyHoldings.reduce((total, holding) => {
      const property = properties.find(
        (item) => item.id === holding.property_id
      );

      return total + Number(property?.current_value || holding.purchase_price || 0);
    }, 0);
  }, [propertyHoldings, properties]);

  const totalNetWorth = dreamTokens + stockPortfolioValue + propertyPortfolioValue;

  const acceptedFriends = friends.filter((friend) => friend.status === "accepted");
  const incomingRequests = friends.filter(
    (friend) => friend.status === "pending" && friend.direction === "incoming"
  );
  const outgoingRequests = friends.filter(
    (friend) => friend.status === "pending" && friend.direction === "outgoing"
  );

  const isLockedUnder16 = useMemo(() => {
    if (!profile?.milo_exchange_locked_until) return false;
    if (profile.milo_exchange_unlocked) return false;
    return profile.milo_exchange_locked_until > getTodayDateOnly();
  }, [profile]);

  const canEnterExchange =
    Boolean(profile?.milo_exchange_unlocked) &&
    Boolean(profile?.milo_exchange_terms_accepted_at) &&
    (profile?.milo_exchange_age_band === "16_17" ||
      profile?.milo_exchange_age_band === "18_plus");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setPageMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUserId(null);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    await Promise.all([
      loadProfile(user.id),
      loadDreamTokens(user.id),
      loadStockPortfolio(user.id),
      loadPropertyPortfolio(user.id),
      loadTransactions(user.id),
      loadLeaderboard(),
      loadFriends(user.id),
    ]);

    setLoading(false);
  }

  async function refreshPage() {
    if (!userId) return;
    setRefreshing(true);

    await Promise.all([
      loadProfile(userId),
      loadDreamTokens(userId),
      loadStockPortfolio(userId),
      loadPropertyPortfolio(userId),
      loadTransactions(userId),
      loadLeaderboard(),
      loadFriends(userId),
    ]);

    setRefreshing(false);
  }

  async function loadProfile(id: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        role,
        tier,
        milo_exchange_age_band,
        milo_exchange_unlocked,
        milo_exchange_locked_until,
        milo_exchange_age_verified_at,
        milo_exchange_age_verification_method,
        milo_exchange_terms_accepted_at
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.warn("Could not load profile:", error.message);
      setPageMessage("Could not load your exchange profile.");
      return;
    }

    setProfile(data as Profile);
  }

  async function loadDreamTokens(id: string) {
    const { data, error } = await supabase
      .from("dream_token_transactions")
      .select("amount")
      .eq("user_id", id)
      .eq("token_kind", "virtual");

    if (error) {
      console.warn("Could not load Dreamscape Tokens:", error.message);
      setDreamTokens(0);
      return;
    }

    const total =
      data?.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;
    setDreamTokens(total);
  }

  async function loadStockPortfolio(id: string) {
    const [stocksResult, holdingsResult] = await Promise.all([
      supabase
        .from("milo_exchange_stocks")
        .select("symbol,name,current_price,previous_price,is_active")
        .eq("is_active", true),
      supabase
        .from("milo_exchange_holdings")
        .select("id,user_id,symbol,quantity,average_price")
        .eq("user_id", id),
    ]);

    if (stocksResult.error) {
      console.warn("Could not load stocks:", stocksResult.error.message);
      setStocks([]);
    } else {
      setStocks((stocksResult.data || []) as Stock[]);
    }

    if (holdingsResult.error) {
      console.warn("Could not load stock holdings:", holdingsResult.error.message);
      setStockHoldings([]);
    } else {
      setStockHoldings((holdingsResult.data || []) as StockHolding[]);
    }
  }

  async function loadPropertyPortfolio(id: string) {
    const propertiesResult = await supabase
      .from("milo_exchange_properties")
      .select("id,name,district,current_value,is_active")
      .eq("is_active", true);

    if (propertiesResult.error) {
      setProperties([]);
      setPropertyHoldings([]);
      setPropertyMarketReady(false);
      return;
    }

    const holdingsResult = await supabase
      .from("milo_exchange_property_holdings")
      .select("id,user_id,property_id,purchase_price,created_at")
      .eq("user_id", id);

    if (holdingsResult.error) {
      setProperties((propertiesResult.data || []) as ExchangeProperty[]);
      setPropertyHoldings([]);
      setPropertyMarketReady(false);
      return;
    }

    setProperties((propertiesResult.data || []) as ExchangeProperty[]);
    setPropertyHoldings((holdingsResult.data || []) as PropertyHolding[]);
    setPropertyMarketReady(true);
  }

  async function loadTransactions(id: string) {
    const { data, error } = await supabase
      .from("dream_token_transactions")
      .select("id,amount,type,title,created_at")
      .eq("user_id", id)
      .eq("token_kind", "virtual")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      console.warn("Could not load transaction history:", error.message);
      setTransactions([]);
      return;
    }

    setTransactions((data || []) as TokenTransaction[]);
  }

  async function loadLeaderboard() {
    setLeaderboardLoading(true);
    setLeaderboardMessage("");

    const overallResult = await supabase.rpc(
      "get_milo_exchange_overall_leaderboard",
      { p_limit: 20 }
    );

    if (!overallResult.error) {
      const rows = (overallResult.data || []).map((row: Record<string, unknown>) => ({
        rank_position: Number(row.rank_position || 0),
        username: String(row.username || "Dreamscape User"),
        cash_value: Number(row.cash_value || 0),
        stock_value: Number(row.stock_value || 0),
        property_value: Number(row.property_value || 0),
        total_value: Number(row.total_value || 0),
        total_shares: Number(row.total_shares || 0),
        is_current_user: Boolean(row.is_current_user),
      }));

      setLeaderboardRows(rows);
      setLeaderboardLoading(false);
      return;
    }

    const fallbackResult = await supabase.rpc(
      "get_milo_exchange_leaderboard",
      { p_limit: 20 }
    );

    if (fallbackResult.error) {
      console.warn(
        "Could not load exchange leaderboard:",
        fallbackResult.error.message
      );
      setLeaderboardRows([]);
      setLeaderboardMessage(
        "The leaderboard could not be loaded. The existing stock leaderboard RPC or the new overall leaderboard RPC is required."
      );
      setLeaderboardLoading(false);
      return;
    }

    const fallbackRows = (fallbackResult.data || []).map(
      (row: Record<string, unknown>) => ({
        rank_position: Number(row.rank_position || 0),
        username: String(row.username || "Dreamscape User"),
        cash_value: 0,
        stock_value: Number(row.portfolio_value || 0),
        property_value: 0,
        total_value: Number(row.portfolio_value || 0),
        total_shares: Number(row.total_shares || 0),
        is_current_user: Boolean(row.is_current_user),
      })
    );

    setLeaderboardRows(fallbackRows);
    setLeaderboardMessage(
      "Showing the current stock portfolio leaderboard. Property and cash values can be added to the overall leaderboard RPC later."
    );
    setLeaderboardLoading(false);
  }

  async function loadFriends(id: string) {
    setFriendsLoading(true);

    const { data, error } = await supabase
      .from("milo_exchange_friends")
      .select("id,user_id,friend_user_id,status,created_at")
      .or(`user_id.eq.${id},friend_user_id.eq.${id}`)
      .order("created_at", { ascending: false });

    if (error) {
      setFriends([]);
      setFriendsFeatureReady(false);
      setFriendsLoading(false);
      return;
    }

    const relations = (data || []) as FriendRelation[];
    const profileIds = Array.from(
      new Set(
        relations.map((relation) =>
          relation.user_id === id ? relation.friend_user_id : relation.user_id
        )
      )
    );

    if (profileIds.length === 0) {
      setFriends([]);
      setFriendsFeatureReady(true);
      setFriendsLoading(false);
      return;
    }

    const profilesResult = await supabase
      .from("profiles")
      .select("id,email")
      .in("id", profileIds);

    if (profilesResult.error) {
      console.warn("Could not load friend profiles:", profilesResult.error.message);
      setFriends([]);
      setFriendsFeatureReady(true);
      setFriendsLoading(false);
      return;
    }

    const friendProfiles = (profilesResult.data || []) as FriendProfile[];

    const items: FriendItem[] = relations.map((relation) => {
      const otherProfileId =
        relation.user_id === id ? relation.friend_user_id : relation.user_id;
      const otherProfile = friendProfiles.find(
        (friendProfile) => friendProfile.id === otherProfileId
      );

      return {
        relationId: relation.id,
        profileId: otherProfileId,
        email: otherProfile?.email || "Dreamscape User",
        status: relation.status,
        direction: relation.user_id === id ? "outgoing" : "incoming",
        createdAt: relation.created_at,
      };
    });

    setFriends(items);
    setFriendsFeatureReady(true);
    setFriendsLoading(false);
  }

  async function sendFriendRequest() {
    if (!userId) return;

    setFriendMessage("");
    const cleanEmail = friendEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setFriendMessage("Enter the email address linked to your friend’s Dreamscape account.");
      return;
    }

    if (!friendsFeatureReady) {
      setFriendMessage(
        "The friends table has not been added to Supabase yet. The page is ready for it once the database setup is added."
      );
      return;
    }

    const { data: friendProfile, error: friendError } = await supabase
      .from("profiles")
      .select("id,email")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (friendError || !friendProfile) {
      setFriendMessage("No Dreamscape account was found with that email address.");
      return;
    }

    if (friendProfile.id === userId) {
      setFriendMessage("You cannot add your own account as a friend.");
      return;
    }

    const alreadyConnected = friends.some(
      (friend) => friend.profileId === friendProfile.id
    );

    if (alreadyConnected) {
      setFriendMessage("A friendship or friend request already exists for this account.");
      return;
    }

    setFriendsLoading(true);

    const { error: insertError } = await supabase
      .from("milo_exchange_friends")
      .insert({
        user_id: userId,
        friend_user_id: friendProfile.id,
        status: "pending",
      });

    if (insertError) {
      setFriendMessage(`Could not send friend request: ${insertError.message}`);
      setFriendsLoading(false);
      return;
    }

    setFriendEmail("");
    setFriendMessage("Friend request sent.");
    await loadFriends(userId);
  }

  async function acceptFriendRequest(relationId: string) {
    if (!userId) return;
    setFriendsLoading(true);
    setFriendMessage("");

    const { error } = await supabase
      .from("milo_exchange_friends")
      .update({ status: "accepted" })
      .eq("id", relationId)
      .eq("friend_user_id", userId);

    if (error) {
      setFriendMessage(`Could not accept friend request: ${error.message}`);
      setFriendsLoading(false);
      return;
    }

    setFriendMessage("Friend request accepted.");
    await loadFriends(userId);
  }

  async function removeFriendRelation(relationId: string) {
    if (!userId) return;
    setFriendsLoading(true);
    setFriendMessage("");

    const { error } = await supabase
      .from("milo_exchange_friends")
      .delete()
      .eq("id", relationId);

    if (error) {
      setFriendMessage(`Could not update friend list: ${error.message}`);
      setFriendsLoading(false);
      return;
    }

    setFriendMessage("Friend list updated.");
    await loadFriends(userId);
  }

  async function handleAgeVerification() {
    if (!userId) return;

    setGateError("");

    if (!dob) {
      setGateError("Please enter your date of birth.");
      return;
    }

    if (!confirmAge) {
      setGateError("Please confirm that your date of birth is accurate.");
      return;
    }

    if (!confirmTerms) {
      setGateError(
        "Please confirm that you understand this is a fictional market simulator."
      );
      return;
    }

    const age = calculateAge(dob);

    if (Number.isNaN(age) || age < 0 || age > 120) {
      setGateError("Please enter a valid date of birth.");
      return;
    }

    const ageBand = getAgeBand(age);
    const now = new Date().toISOString();
    setActionLoading(true);

    if (age < 16) {
      const lockedUntil = getSixteenthBirthday(dob);

      const { error } = await supabase
        .from("profiles")
        .update({
          milo_exchange_age_band: ageBand,
          milo_exchange_unlocked: false,
          milo_exchange_locked_until: lockedUntil,
          milo_exchange_age_verified_at: now,
          milo_exchange_age_verification_method: "self_declared_dob",
          milo_exchange_terms_accepted_at: null,
        })
        .eq("id", userId);

      setActionLoading(false);

      if (error) {
        setGateError("Could not save your age check. Check the profiles update policy.");
        return;
      }

      await loadProfile(userId);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        milo_exchange_age_band: ageBand,
        milo_exchange_unlocked: true,
        milo_exchange_locked_until: null,
        milo_exchange_age_verified_at: now,
        milo_exchange_age_verification_method: "self_declared_dob",
        milo_exchange_terms_accepted_at: now,
      })
      .eq("id", userId);

    setActionLoading(false);

    if (error) {
      setGateError("Could not unlock Milo’s Exchange. Check the profiles update policy.");
      return;
    }

    await loadProfile(userId);
  }

  const pageShell: CSSProperties = {
    position: "relative",
    minHeight: "100vh",
    background: "#020817",
    color: "white",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflowX: "hidden",
  };

  const contentWrap: CSSProperties = {
    position: "relative",
    zIndex: 5,
    width: "min(1680px, calc(100% - 36px))",
    margin: "0 auto",
    padding: isMobile ? "18px 0 72px" : "28px 0 90px",
  };

  const glassPanel: CSSProperties = {
    borderRadius: isMobile ? "22px" : "28px",
    border: "1px solid rgba(132,218,255,0.2)",
    background: "rgba(5,13,28,0.72)",
    boxShadow:
      "0 30px 90px rgba(0,0,0,0.44), inset 0 0 42px rgba(83,215,255,0.04)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };

  const navButtonStyle: CSSProperties = {
    minHeight: isMobile ? "38px" : "42px",
    padding: isMobile ? "0 14px" : "0 20px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    color: "rgba(255,255,255,0.9)",
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: isMobile ? "0.07em" : "0.12em",
    fontSize: isMobile ? "10px" : "12px",
    fontWeight: 900,
    border: "1px solid rgba(132,218,255,0.22)",
    background: "rgba(5,13,28,0.7)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.26)",
    fontFamily: "inherit",
  };

  const primaryButton: CSSProperties = {
    minHeight: "48px",
    padding: "0 24px",
    borderRadius: "999px",
    border: "1px solid rgba(132,218,255,0.32)",
    background: "rgba(83,215,255,0.16)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
  };

  const secondaryButton: CSSProperties = {
    ...primaryButton,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
  };

  const inputStyle: CSSProperties = {
    height: "48px",
    borderRadius: "14px",
    border: "1px solid rgba(132,218,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    padding: "0 16px",
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
  };

  function Background() {
    return (
      <>
        <video
          src="/milo-world/milo-world-bg-loop.mp4"
          poster="/milo-world/milo-world-bg.png"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            zIndex: 0,
            transform: "scale(1.01)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(to bottom, rgba(2,8,23,0.25), rgba(2,8,23,0.56) 44%, rgba(2,8,23,0.92)), linear-gradient(to right, rgba(2,8,23,0.5), transparent 48%, rgba(2,8,23,0.38))",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            boxShadow: "inset 0 0 190px rgba(0,0,0,0.8)",
          }}
        />
      </>
    );
  }

  function CenterPanel({
    eyebrow,
    title,
    children,
  }: {
    eyebrow: string;
    title: string;
    children: ReactNode;
  }) {
    return (
      <main style={pageShell}>
        <ScrollStyles />
        <Background />

        <div
          style={{
            position: "relative",
            zIndex: 5,
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: isMobile ? "18px" : "32px",
          }}
        >
          <section
            style={{
              ...glassPanel,
              width: "min(760px, 100%)",
              padding: isMobile ? "24px" : "38px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "13px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              {eyebrow}
            </p>

            <h1
              style={{
                margin: "14px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "40px" : "58px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {title}
            </h1>

            <div
              style={{
                marginTop: "22px",
                color: "rgba(255,255,255,0.78)",
                fontSize: "16px",
                lineHeight: 1.65,
              }}
            >
              {children}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <CenterPanel eyebrow="Milo’s Exchange" title="Loading your portfolio...">
        <p>Preparing your cash, investments, leaderboard and friends.</p>
      </CenterPanel>
    );
  }

  if (!userId) {
    return (
      <CenterPanel eyebrow="Milo’s Exchange" title="Log in to enter">
        <p>
          Log in to view your Dreamscape Tokens, investment portfolio,
          transaction history, leaderboard and friends.
        </p>

        <div style={{ marginTop: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link href="/login" style={primaryButton}>
            Log In
          </Link>
          <Link href="/milo-world" style={secondaryButton}>
            Back to Milo’s World
          </Link>
        </div>
      </CenterPanel>
    );
  }

  if (isLockedUnder16) {
    return (
      <CenterPanel eyebrow="Locked Feature" title="Milo’s Exchange is for users aged 16 and above.">
        <p>
          The exchange is locked for this account. You can continue earning
          Dreamscape Tokens through Milo’s Activity Lab.
        </p>

        {profile?.milo_exchange_locked_until && (
          <p style={{ color: "rgba(255,255,255,0.58)", fontSize: "14px" }}>
            This feature can be reviewed again from {profile.milo_exchange_locked_until}.
          </p>
        )}

        <div style={{ marginTop: "24px" }}>
          <Link href="/milo-world" style={primaryButton}>
            Back to Milo’s World
          </Link>
        </div>
      </CenterPanel>
    );
  }

  if (!canEnterExchange) {
    return (
      <CenterPanel eyebrow="Age Check Required" title="Milo’s Exchange is for users aged 16 and above.">
        <p>
          Verify your age before entering. This is a fictional market using
          earned Dreamscape Tokens only.
        </p>

        <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em" }}>
              Date of birth
            </span>
            <input
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: "12px" }}>
            <input
              type="checkbox"
              checked={confirmAge}
              onChange={(event) => setConfirmAge(event.target.checked)}
            />
            <span>I confirm that my date of birth is accurate.</span>
          </label>

          <label style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: "12px" }}>
            <input
              type="checkbox"
              checked={confirmTerms}
              onChange={(event) => setConfirmTerms(event.target.checked)}
            />
            <span>
              I understand this is a fictional market simulator. Dreamscape
              Tokens have no cash value and cannot be cashed out.
            </span>
          </label>

          {gateError && <p style={{ color: "#ffb0b0", fontWeight: 800 }}>{gateError}</p>}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleAgeVerification}
              disabled={actionLoading}
              style={{
                ...primaryButton,
                opacity: actionLoading ? 0.6 : 1,
                cursor: actionLoading ? "not-allowed" : "pointer",
              }}
            >
              {actionLoading ? "Checking..." : "Continue"}
            </button>

            <Link href="/milo-world" style={secondaryButton}>
              Back to Milo’s World
            </Link>
          </div>
        </div>
      </CenterPanel>
    );
  }

  return (
    <main className="milo-scrollbar" style={pageShell}>
      <ScrollStyles />
      <Background />

      <div style={contentWrap}>
        <header
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          <Link href="/milo-world" style={navButtonStyle}>
            ← Milo’s World
          </Link>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
            <Link href="/milo-world/exchange/stocks" style={navButtonStyle}>
              Stock Exchange
            </Link>
            <Link
              href="/milo-world/exchange/property"
              style={{
                ...navButtonStyle,
                color: "#ffd18a",
                border: "1px solid rgba(255,209,138,0.26)",
                background: "rgba(255,209,138,0.1)",
              }}
            >
              Property Exchange
            </Link>
            <Link href="/profile" style={navButtonStyle}>
              My Account
            </Link>
          </div>
        </header>

        <section
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "flex-end",
            gap: "18px",
            marginBottom: "20px",
          }}
        >
          <div>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
              Economy Hub
            </p>
            <h1
              style={{
                margin: "12px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "48px" : isCompact ? "64px" : "76px",
                fontWeight: 500,
                lineHeight: 0.95,
                textShadow: "0 18px 60px rgba(0,0,0,0.45)",
              }}
            >
              Milo’s Exchange
            </h1>
            <p style={{ margin: "18px 0 0", maxWidth: "760px", color: "rgba(255,255,255,0.66)", lineHeight: 1.6, fontSize: isMobile ? "15px" : "17px" }}>
              Your complete Dreamscape economy dashboard.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshPage}
            disabled={refreshing}
            style={{
              ...navButtonStyle,
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh Portfolio"}
          </button>
        </section>

        {pageMessage && (
          <p style={{ color: "#ffd18a", fontWeight: 800, marginBottom: "16px" }}>
            {pageMessage}
          </p>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
            gap: isMobile ? "10px" : "14px",
          }}
        >
          {[
            ["Cash Holdings", `${formatNumber(dreamTokens)} DT`, "Available Dreamscape Tokens"],
            ["Stock Portfolio", `${formatNumber(stockPortfolioValue)} DT`, `${stockHoldings.length} stock holding${stockHoldings.length === 1 ? "" : "s"}`],
            ["Property Portfolio", `${formatNumber(propertyPortfolioValue)} DT`, propertyMarketReady ? `${propertyHoldings.length} propert${propertyHoldings.length === 1 ? "y" : "ies"}` : "Property market preparing"],
            ["Total Net Worth", `${formatNumber(totalNetWorth)} DT`, "Cash + stocks + property"],
          ].map(([label, value, detail]) => (
            <article key={label} style={{ ...glassPanel, borderRadius: "21px", padding: isMobile ? "16px" : "20px" }}>
              <span style={{ display: "block", color: "rgba(255,255,255,0.48)", fontSize: isMobile ? "10px" : "12px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {label}
              </span>
              <strong style={{ display: "block", marginTop: "9px", fontSize: isMobile ? "21px" : "29px", letterSpacing: "-0.04em", color: label === "Total Net Worth" ? "#ffd18a" : "white" }}>
                {value}
              </strong>
              <span style={{ display: "block", marginTop: "8px", color: "rgba(255,255,255,0.42)", fontSize: "12px", lineHeight: 1.4 }}>
                {detail}
              </span>
            </article>
          ))}
        </section>

        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "18px",
          }}
        >
          <Link
            href="/milo-world/exchange/stocks"
            style={{
              ...glassPanel,
              minHeight: isMobile ? "190px" : "230px",
              padding: isMobile ? "24px" : "30px",
              textDecoration: "none",
              color: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background:
                "linear-gradient(145deg, rgba(8,45,73,0.82), rgba(5,13,28,0.82))",
            }}
          >
            <div>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                Live Market
              </p>
              <h2 style={{ margin: "12px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "44px", fontWeight: 500 }}>
                Stock Exchange
              </h2>
              <p style={{ margin: "14px 0 0", color: "rgba(255,255,255,0.62)", lineHeight: 1.55, maxWidth: "560px" }}>
                Study prices and news, then buy or sell fictional Dreamscape stocks.
              </p>
            </div>
            <strong style={{ color: "#8ee8ff", fontSize: "14px" }}>
              Enter Stock Exchange →
            </strong>
          </Link>

          <Link
            href="/milo-world/exchange/property"
            style={{
              ...glassPanel,
              minHeight: isMobile ? "190px" : "230px",
              padding: isMobile ? "24px" : "30px",
              textDecoration: "none",
              color: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background:
                "linear-gradient(145deg, rgba(85,49,18,0.82), rgba(5,13,28,0.84))",
              border: "1px solid rgba(255,209,138,0.24)",
            }}
          >
            <div>
              <p style={{ margin: 0, color: "#ffd18a", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                Eight Districts
              </p>
              <h2 style={{ margin: "12px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "34px" : "44px", fontWeight: 500 }}>
                Property Exchange
              </h2>
              <p style={{ margin: "14px 0 0", color: "rgba(255,255,255,0.62)", lineHeight: 1.55, maxWidth: "560px" }}>
                Explore Dreamscape districts and purchase virtual homes, shops and land.
              </p>
            </div>
            <strong style={{ color: "#ffd18a", fontSize: "14px" }}>
              Explore Property Market →
            </strong>
          </Link>
        </section>

        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: isDesktop
              ? "minmax(0, 1.2fr) minmax(330px, 0.78fr) minmax(310px, 0.72fr)"
              : "1fr",
            gap: "18px",
            alignItems: "start",
          }}
        >
          <section style={{ ...glassPanel, padding: isMobile ? "20px" : "26px", minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-end", marginBottom: "18px" }}>
              <div>
                <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", fontWeight: 900, letterSpacing: "0.19em", textTransform: "uppercase" }}>
                  Account Activity
                </p>
                <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "38px", fontWeight: 500 }}>
                  Transaction History
                </h2>
              </div>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                Latest 40
              </span>
            </div>

            {transactions.length === 0 ? (
              <div style={{ minHeight: "220px", display: "grid", placeItems: "center", borderRadius: "18px", border: "1px dashed rgba(132,218,255,0.18)", color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "20px" }}>
                No Dreamscape Token transactions yet.
              </div>
            ) : (
              <div className="milo-scrollbar" style={{ display: "grid", gap: "9px", maxHeight: isDesktop ? "650px" : "none", overflowY: isDesktop ? "auto" : "visible", paddingRight: isDesktop ? "5px" : 0 }}>
                {transactions.map((transaction) => {
                  const isPositive = Number(transaction.amount) >= 0;
                  const category = getTransactionCategory(transaction.title);

                  return (
                    <article key={transaction.id} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr auto" : "94px minmax(0, 1fr) auto", gap: "12px", alignItems: "center", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.055)", padding: "14px" }}>
                      {!isMobile && (
                        <span style={{ color: category === "Property" ? "#ffd18a" : "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {category}
                        </span>
                      )}

                      <div style={{ minWidth: 0 }}>
                        {isMobile && (
                          <span style={{ display: "block", marginBottom: "5px", color: category === "Property" ? "#ffd18a" : "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                            {category}
                          </span>
                        )}
                        <strong style={{ display: "block", color: "white", fontSize: "13px", lineHeight: 1.4, wordBreak: "break-word" }}>
                          {transaction.title || "Dreamscape Token transaction"}
                        </strong>
                        <span style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.42)", fontSize: "11px" }}>
                          {formatDateTime(transaction.created_at)}
                        </span>
                      </div>

                      <strong style={{ color: isPositive ? "#8ee8ff" : "#ffb0b0", fontSize: "14px", whiteSpace: "nowrap" }}>
                        {isPositive ? "+" : "−"}{formatNumber(Math.abs(transaction.amount))} DT
                      </strong>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ ...glassPanel, padding: isMobile ? "20px" : "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div>
                <p style={{ margin: 0, color: "#ffd18a", fontSize: "12px", fontWeight: 900, letterSpacing: "0.19em", textTransform: "uppercase" }}>
                  Rankings
                </p>
                <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "36px", fontWeight: 500 }}>
                  Leaderboard
                </h2>
              </div>
              <button
                type="button"
                onClick={loadLeaderboard}
                disabled={leaderboardLoading}
                style={{ ...navButtonStyle, minHeight: "36px", padding: "0 13px", cursor: leaderboardLoading ? "not-allowed" : "pointer", opacity: leaderboardLoading ? 0.6 : 1 }}
              >
                ↻
              </button>
            </div>

            {leaderboardMessage && (
              <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,0.46)", fontSize: "11px", lineHeight: 1.45 }}>
                {leaderboardMessage}
              </p>
            )}

            {leaderboardLoading ? (
              <div style={{ minHeight: "220px", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.55)" }}>
                Loading leaderboard...
              </div>
            ) : leaderboardRows.length === 0 ? (
              <div style={{ minHeight: "220px", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
                No ranked portfolios yet.
              </div>
            ) : (
              <div className="milo-scrollbar" style={{ marginTop: "18px", display: "grid", gap: "9px", maxHeight: isDesktop ? "590px" : "none", overflowY: isDesktop ? "auto" : "visible", paddingRight: isDesktop ? "4px" : 0 }}>
                {leaderboardRows.map((row) => (
                  <article key={`${row.rank_position}-${row.username}`} style={{ borderRadius: "16px", border: row.is_current_user ? "1px solid rgba(132,218,255,0.45)" : "1px solid rgba(255,255,255,0.09)", background: row.is_current_user ? "rgba(83,215,255,0.13)" : "rgba(255,255,255,0.05)", padding: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ color: row.rank_position <= 3 ? "#ffd18a" : "#8ee8ff", fontWeight: 950, fontSize: "15px" }}>
                          #{row.rank_position}
                        </span>
                        <strong style={{ marginLeft: "9px", color: "white", fontSize: "13px", wordBreak: "break-word" }}>
                          {row.username}{row.is_current_user ? " · You" : ""}
                        </strong>
                      </div>
                      <strong style={{ color: "#ffd18a", whiteSpace: "nowrap" }}>
                        {formatNumber(row.total_value)} DT
                      </strong>
                    </div>

                    <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px 12px", color: "rgba(255,255,255,0.4)", fontSize: "10px" }}>
                      {row.cash_value > 0 && <span>Cash {formatNumber(row.cash_value)}</span>}
                      <span>Stocks {formatNumber(row.stock_value)}</span>
                      {row.property_value > 0 && <span>Property {formatNumber(row.property_value)}</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section style={{ ...glassPanel, padding: isMobile ? "20px" : "24px" }}>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", fontWeight: 900, letterSpacing: "0.19em", textTransform: "uppercase" }}>
              Social Portfolio
            </p>
            <h2 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "31px" : "36px", fontWeight: 500 }}>
              Friends
            </h2>

            <div style={{ marginTop: "18px", display: "grid", gap: "10px" }}>
              <input
                type="email"
                value={friendEmail}
                onChange={(event) => setFriendEmail(event.target.value)}
                placeholder="Friend’s Dreamscape email"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={sendFriendRequest}
                disabled={friendsLoading}
                style={{
                  ...primaryButton,
                  width: "100%",
                  minHeight: "44px",
                  opacity: friendsLoading ? 0.6 : 1,
                  cursor: friendsLoading ? "not-allowed" : "pointer",
                }}
              >
                Send Friend Request
              </button>
            </div>

            {!friendsFeatureReady && (
              <div style={{ marginTop: "14px", borderRadius: "15px", border: "1px solid rgba(255,209,138,0.18)", background: "rgba(255,209,138,0.07)", padding: "13px", color: "rgba(255,255,255,0.58)", fontSize: "12px", lineHeight: 1.5 }}>
                The friends interface is ready, but the `milo_exchange_friends`
                table still needs to be added to Supabase.
              </div>
            )}

            {friendMessage && (
              <p style={{ margin: "13px 0 0", color: "#ffd18a", fontSize: "12px", fontWeight: 800, lineHeight: 1.5 }}>
                {friendMessage}
              </p>
            )}

            {incomingRequests.length > 0 && (
              <div style={{ marginTop: "18px" }}>
                <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Friend Requests
                </p>
                <div style={{ marginTop: "9px", display: "grid", gap: "8px" }}>
                  {incomingRequests.map((friend) => (
                    <article key={friend.relationId} style={{ borderRadius: "15px", border: "1px solid rgba(255,209,138,0.16)", background: "rgba(255,209,138,0.06)", padding: "12px" }}>
                      <strong style={{ display: "block", fontSize: "12px", wordBreak: "break-word" }}>
                        {friend.email}
                      </strong>
                      <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <button type="button" onClick={() => acceptFriendRequest(friend.relationId)} style={{ minHeight: "36px", borderRadius: "11px", border: "1px solid rgba(132,218,255,0.28)", background: "rgba(83,215,255,0.14)", color: "white", fontWeight: 900, cursor: "pointer" }}>
                          Accept
                        </button>
                        <button type="button" onClick={() => removeFriendRelation(friend.relationId)} style={{ minHeight: "36px", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.06)", color: "white", fontWeight: 900, cursor: "pointer" }}>
                          Decline
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: "18px" }}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.46)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                My Friends · {acceptedFriends.length}
              </p>

              {friendsLoading ? (
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
                  Loading friends...
                </p>
              ) : acceptedFriends.length === 0 ? (
                <div style={{ marginTop: "10px", minHeight: "100px", display: "grid", placeItems: "center", borderRadius: "15px", border: "1px dashed rgba(132,218,255,0.16)", color: "rgba(255,255,255,0.42)", textAlign: "center", padding: "14px", fontSize: "12px", lineHeight: 1.5 }}>
                  Add friends to compare portfolios and visit their future Dreamscape properties.
                </div>
              ) : (
                <div className="milo-scrollbar" style={{ marginTop: "10px", display: "grid", gap: "8px", maxHeight: isDesktop ? "270px" : "none", overflowY: isDesktop ? "auto" : "visible", paddingRight: isDesktop ? "4px" : 0 }}>
                  {acceptedFriends.map((friend) => (
                    <article key={friend.relationId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", borderRadius: "15px", border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.05)", padding: "12px" }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: "12px", wordBreak: "break-word" }}>
                          {friend.email}
                        </strong>
                        <span style={{ display: "block", marginTop: "4px", color: "#8ee8ff", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Friend
                        </span>
                      </div>
                      <button type="button" onClick={() => removeFriendRelation(friend.relationId)} style={{ minWidth: "32px", height: "32px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.68)", cursor: "pointer" }} aria-label="Remove friend">
                        ×
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {outgoingRequests.length > 0 && (
              <div style={{ marginTop: "18px" }}>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Pending · {outgoingRequests.length}
                </p>
                <div style={{ marginTop: "9px", display: "grid", gap: "8px" }}>
                  {outgoingRequests.map((friend) => (
                    <article key={friend.relationId} style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", borderRadius: "15px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "11px" }}>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.58)", wordBreak: "break-word" }}>
                        {friend.email}
                      </span>
                      <button type="button" onClick={() => removeFriendRelation(friend.relationId)} style={{ border: "none", background: "transparent", color: "#ffb0b0", cursor: "pointer", fontWeight: 900 }}>
                        Cancel
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </section>

        <section
          style={{
            marginTop: "28px",
            display: "flex",
            flexDirection: isMobile ? "column-reverse" : "row",
            justifyContent: "flex-end",
            alignItems: isMobile ? "stretch" : "flex-end",
            gap: isMobile ? "4px" : "12px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: isMobile ? "100%" : "min(500px, 44vw)",
              marginBottom: isMobile ? 0 : "76px",
              borderRadius: "24px 24px 6px 24px",
              border: "1px solid rgba(132,218,255,0.28)",
              background: "rgba(5,13,28,0.86)",
              boxShadow: "0 24px 70px rgba(0,0,0,0.42)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              padding: isMobile ? "18px" : "21px 23px",
            }}
          >
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "12px", letterSpacing: "0.17em", textTransform: "uppercase", fontWeight: 900 }}>
              Milo says
            </p>
            <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.78)", fontSize: isMobile ? "14px" : "15px", lineHeight: 1.6 }}>
              This is your economy home. Check your cash and investments, review every token transaction, compare your portfolio on the leaderboard and connect with friends before entering the stock or property markets.
            </p>
          </div>

          <img
            src="/milo-world/milo-character.png"
            alt="Milo"
            style={{
              width: "auto",
              height: isMobile ? "150px" : "210px",
              objectFit: "contain",
              alignSelf: isMobile ? "flex-end" : "auto",
              marginRight: isMobile ? "8px" : 0,
              filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.58))",
              pointerEvents: "none",
            }}
          />
        </section>
      </div>
    </main>
  );
}
