"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type CustomBolt = {
  id: string;
  antenna: string;
  eye: string;
  leg: string;
  created_at: string;
};

type DreamTokenTransaction = {
  id: string;
  user_id: string;
  type: "earn" | "spend" | "physical";
  title: string;
  amount: number;
  token_kind: "virtual" | "physical";
  created_at: string;
};

const antennaImages: Record<string, string> = {
  "Explorer Antenna":
    "/activities/robot-workshop/bolt-final/explorer-antenna.png",
  "Lightning Antenna":
    "/activities/robot-workshop/bolt-final/lightning-antenna.png",
  "Satellite Antenna":
    "/activities/robot-workshop/bolt-final/satellite-antenna.png",
};

const eyeImages: Record<string, string> = {
  "Blue Lens": "/activities/robot-workshop/bolt-final/eye-blue-lens.png",
  "Green Scan": "/activities/robot-workshop/bolt-final/eye-green-scan.png",
  "Multi Scan": "/activities/robot-workshop/bolt-final/eye-multi-scan.png",
  "Green Scan Lens": "/activities/robot-workshop/bolt-final/eye-green-scan.png",
  "Multi-Scan Lens": "/activities/robot-workshop/bolt-final/eye-multi-scan.png",
};

const legImages: Record<string, string> = {
  "All-Terrain Leg":
    "/activities/robot-workshop/bolt-final/all-terrain leg.png",
  "Flying Leg": "/activities/robot-workshop/bolt-final/flying-leg.png",
  "Speed Leg": "/activities/robot-workshop/bolt-final/speed-leg.png",
};

function resolvePartImage(
  value: string | null | undefined,
  imageMap: Record<string, string>
) {
  if (!value) return "";

  if (value.startsWith("/")) {
    return value;
  }

  return imageMap[value] || "";
}

function addBoltToCart(bolt: CustomBolt) {
  const existingCart = JSON.parse(
    localStorage.getItem("dreamscape-cart") || "[]"
  );

  existingCart.push({
    type: "custom-bolt",
    antenna: bolt.antenna,
    eye: bolt.eye,
    leg: bolt.leg,
    quantity: 1,
  });

  localStorage.setItem("dreamscape-cart", JSON.stringify(existingCart));

  alert("Bolt added to cart!");
  window.location.href = "/cart";
}

function formatTransactionAmount(transaction: DreamTokenTransaction) {
  const prefix = transaction.amount > 0 ? "+" : "";

  if (transaction.token_kind === "physical") {
    return `${prefix}${transaction.amount} Token`;
  }

  return `${prefix}${transaction.amount} DT`;
}

function formatTransactionDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#05050a"
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

function BoltPreview({ bolt }: { bolt: CustomBolt }) {
  const antennaSrc = resolvePartImage(bolt.antenna, antennaImages);
  const eyeSrc = resolvePartImage(bolt.eye, eyeImages);
  const legSrc = resolvePartImage(bolt.leg, legImages);

  return (
    <div className="relative mx-auto h-[360px] w-[260px] overflow-hidden rounded-2xl bg-white">
      <img
        src="/activities/robot-workshop/Bolt-Base.png"
        alt="Custom Bolt"
        className="h-full w-full object-contain object-center"
      />

      {antennaSrc && (
        <img
          src={antennaSrc}
          alt={bolt.antenna}
          style={{
            position: "absolute",
            left: "52%",
            top: "0px",
            width: "45px",
            transform: "translateX(-50%)",
          }}
        />
      )}

      {eyeSrc && (
        <img
          src={eyeSrc}
          alt={bolt.eye}
          style={{
            position: "absolute",
            left: "51%",
            top: "75px",
            width: "105px",
            transform: "translateX(-50%)",
          }}
        />
      )}

      {legSrc && (
        <img
          src={legSrc}
          alt={bolt.leg}
          style={{
            position: "absolute",
            left: "50%",
            top: "220px",
            width: "160px",
            transform: "translateX(-50%)",
          }}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bolts, setBolts] = useState<CustomBolt[]>([]);
  const [tokenTransactions, setTokenTransactions] = useState<
    DreamTokenTransaction[]
  >([]);
  const [showTokenHistory, setShowTokenHistory] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);

  const dreamTokenBalance = tokenTransactions
    .filter((transaction) => transaction.token_kind === "virtual")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const physicalTokenBalance = tokenTransactions
    .filter((transaction) => transaction.token_kind === "physical")
    .reduce((total, transaction) => total + transaction.amount, 0);

  useEffect(() => {
    async function loadProfile() {
      setIsLoadingTokens(true);

      const { data, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("User error:", userError.message);
      }

      if (!data.user) {
        setEmail(null);
        setIsAdmin(false);
        setBolts([]);
        setTokenTransactions([]);
        setIsLoadingTokens(false);
        return;
      }

      setEmail(data.user.email ?? null);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile role error:", profileError.message);
      }

      setIsAdmin(profile?.role?.trim().toLowerCase() === "admin");

      const { data: savedBolts, error: boltsError } = await supabase
        .from("custom_bolts")
        .select("*")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });

      if (boltsError) {
        console.error("Bolts error:", boltsError.message);
      }

      setBolts(savedBolts ?? []);

      const { data: savedTokenTransactions, error: tokenError } =
        await supabase
          .from("dream_token_transactions")
          .select("*")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false });

      if (tokenError) {
        console.error("Token error:", tokenError.message);
      }

      setTokenTransactions(savedTokenTransactions ?? []);
      setIsLoadingTokens(false);
    }

    loadProfile();
  }, []);

  async function deleteBolt(id: string) {
    const confirmDelete = window.confirm("Delete this saved Bolt?");

    if (!confirmDelete) return;

    const { error } = await supabase.from("custom_bolts").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setBolts((current) => current.filter((bolt) => bolt.id !== id));
  }

  async function logout() {
    localStorage.removeItem("seen-prologue");
    localStorage.removeItem("seen-chapter-guide");

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  return (
    <main className="relative min-h-screen bg-white px-8 py-10 text-indigo-950">
      <button
        onClick={() => router.push("/")}
        className="absolute left-8 top-8 z-30 rounded-full bg-white px-5 py-2 text-sm tracking-wide text-indigo-950 shadow-md transition hover:scale-[1.03]"
      >
        ← Back to World
      </button>

      <div className="fixed right-8 top-8 z-50 flex items-center gap-3">
        {isAdmin && (
  <button
    type="button"
    onClick={() => router.push("/admin/dream-tokens")}
    style={{
      backgroundColor: "#6d4f8f",
      color: "#ffffff",
      padding: "12px 24px",
      minWidth: "150px",
      height: "46px",
      borderRadius: "999px",
      border: "none",
      fontSize: "13px",
      fontWeight: 800,
      letterSpacing: "0.12em",
      cursor: "pointer",
      boxShadow: "0 12px 28px rgba(109, 79, 143, 0.28)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
      textTransform: "uppercase",
    }}
  >
    ADMIN PANEL
  </button>
)}

        <button
          type="button"
          onClick={logout}
          className="rounded-full bg-indigo-950 px-5 py-3 text-sm tracking-wide text-white shadow-md transition hover:scale-[1.03]"
        >
          LOG OUT
        </button>

        <button
          type="button"
          onClick={() => router.push("/cart")}
          aria-label="Cart"
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "999px",
            backgroundColor: "#ffffff",
            border: "1px solid rgba(36, 18, 77, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 12px 28px rgba(36, 18, 77, 0.12)",
          }}
        >
          <CartIcon />
        </button>
      </div>

      <div className="mx-auto max-w-6xl pt-2">
        <div>
          <h1 className="text-5xl font-extralight tracking-[0.16em]">
            MY PROFILE
          </h1>

          <p className="mt-4 text-indigo-950/60">
            {email ? `Logged in as ${email}` : "Not logged in"}
          </p>
        </div>

        <section className="mt-10 rounded-3xl border border-violet-200 bg-white p-6 shadow-[0_0_50px_rgba(167,139,250,0.25)]">
          <h2 className="text-2xl font-light">My Custom Bolts</h2>

          {bolts.length === 0 ? (
            <p className="mt-3 text-sm text-indigo-950/60">
              Your saved Bolt designs will appear here.
            </p>
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {bolts.map((bolt) => (
                <div
                  key={bolt.id}
                  className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5"
                >
                  <BoltPreview bolt={bolt} />

                  <button
                    onClick={() => addBoltToCart(bolt)}
                    className="mt-4 w-full rounded-full bg-indigo-950 px-5 py-3 text-sm tracking-[0.08em] text-white transition hover:scale-[1.02]"
                  >
                    BRING BOLT TO LIFE
                  </button>

                  <button
                    onClick={() => deleteBolt(bolt.id)}
                    className="mt-3 w-full rounded-full bg-white px-5 py-3 text-sm tracking-[0.08em] text-red-500 shadow-sm transition hover:bg-red-50"
                  >
                    DELETE BOLT
                  </button>

                  <p className="mt-3 text-center text-xs text-indigo-950/60">
                    Turn your custom Bolt into a real 3D printed collectible.
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <button
            onClick={() => setShowTokenHistory(true)}
            className="w-full rounded-3xl border border-yellow-300/50 bg-white p-5 text-left shadow-[0_0_35px_rgba(250,204,21,0.18)] transition hover:scale-[1.01] hover:shadow-[0_0_45px_rgba(250,204,21,0.28)]"
          >
            <div className="flex items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <img
                  src="/dreamscape/dream-token.png"
                  alt="Dream Token"
                  className="h-14 w-14 object-contain"
                />

                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-yellow-700">
                    Dream Token Wallet
                  </p>

                  <h2 className="mt-1 text-xl font-light text-indigo-950">
                    View balance and history
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full bg-yellow-50 px-5 py-3">
                {isLoadingTokens ? (
                  <span className="text-sm text-indigo-950/50">Loading...</span>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-indigo-950">
                      {dreamTokenBalance.toLocaleString()}
                    </span>

                    <span className="text-sm font-semibold tracking-[0.16em] text-yellow-700">
                      DT
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        </section>
      </div>

      {showTokenHistory && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-indigo-950/70 px-4 py-10 backdrop-blur-sm">
          <div className="relative h-[70vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-yellow-300/40 bg-white shadow-2xl">
            <button
              onClick={() => setShowTokenHistory(false)}
              className="absolute right-5 top-5 z-20 rounded-full bg-indigo-50 px-3 py-1 text-indigo-950 transition hover:bg-indigo-100"
            >
              ✕
            </button>

            <div className="grid h-full grid-rows-[auto_1fr_auto]">
              <div className="border-b border-indigo-100 px-6 py-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/dreamscape/dream-token.png"
                    alt="Dream Token"
                    className="object-contain"
                    style={{
                      width: "64px",
                      height: "64px",
                      maxWidth: "64px",
                      maxHeight: "64px",
                    }}
                  />

                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-yellow-700">
                      Dream Token Wallet
                    </p>

                    <div className="mt-1 flex items-end gap-2">
                      <p className="text-3xl font-light leading-none text-indigo-950">
                        {dreamTokenBalance.toLocaleString()}
                      </p>

                      <p className="pb-1 text-sm font-semibold tracking-[0.16em] text-indigo-950">
                        DT
                      </p>
                    </div>

                    <p className="mt-1 text-sm text-indigo-950/50">
                      {physicalTokenBalance} physical Dream Tokens collected
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto px-6 py-5">
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <h3 className="text-lg font-medium text-indigo-950">
                    Dream Token History
                  </h3>

                  <p className="mt-1 text-sm text-indigo-950/50">
                    Track tokens earned from classes, items unlocked, and
                    physical tokens collected.
                  </p>
                </div>

                {tokenTransactions.length === 0 ? (
                  <p className="mt-6 text-sm text-indigo-950/50">
                    No Dream Token activity yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {tokenTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-white px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="font-medium text-indigo-950">
                            {transaction.title}
                          </p>

                          <p className="mt-1 text-sm text-indigo-950/50">
                            {formatTransactionDate(transaction.created_at)}
                          </p>
                        </div>

                        <p
                          className={`shrink-0 font-bold ${
                            transaction.type === "spend"
                              ? "text-red-500"
                              : transaction.type === "physical"
                              ? "text-blue-500"
                              : "text-green-600"
                          }`}
                        >
                          {formatTransactionAmount(transaction)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-indigo-100 bg-white px-6 py-4">
                <button
                  onClick={() => setShowTokenHistory(false)}
                  className="w-full rounded-full bg-indigo-950 px-5 py-3 text-sm tracking-[0.12em] text-white transition hover:scale-[1.01]"
                >
                  CLOSE WALLET
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}