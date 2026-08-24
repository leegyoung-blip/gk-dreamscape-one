"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLearningEntitlements, learningPlanLabel } from "@/lib/learning-access";
import {
  claimMyOrganisationInvites,
  takeOrganisationClaimMessage,
} from "@/lib/organisation-access";
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


type MembershipPlanOption = {
  id: string;
  name: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
};

type MembershipPayment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  refund_amount?: number | null;
};

type ProfileMembership = {
  contractId: string;
  provider: string;
  providerEnvironment: string | null;
  planId: string;
  planName: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: string;
  providerStatus: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  graceUntil: string | null;
  pausedAt: string | null;
  cancelAtPeriodEnd: boolean;
  canUpdatePaymentMethod: boolean;
  canChangePlan: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancelAtPeriodEnd: boolean;
  canKeepSubscription: boolean;
  isLive: boolean;
  isPaused: boolean;
  pendingPlan: null | {
    id: string;
    name: string;
    planCode: string;
    billingCycle: string;
    amount: number;
    currency: string;
    effectiveAt: string | null;
    status: string | null;
  };
};

type ProfileMembershipResponse = {
  membership: ProfileMembership | null;
  availablePlans: MembershipPlanOption[];
  payments: MembershipPayment[];
  error?: string;
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

  const [organisationClaimMessage, setOrganisationClaimMessage] =
    useState("");

  const [supportMessage, setSupportMessage] =
    useState("");

  const [showSettings, setShowSettings] =
    useState(false);

  const [showSupport, setShowSupport] =
    useState(false);

  const [membershipAccessUntil, setMembershipAccessUntil] =
    useState<string | null>(null);


  const [membershipDetails, setMembershipDetails] =
    useState<ProfileMembership | null>(null);

  const [membershipPlanOptions, setMembershipPlanOptions] =
    useState<MembershipPlanOption[]>([]);

  const [membershipPayments, setMembershipPayments] =
    useState<MembershipPayment[]>([]);

  const [membershipTargetPlanId, setMembershipTargetPlanId] =
    useState("");

  const [isLoadingMembership, setIsLoadingMembership] =
    useState(true);

  const [isWorkingMembership, setIsWorkingMembership] =
    useState(false);

  const [membershipMessage, setMembershipMessage] =
    useState("");

  const [membershipError, setMembershipError] =
    useState("");

  const [showDeleteAccount, setShowDeleteAccount] =
    useState(false);

  const [deletePreflightLoading, setDeletePreflightLoading] =
    useState(false);

  const [deleteCanProceed, setDeleteCanProceed] =
    useState(false);

  const [deleteBlockers, setDeleteBlockers] =
    useState<string[]>([]);

  const [deleteWord, setDeleteWord] =
    useState("");

  const [deleteEmailConfirmation, setDeleteEmailConfirmation] =
    useState("");

  const [deleteAcknowledgeAccessLoss, setDeleteAcknowledgeAccessLoss] =
    useState(false);

  const [deleteAcknowledgeNoRefund, setDeleteAcknowledgeNoRefund] =
    useState(false);

  const [isDeletingAccount, setIsDeletingAccount] =
    useState(false);

  const [deleteAccountError, setDeleteAccountError] =
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

  const [hasOrganisationPortalAccess, setHasOrganisationPortalAccess] =
    useState(false);

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
        setOrganisationClaimMessage("");
        setIsAdmin(false);
        setHasOrganisationPortalAccess(false);
        setHasStudentRewardsAccess(false);
        setActiveLearningPlanLabels([]);
        setMembershipAccessUntil(null);
        setMembershipDetails(null);
        setMembershipPlanOptions([]);
        setMembershipPayments([]);
        setMembershipTargetPlanId("");
        setMembershipMessage("");
        setMembershipError("");
        setIsLoadingMembership(false);
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
      void loadMembershipControls();

      const carriedClaimMessage =
        takeOrganisationClaimMessage();

      const organisationClaim =
        await claimMyOrganisationInvites();

      if (!isMounted) {
        return;
      }

      if (organisationClaim.error) {
        console.warn(
          "Organisation invite claim error:",
          organisationClaim.error.message,
        );
      }

      if (organisationClaim.message || carriedClaimMessage) {
        setOrganisationClaimMessage(
          organisationClaim.message || carriedClaimMessage,
        );
      }

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

      const {
        data: manageableOrganisationRows,
        error: manageableOrganisationError,
      } = await supabase.rpc("get_my_manageable_organisations");

      if (!isMounted) {
        return;
      }

      if (manageableOrganisationError) {
        console.warn(
          "Could not load organisation portal access:",
          manageableOrganisationError.message,
        );
        setHasOrganisationPortalAccess(false);
      } else {
        setHasOrganisationPortalAccess(
          Array.isArray(manageableOrganisationRows) &&
            manageableOrganisationRows.length > 0,
        );
      }

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

      const latestAccessUntil =
        subscriptionData
          .map((row) => row.access_until)
          .filter(
            (value): value is string =>
              typeof value === "string" &&
              value.length > 0 &&
              Number.isFinite(
                new Date(value).getTime(),
              ),
          )
          .sort(
            (a, b) =>
              new Date(b).getTime() -
              new Date(a).getTime(),
          )[0] || null;

      setMembershipAccessUntil(
        latestAccessUntil,
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
      "dreamscape-membership-updated",
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
        "dreamscape-membership-updated",
        refreshBalances,
      );

      window.removeEventListener(
        "focus",
        refreshBalances,
      );
    };
  }, []);

  async function loadMembershipControls() {
    setIsLoadingMembership(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMembershipDetails(null);
        setMembershipPlanOptions([]);
        setMembershipPayments([]);
        setIsLoadingMembership(false);
        return;
      }

      const response = await fetch(
        "/api/profile/membership",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        },
      );

      const payload =
        (await response.json()) as
          ProfileMembershipResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Membership details could not be loaded.",
        );
      }

      setMembershipDetails(
        payload.membership || null,
      );

      setMembershipPlanOptions(
        payload.availablePlans || [],
      );

      setMembershipPayments(
        payload.payments || [],
      );

      setMembershipTargetPlanId(
        (current) => {
          if (
            current &&
            (payload.availablePlans || []).some(
              (plan) =>
                plan.id === current,
            )
          ) {
            return current;
          }

          return "";
        },
      );

      setMembershipError("");
    } catch (error) {
      console.warn(
        "Could not load profile membership controls:",
        error,
      );

      setMembershipError(
        error instanceof Error
          ? error.message
          : "Membership details could not be loaded.",
      );
    }

    setIsLoadingMembership(false);
  }

  async function runMembershipAction(
    action:
      | "payment_method"
      | "change_plan"
      | "cancel_plan_change"
      | "cancel_period_end"
      | "keep_subscription"
      | "pause_membership"
      | "resume_membership",
  ) {
    if (!membershipDetails) {
      return;
    }

    if (
      action === "change_plan" &&
      !membershipTargetPlanId
    ) {
      setMembershipError(
        "Choose the new membership plan first.",
      );
      return;
    }

    if (
      action === "change_plan" &&
      !window.confirm(
        "Schedule this plan change for the next paid billing cycle? Your current access remains unchanged until the new plan starts.",
      )
    ) {
      return;
    }

    if (
      action === "cancel_plan_change" &&
      !window.confirm(
        "Cancel the pending membership plan change and keep the current plan?",
      )
    ) {
      return;
    }

    if (
      action === "cancel_period_end" &&
      !window.confirm(
        "Stop future renewal? Paid learning access will remain available through the current paid period.",
      )
    ) {
      return;
    }

    if (
      action === "keep_subscription" &&
      !window.confirm(
        "Keep this membership renewing normally?",
      )
    ) {
      return;
    }

    if (
      action === "pause_membership" &&
      !window.confirm(
        "Pause membership now? Learning access stops immediately and Stripe stops generating subscription invoices while paused. Unused paid time is credited by Stripe and can be applied when the membership is resumed.",
      )
    ) {
      return;
    }

    if (
      action === "resume_membership" &&
      !window.confirm(
        "Resume membership now? Stripe may charge the payment method to begin the resumed billing period. Learning access is restored after Stripe confirms the subscription is active.",
      )
    ) {
      return;
    }

    setIsWorkingMembership(true);
    setMembershipMessage("");
    setMembershipError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Please sign in again.",
        );
      }

      const response = await fetch(
        "/api/profile/membership",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action,
            ...(action === "change_plan"
              ? {
                  targetPlanId:
                    membershipTargetPlanId,
                }
              : {}),
          }),
        },
      );

      const payload =
        (await response.json().catch(
          () => null,
        )) as
          | {
              error?: string;
              redirectUrl?: string;
              status?: string;
              nextPlan?: string;
            }
          | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "The membership action could not be completed.",
        );
      }

      if (
        action === "payment_method" &&
        payload?.redirectUrl
      ) {
        window.location.href =
          payload.redirectUrl;
        return;
      }

      const labels: Record<
        typeof action,
        string
      > = {
        payment_method:
          "Opening secure payment settings...",
        change_plan:
          "Membership plan change scheduled.",
        cancel_plan_change:
          "Pending plan change cancelled.",
        cancel_period_end:
          "Future renewal has been stopped. Current paid access remains available through the paid-through date.",
        keep_subscription:
          "Membership renewal restored.",
        pause_membership:
          "Membership paused. Paid learning access is now paused too.",
        resume_membership:
          "Membership resumed and learning access restored.",
      };

      setMembershipMessage(
        labels[action],
      );

      setMembershipTargetPlanId("");

      await loadMembershipControls();

      window.dispatchEvent(
        new Event(
          "dreamscape-membership-updated",
        ),
      );
    } catch (error) {
      setMembershipError(
        error instanceof Error
          ? error.message
          : "The membership action could not be completed.",
      );
    }

    setIsWorkingMembership(false);
  }

  async function openDeleteAccount() {
    setShowDeleteAccount(true);
    setDeletePreflightLoading(true);
    setDeleteCanProceed(false);
    setDeleteBlockers([]);
    setDeleteWord("");
    setDeleteEmailConfirmation("");
    setDeleteAcknowledgeAccessLoss(false);
    setDeleteAcknowledgeNoRefund(false);
    setDeleteAccountError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch(
        "/api/profile/account-deletion",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const payload = (await response.json()) as {
        canDelete?: boolean;
        blockers?: string[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Account deletion could not be checked.",
        );
      }

      setDeleteCanProceed(Boolean(payload.canDelete));
      setDeleteBlockers(
        Array.isArray(payload.blockers) ? payload.blockers : [],
      );
    } catch (error) {
      setDeleteAccountError(
        error instanceof Error
          ? error.message
          : "Account deletion could not be checked.",
      );
    }

    setDeletePreflightLoading(false);
  }

  async function deleteAccountPermanently() {
    if (!deleteCanProceed) {
      return;
    }

    const expectedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (deleteWord !== "DELETE") {
      setDeleteAccountError('Type "DELETE" exactly.');
      return;
    }

    if (
      deleteEmailConfirmation.trim().toLowerCase() !==
      expectedEmail
    ) {
      setDeleteAccountError(
        "Enter this account's email address exactly.",
      );
      return;
    }

    if (
      !deleteAcknowledgeAccessLoss ||
      !deleteAcknowledgeNoRefund
    ) {
      setDeleteAccountError(
        "Confirm both deletion acknowledgements before continuing.",
      );
      return;
    }

    if (
      !window.confirm(
        "Final confirmation: permanently delete this Dreamscape account now?",
      )
    ) {
      return;
    }

    setIsDeletingAccount(true);
    setDeleteAccountError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch(
        "/api/profile/account-deletion",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirmation: deleteWord,
            emailConfirmation: deleteEmailConfirmation,
            acknowledgeImmediateAccessLoss:
              deleteAcknowledgeAccessLoss,
            acknowledgeNoAutomaticRefund:
              deleteAcknowledgeNoRefund,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            deleted?: boolean;
            cleanupPending?: boolean;
            message?: string;
            error?: string;
            blockers?: string[];
          }
        | null;

      if (!response.ok && !payload?.deleted) {
        throw new Error(
          payload?.error ||
            "The account could not be deleted.",
        );
      }

      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // The server-side deletion is authoritative.
      }

      window.localStorage.clear();
      window.sessionStorage.clear();

      window.location.href = payload?.cleanupPending
        ? "/?account=deleted&cleanup=pending"
        : "/?account=deleted";
    } catch (error) {
      setDeleteAccountError(
        error instanceof Error
          ? error.message
          : "The account could not be deleted.",
      );
      setIsDeletingAccount(false);
    }
  }

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

  function formatMembershipDate(
    value: string | null,
  ) {
    if (!value) {
      return "Not applicable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleDateString(
      "en-SG",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );
  }

  const hasStaffAccess =
    isAdmin ||
    hasTeachingDashboardAccess ||
    hasCurriculumDeveloperAccess;

  const hasAnyStaffTools =
    hasTeachingDashboardAccess ||
    hasCurriculumDeveloperAccess ||
    hasOrganisationPortalAccess ||
    isAdmin;

  const hasActiveAccountAccess =
    hasStaffAccess ||
    hasStudentRewardsAccess;

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
    <main className="relative min-h-screen overflow-x-hidden bg-[#020813] px-5 py-7 pb-16 text-white sm:px-8 sm:py-8 sm:pb-16">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(126,232,255,0.18),transparent_34%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Top navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border border-cyan-200/25 bg-white/[0.06] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-white shadow-[0_14px_34px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:scale-[1.02] hover:border-cyan-200/45 sm:px-5"
          >
            ← Back to World
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="min-h-[44px] rounded-full border border-cyan-200/24 bg-white/[0.07] px-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.2)] backdrop-blur-xl transition hover:scale-[1.02] hover:bg-white/[0.1] sm:px-5"
            >
              Settings
            </button>

            <button
              type="button"
              onClick={() => {
                setSupportMessage("");
                setShowSupport(true);
              }}
              className="min-h-[44px] rounded-full border border-violet-200/24 bg-violet-300/[0.10] px-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.2)] backdrop-blur-xl transition hover:scale-[1.02] hover:bg-violet-300/[0.16] sm:px-5"
            >
              Support
            </button>

            <button
              type="button"
              onClick={() => router.push("/cart")}
              aria-label="Cart"
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-cyan-200/24 bg-white/[0.07] shadow-[0_12px_28px_rgba(0,0,0,0.2)] backdrop-blur-xl transition hover:scale-[1.03]"
            >
              <CartIcon />
            </button>
          </div>
        </div>

        {/* Identity */}
        <section className="mx-auto mt-12 max-w-3xl text-center sm:mt-14">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.24em] text-[#7ee8ff]">
            Dreamscape One
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] text-white drop-shadow-[0_0_28px_rgba(126,232,255,0.18)] sm:text-7xl">
            My Profile
          </h1>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white/88">
              {username || "Dreamscape User"}
            </span>

            <span className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-50/80">
              {accountAccessLabel}
            </span>
          </div>

          <p className="mx-auto mt-4 max-w-2xl break-all text-sm leading-6 text-white/54">
            {email ? email : "Not logged in"}
          </p>

          {referralMessage && (
            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-violet-200/20 bg-violet-400/12 px-5 py-4 text-sm leading-6 text-white/78">
              {referralMessage}
            </div>
          )}

          {organisationClaimMessage && (
            <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-emerald-200/22 bg-emerald-400/10 px-5 py-4 text-sm leading-6 text-emerald-100">
              {organisationClaimMessage}
            </div>
          )}
        </section>

        {/* Staff tools */}
        {hasAnyStaffTools && (
          <section className="mt-9 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_58px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/42">
                  Staff Tools
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-white">
                  Workspaces for your role
                </h2>
              </div>

              <p className="text-xs uppercase tracking-[0.13em] text-white/34">
                {normalizedRole.replace(/-/g, " ")}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {hasTeachingDashboardAccess && (
                <button
                  type="button"
                  onClick={() => router.push("/teacher-dashboard")}
                  className="min-h-[46px] rounded-full border border-cyan-200/28 bg-cyan-400/16 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:scale-[1.02] hover:bg-cyan-400/24"
                >
                  Teaching Dashboard
                </button>
              )}

              {hasCurriculumDeveloperAccess && (
                <button
                  type="button"
                  onClick={() => router.push("/curriculum-developer")}
                  className="min-h-[46px] rounded-full border border-emerald-200/28 bg-emerald-400/16 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:scale-[1.02] hover:bg-emerald-400/24"
                >
                  Quiz Builder
                </button>
              )}

              {hasOrganisationPortalAccess && (
                <button
                  type="button"
                  onClick={() => router.push("/organisation/manage")}
                  className="min-h-[46px] rounded-full border border-amber-200/28 bg-amber-300/14 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:scale-[1.02] hover:bg-amber-300/22"
                >
                  Organisation Portal
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => router.push("/admin/dream-tokens")}
                  className="min-h-[46px] rounded-full border border-violet-200/28 bg-violet-500/20 px-5 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:scale-[1.02] hover:bg-violet-500/30"
                >
                  Admin Panel
                </button>
              )}
            </div>
          </section>
        )}

        {/* Snapshot */}
        <section className="mt-7 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[30px] border border-cyan-200/16 bg-white/[0.045] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                  Account Overview
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
                  Your details
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.08] px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-cyan-300/[0.14]"
              >
                Manage
              </button>
            </div>

            <div className="mt-6 divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-[#061632]/64 px-5">
              {[
                ["Username", username || "Not set"],
                ["Email", email || "No active login"],
                [
                  "Learner age",
                  isLoadingLearnerDetails
                    ? "Loading..."
                    : ageYears === null
                      ? "Not recorded"
                      : `${ageYears} years`,
                ],
                [
                  "Nova age band",
                  isLoadingLearnerDetails
                    ? "Loading..."
                    : formatAgeBand(ageBand),
                ],
                ["Access", accountAccessLabel],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">
                    {label}
                  </p>
                  <p className="break-all text-sm font-semibold text-white/82 sm:text-right">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[30px] border border-violet-200/18 bg-[linear-gradient(145deg,rgba(37,22,78,0.68),rgba(4,20,48,0.82))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7b7ff]">
                  Membership
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
                  {membershipDetails?.planName || accountAccessLabel}
                </h2>
              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] ${
                  membershipDetails?.isPaused
                    ? "border-amber-200/20 bg-amber-300/10 text-amber-100"
                    : hasActiveAccountAccess
                      ? "border-green-200/20 bg-green-300/10 text-green-200"
                      : "border-white/12 bg-white/[0.05] text-white/48"
                }`}
              >
                {membershipDetails?.isPaused
                  ? "Paused"
                  : membershipDetails?.cancelAtPeriodEnd
                    ? "Ends after paid period"
                    : hasActiveAccountAccess
                      ? "Active"
                      : "Basic"}
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-white/[0.09] bg-black/18 p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">
                  Learning plan
                </p>

                <p className="text-right text-sm font-bold text-white/82">
                  {activeLearningPlanLabels.length > 0
                    ? activeLearningPlanLabels.join(" + ")
                    : hasStaffAccess
                      ? accountAccessLabel
                      : "Basic Access"}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/[0.08] pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">
                  Access through
                </p>

                <p className="text-right text-sm font-bold text-white/82">
                  {hasStaffAccess
                    ? "Staff access"
                    : formatMembershipDate(membershipAccessUntil)}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/[0.08] pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/38">
                  Rewards
                </p>

                <p className="text-right text-sm font-bold text-white/82">
                  {hasStudentRewardsAccess
                    ? "Dream Gem rewards enabled"
                    : hasStaffAccess
                      ? "Staff access"
                      : "Upgrade required"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMembershipMessage("");
                setMembershipError("");
                setShowSettings(true);
              }}
              className="mt-5 min-h-[50px] w-full rounded-full border border-violet-200/26 bg-violet-300/14 px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] hover:bg-violet-300/22"
            >
              Manage Membership
            </button>
          </article>
        </section>

        {/* Wallets */}
        <section className="mt-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/38">
              Your Wallet
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-white">
              Dreamscape balances
            </h2>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => setShowTokenHistory(true)}
              className="group rounded-[30px] border border-yellow-300/26 bg-[linear-gradient(180deg,rgba(112,57,18,0.38),rgba(4,20,48,0.82))] p-6 text-left shadow-[0_0_42px_rgba(250,204,21,0.07),0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:scale-[1.01] hover:border-yellow-200/42 sm:p-7"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffd18a]">
                    Dream Tokens
                  </p>

                  {isLoadingTokens ? (
                    <p className="mt-4 text-lg text-white/48">
                      Loading...
                    </p>
                  ) : (
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-5xl font-extrabold leading-none text-white">
                        {dreamTokenBalance.toLocaleString()}
                      </span>
                      <span className="pb-2 text-sm font-bold tracking-[0.14em] text-[#ffd18a]">
                        DT
                      </span>
                    </div>
                  )}
                </div>

                <img
                  src="/dreamscape/dream-token.png"
                  alt="Dream Token"
                  className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_0_22px_rgba(250,204,21,0.28)]"
                />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/38">
                    Net Worth
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-white">
                    {isLoadingTokens || isLoadingPortfolio
                      ? "—"
                      : totalNetWorth.toLocaleString()}{" "}
                    <span className="text-xs text-[#ffd18a]">
                      DT
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-center rounded-2xl border border-yellow-200/14 bg-yellow-200/[0.06] p-4 text-center text-xs font-extrabold uppercase tracking-[0.12em] text-[#ffd18a]">
                  View History →
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowGemHistory(true)}
              className="group rounded-[30px] border border-fuchsia-200/28 bg-[linear-gradient(180deg,rgba(76,24,112,0.44),rgba(4,20,48,0.86))] p-6 text-left shadow-[0_0_46px_rgba(217,70,239,0.10),0_24px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:scale-[1.01] hover:border-fuchsia-200/46 sm:p-7"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7b7ff]">
                    Dream Gems
                  </p>

                  {isLoadingGems ? (
                    <p className="mt-4 text-lg text-white/48">
                      Loading...
                    </p>
                  ) : (
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-5xl font-extrabold leading-none text-white">
                        {dreamGemBalance.toLocaleString()}
                      </span>
                      <span className="pb-2 text-sm font-bold tracking-[0.14em] text-[#e7b7ff]">
                        DG
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-200/22 bg-fuchsia-300/10 text-[#e7b7ff]">
                  <GemIcon className="h-10 w-10" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/38">
                    Reward Access
                  </p>
                  <p
                    className={`mt-2 text-sm font-extrabold ${
                      hasStudentRewardsAccess
                        ? "text-green-200"
                        : "text-white/58"
                    }`}
                  >
                    {hasStudentRewardsAccess
                      ? "Rewards active"
                      : "Student access required"}
                  </p>
                </div>

                <div className="flex items-center justify-center rounded-2xl border border-fuchsia-200/14 bg-fuchsia-200/[0.06] p-4 text-center text-xs font-extrabold uppercase tracking-[0.12em] text-[#e7b7ff]">
                  View History →
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Referral */}
        <section className="mt-7 rounded-[30px] border border-violet-200/18 bg-[linear-gradient(145deg,rgba(24,16,60,0.74),rgba(4,20,48,0.82))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7b7ff]">
                Invite a Friend
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl">
                Share Dreamscape and earn rewards
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/54">
                When a friend successfully joins using your code, both of you receive 10 Dream Tokens. Additional referral objectives can unlock more bonuses.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-violet-200/14 bg-black/20 p-4 lg:max-w-md">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
                Referral Code
              </p>

              <button
                type="button"
                onClick={copyReferralCode}
                disabled={!referralCode}
                className="mt-2 break-all text-left text-2xl font-extrabold tracking-[0.14em] text-white disabled:opacity-50"
              >
                {referralCode || "Loading..."}
              </button>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={copyReferralCode}
                  disabled={!referralCode}
                  className="min-h-[44px] rounded-full border border-violet-200/20 bg-white/[0.05] px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-white/[0.09] disabled:opacity-50"
                >
                  {copiedReferralCode ? "Code Copied" : "Copy Code"}
                </button>

                <button
                  type="button"
                  onClick={shareOrCopyReferralLink}
                  disabled={!referralCode}
                  className="min-h-[44px] rounded-full border border-violet-200/24 bg-violet-300/14 px-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-violet-300/22 disabled:opacity-50"
                >
                  {copiedReferralLink
                    ? "Link Copied"
                    : isShareDevice
                      ? "Share Invite"
                      : "Copy Invite"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-[#020813]/84 px-4 py-6 backdrop-blur-md sm:py-10">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[30px] border border-cyan-200/22 bg-[#051126] shadow-[0_30px_90px_rgba(0,0,0,0.58)]">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#051126]/95 px-5 py-5 backdrop-blur-xl sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7ee8ff]">
                  Settings
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-white">
                  Account & membership
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-full border border-white/14 bg-white/[0.07] px-3 py-1.5 text-white transition hover:bg-white/[0.12]"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
              {/* Profile settings */}
              <section className="rounded-[26px] border border-cyan-200/14 bg-white/[0.035] p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7ee8ff]">
                  Profile
                </p>

                <h3 className="mt-3 text-2xl font-bold text-white">
                  Personal details
                </h3>

                <div className="mt-5">
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-white/44">
                    Email
                  </label>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-black/16 px-4 py-3 text-sm text-white/72">
                    {email || "No active login"}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/38">
                    Email changes will be handled through account security rather than edited directly here.
                  </p>
                </div>

                <div className="mt-5">
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-white/44">
                    Username
                  </label>

                  <div className="mt-2 flex flex-col gap-3 sm:flex-row">
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
                      className="min-h-[50px] rounded-full border border-cyan-200/22 bg-cyan-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingUsername ? "Saving..." : "Save"}
                    </button>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-white/38">
                    3–20 characters using letters, numbers, or underscores.
                  </p>

                  {usernameMessage && (
                    <p
                      className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                        usernameMessageType === "success"
                          ? "border-green-200/20 bg-green-400/10 text-green-200"
                          : "border-red-200/20 bg-red-400/10 text-red-200"
                      }`}
                    >
                      {usernameMessage}
                    </p>
                  )}
                </div>
              </section>

              {/* Learner settings */}
              <section className="rounded-[26px] border border-cyan-200/14 bg-white/[0.035] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7ee8ff]">
                      Learner Profile
                    </p>
                    <h3 className="mt-3 text-2xl font-bold text-white">
                      Age settings
                    </h3>
                  </div>

                  {!dateOfBirth && !isLoadingLearnerDetails && (
                    <span className="rounded-full border border-amber-200/24 bg-amber-300/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-amber-100">
                      Required
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm leading-6 text-white/50">
                  Nova uses the learner&apos;s age to adjust explanations and recommendations. Age does not change quiz marks.
                </p>

                {isLoadingLearnerDetails ? (
                  <p className="mt-5 text-sm text-white/46">
                    Loading learner details...
                  </p>
                ) : (
                  <>
                    <label className="mt-5 block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/44">
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
                        className="dream-mobile-date-input block min-h-[52px] w-full min-w-0 max-w-full rounded-2xl border border-cyan-200/16 bg-[#020a1b]/70 px-4 text-[16px] text-white outline-none transition focus:border-cyan-200/48"
                      />
                    </label>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/36">
                          Age
                        </p>
                        <p className="mt-2 text-base font-extrabold text-white">
                          {ageYears === null
                            ? "Not recorded"
                            : `${ageYears} years`}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/36">
                          Nova Band
                        </p>
                        <p className="mt-2 text-base font-extrabold text-white">
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
                      className="mt-4 min-h-[50px] w-full rounded-full border border-cyan-200/24 bg-cyan-300/14 px-6 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:bg-cyan-300/21 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingLearnerDetails
                        ? "Saving..."
                        : "Save Learner Details"}
                    </button>
                  </>
                )}
              </section>

              {/* Membership settings */}
              <section className="rounded-[26px] border border-violet-200/16 bg-violet-300/[0.035] p-5 sm:p-6 lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e7b7ff]">
                      Membership & Billing
                    </p>

                    <h3 className="mt-3 text-2xl font-bold text-white">
                      {membershipDetails?.planName || accountAccessLabel}
                    </h3>
                  </div>

                  {membershipDetails && (
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] ${
                        membershipDetails.isPaused
                          ? "border-amber-200/20 bg-amber-300/10 text-amber-100"
                          : membershipDetails.cancelAtPeriodEnd
                            ? "border-red-200/20 bg-red-300/10 text-red-100"
                            : membershipDetails.status === "payment_issue"
                              ? "border-amber-200/20 bg-amber-300/10 text-amber-100"
                              : "border-green-200/20 bg-green-300/10 text-green-200"
                      }`}
                    >
                      {membershipDetails.isPaused
                        ? "Paused"
                        : membershipDetails.cancelAtPeriodEnd
                          ? "Renewal stopped"
                          : membershipDetails.status === "payment_issue"
                            ? "Payment issue"
                            : membershipDetails.isLive
                              ? "Active"
                              : membershipDetails.status}
                    </span>
                  )}
                </div>

                {isLoadingMembership ? (
                  <p className="mt-5 text-sm text-white/48">
                    Loading membership details...
                  </p>
                ) : !membershipDetails ? (
                  <div className="mt-5 rounded-2xl border border-white/9 bg-black/16 p-5">
                    <p className="text-sm font-bold text-white">
                      No paid Dreamscape membership is linked to this account.
                    </p>

                    <p className="mt-2 text-sm leading-6 text-white/46">
                      Basic Dreamscape access remains available. View the current Core and Full plans when you are ready to upgrade.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setShowSettings(false);
                        router.push("/pricing");
                      }}
                      className="mt-4 min-h-[48px] w-full rounded-full border border-violet-200/24 bg-violet-300/14 px-5 text-xs font-extrabold uppercase tracking-[0.13em] text-white transition hover:bg-violet-300/22"
                    >
                      View Membership Plans
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-white/9 bg-black/16 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/36">
                          Plan
                        </p>
                        <p className="mt-2 text-sm font-extrabold text-white/84">
                          {membershipDetails.planName}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/9 bg-black/16 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/36">
                          Price
                        </p>
                        <p className="mt-2 text-sm font-extrabold text-white/84">
                          {new Intl.NumberFormat("en-SG", {
                            style: "currency",
                            currency: membershipDetails.currency || "SGD",
                          }).format(membershipDetails.amount)}
                          {" / "}
                          {membershipDetails.billingCycle === "annual"
                            ? "year"
                            : "month"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/9 bg-black/16 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/36">
                          {membershipDetails.isPaused
                            ? "Paused since"
                            : membershipDetails.cancelAtPeriodEnd
                              ? "Access through"
                              : "Next billing"}
                        </p>
                        <p className="mt-2 text-sm font-extrabold text-white/84">
                          {formatMembershipDate(
                            membershipDetails.isPaused
                              ? membershipDetails.pausedAt
                              : membershipDetails.cancelAtPeriodEnd
                                ? membershipDetails.currentPeriodEnd
                                : membershipDetails.nextBillingAt ||
                                  membershipDetails.currentPeriodEnd,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/9 bg-black/16 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/36">
                          Billing
                        </p>
                        <p className="mt-2 text-sm font-extrabold text-white/84">
                          {membershipDetails.provider === "stripe"
                            ? "Stripe"
                            : membershipDetails.provider === "gkp_billing"
                              ? "Guru Kids Pro"
                              : "Legacy billing"}
                        </p>
                      </div>
                    </div>

                    {membershipDetails.pendingPlan && (
                      <div className="mt-4 rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.07] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.13em] text-cyan-100/58">
                          Scheduled Plan Change
                        </p>

                        <p className="mt-2 text-sm font-extrabold text-white">
                          {membershipDetails.planName}
                          {" → "}
                          {membershipDetails.pendingPlan.name}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-white/46">
                          Effective from{" "}
                          {formatMembershipDate(
                            membershipDetails.pendingPlan.effectiveAt ||
                              membershipDetails.currentPeriodEnd,
                          )}
                          .
                        </p>

                        <button
                          type="button"
                          disabled={isWorkingMembership}
                          onClick={() =>
                            void runMembershipAction("cancel_plan_change")
                          }
                          className="mt-4 min-h-[44px] rounded-full border border-red-200/20 bg-red-300/[0.08] px-4 text-[10px] font-extrabold uppercase tracking-[0.11em] text-red-100 transition hover:bg-red-300/[0.14] disabled:opacity-45"
                        >
                          Cancel Pending Change
                        </button>
                      </div>
                    )}

                    {membershipDetails.provider === "stripe" ? (
                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-white/9 bg-black/14 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.13em] text-white/40">
                            Plan & Payment
                          </p>

                          {membershipDetails.canChangePlan &&
                            membershipPlanOptions.length > 0 && (
                              <div className="mt-4">
                                <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/36">
                                  Change plan next cycle
                                </label>

                                <select
                                  value={membershipTargetPlanId}
                                  onChange={(event) =>
                                    setMembershipTargetPlanId(event.target.value)
                                  }
                                  className="mt-2 min-h-[48px] w-full rounded-2xl border border-white/12 bg-[#071022] px-4 text-sm font-bold text-white outline-none"
                                >
                                  <option value="">
                                    Choose a new plan
                                  </option>

                                  {membershipPlanOptions.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                      {plan.name} ·{" "}
                                      {new Intl.NumberFormat("en-SG", {
                                        style: "currency",
                                        currency: plan.currency || "SGD",
                                      }).format(plan.amount)}
                                      {" / "}
                                      {plan.billingCycle === "annual"
                                        ? "year"
                                        : "month"}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  disabled={
                                    isWorkingMembership ||
                                    !membershipTargetPlanId
                                  }
                                  onClick={() =>
                                    void runMembershipAction("change_plan")
                                  }
                                  className="mt-3 min-h-[46px] w-full rounded-full border border-cyan-200/22 bg-cyan-300/12 px-4 text-[10px] font-extrabold uppercase tracking-[0.11em] text-white transition hover:bg-cyan-300/20 disabled:opacity-45"
                                >
                                  Schedule Plan Change
                                </button>
                              </div>
                            )}

                          {membershipDetails.canUpdatePaymentMethod && (
                            <button
                              type="button"
                              disabled={isWorkingMembership}
                              onClick={() =>
                                void runMembershipAction("payment_method")
                              }
                              className="mt-4 min-h-[46px] w-full rounded-full border border-violet-200/22 bg-violet-300/12 px-4 text-[10px] font-extrabold uppercase tracking-[0.11em] text-white transition hover:bg-violet-300/20 disabled:opacity-45"
                            >
                              Update Payment Method
                            </button>
                          )}
                        </div>

                        <div className="rounded-2xl border border-white/9 bg-black/14 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.13em] text-white/40">
                            Membership Status
                          </p>

                          {membershipDetails.canPause && (
                            <>
                              <button
                                type="button"
                                disabled={isWorkingMembership}
                                onClick={() =>
                                  void runMembershipAction("pause_membership")
                                }
                                className="mt-4 min-h-[46px] w-full rounded-full border border-amber-200/20 bg-amber-300/[0.08] px-4 text-[10px] font-extrabold uppercase tracking-[0.11em] text-amber-50 transition hover:bg-amber-300/[0.14] disabled:opacity-45"
                              >
                                Pause Membership
                              </button>

                              <p className="mt-2 text-xs leading-5 text-white/38">
                                Pausing stops learning access and Stripe invoice generation immediately. Your account, progress, DT and DG remain.
                              </p>
                            </>
                          )}

                          {membershipDetails.canResume && (
                            <>
                              <button
                                type="button"
                                disabled={isWorkingMembership}
                                onClick={() =>
                                  void runMembershipAction("resume_membership")
                                }
                                className="mt-4 min-h-[46px] w-full rounded-full border border-green-200/22 bg-green-300/[0.10] px-4 text-[10px] font-extrabold uppercase tracking-[0.11em] text-green-50 transition hover:bg-green-300/[0.16] disabled:opacity-45"
                              >
                                Resume Membership
                              </button>

                              <p className="mt-2 text-xs leading-5 text-white/38">
                                Stripe may collect a resumption payment before paid learning access is restored.
                              </p>
                            </>
                          )}

                          {membershipDetails.canCancelAtPeriodEnd && (
                            <button
                              type="button"
                              disabled={isWorkingMembership}
                              onClick={() =>
                                void runMembershipAction("cancel_period_end")
                              }
                              className="mt-4 min-h-[46px] w-full rounded-full border border-red-200/20 bg-red-300/[0.07] px-4 text-[10px] font-extrabold uppercase tracking-[0.11em] text-red-100 transition hover:bg-red-300/[0.13] disabled:opacity-45"
                            >
                              Stop Future Renewal
                            </button>
                          )}

                          {membershipDetails.canKeepSubscription && (
                            <button
                              type="button"
                              disabled={isWorkingMembership}
                              onClick={() =>
                                void runMembershipAction("keep_subscription")
                              }
                              className="mt-4 min-h-[46px] w-full rounded-full border border-green-200/22 bg-green-300/[0.10] px-4 text-[10px] font-extrabold uppercase tracking-[0.11em] text-green-50 transition hover:bg-green-300/[0.16] disabled:opacity-45"
                            >
                              Keep Membership
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-300/[0.06] p-4">
                        <p className="text-sm font-bold text-amber-100">
                          {membershipDetails.provider === "gkp_billing"
                            ? "This membership is managed through Guru Kids Pro billing."
                            : "This is a legacy non-Stripe Dreamscape membership."}
                        </p>

                        <p className="mt-2 text-xs leading-5 text-white/42">
                          Use Support for billing changes. Your existing membership remains visible here and is not removed by the Stripe migration.
                        </p>
                      </div>
                    )}

                    {membershipMessage && (
                      <p className="mt-4 rounded-2xl border border-green-200/18 bg-green-300/[0.08] px-4 py-3 text-sm text-green-100">
                        {membershipMessage}
                      </p>
                    )}

                    {membershipError && (
                      <p className="mt-4 rounded-2xl border border-red-200/18 bg-red-300/[0.08] px-4 py-3 text-sm text-red-100">
                        {membershipError}
                      </p>
                    )}

                    <div className="mt-6 border-t border-white/8 pt-5">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.13em] text-white/40">
                            Billing History
                          </p>
                          <p className="mt-1 text-xs text-white/34">
                            Latest recorded Dreamscape subscription payments
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isWorkingMembership}
                          onClick={() => void loadMembershipControls()}
                          className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white/62 transition hover:bg-white/[0.08] disabled:opacity-45"
                        >
                          Refresh
                        </button>
                      </div>

                      {membershipPayments.length === 0 ? (
                        <p className="mt-4 text-sm text-white/40">
                          No payment history is recorded yet.
                        </p>
                      ) : (
                        <div className="mt-4 space-y-2">
                          {membershipPayments.slice(0, 6).map((payment) => (
                            <div
                              key={payment.id}
                              className="flex flex-col gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-sm font-bold text-white/78">
                                  {new Intl.NumberFormat("en-SG", {
                                    style: "currency",
                                    currency: payment.currency || "SGD",
                                  }).format(Number(payment.amount || 0))}
                                </p>

                                <p className="mt-1 text-xs text-white/36">
                                  {formatMembershipDate(
                                    payment.paid_at || payment.created_at,
                                  )}
                                </p>
                              </div>

                              <span
                                className={`text-xs font-extrabold uppercase tracking-[0.1em] ${
                                  payment.status === "succeeded"
                                    ? "text-green-200"
                                    : payment.status === "refunded"
                                      ? "text-amber-100"
                                      : "text-white/46"
                                }`}
                              >
                                {payment.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>

              {/* Account controls */}
              <section className="rounded-[26px] border border-white/12 bg-white/[0.025] p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">
                  Account
                </p>

                <h3 className="mt-3 text-2xl font-bold text-white">
                  Session & account controls
                </h3>

                <button
                  type="button"
                  onClick={logout}
                  className="mt-5 min-h-[50px] w-full rounded-full border border-white/16 bg-white/[0.07] px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:bg-white/[0.11]"
                >
                  Log Out
                </button>

                <div className="mt-5 border-t border-white/8 pt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-200/60">
                    Account management
                  </p>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => void openDeleteAccount()}
                      className="min-h-[48px] w-full rounded-full border border-red-200/22 bg-red-300/[0.07] px-4 text-[10px] font-extrabold uppercase tracking-[0.11em] text-red-100 transition hover:bg-red-300/[0.13]"
                    >
                      Delete Account
                    </button>

                    <p className="mt-2 text-xs leading-5 text-white/34">
                      Permanent deletion has a separate protected confirmation flow. Staff and organisation-managed accounts require administrator assistance.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="border-t border-white/10 bg-white/[0.02] px-5 py-4 sm:px-7">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="min-h-[48px] w-full rounded-full bg-white px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#071022] transition hover:scale-[1.005]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-[140] flex items-start justify-center overflow-y-auto bg-[#020813]/90 px-4 py-6 backdrop-blur-md sm:py-10">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[30px] border border-red-200/24 bg-[#0a0d1a] shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
            <button
              type="button"
              disabled={isDeletingAccount}
              onClick={() => setShowDeleteAccount(false)}
              className="absolute right-5 top-5 z-20 rounded-full border border-white/14 bg-white/[0.07] px-3 py-1.5 text-white transition hover:bg-white/[0.12] disabled:opacity-40"
            >
              ✕
            </button>

            <div className="p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-200">
                Permanent Account Deletion
              </p>

              <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-white">
                Delete Dreamscape account?
              </h2>

              <p className="mt-4 text-sm leading-6 text-white/56">
                This is different from pausing or stopping renewal. Deleting the account disables the Dreamscape login and removes or anonymises the learner&apos;s personal Dreamscape data.
              </p>

              {deletePreflightLoading ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 text-sm text-white/52">
                  Checking whether this account can be safely deleted...
                </div>
              ) : deleteBlockers.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-300/[0.07] p-5">
                  <p className="text-sm font-extrabold text-amber-100">
                    This account cannot be self-deleted yet.
                  </p>

                  <div className="mt-3 space-y-2">
                    {deleteBlockers.map((blocker) => (
                      <p
                        key={blocker}
                        className="text-sm leading-6 text-white/58"
                      >
                        • {blocker}
                      </p>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteAccount(false);
                      setSupportMessage("");
                      setShowSupport(true);
                    }}
                    className="mt-5 min-h-[48px] w-full rounded-full border border-amber-200/22 bg-amber-300/[0.10] px-5 text-xs font-extrabold uppercase tracking-[0.13em] text-amber-50 transition hover:bg-amber-300/[0.16]"
                  >
                    Contact Support
                  </button>
                </div>
              ) : deleteCanProceed ? (
                <>
                  <div className="mt-6 rounded-2xl border border-red-200/16 bg-red-300/[0.05] p-5">
                    <p className="text-sm font-extrabold text-red-100">
                      What deletion does
                    </p>

                    <div className="mt-3 space-y-2 text-sm leading-6 text-white/56">
                      <p>• Your Dreamscape login is disabled.</p>
                      <p>• Paid Dreamscape learning access ends immediately.</p>
                      <p>• Any live Stripe Dreamscape subscription is cancelled immediately so it cannot renew.</p>
                      <p>• Quiz responses, learner progress, DT, DG and exchange holdings linked to the learner are removed.</p>
                      <p>• Profile details such as email, username and date of birth are removed or anonymised.</p>
                      <p>• Required billing and deletion-audit records may be retained in anonymised form.</p>
                      <p>• Account deletion does not automatically create a Stripe refund.</p>
                    </div>
                  </div>

                  <label className="mt-6 block">
                    <span className="text-xs font-bold uppercase tracking-[0.13em] text-white/42">
                      Type DELETE
                    </span>

                    <input
                      value={deleteWord}
                      onChange={(event) => {
                        setDeleteWord(event.target.value);
                        setDeleteAccountError("");
                      }}
                      autoComplete="off"
                      placeholder="DELETE"
                      className="mt-2 min-h-[50px] w-full rounded-2xl border border-red-200/18 bg-black/24 px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/22 focus:border-red-200/40"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="text-xs font-bold uppercase tracking-[0.13em] text-white/42">
                      Confirm account email
                    </span>

                    <input
                      value={deleteEmailConfirmation}
                      onChange={(event) => {
                        setDeleteEmailConfirmation(event.target.value);
                        setDeleteAccountError("");
                      }}
                      autoComplete="off"
                      placeholder={email || "Account email"}
                      className="mt-2 min-h-[50px] w-full rounded-2xl border border-red-200/18 bg-black/24 px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/22 focus:border-red-200/40"
                    />
                  </label>

                  <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <input
                      type="checkbox"
                      checked={deleteAcknowledgeAccessLoss}
                      onChange={(event) => {
                        setDeleteAcknowledgeAccessLoss(event.target.checked);
                        setDeleteAccountError("");
                      }}
                      className="mt-1 h-4 w-4"
                    />

                    <span className="text-sm leading-6 text-white/58">
                      I understand that Dreamscape learning access ends immediately and cannot be recovered through this account.
                    </span>
                  </label>

                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <input
                      type="checkbox"
                      checked={deleteAcknowledgeNoRefund}
                      onChange={(event) => {
                        setDeleteAcknowledgeNoRefund(event.target.checked);
                        setDeleteAccountError("");
                      }}
                      className="mt-1 h-4 w-4"
                    />

                    <span className="text-sm leading-6 text-white/58">
                      I understand that deleting the account does not automatically refund previous Stripe payments.
                    </span>
                  </label>

                  {deleteAccountError && (
                    <p className="mt-4 rounded-2xl border border-red-200/18 bg-red-300/[0.08] px-4 py-3 text-sm leading-6 text-red-100">
                      {deleteAccountError}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={
                      isDeletingAccount ||
                      deleteWord !== "DELETE" ||
                      deleteEmailConfirmation.trim().toLowerCase() !==
                        String(email || "").trim().toLowerCase() ||
                      !deleteAcknowledgeAccessLoss ||
                      !deleteAcknowledgeNoRefund
                    }
                    onClick={() => void deleteAccountPermanently()}
                    className="mt-6 min-h-[52px] w-full rounded-full border border-red-200/28 bg-red-500/22 px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-red-50 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    {isDeletingAccount
                      ? "Deleting Account..."
                      : "Permanently Delete Account"}
                  </button>

                  <button
                    type="button"
                    disabled={isDeletingAccount}
                    onClick={() => setShowDeleteAccount(false)}
                    className="mt-3 min-h-[48px] w-full rounded-full border border-white/14 bg-white/[0.05] px-5 text-xs font-extrabold uppercase tracking-[0.13em] text-white/76 transition hover:bg-white/[0.09] disabled:opacity-40"
                  >
                    Keep My Account
                  </button>
                </>
              ) : (
                <div className="mt-6 rounded-2xl border border-red-200/16 bg-red-300/[0.05] p-5">
                  <p className="text-sm leading-6 text-red-100">
                    {deleteAccountError ||
                      "Account deletion is not available right now."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Support modal */}
      {showSupport && (
        <div className="fixed inset-0 z-[125] flex items-start justify-center overflow-y-auto bg-[#020813]/84 px-4 py-8 backdrop-blur-md sm:py-12">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[30px] border border-violet-200/22 bg-[#071022] shadow-[0_30px_90px_rgba(0,0,0,0.58)]">
            <button
              type="button"
              onClick={() => setShowSupport(false)}
              className="absolute right-5 top-5 z-20 rounded-full border border-white/14 bg-white/[0.07] px-3 py-1.5 text-white transition hover:bg-white/[0.12]"
            >
              ✕
            </button>

            <div className="p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7b7ff]">
                Dreamscape Support
              </p>

              <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-white">
                How can we help?
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-white/54">
                Contact the Dreamscape team for login, account, membership, billing, Learning Missions, Dream Token, Dream Gem, or technical issues.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Login or account",
                  "Membership & billing",
                  "Learning Missions",
                  "Dream Tokens / Dream Gems",
                  "Technical problem",
                  "Something else",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/9 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-white/70"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-violet-200/14 bg-violet-300/[0.05] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-white/38">
                  Account
                </p>
                <p className="mt-2 break-all text-sm text-white/72">
                  {email || "No active login"}
                </p>
              </div>

              <button
                type="button"
                onClick={openSupportEmail}
                className="mt-6 flex min-h-[54px] w-full items-center justify-center rounded-full border border-violet-200/25 bg-violet-300/16 px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-white transition hover:scale-[1.01] hover:bg-violet-300/24"
              >
                Email Support
              </button>

              <p className="mt-4 text-center text-sm text-white/42">
                admin@gurukidspro.com
              </p>

              {supportMessage && (
                <p className="mt-3 text-center text-xs leading-5 text-violet-100/64">
                  {supportMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dream Token history */}
      {showTokenHistory && (
        <div className="fixed inset-0 z-[130] flex items-start justify-center overflow-y-auto bg-[#020813]/78 px-4 py-10 backdrop-blur-md">
          <div className="relative h-[74vh] w-full max-w-4xl overflow-hidden rounded-[30px] border border-yellow-300/30 bg-[#041124] shadow-[0_0_55px_rgba(250,204,21,0.12),0_30px_90px_rgba(0,0,0,0.55)]">
            <button
              type="button"
              onClick={() => setShowTokenHistory(false)}
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
                      Digital currency for use inside Dreamscape only
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
                    Track DT earned and spent across Dreamscape&apos;s digital activities, upgrades, and virtual assets.
                  </p>
                </div>

                {tokenTransactions.length === 0 ? (
                  <p className="mt-6 text-sm text-white/48">
                    No Dream Token activity yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {tokenTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {transaction.title}
                          </p>

                          <p className="mt-1 text-sm text-white/42">
                            {formatTransactionDate(transaction.created_at)}
                          </p>
                        </div>

                        <p
                          className={`shrink-0 font-bold ${
                            transaction.amount < 0
                              ? "text-red-300"
                              : "text-green-300"
                          }`}
                        >
                          {formatTokenTransactionAmount(transaction)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 bg-white/[0.03] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowTokenHistory(false)}
                  className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.01]"
                >
                  Close Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dream Gem history */}
      {showGemHistory && (
        <div className="fixed inset-0 z-[135] flex items-start justify-center overflow-y-auto bg-[#020813]/82 px-4 py-8 backdrop-blur-md sm:py-10">
          <div className="relative h-[82vh] w-full max-w-4xl overflow-hidden rounded-[30px] border border-fuchsia-200/32 bg-[#071022] shadow-[0_0_60px_rgba(217,70,239,0.14),0_30px_90px_rgba(0,0,0,0.58)]">
            <button
              type="button"
              onClick={() => setShowGemHistory(false)}
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
                      Premium achievement rewards · Not exchangeable for cash
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
                    Dream Gems are earned from eligible class attendance and selected Core, Science and Think Learning Missions. They may be redeemed for selected physical or digital Dreamscape rewards, subject to availability.
                  </p>
                </div>

                {!hasStudentRewardsAccess && (
                  <div className="mt-5 rounded-3xl border border-fuchsia-200/22 bg-[linear-gradient(145deg,rgba(92,38,130,0.42),rgba(19,22,58,0.72))] p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e7b7ff]">
                      Unlock Premium Rewards
                    </p>

                    <h4 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-white">
                      Get Student Access for Bigger Rewards
                    </h4>

                    <p className="mt-3 text-sm leading-6 text-white/60">
                      Student Access unlocks eligible Dream Gem earning opportunities across selected paid learning activities.
                    </p>

                    <button
                      type="button"
                      onClick={() => router.push("/nova/membership-portal")}
                      className="mt-5 w-full rounded-full border border-fuchsia-100/30 bg-fuchsia-300/18 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-fuchsia-300/24"
                    >
                      Get Student Access
                    </button>
                  </div>
                )}

                {hasStudentRewardsAccess && (
                  <div className="mt-5 rounded-2xl border border-green-200/18 bg-green-400/[0.08] px-5 py-4">
                    <p className="text-sm font-bold text-green-200">
                      Student reward access is active on this account.
                    </p>
                  </div>
                )}

                {gemTransactions.length === 0 ? (
                  <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-5 text-sm text-white/48">
                    No Dream Gem activity yet. Your balance will remain at 0 until an eligible reward or adjustment is recorded.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {gemTransactions.map((transaction) => {
                      const isPositive = transaction.amount > 0;

                      return (
                        <div
                          key={transaction.id}
                          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-white">
                              {transaction.title}
                            </p>

                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/42">
                              <span>
                                {formatTransactionDate(transaction.created_at)}
                              </span>
                              <span>
                                {formatGemSource(transaction.source)}
                              </span>
                              <span>
                                Balance after: {transaction.balance_after} DG
                              </span>
                            </div>

                            {transaction.description && (
                              <p className="mt-2 text-sm leading-6 text-white/50">
                                {transaction.description}
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
                            {formatGemTransactionAmount(transaction)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-fuchsia-100/12 bg-fuchsia-300/[0.03] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowGemHistory(false)}
                  className="w-full rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#111028] transition hover:scale-[1.01]"
                >
                  Close Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 639px) {
          .dream-mobile-date-input {
            box-sizing: border-box;
            min-width: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }

          .dream-mobile-date-input::-webkit-date-and-time-value {
            min-width: 0;
            text-align: left;
          }
        }
      `}</style>
    </main>
  );
}
