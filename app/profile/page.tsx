"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLearningEntitlements, learningPlanLabel } from "@/lib/learning-access";
import { supabase } from "@/lib/supabase";

type DreamTokenTransaction = {
  id: string;
  user_id: string;
  type: "earn" | "spend";
  title: string;
  amount: number;
  token_kind: "virtual";
  created_at: string;
};

type DreamGemTransaction = {
  id: string;
  user_id: string;
  type: "earn" | "spend" | "adjustment" | "reversal";
  source:
    | "class_attendance"
    | "core_mission"
    | "think_mission"
    | "science_mission"
    | "redemption"
    | "admin_adjustment"
    | "system"
    | "reversal";
  title: string;
  description: string | null;
  amount: number;
  balance_after: number;
  created_at: string;
};

type NovaSubscription = {
  status: string | null;
  access_until: string | null;
  plan_code: string | null;
};

type LearningProfileStatus = {
  complete?: boolean;
  missing_fields?: string[];
  date_of_birth?: string | null;
  age_years?: number | null;
  age_band?: string | null;
};

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function ageBandFromAge(age: number | null) {
  if (age === null || age < 4 || age > 120) return null;
  if (age <= 5) return "4_5";
  if (age <= 7) return "6_7";
  if (age <= 9) return "8_9";
  if (age <= 12) return "10_12";
  if (age <= 15) return "13_15";
  if (age <= 17) return "16_17";
  return "18_plus";
}

function formatAgeBand(value: string | null) {
  const labels: Record<string, string> = {
    "4_5": "Ages 4–5",
    "6_7": "Ages 6–7",
    "8_9": "Ages 8–9",
    "10_12": "Ages 10–12",
    "13_15": "Ages 13–15",
    "16_17": "Ages 16–17",
    "18_plus": "Age 18+",
  };

  return value ? labels[value] || value : "Not recorded";
}

type ExchangeStock = {
  symbol: string;
  current_price: number;
};

type ExchangeStockHolding = {
  symbol: string;
  quantity: number;
};

type ExchangeProperty = {
  id: string;
  current_value: number;
};

type ExchangePropertyHolding = {
  property_id: string;
  quantity: number;
};

function formatTokenTransactionAmount(
  transaction: DreamTokenTransaction,
) {
  const prefix = transaction.amount > 0 ? "+" : "";
  return `${prefix}${transaction.amount} DT`;
}

function formatGemTransactionAmount(
  transaction: DreamGemTransaction,
) {
  const prefix = transaction.amount > 0 ? "+" : "";
  return `${prefix}${transaction.amount} DG`;
}

function formatTransactionDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatGemSource(source: DreamGemTransaction["source"]) {
  const labels: Record<DreamGemTransaction["source"], string> = {
    class_attendance: "Class Attendance",
    core_mission: "Core Mission",
    think_mission: "Think Mission",
    science_mission: "Science Mission",
    redemption: "Reward Redemption",
    admin_adjustment: "Admin Adjustment",
    system: "Dreamscape System",
    reversal: "Transaction Reversal",
  };

  return labels[source] || "Dream Gem Activity";
}

function CartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}

function GemIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M18 12h28l10 14-24 28L8 26 18 12Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m18 12 14 42 14-42M8 26h48M18 12 8 26l24-14 24 14-10-14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function normaliseRole(
  value: string | null | undefined,
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function hasTeachingDashboardRole(
  value: string | null | undefined,
) {
  const cleanRole = normaliseRole(value);

  return (
    cleanRole === "teacher" ||
    cleanRole === "curriculum-lead"
  );
}

function hasCurriculumDeveloperRole(
  value: string | null | undefined,
) {
  const cleanRole = normaliseRole(value);

  return (
    cleanRole === "admin" ||
    cleanRole === "curriculum-lead"
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<
    string | null
  >(null);

  const [copiedReferralCode, setCopiedReferralCode] =
    useState(false);

  const [copiedReferralLink, setCopiedReferralLink] =
    useState(false);

  const [isShareDevice, setIsShareDevice] =
    useState(false);

  const [referralMessage, setReferralMessage] =
    useState("");

  const [supportMessage, setSupportMessage] =
    useState("");

  const [username, setUsername] = useState<
    string | null
  >(null);

  const [usernameDraft, setUsernameDraft] =
    useState("");

  const [usernameMessage, setUsernameMessage] =
    useState("");

  const [usernameMessageType, setUsernameMessageType] =
    useState<"success" | "error" | "">("");

  const [isSavingUsername, setIsSavingUsername] =
    useState(false);

  const [dateOfBirth, setDateOfBirth] =
    useState("");

  const [ageYears, setAgeYears] =
    useState<number | null>(null);

  const [ageBand, setAgeBand] =
    useState<string | null>(null);

  const [isLoadingLearnerDetails, setIsLoadingLearnerDetails] =
    useState(true);

  const [isSavingLearnerDetails, setIsSavingLearnerDetails] =
    useState(false);

  const [learnerDetailsMessage, setLearnerDetailsMessage] =
    useState("");

  const [
    learnerDetailsMessageType,
    setLearnerDetailsMessageType,
  ] = useState<"success" | "error" | "">("");

  const [isAdmin, setIsAdmin] = useState(false);

  const [
    hasStudentRewardsAccess,
    setHasStudentRewardsAccess,
  ] = useState(false);

  const [activeLearningPlanLabels, setActiveLearningPlanLabels] =
    useState<string[]>([]);

  const [tokenTransactions, setTokenTransactions] =
    useState<DreamTokenTransaction[]>([]);

  const [gemTransactions, setGemTransactions] =
    useState<DreamGemTransaction[]>([]);

  const [dreamGemBalance, setDreamGemBalance] =
    useState(0);

  const [showTokenHistory, setShowTokenHistory] =
    useState(false);

  const [showGemHistory, setShowGemHistory] =
    useState(false);

  const [isLoadingTokens, setIsLoadingTokens] =
    useState(true);

  const [isLoadingGems, setIsLoadingGems] =
    useState(true);

  const [isLoadingPortfolio, setIsLoadingPortfolio] =
    useState(true);

  const [stockPortfolioValue, setStockPortfolioValue] =
    useState(0);

  const [
    propertyPortfolioValue,
    setPropertyPortfolioValue,
  ] = useState(0);

  const dreamTokenBalance = tokenTransactions.reduce(
    (total, transaction) =>
      total + Number(transaction.amount || 0),
    0,
  );

  const totalNetWorth =
    dreamTokenBalance +
    stockPortfolioValue +
    propertyPortfolioValue;

  const normalizedRole =
    normaliseRole(role) || "regular";

  const hasTeachingDashboardAccess =
    hasTeachingDashboardRole(normalizedRole);

  const hasCurriculumDeveloperAccess =
    hasCurriculumDeveloperRole(normalizedRole);

  const accountAccessLabel = isAdmin
    ? "Admin"
    : normalizedRole === "curriculum-lead"
      ? "Curriculum Lead"
      : normalizedRole === "teacher"
        ? "Teacher Access"
        : activeLearningPlanLabels.length === 1
          ? activeLearningPlanLabels[0]
          : activeLearningPlanLabels.length > 1
            ? "Combined Student Access"
            : hasStudentRewardsAccess
              ? "Student Access"
              : "Basic Access";

  useEffect(() => {
    function updateShareMode() {
      const userAgent = navigator.userAgent || "";

      const isIPad =
        /iPad/i.test(userAgent) ||
        (navigator.platform === "MacIntel" &&
          navigator.maxTouchPoints > 1);

      const isMobileOrTablet =
        window.innerWidth <= 1180 ||
        isIPad ||
        /iPhone|Android/i.test(userAgent) ||
        window.matchMedia("(pointer: coarse)").matches;

      setIsShareDevice(isMobileOrTablet);
    }

    updateShareMode();

    window.addEventListener(
      "resize",
      updateShareMode,
    );

    return () =>
      window.removeEventListener(
        "resize",
        updateShareMode,
      );
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoadingTokens(true);
      setIsLoadingGems(true);
      setIsLoadingPortfolio(true);
      setIsLoadingLearnerDetails(true);

      const { data, error: userError } =
        await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (userError) {
        console.error(
          "User error:",
          userError.message,
        );
      }

      if (!data.user) {
        setEmail(null);
        setRole(null);
        setReferralCode(null);
        setUsername(null);
        setUsernameDraft("");
        setDateOfBirth("");
        setAgeYears(null);
        setAgeBand(null);
        setLearnerDetailsMessage("");
        setLearnerDetailsMessageType("");
        setIsAdmin(false);
        setHasStudentRewardsAccess(false);
        setActiveLearningPlanLabels([]);
        setTokenTransactions([]);
        setGemTransactions([]);
        setDreamGemBalance(0);
        setStockPortfolioValue(0);
        setPropertyPortfolioValue(0);
        setIsLoadingTokens(false);
        setIsLoadingGems(false);
        setIsLoadingPortfolio(false);
        setIsLoadingLearnerDetails(false);
        return;
      }

      const userId = data.user.id;

      setEmail(data.user.email ?? null);

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "role, referral_code, username, dream_gem_balance",
        )
        .eq("id", userId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profileError) {
        console.error(
          "Profile error:",
          profileError.message,
        );
      }

      const loadedUsername =
        profile?.username ?? null;

      const loadedRole =
        normaliseRole(profile?.role) || "regular";


      setRole(loadedRole);
      setIsAdmin(loadedRole === "admin");
      setReferralCode(
        profile?.referral_code ?? null,
      );
      setUsername(loadedUsername);
      setUsernameDraft(loadedUsername ?? "");
      setDreamGemBalance(
        Number(profile?.dream_gem_balance || 0),
      );

      const {
        data: learningProfileData,
        error: learningProfileError,
      } = await supabase.rpc(
        "get_my_learning_profile_status",
      );

      if (!isMounted) {
        return;
      }

      if (learningProfileError) {
        console.warn(
          "Could not load learner details:",
          learningProfileError.message,
        );

        setDateOfBirth("");
        setAgeYears(null);
        setAgeBand(null);
        setLearnerDetailsMessage(
          "Learner details could not be loaded.",
        );
        setLearnerDetailsMessageType("error");
      } else {
        const learningProfile =
          (learningProfileData || {}) as LearningProfileStatus;

        setDateOfBirth(
          learningProfile.date_of_birth || "",
        );
        setAgeYears(
          typeof learningProfile.age_years === "number"
            ? learningProfile.age_years
            : null,
        );
        setAgeBand(
          learningProfile.age_band || null,
        );
      }

      setIsLoadingLearnerDetails(false);

      const {
        data: subscriptionRows,
        error: subscriptionError,
      } = await supabase
        .from("nova_subscriptions")
        .select("status,access_until,plan_code")
        .eq("user_id", userId)
        .order("access_until", {
          ascending: false,
        });

      if (!isMounted) {
        return;
      }

      if (subscriptionError) {
        console.warn(
          "Could not load Nova Student Access:",
          subscriptionError.message,
        );
      }

      const subscriptionData = subscriptionError
        ? []
        : ((subscriptionRows || []) as NovaSubscription[]);

      const entitlements = getLearningEntitlements(
        loadedRole,
        subscriptionData,
      );

      setHasStudentRewardsAccess(entitlements.rewards);
      setActiveLearningPlanLabels(
        entitlements.activePlans.map(learningPlanLabel),
      );

      const pendingReferralCode =
        typeof window !== "undefined"
          ? localStorage.getItem(
              "pending-referral-code",
            )
          : null;

      if (pendingReferralCode) {
        const {
          data: referralResult,
          error: referralError,
        } = await supabase.rpc(
          "apply_referral_bonus",
          {
            new_user_id: userId,
            input_referral_code:
              pendingReferralCode,
          },
        );

        const referralData = referralResult as {
          success?: boolean;
          message?: string;
        } | null;

        if (referralError) {
          console.error(
            "Google referral error:",
            referralError.message,
          );

          setReferralMessage(
            "Referral code could not be applied.",
          );
        } else if (referralData?.success) {
          setReferralMessage(
            "Referral bonus applied. You received 10 Dream Tokens.",
          );
        } else if (referralData?.message) {
          setReferralMessage(
            referralData.message,
          );
        }

        localStorage.removeItem(
          "pending-referral-code",
        );
      }

      const [
        tokenResult,
        gemResult,
        stocksResult,
        stockHoldingsResult,
        propertiesResult,
        propertyHoldingsResult,
      ] = await Promise.all([
        supabase
          .from("dream_token_transactions")
          .select(
            "id,user_id,type,title,amount,token_kind,created_at",
          )
          .eq("user_id", userId)
          .eq("token_kind", "virtual")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("dream_gem_transactions")
          .select(
            "id,user_id,type,source,title,description,amount,balance_after,created_at",
          )
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("milo_exchange_stocks")
          .select("symbol,current_price")
          .eq("is_active", true),

        supabase
          .from("milo_exchange_holdings")
          .select("symbol,quantity")
          .eq("user_id", userId),

        supabase
          .from("milo_exchange_properties")
          .select("id,current_value")
          .eq("is_active", true),

        supabase
          .from(
            "milo_exchange_property_holdings",
          )
          .select("property_id,quantity")
          .eq("user_id", userId),
      ]);

      if (!isMounted) {
        return;
      }

      if (tokenResult.error) {
        console.error(
          "Token error:",
          tokenResult.error.message,
        );

        setTokenTransactions([]);
      } else {
        setTokenTransactions(
          (tokenResult.data ??
            []) as DreamTokenTransaction[],
        );
      }

      if (gemResult.error) {
        console.error(
          "Dream Gem error:",
          gemResult.error.message,
        );

        setGemTransactions([]);
      } else {
        setGemTransactions(
          (gemResult.data ??
            []) as DreamGemTransaction[],
        );
      }

      if (
        stocksResult.error ||
        stockHoldingsResult.error
      ) {
        console.warn(
          "Could not load stock portfolio:",
          stocksResult.error?.message ||
            stockHoldingsResult.error?.message,
        );

        setStockPortfolioValue(0);
      } else {
        const prices = new Map(
          (
            (stocksResult.data ??
              []) as ExchangeStock[]
          ).map((stock) => [
            stock.symbol,
            Number(stock.current_price || 0),
          ]),
        );

        const stockValue = (
          (stockHoldingsResult.data ??
            []) as ExchangeStockHolding[]
        ).reduce((total, holding) => {
          return (
            total +
            Number(holding.quantity || 0) *
              Number(
                prices.get(holding.symbol) || 0,
              )
          );
        }, 0);

        setStockPortfolioValue(stockValue);
      }

      if (
        propertiesResult.error ||
        propertyHoldingsResult.error
      ) {
        console.warn(
          "Could not load property portfolio:",
          propertiesResult.error?.message ||
            propertyHoldingsResult.error
              ?.message,
        );

        setPropertyPortfolioValue(0);
      } else {
        const propertyValues = new Map(
          (
            (propertiesResult.data ??
              []) as ExchangeProperty[]
          ).map((property) => [
            property.id,
            Number(
              property.current_value || 0,
            ),
          ]),
        );

        const propertyValue = (
          (propertyHoldingsResult.data ??
            []) as ExchangePropertyHolding[]
        ).reduce((total, holding) => {
          return (
            total +
            Number(holding.quantity || 0) *
              Number(
                propertyValues.get(
                  holding.property_id,
                ) || 0,
              )
          );
        }, 0);

        setPropertyPortfolioValue(
          propertyValue,
        );
      }

      setIsLoadingTokens(false);
      setIsLoadingGems(false);
      setIsLoadingPortfolio(false);
    }

    void loadProfile();

    function refreshBalances() {
      void loadProfile();
    }

    window.addEventListener(
      "dream-tokens-updated",
      refreshBalances,
    );

    window.addEventListener(
      "dream-gems-updated",
      refreshBalances,
    );

    window.addEventListener(
      "focus",
      refreshBalances,
    );

    return () => {
      isMounted = false;

      window.removeEventListener(
        "dream-tokens-updated",
        refreshBalances,
      );

      window.removeEventListener(
        "dream-gems-updated",
        refreshBalances,
      );

      window.removeEventListener(
        "focus",
        refreshBalances,
      );
    };
  }, []);

  async function saveUsername() {
    const cleanedUsername = usernameDraft
      .trim()
      .toLowerCase();

    setUsernameMessage("");
    setUsernameMessageType("");

    if (!cleanedUsername) {
      setUsernameMessage(
        "Please enter a username.",
      );
      setUsernameMessageType("error");
      return;
    }

    if (
      !/^[a-z0-9_]{3,20}$/.test(
        cleanedUsername,
      )
    ) {
      setUsernameMessage(
        "Username must be 3 to 20 characters and use only letters, numbers, or underscores.",
      );
      setUsernameMessageType("error");
      return;
    }

    setIsSavingUsername(true);

    const { data, error } = await supabase.rpc(
      "update_my_username",
      {
        p_username: cleanedUsername,
      },
    );

    setIsSavingUsername(false);

    if (error) {
      console.error(
        "Username update error:",
        error.message,
      );

      setUsernameMessage(
        error.message ||
          "Username could not be saved.",
      );

      setUsernameMessageType("error");
      return;
    }

    const result = data as {
      username?: string;
    }[] | null;

    const savedUsername =
      result?.[0]?.username ??
      cleanedUsername;

    setUsername(savedUsername);
    setUsernameDraft(savedUsername);
    setUsernameMessage("Username saved.");
    setUsernameMessageType("success");
  }

  async function saveLearnerDetails() {
    setLearnerDetailsMessage("");
    setLearnerDetailsMessageType("");

    const age = calculateAge(dateOfBirth);

    if (!dateOfBirth || age === null || age < 4 || age > 120) {
      setLearnerDetailsMessage(
        "Please enter a valid date of birth.",
      );
      setLearnerDetailsMessageType("error");
      return;
    }

    setIsSavingLearnerDetails(true);

    const { data, error } = await supabase.rpc(
      "update_my_learning_profile",
      {
        p_date_of_birth: dateOfBirth,
      },
    );

    setIsSavingLearnerDetails(false);

    if (error) {
      console.error(
        "Learner details update error:",
        error.message,
      );

      setLearnerDetailsMessage(
        error.message ||
          "Learner details could not be saved.",
      );
      setLearnerDetailsMessageType("error");
      return;
    }

    const learningProfile =
      (data || {}) as LearningProfileStatus;

    setDateOfBirth(
      learningProfile.date_of_birth || dateOfBirth,
    );
    setAgeYears(
      typeof learningProfile.age_years === "number"
        ? learningProfile.age_years
        : age,
    );
    setAgeBand(
      learningProfile.age_band ||
        ageBandFromAge(age),
    );
    setLearnerDetailsMessage(
      "Learner details saved.",
    );
    setLearnerDetailsMessageType("success");

    localStorage.removeItem("pending-date-of-birth");
    window.dispatchEvent(
      new Event("learning-profile-updated"),
    );
  }

  async function copyReferralCode() {
    if (!referralCode) {
      return;
    }

    await navigator.clipboard.writeText(
      referralCode,
    );

    setCopiedReferralCode(true);

    window.setTimeout(() => {
      setCopiedReferralCode(false);
    }, 1800);
  }

  async function shareOrCopyReferralLink() {
    if (
      !referralCode ||
      typeof window === "undefined"
    ) {
      return;
    }

    const referralLink = `${
      window.location.origin
    }/signup?ref=${encodeURIComponent(
      referralCode,
    )}`;

    if (
      isShareDevice &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: "Join Dreamscape One",
          text: `Join me on Dreamscape One. Use referral code ${referralCode} when signing up.`,
          url: referralLink,
        });

        return;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
      }
    }

    await navigator.clipboard.writeText(
      referralLink,
    );

    setCopiedReferralLink(true);

    window.setTimeout(() => {
      setCopiedReferralLink(false);
    }, 1800);
  }

  function openSupportEmail() {
    const supportEmail =
      "admin@gurukidspro.com";

    const subject =
      "Dreamscape One Support Request";

    const body = `Hi Dreamscape team,

I need help with:

My account email: ${email || ""}
Device/browser:
What happened:

Thank you.`;

    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    if (isShareDevice) {
      window.location.href = mailtoUrl;

      setSupportMessage(
        "Opening your email app...",
      );

      return;
    }

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      supportEmail,
    )}&su=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    const emailWindow = window.open(
      gmailUrl,
      "_blank",
    );

    if (emailWindow) {
      emailWindow.opener = null;
    } else {
      window.location.href = mailtoUrl;
    }

    setSupportMessage(
      "Opening the support email in a new browser tab...",
    );
  }

  async function logout() {
    localStorage.removeItem("seen-prologue");
    localStorage.removeItem(
      "seen-chapter-guide",
    );
    localStorage.removeItem(
      "pending-referral-code",
    );
    localStorage.removeItem(
      "pending-date-of-birth",
    );

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020813] px-5 py-8 pb-16 text-white sm:px-8 sm:py-8 sm:pb-16">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(126,232,255,0.18),transparent_34%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />

        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute bottom-[-140px] right-[-120px] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <button
        type="button"
        onClick={() => router.push("/")}
        className="absolute left-5 top-5 z-30 rounded-full border border-cyan-200/25 bg-white/[0.06] px-5 py-2 text-sm tracking-wide text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-200/45 sm:left-8 sm:top-8"
      >
        ← Back to World
      </button>

      <div className="fixed right-5 top-5 z-50 flex items-center gap-3 sm:right-8 sm:top-8">
        {hasTeachingDashboardAccess && (
          <button
            type="button"
            onClick={() =>
              router.push(
                "/learning-missions/progress-rewards",
              )
            }
            className="hidden h-[46px] items-center justify-center rounded-full border border-cyan-200/28 bg-cyan-400/18 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(34,211,238,0.18)] backdrop-blur-xl transition hover:scale-[1.03] sm:flex"
          >
            Teaching Dashboard
          </button>
        )}

        {hasCurriculumDeveloperAccess && (
          <button
            type="button"
            onClick={() =>
              router.push(
                "/curriculum-developer",
              )
            }
            className="hidden h-[46px] items-center justify-center rounded-full border border-emerald-200/28 bg-emerald-400/18 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(52,211,153,0.18)] backdrop-blur-xl transition hover:scale-[1.03] sm:flex"
          >
            Quiz Builder
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/dream-tokens",
              )
            }
            className="hidden h-[46px] items-center justify-center rounded-full border border-violet-200/25 bg-violet-500/25 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(109,79,143,0.28)] backdrop-blur-xl transition hover:scale-[1.03] sm:flex"
          >
            Admin Panel
          </button>
        )}

        <button
          type="button"
          onClick={logout}
          className="h-[46px] rounded-full border border-cyan-200/25 bg-white/[0.08] px-5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:scale-[1.03]"
        >
          Log Out
        </button>

        <button
          type="button"
          onClick={() => router.push("/cart")}
          aria-label="Cart"
          className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-cyan-200/25 bg-white/[0.08] shadow-[0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:scale-[1.03]"
        >
          <CartIcon />
        </button>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl pt-24 sm:pt-0">
        <section className="text-center">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.24em] text-[#7ee8ff]">
            Dreamscape One
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] text-white drop-shadow-[0_0_28px_rgba(126,232,255,0.18)] sm:text-7xl">
            My Profile
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/62">
            {email
              ? `Logged in as ${email}`
              : "Not logged in"}
          </p>

          {referralMessage && (
            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-violet-200/20 bg-violet-400/12 px-5 py-4 text-sm leading-6 text-white/78">
              {referralMessage}
            </div>
          )}
        </section>

        <section className="mt-9 grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-8">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
              Account
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
              Dreamscape Access
            </h2>

            <div className="mt-7 grid gap-4">
              <div className="rounded-2xl border border-cyan-200/14 bg-[#061632]/75 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                  Email
                </p>

                <p className="mt-2 break-all text-lg text-white/86">
                  {email || "No active login"}
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-200/14 bg-[#061632]/75 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                  Username
                </p>

                <p className="mt-2 break-all text-2xl font-extrabold tracking-[0.08em] text-white">
                  {username || "Loading..."}
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={usernameDraft}
                    onChange={(event) =>
                      setUsernameDraft(
                        event.target.value.toLowerCase(),
                      )
                    }
                    placeholder="Choose username"
                    className="min-h-[50px] flex-1 rounded-full border border-cyan-200/14 bg-white/[0.07] px-5 text-sm font-bold text-white outline-none transition placeholder:text-white/32 focus:border-cyan-200/45"
                  />

                  <button
                    type="button"
                    onClick={saveUsername}
                    disabled={isSavingUsername}
                    className="min-h-[50px] rounded-full border border-cyan-200/22 bg-cyan-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:scale-[1.02] hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingUsername
                      ? "Saving..."
                      : "Save"}
                  </button>
                </div>

                <p className="mt-3 text-sm leading-6 text-white/54">
                  This username appears on Milo’s
                  Stock Exchange leaderboard. Use
                  3–20 characters: letters, numbers,
                  or underscores.
                </p>

                {usernameMessage && (
                  <p
                    className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                      usernameMessageType ===
                      "success"
                        ? "border-green-200/20 bg-green-400/10 text-green-200"
                        : "border-red-200/20 bg-red-400/10 text-red-200"
                    }`}
                  >
                    {usernameMessage}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-cyan-200/18 bg-[linear-gradient(145deg,rgba(12,57,89,0.72),rgba(6,22,50,0.82))] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#7ee8ff]">
                      Learner Details
                    </p>

                    <h3 className="mt-2 text-2xl font-extrabold text-white">
                      Age Profile
                    </h3>
                  </div>

                  {!dateOfBirth && !isLoadingLearnerDetails && (
                    <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-amber-100">
                      Required
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm leading-6 text-white/54">
                  Nova uses the learner&apos;s age to adjust explanations and
                  recommendations. Age does not change quiz marks.
                </p>

                {isLoadingLearnerDetails ? (
                  <p className="mt-5 text-sm text-white/48">
                    Loading learner details...
                  </p>
                ) : (
                  <>
                    <label className="mt-5 block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/48">
                        Date of birth
                      </span>

                      <input
                        type="date"
                        required
                        max={new Date().toISOString().slice(0, 10)}
                        value={dateOfBirth}
                        onChange={(event) => {
                          const nextDate = event.target.value;
                          const nextAge = calculateAge(nextDate);

                          setDateOfBirth(nextDate);
                          setAgeYears(nextAge);
                          setAgeBand(ageBandFromAge(nextAge));
                          setLearnerDetailsMessage("");
                          setLearnerDetailsMessageType("");
                        }}
                        autoComplete="bday"
                        className="min-h-[52px] w-full rounded-2xl border border-cyan-200/16 bg-[#020a1b]/70 px-5 text-base text-white outline-none transition focus:border-cyan-200/48"
                      />
                    </label>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                          Current Age
                        </p>

                        <p className="mt-2 text-lg font-extrabold text-white">
                          {ageYears === null
                            ? "Not recorded"
                            : `${ageYears} years`}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                          Nova Age Band
                        </p>

                        <p className="mt-2 text-lg font-extrabold text-white">
                          {formatAgeBand(ageBand)}
                        </p>
                      </div>
                    </div>

                    {learnerDetailsMessage && (
                      <p
                        className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                          learnerDetailsMessageType === "success"
                            ? "border-green-200/20 bg-green-400/10 text-green-200"
                            : "border-red-200/20 bg-red-400/10 text-red-200"
                        }`}
                      >
                        {learnerDetailsMessage}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={saveLearnerDetails}
                      disabled={isSavingLearnerDetails}
                      className="mt-4 min-h-[50px] w-full rounded-full border border-cyan-200/25 bg-cyan-300/16 px-6 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] hover:bg-cyan-300/22 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingLearnerDetails
                        ? "Saving..."
                        : "Save Learner Details"}
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-cyan-200/14 bg-[#061632]/75 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                  Access Level
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="text-lg text-white/86">
                    {accountAccessLabel}
                  </p>

                  {hasStudentRewardsAccess && (
                    <span className="rounded-full border border-fuchsia-200/22 bg-fuchsia-300/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#e7b7ff]">
                      Dream Gem Rewards
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-violet-200/18 bg-[#120b2e]/75 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                  Referral Code
                </p>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={copyReferralCode}
                    disabled={!referralCode}
                    aria-label="Copy referral code only"
                    title="Copy referral code only"
                    className="break-all rounded-2xl border border-transparent px-2 py-1 text-left text-2xl font-extrabold tracking-[0.16em] text-white transition hover:border-violet-200/20 hover:bg-violet-300/[0.08] disabled:cursor-default"
                  >
                    {referralCode ||
                      "Loading..."}
                  </button>

                  <button
                    type="button"
                    onClick={
                      shareOrCopyReferralLink
                    }
                    disabled={!referralCode}
                    className="rounded-full border border-violet-200/25 bg-violet-400/18 px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:scale-[1.03] disabled:opacity-50"
                  >
                    {copiedReferralLink
                      ? "Link Copied"
                      : isShareDevice
                        ? "Share Link"
                        : "Copy Link"}
                  </button>
                </div>

                <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-violet-100/58">
                  {copiedReferralCode
                    ? "Referral code copied"
                    : "Tap the code to copy the code only"}
                </p>

                <p className="mt-3 text-sm leading-6 text-white/54">
                  Share your signup link with a
                  friend. On phones and iPads, Share
                  Link opens the device share sheet
                  for available messaging apps. When
                  they successfully join using your
                  code, both of you receive 10 Dream
                  Tokens. You can also earn additional
                  bonuses by reaching the referral
                  objectives.
                </p>
              </div>
            </div>

            {hasTeachingDashboardAccess && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/learning-missions/progress-rewards",
                  )
                }
                className="mt-6 w-full rounded-2xl border border-cyan-200/25 bg-cyan-400/16 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] hover:bg-cyan-400/24 sm:hidden"
              >
                Teaching Dashboard
              </button>
            )}

            {hasCurriculumDeveloperAccess && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/curriculum-developer",
                  )
                }
                className={`${
                  hasTeachingDashboardAccess
                    ? "mt-3"
                    : "mt-6"
                } w-full rounded-2xl border border-emerald-200/25 bg-emerald-400/16 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] hover:bg-emerald-400/24 sm:hidden`}
              >
                Quiz Builder
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/admin/dream-tokens",
                  )
                }
                className={`${
                  hasTeachingDashboardAccess ||
                  hasCurriculumDeveloperAccess
                    ? "mt-3"
                    : "mt-6"
                } w-full rounded-2xl border border-violet-200/25 bg-violet-500/24 px-5 py-4 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] hover:bg-violet-500/34 sm:hidden`}
              >
                Admin Panel
              </button>
            )}
          </div>

          <div className="grid gap-6">
            <button
              type="button"
              onClick={() =>
                setShowTokenHistory(true)
              }
              className="group rounded-[32px] border border-yellow-300/28 bg-[linear-gradient(180deg,rgba(112,57,18,0.42),rgba(4,20,48,0.82))] p-7 text-left shadow-[0_0_42px_rgba(250,204,21,0.08),0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl transition hover:scale-[1.01] hover:border-yellow-200/44 hover:shadow-[0_0_52px_rgba(250,204,21,0.14)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
                    Dream Token Wallet
                  </p>

                  <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
                    Platform currency
                  </h2>

                  <p className="mt-4 max-w-md text-sm leading-6 text-white/62">
                    Use DT for digital activities,
                    upgrades, and virtual assets inside
                    Dreamscape. DT cannot be redeemed
                    for cash or physical products.
                  </p>
                </div>

                <img
                  src="/dreamscape/dream-token.png"
                  alt="Dream Token"
                  className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_0_22px_rgba(250,204,21,0.28)]"
                />
              </div>

              <div className="mt-9 rounded-3xl border border-yellow-200/16 bg-black/24 p-5">
                <div className="flex items-end justify-between gap-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                      Current Balance
                    </p>

                    {isLoadingTokens ? (
                      <p className="mt-2 text-lg text-white/52">
                        Loading...
                      </p>
                    ) : (
                      <div className="mt-2 flex items-end gap-3">
                        <span className="text-5xl font-extrabold leading-none text-white">
                          {dreamTokenBalance.toLocaleString()}
                        </span>

                        <span className="pb-2 text-sm font-bold tracking-[0.16em] text-[#ffd18a]">
                          DT
                        </span>
                      </div>
                    )}
                  </div>

                  <span className="rounded-full border border-yellow-200/20 bg-yellow-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#ffd18a]">
                    Open Wallet
                  </span>
                </div>

                <div className="mt-5 border-t border-yellow-100/12 pt-5">
                  <div className="flex items-end justify-between gap-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                      Total Net Worth
                    </p>

                    {isLoadingTokens ||
                    isLoadingPortfolio ? (
                      <p className="text-sm text-white/48">
                        Loading...
                      </p>
                    ) : (
                      <p className="text-2xl font-extrabold text-white">
                        {totalNetWorth.toLocaleString()}{" "}
                        <span className="text-xs tracking-[0.12em] text-[#ffd18a]">
                          DT
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      [
                        "Cash",
                        dreamTokenBalance,
                      ],
                      [
                        "Property",
                        propertyPortfolioValue,
                      ],
                      [
                        "Stocks",
                        stockPortfolioValue,
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-3"
                      >
                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/38">
                          {label}
                        </p>

                        <p className="mt-2 truncate text-sm font-extrabold text-white sm:text-base">
                          {isLoadingTokens ||
                          isLoadingPortfolio
                            ? "—"
                            : Number(
                                value,
                              ).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setShowGemHistory(true)
              }
              className="group rounded-[32px] border border-fuchsia-200/30 bg-[linear-gradient(180deg,rgba(76,24,112,0.48),rgba(4,20,48,0.86))] p-7 text-left shadow-[0_0_46px_rgba(217,70,239,0.11),0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.01] hover:border-fuchsia-200/48 hover:shadow-[0_0_58px_rgba(217,70,239,0.17)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#e7b7ff]">
                    Dream Gem Wallet
                  </p>

                  <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
                    Premium learning rewards
                  </h2>

                  <p className="mt-4 max-w-md text-sm leading-6 text-white/62">
                    Earn DG through eligible class
                    attendance and selected Core, Science and
                    Think Learning Missions. Redeem
                    them for selected Dreamscape
                    rewards.
                  </p>
                </div>

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-200/25 bg-fuchsia-300/10 text-[#e7b7ff] shadow-[0_0_24px_rgba(217,70,239,0.17)]">
                  <GemIcon className="h-11 w-11" />
                </div>
              </div>

              <div className="mt-9 rounded-3xl border border-fuchsia-200/16 bg-black/24 p-5">
                <div className="flex items-end justify-between gap-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                      Current Balance
                    </p>

                    {isLoadingGems ? (
                      <p className="mt-2 text-lg text-white/52">
                        Loading...
                      </p>
                    ) : (
                      <div className="mt-2 flex items-end gap-3">
                        <span className="text-5xl font-extrabold leading-none text-white">
                          {dreamGemBalance.toLocaleString()}
                        </span>

                        <span className="pb-2 text-sm font-bold tracking-[0.16em] text-[#e7b7ff]">
                          DG
                        </span>
                      </div>
                    )}
                  </div>

                  <span className="rounded-full border border-fuchsia-200/22 bg-fuchsia-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#e7b7ff]">
                    {hasStudentRewardsAccess
                      ? "Rewards Active"
                      : "Explore Rewards"}
                  </span>
                </div>

                <div className="mt-5 border-t border-fuchsia-100/12 pt-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                      Reward Access
                    </p>

                    <p
                      className={`text-sm font-extrabold ${
                        hasStudentRewardsAccess
                          ? "text-green-200"
                          : "text-[#e7b7ff]"
                      }`}
                    >
                      {hasStudentRewardsAccess
                        ? "Student rewards enabled"
                        : "Student Access required to earn DG"}
                    </p>
                  </div>
                </div>
              </div>
            </button>

            <section className="rounded-[32px] border border-cyan-200/18 bg-[linear-gradient(180deg,rgba(12,48,83,0.52),rgba(4,20,48,0.82))] p-7 shadow-[0_0_42px_rgba(126,232,255,0.08),0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                    Tech Support
                  </p>

                  <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
                    Need help?
                  </h2>

                  <p className="mt-4 max-w-md text-sm leading-6 text-white/62">
                    For technical difficulties, login
                    issues, account problems, or
                    general enquiries, contact the
                    Dreamscape team directly.
                  </p>
                </div>

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-3xl shadow-[0_0_22px_rgba(126,232,255,0.16)]">
                  ✉
                </div>
              </div>

              <button
                type="button"
                onClick={openSupportEmail}
                className="mt-7 flex min-h-[56px] w-full items-center justify-center rounded-full border border-cyan-200/24 bg-cyan-300/14 px-5 text-sm font-extrabold uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] hover:bg-cyan-300/22"
              >
                Email Support
              </button>

              <p className="mt-4 text-center text-sm text-white/46">
                admin@gurukidspro.com
              </p>

              {supportMessage && (
                <p className="mt-3 text-center text-xs leading-5 text-cyan-100/62">
                  {supportMessage}
                </p>
              )}
            </section>
          </div>
        </section>
      </div>

      {showTokenHistory && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#020813]/78 px-4 py-10 backdrop-blur-md">
          <div className="relative h-[74vh] w-full max-w-4xl overflow-hidden rounded-[30px] border border-yellow-300/30 bg-[#041124] shadow-[0_0_55px_rgba(250,204,21,0.12),0_30px_90px_rgba(0,0,0,0.55)]">
            <button
              type="button"
              onClick={() =>
                setShowTokenHistory(false)
              }
              className="absolute right-5 top-5 z-20 rounded-full border border-white/14 bg-white/[0.08] px-3 py-1 text-white transition hover:bg-white/[0.14]"
            >
              ✕
            </button>

            <div className="grid h-full grid-rows-[auto_1fr_auto]">
              <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
                <div className="flex items-center gap-4">
                  <img
                    src="/dreamscape/dream-token.png"
                    alt="Dream Token"
                    className="h-16 w-16 object-contain drop-shadow-[0_0_22px_rgba(250,204,21,0.26)]"
                  />

                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#ffd18a]">
                      Dream Token Wallet
                    </p>

                    <div className="mt-2 flex items-end gap-2">
                      <p className="text-4xl font-light leading-none text-white">
                        {dreamTokenBalance.toLocaleString()}
                      </p>

                      <p className="pb-1 text-sm font-semibold tracking-[0.16em] text-[#ffd18a]">
                        DT
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-white/48">
                      Digital currency for use inside
                      Dreamscape only
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto px-6 py-5">
                <div className="rounded-2xl border border-yellow-200/12 bg-white/[0.045] p-4">
                  <h3 className="text-lg font-medium text-white">
                    Dream Token History
                  </h3>

                  <p className="mt-1 text-sm text-white/48">
                    Track DT earned and spent across
                    Dreamscape’s digital activities,
                    upgrades, and virtual assets.
                  </p>
                </div>

                {tokenTransactions.length === 0 ? (
                  <p className="mt-6 text-sm text-white/48">
                    No Dream Token activity yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {tokenTransactions.map(
                      (transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 shadow-sm"
                        >
                          <div>
                            <p className="font-medium text-white">
                              {
                                transaction.title
                              }
                            </p>

                            <p className="mt-1 text-sm text-white/42">
                              {formatTransactionDate(
                                transaction.created_at,
                              )}
                            </p>
                          </div>

                          <p
                            className={`shrink-0 font-bold ${
                              transaction.amount <
                              0
                                ? "text-red-300"
                                : "text-green-300"
                            }`}
                          >
                            {formatTokenTransactionAmount(
                              transaction,
                            )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 bg-white/[0.03] px-6 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowTokenHistory(false)
                  }
                  className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01]"
                >
                  Close Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGemHistory && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-[#020813]/82 px-4 py-8 backdrop-blur-md sm:py-10">
          <div className="relative h-[82vh] w-full max-w-4xl overflow-hidden rounded-[30px] border border-fuchsia-200/32 bg-[#071022] shadow-[0_0_60px_rgba(217,70,239,0.14),0_30px_90px_rgba(0,0,0,0.58)]">
            <button
              type="button"
              onClick={() =>
                setShowGemHistory(false)
              }
              className="absolute right-5 top-5 z-20 rounded-full border border-white/14 bg-white/[0.08] px-3 py-1 text-white transition hover:bg-white/[0.14]"
            >
              ✕
            </button>

            <div className="grid h-full grid-rows-[auto_1fr_auto]">
              <div className="border-b border-fuchsia-100/12 bg-fuchsia-300/[0.04] px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-200/24 bg-fuchsia-300/10 text-[#e7b7ff] shadow-[0_0_24px_rgba(217,70,239,0.16)]">
                    <GemIcon className="h-11 w-11" />
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#e7b7ff]">
                      Dream Gem Wallet
                    </p>

                    <div className="mt-2 flex items-end gap-2">
                      <p className="text-4xl font-light leading-none text-white">
                        {dreamGemBalance.toLocaleString()}
                      </p>

                      <p className="pb-1 text-sm font-semibold tracking-[0.16em] text-[#e7b7ff]">
                        DG
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-white/48">
                      Premium achievement rewards ·
                      Not exchangeable for cash
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto px-6 py-5">
                <div className="rounded-2xl border border-fuchsia-200/14 bg-white/[0.045] p-4">
                  <h3 className="text-lg font-medium text-white">
                    Dream Gem History
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-white/48">
                    Dream Gems are earned from
                    eligible class attendance and
                    selected Core and Think Learning
                    Missions. They may be redeemed for
                    selected physical or digital
                    Dreamscape rewards, subject to
                    availability.
                  </p>
                </div>

                {!hasStudentRewardsAccess && (
                  <div className="mt-5 rounded-3xl border border-fuchsia-200/22 bg-[linear-gradient(145deg,rgba(92,38,130,0.42),rgba(19,22,58,0.72))] p-5 shadow-[0_0_30px_rgba(217,70,239,0.08)]">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e7b7ff]">
                      Unlock Premium Rewards
                    </p>

                    <h4 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-white">
                      Get Student Access for Bigger
                      Rewards
                    </h4>

                    <p className="mt-3 text-sm leading-6 text-white/60">
                      Student Access unlocks eligible
                      Dream Gem earning opportunities
                      across selected paid learning
                      activities.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          "/nova/membership-portal",
                        )
                      }
                      className="mt-5 w-full rounded-full border border-fuchsia-100/30 bg-fuchsia-300/18 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:scale-[1.01] hover:bg-fuchsia-300/24"
                    >
                      Get Student Access for Bigger
                      Rewards
                    </button>
                  </div>
                )}

                {hasStudentRewardsAccess && (
                  <div className="mt-5 rounded-2xl border border-green-200/18 bg-green-400/[0.08] px-5 py-4">
                    <p className="text-sm font-bold text-green-200">
                      Student reward access is active
                      on this account.
                    </p>

                    <p className="mt-1 text-sm leading-6 text-white/48">
                      Core, Science and Think reward rules will
                      appear here after those mission
                      pages are connected to the Dream
                      Gem ledger.
                    </p>
                  </div>
                )}

                {gemTransactions.length === 0 ? (
                  <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-5 text-sm text-white/48">
                    No Dream Gem activity yet. Your
                    balance will remain at 0 until an
                    eligible reward or adjustment is
                    recorded.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {gemTransactions.map(
                      (transaction) => {
                        const isPositive =
                          transaction.amount > 0;

                        return (
                          <div
                            key={transaction.id}
                            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-white">
                                {
                                  transaction.title
                                }
                              </p>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/42">
                                <span>
                                  {formatTransactionDate(
                                    transaction.created_at,
                                  )}
                                </span>

                                <span>
                                  {formatGemSource(
                                    transaction.source,
                                  )}
                                </span>

                                <span>
                                  Balance after:{" "}
                                  {
                                    transaction.balance_after
                                  }{" "}
                                  DG
                                </span>
                              </div>

                              {transaction.description && (
                                <p className="mt-2 text-sm leading-6 text-white/50">
                                  {
                                    transaction.description
                                  }
                                </p>
                              )}
                            </div>

                            <p
                              className={`shrink-0 text-lg font-extrabold ${
                                isPositive
                                  ? "text-green-300"
                                  : "text-red-300"
                              }`}
                            >
                              {formatGemTransactionAmount(
                                transaction,
                              )}
                            </p>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-fuchsia-100/12 bg-fuchsia-300/[0.03] px-6 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowGemHistory(false)
                  }
                  className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#111028] transition hover:scale-[1.01]"
                >
                  Close Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}