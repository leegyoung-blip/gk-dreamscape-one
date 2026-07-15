"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  sector: string;
  description: string;
  current_price: number;
  previous_price: number;
  is_active: boolean;
  display_order: number;
  updated_at: string;
};

type Holding = {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  average_price: number;
  created_at: string;
  updated_at: string;
};

type Trade = {
  id: string;
  user_id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  created_at: string;
};

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
  return Math.round(value).toLocaleString();
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

export default function MiloStockExchangePage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dreamTokens, setDreamTokens] = useState(0);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [dob, setDob] = useState("");
  const [confirmAge, setConfirmAge] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);

  const [pageMessage, setPageMessage] = useState("");
  const [gateError, setGateError] = useState("");
  const [tradeMessage, setTradeMessage] = useState("");

  const selectedStock =
    stocks.find((stock) => stock.symbol === selectedSymbol) || stocks[0];

  const portfolioValue = useMemo(() => {
    return holdings.reduce((total, holding) => {
      const stock = stocks.find((item) => item.symbol === holding.symbol);
      if (!stock) return total;
      return total + holding.quantity * stock.current_price;
    }, 0);
  }, [holdings, stocks]);

  const totalEstimatedValue = dreamTokens + portfolioValue;

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
      loadStocks(),
      loadHoldings(user.id),
      loadTrades(user.id),
    ]);

    setLoading(false);
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
      setPageMessage(
        "Could not load your profile. Check that the Milo Exchange profile columns were added."
      );
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

    const total = data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;
    setDreamTokens(total);
  }

  async function loadStocks() {
    const { data, error } = await supabase
      .from("milo_exchange_stocks")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("Could not load stocks:", error.message);
      setPageMessage(
        "Could not load Milo’s fictional stocks. Check the stock table and RLS policy."
      );
      return;
    }

    const nextStocks = (data || []) as Stock[];
    setStocks(nextStocks);

    if (nextStocks.length > 0) {
      setSelectedSymbol((current) => current || nextStocks[0].symbol);
    }
  }

  async function loadHoldings(id: string) {
    const { data, error } = await supabase
      .from("milo_exchange_holdings")
      .select("*")
      .eq("user_id", id)
      .order("symbol", { ascending: true });

    if (error) {
      console.warn("Could not load holdings:", error.message);
      return;
    }

    setHoldings((data || []) as Holding[]);
  }

  async function loadTrades(id: string) {
    const { data, error } = await supabase
      .from("milo_exchange_trades")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.warn("Could not load trades:", error.message);
      return;
    }

    setTrades((data || []) as Trade[]);
  }

  function getHolding(symbol: string) {
    return holdings.find((holding) => holding.symbol === symbol);
  }

  function getChangePercent(stock: Stock) {
    if (!stock.previous_price) return 0;
    return ((stock.current_price - stock.previous_price) / stock.previous_price) * 100;
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
        console.warn("Age gate update failed:", error.message);
        setGateError(
          "Could not save your age check. Check the profiles update RLS policy."
        );
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
      console.warn("Age gate update failed:", error.message);
      setGateError(
        "Could not unlock Milo’s Stock Exchange. Check the profiles update RLS policy."
      );
      return;
    }

    await loadProfile(userId);
  }

  async function addTokenTransaction(
    id: string,
    amount: number,
    title: string
  ) {
    const { error } = await supabase.from("dream_token_transactions").insert({
      user_id: id,
      amount,
      token_kind: "virtual",
      type: amount < 0 ? "spend" : "earn",
      title,
    });

    if (error) {
      console.warn("Token transaction failed:", error.message);
      return false;
    }

    window.dispatchEvent(new Event("dream-tokens-updated"));
    return true;
  }

  async function refreshUserData() {
    if (!userId) return;

    await Promise.all([
      loadProfile(userId),
      loadDreamTokens(userId),
      loadHoldings(userId),
      loadTrades(userId),
    ]);
  }

  async function buyStock() {
    if (!userId || !selectedStock || !canEnterExchange) return;

    setTradeMessage("");

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const total = qty * selectedStock.current_price;

    if (total > dreamTokens) {
      setTradeMessage("You do not have enough Dreamscape Tokens for this trade.");
      return;
    }

    setActionLoading(true);

    const tokenSaved = await addTokenTransaction(
      userId,
      -total,
      `Bought ${qty} ${selectedStock.symbol} in Milo’s Stock Exchange`
    );

    if (!tokenSaved) {
      setActionLoading(false);
      setTradeMessage("Could not deduct Dreamscape Tokens.");
      return;
    }

    const existingHolding = getHolding(selectedStock.symbol);

    if (existingHolding) {
      const currentTotalCost =
        existingHolding.quantity * existingHolding.average_price;
      const newQuantity = existingHolding.quantity + qty;
      const newAveragePrice = Math.round(
        (currentTotalCost + total) / newQuantity
      );

      const { error: holdingError } = await supabase
        .from("milo_exchange_holdings")
        .update({
          quantity: newQuantity,
          average_price: newAveragePrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingHolding.id);

      if (holdingError) {
        console.warn("Holding update failed:", holdingError.message);
        setTradeMessage(
          "Tokens were deducted, but the holding update failed. Please check Supabase policies."
        );
        setActionLoading(false);
        await refreshUserData();
        return;
      }
    } else {
      const { error: holdingError } = await supabase
        .from("milo_exchange_holdings")
        .insert({
          user_id: userId,
          symbol: selectedStock.symbol,
          quantity: qty,
          average_price: selectedStock.current_price,
        });

      if (holdingError) {
        console.warn("Holding insert failed:", holdingError.message);
        setTradeMessage(
          "Tokens were deducted, but the holding insert failed. Please check Supabase policies."
        );
        setActionLoading(false);
        await refreshUserData();
        return;
      }
    }

    const { error: tradeError } = await supabase
      .from("milo_exchange_trades")
      .insert({
        user_id: userId,
        symbol: selectedStock.symbol,
        side: "buy",
        quantity: qty,
        price: selectedStock.current_price,
        total,
      });

    if (tradeError) {
      console.warn("Trade insert failed:", tradeError.message);
    }

    setTradeMessage(
      `Bought ${qty} share${qty === 1 ? "" : "s"} of ${selectedStock.symbol}.`
    );

    await refreshUserData();
    setActionLoading(false);
  }

  async function sellStock() {
    if (!userId || !selectedStock || !canEnterExchange) return;

    setTradeMessage("");

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const existingHolding = getHolding(selectedStock.symbol);

    if (!existingHolding || existingHolding.quantity < qty) {
      setTradeMessage("You do not have enough shares to sell.");
      return;
    }

    const total = qty * selectedStock.current_price;
    const remainingQuantity = existingHolding.quantity - qty;

    setActionLoading(true);

    if (remainingQuantity <= 0) {
      const { error: deleteError } = await supabase
        .from("milo_exchange_holdings")
        .delete()
        .eq("id", existingHolding.id);

      if (deleteError) {
        console.warn("Holding delete failed:", deleteError.message);
        setTradeMessage("Could not update your holding. Please try again.");
        setActionLoading(false);
        return;
      }
    } else {
      const { error: holdingError } = await supabase
        .from("milo_exchange_holdings")
        .update({
          quantity: remainingQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingHolding.id);

      if (holdingError) {
        console.warn("Holding update failed:", holdingError.message);
        setTradeMessage("Could not update your holding. Please try again.");
        setActionLoading(false);
        return;
      }
    }

    const tokenSaved = await addTokenTransaction(
      userId,
      total,
      `Sold ${qty} ${selectedStock.symbol} in Milo’s Stock Exchange`
    );

    if (!tokenSaved) {
      setTradeMessage(
        "The holding was updated, but the token credit failed. Please check Supabase policies."
      );
      setActionLoading(false);
      await refreshUserData();
      return;
    }

    const { error: tradeError } = await supabase
      .from("milo_exchange_trades")
      .insert({
        user_id: userId,
        symbol: selectedStock.symbol,
        side: "sell",
        quantity: qty,
        price: selectedStock.current_price,
        total,
      });

    if (tradeError) {
      console.warn("Trade insert failed:", tradeError.message);
    }

    setTradeMessage(
      `Sold ${qty} share${qty === 1 ? "" : "s"} of ${selectedStock.symbol}.`
    );

    await refreshUserData();
    setActionLoading(false);
  }

  if (loading) {
    return (
      <main className="pageShell centerShell">
        <section className="glassPanel">
          <p className="eyebrow">Milo’s Stock Exchange</p>
          <h1>Loading...</h1>
        </section>
        <PageStyles />
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="pageShell centerShell">
        <section className="glassPanel">
          <p className="eyebrow">16+ Feature</p>
          <h1>Log in to enter Milo’s Stock Exchange</h1>
          <p>
            This feature uses your Dreamscape profile to check your access and
            save your fictional portfolio.
          </p>
          <div className="buttonRow">
            <Link href="/login" className="primaryBtn">
              Log In
            </Link>
            <Link href="/milo-world" className="secondaryBtn">
              Back to Milo’s World
            </Link>
          </div>
        </section>
        <PageStyles />
      </main>
    );
  }

  if (isLockedUnder16) {
    return (
      <main className="pageShell centerShell">
        <section className="glassPanel">
          <p className="eyebrow">Locked Feature</p>
          <h1>Milo’s Stock Exchange is for users aged 16 and above.</h1>
          <p>
            This exchange is locked for your account. You can still earn
            Dreamscape Tokens in the Activity Lab and use other Dreamscape
            features.
          </p>

          {profile?.milo_exchange_locked_until && (
            <p className="smallNote">
              This feature can be reviewed again from{" "}
              {profile.milo_exchange_locked_until}.
            </p>
          )}

          <div className="buttonRow">
            <Link href="/milo-world" className="primaryBtn">
              Back to Milo’s World
            </Link>
          </div>
        </section>
        <PageStyles />
      </main>
    );
  }

  if (!canEnterExchange) {
    return (
      <main className="pageShell centerShell">
        <section className="glassPanel ageGatePanel">
          <p className="eyebrow">Age Check Required</p>
          <h1>Milo’s Stock Exchange is for users aged 16 and above.</h1>
          <p>
            Please verify your age before entering. This is a fictional market
            simulator using earned Dreamscape Tokens only.
          </p>

          <label className="inputGroup">
            <span>Date of birth</span>
            <input
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
            />
          </label>

          <label className="checkRow">
            <input
              type="checkbox"
              checked={confirmAge}
              onChange={(event) => setConfirmAge(event.target.checked)}
            />
            <span>I confirm that my date of birth is accurate.</span>
          </label>

          <label className="checkRow">
            <input
              type="checkbox"
              checked={confirmTerms}
              onChange={(event) => setConfirmTerms(event.target.checked)}
            />
            <span>
              I understand this is a fictional market simulator. Dreamscape
              Tokens have no cash value, cannot be purchased here, and cannot be
              cashed out.
            </span>
          </label>

          {gateError && <p className="errorText">{gateError}</p>}

          <div className="buttonRow">
            <button
              type="button"
              className="primaryBtn buttonReset"
              onClick={handleAgeVerification}
              disabled={actionLoading}
            >
              {actionLoading ? "Checking..." : "Continue"}
            </button>

            <Link href="/milo-world" className="secondaryBtn">
              Back to Milo’s World
            </Link>
          </div>
        </section>
        <PageStyles />
      </main>
    );
  }

  return (
    <main className="pageShell">
      <header className="topBar">
        <Link href="/milo-world" className="backLink">
          ← Milo’s World
        </Link>

        <div className="topBadges">
          <span>16+ Fictional Market</span>
          <span>No token purchasing</span>
        </div>
      </header>

      <section className="heroGrid">
        <div className="heroCopy">
          <p className="eyebrow">Milo’s Stock Exchange</p>
          <h1>Build your Dreamscape portfolio.</h1>
          <p>
            Buy and sell fictional Dreamscape stocks using earned Dreamscape
            Tokens. No real money. No cash-out. No real financial advice.
          </p>

          {pageMessage && <p className="warningText">{pageMessage}</p>}
        </div>

        <aside className="walletCard">
          <p>Available Tokens</p>
          <strong>{formatNumber(dreamTokens)} DT</strong>
          <span>Earned from Dreamscape gameplay</span>
        </aside>
      </section>

      <section className="statsGrid">
        <article>
          <span>Portfolio Value</span>
          <strong>{formatNumber(portfolioValue)} DT</strong>
        </article>

        <article>
          <span>Total Estimated Value</span>
          <strong>{formatNumber(totalEstimatedValue)} DT</strong>
        </article>

        <article>
          <span>Token Purchases</span>
          <strong>Disabled</strong>
        </article>
      </section>

      <section className="mainGrid">
        <section className="marketPanel">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Market</p>
              <h2>Fictional Dreamscape Stocks</h2>
            </div>
          </div>

          {stocks.length === 0 ? (
            <p className="emptyText">
              No active fictional stocks found. Check the
              milo_exchange_stocks table.
            </p>
          ) : (
            <div className="stockGrid">
              {stocks.map((stock) => {
                const holding = getHolding(stock.symbol);
                const isSelected = selectedSymbol === stock.symbol;
                const change = getChangePercent(stock);

                return (
                  <button
                    key={stock.symbol}
                    type="button"
                    className={`stockCard ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedSymbol(stock.symbol)}
                  >
                    <div className="stockTop">
                      <strong>{stock.symbol}</strong>
                      <span className={change >= 0 ? "upText" : "downText"}>
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(1)}%
                      </span>
                    </div>

                    <h3>{stock.name}</h3>
                    <p>{stock.sector}</p>

                    <div className="stockBottom">
                      <span>{stock.current_price} DT</span>
                      <small>You own {holding?.quantity || 0}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="tradePanel">
          {selectedStock ? (
            <>
              <p className="eyebrow">Trade</p>
              <h2>{selectedStock.name}</h2>
              <p>{selectedStock.description}</p>

              <div className="priceBox">
                <span>Current Price</span>
                <strong>{selectedStock.current_price} DT</strong>
              </div>

              <label className="inputGroup">
                <span>Quantity</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </label>

              <div className="tradeSummary">
                <span>Estimated Total</span>
                <strong>
                  {formatNumber(
                    Math.max(1, Math.floor(Number(quantity) || 1)) *
                      selectedStock.current_price
                  )}{" "}
                  DT
                </strong>
              </div>

              <div className="tradeButtons">
                <button
                  type="button"
                  className="buyBtn"
                  onClick={buyStock}
                  disabled={actionLoading}
                >
                  Buy
                </button>

                <button
                  type="button"
                  className="sellBtn"
                  onClick={sellStock}
                  disabled={actionLoading}
                >
                  Sell
                </button>
              </div>

              {tradeMessage && <p className="tradeMessage">{tradeMessage}</p>}
            </>
          ) : (
            <p className="emptyText">Select a stock to begin trading.</p>
          )}
        </aside>
      </section>

      <section className="portfolioPanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2>Your Holdings</h2>
          </div>
        </div>

        {holdings.length === 0 ? (
          <p className="emptyText">
            You do not own any fictional stocks yet. Choose a stock above to
            start building your Dreamscape portfolio.
          </p>
        ) : (
          <div className="holdingsTable">
            <div className="tableHeader">
              <span>Stock</span>
              <span>Qty</span>
              <span>Avg Price</span>
              <span>Current Value</span>
            </div>

            {holdings.map((holding) => {
              const stock = stocks.find((item) => item.symbol === holding.symbol);
              if (!stock) return null;

              return (
                <div className="tableRow" key={holding.id}>
                  <span>
                    <strong>{holding.symbol}</strong>
                    <small>{stock.name}</small>
                  </span>
                  <span>{holding.quantity}</span>
                  <span>{holding.average_price} DT</span>
                  <span>
                    {formatNumber(holding.quantity * stock.current_price)} DT
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="portfolioPanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Recent Activity</p>
            <h2>Trade History</h2>
          </div>
        </div>

        {trades.length === 0 ? (
          <p className="emptyText">No trades yet.</p>
        ) : (
          <div className="tradeHistory">
            {trades.map((trade) => (
              <div className="historyRow" key={trade.id}>
                <div>
                  <strong>
                    {trade.side === "buy" ? "Bought" : "Sold"} {trade.quantity}{" "}
                    {trade.symbol}
                  </strong>
                  <span>{formatDateTime(trade.created_at)}</span>
                </div>
                <p>{formatNumber(trade.total)} DT</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="disclaimer">
        <h2>Simulator Notice</h2>
        <p>
          Milo’s Stock Exchange is a fictional game simulator. It does not use
          real companies, real securities, real money, or financial advice.
          Dreamscape Tokens have no cash value, cannot be purchased on this
          exchange, and cannot be cashed out.
        </p>
      </section>

      <PageStyles />
    </main>
  );
}

function PageStyles() {
  return (
    <style jsx>{`
      .pageShell {
        min-height: 100vh;
        padding: 28px;
        color: #fff;
        background:
          radial-gradient(circle at top left, rgba(255, 155, 73, 0.32), transparent 34%),
          radial-gradient(circle at bottom right, rgba(119, 86, 255, 0.32), transparent 34%),
          linear-gradient(135deg, #120a18 0%, #20102a 52%, #0f0a16 100%);
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      .centerShell {
        display: grid;
        place-items: center;
      }

      .glassPanel {
        width: min(760px, 100%);
        padding: 34px;
        border-radius: 30px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(16px);
      }

      .ageGatePanel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .topBar {
        max-width: 1180px;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .backLink {
        color: #ffd29a;
        font-weight: 900;
        text-decoration: none;
      }

      .topBadges {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }

      .topBadges span {
        padding: 8px 12px;
        border-radius: 999px;
        color: #d9c8ff;
        background: rgba(142, 102, 255, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.12);
        font-size: 0.8rem;
        font-weight: 900;
      }

      .heroGrid {
        max-width: 1180px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 300px;
        gap: 18px;
        align-items: stretch;
      }

      .heroCopy,
      .walletCard,
      .statsGrid article,
      .marketPanel,
      .tradePanel,
      .portfolioPanel,
      .disclaimer {
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.13);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
        backdrop-filter: blur(16px);
      }

      .heroCopy {
        padding: 32px;
      }

      .walletCard {
        padding: 24px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .walletCard p {
        margin: 0;
        color: rgba(255, 255, 255, 0.58);
        font-weight: 800;
      }

      .walletCard strong {
        margin-top: 8px;
        font-size: 2.35rem;
        letter-spacing: -0.06em;
      }

      .walletCard span {
        margin-top: 8px;
        color: rgba(255, 255, 255, 0.58);
        font-size: 0.9rem;
      }

      .eyebrow {
        margin: 0 0 10px;
        color: #ffd29a;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.76rem;
        font-weight: 900;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.5rem, 7vw, 5.4rem);
        line-height: 0.95;
        letter-spacing: -0.075em;
      }

      h2 {
        margin: 0;
        font-size: clamp(1.5rem, 4vw, 2.4rem);
        letter-spacing: -0.055em;
      }

      h3 {
        margin: 10px 0 6px;
        font-size: 1.04rem;
        letter-spacing: -0.02em;
      }

      p {
        color: rgba(255, 255, 255, 0.74);
        line-height: 1.65;
      }

      .buttonRow {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 20px;
      }

      .primaryBtn,
      .secondaryBtn,
      .buttonReset {
        min-height: 46px;
        width: fit-content;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
        border-radius: 999px;
        font-weight: 900;
        text-decoration: none;
        cursor: pointer;
      }

      .primaryBtn {
        color: #201128;
        background: linear-gradient(135deg, #ffc071, #ff9147);
      }

      .secondaryBtn {
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.22);
        background: rgba(255, 255, 255, 0.08);
      }

      .buttonReset {
        border: none;
        font-family: inherit;
      }

      .buttonReset:disabled,
      .buyBtn:disabled,
      .sellBtn:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .inputGroup {
        display: flex;
        flex-direction: column;
        gap: 8px;
        color: rgba(255, 255, 255, 0.84);
        font-weight: 800;
      }

      input {
        min-height: 46px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(0, 0, 0, 0.22);
        color: #fff;
        padding: 0 14px;
        font-size: 1rem;
        outline: none;
      }

      .checkRow {
        display: grid;
        grid-template-columns: 20px 1fr;
        gap: 12px;
        align-items: flex-start;
        color: rgba(255, 255, 255, 0.78);
        line-height: 1.55;
      }

      .checkRow input {
        min-height: auto;
        margin-top: 4px;
      }

      .errorText {
        color: #ffb0b0;
        font-weight: 800;
      }

      .warningText {
        color: #ffd29a;
        font-weight: 800;
      }

      .smallNote {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.58);
      }

      .statsGrid {
        max-width: 1180px;
        margin: 18px auto 0;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
      }

      .statsGrid article {
        padding: 22px;
      }

      .statsGrid span {
        color: rgba(255, 255, 255, 0.58);
        font-weight: 800;
      }

      .statsGrid strong {
        display: block;
        margin-top: 10px;
        font-size: 1.7rem;
        letter-spacing: -0.05em;
      }

      .mainGrid {
        max-width: 1180px;
        margin: 18px auto 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 350px;
        gap: 18px;
      }

      .marketPanel,
      .tradePanel,
      .portfolioPanel,
      .disclaimer {
        padding: 24px;
      }

      .sectionHeader {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 18px;
      }

      .stockGrid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .stockCard {
        text-align: left;
        color: #fff;
        padding: 18px;
        min-height: 178px;
        border-radius: 22px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.12);
        cursor: pointer;
        transition:
          transform 0.2s ease,
          border-color 0.2s ease,
          background 0.2s ease;
        font-family: inherit;
      }

      .stockCard:hover,
      .stockCard.selected {
        transform: translateY(-3px);
        border-color: rgba(255, 200, 137, 0.5);
        background: rgba(255, 255, 255, 0.1);
      }

      .stockTop,
      .stockBottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }

      .stockTop strong {
        font-size: 1.1rem;
      }

      .stockCard p {
        margin: 0;
        font-size: 0.9rem;
      }

      .stockBottom {
        margin-top: 18px;
      }

      .stockBottom span {
        font-weight: 950;
        color: #ffd29a;
      }

      .stockBottom small {
        color: rgba(255, 255, 255, 0.58);
        font-weight: 800;
      }

      .upText {
        color: #8ff5b0;
        font-weight: 900;
      }

      .downText {
        color: #ff9d9d;
        font-weight: 900;
      }

      .tradePanel {
        position: sticky;
        top: 20px;
        height: fit-content;
      }

      .priceBox,
      .tradeSummary {
        margin: 18px 0;
        padding: 16px;
        border-radius: 18px;
        background: rgba(0, 0, 0, 0.22);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
      }

      .priceBox span,
      .tradeSummary span {
        color: rgba(255, 255, 255, 0.58);
        font-weight: 800;
      }

      .priceBox strong,
      .tradeSummary strong {
        font-size: 1.25rem;
      }

      .tradeButtons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 16px;
      }

      .buyBtn,
      .sellBtn {
        min-height: 46px;
        border: none;
        border-radius: 16px;
        font-weight: 950;
        cursor: pointer;
        font-family: inherit;
      }

      .buyBtn {
        color: #102116;
        background: #8ff5b0;
      }

      .sellBtn {
        color: #26100f;
        background: #ffb0a7;
      }

      .tradeMessage {
        margin-top: 14px;
        color: #ffd29a;
        font-weight: 850;
      }

      .portfolioPanel,
      .disclaimer {
        max-width: 1180px;
        margin: 18px auto 0;
      }

      .emptyText {
        margin-bottom: 0;
      }

      .holdingsTable {
        display: grid;
        gap: 8px;
      }

      .tableHeader,
      .tableRow {
        display: grid;
        grid-template-columns: 1.4fr 0.6fr 0.8fr 0.9fr;
        gap: 12px;
        align-items: center;
      }

      .tableHeader {
        padding: 0 14px 8px;
        color: rgba(255, 255, 255, 0.52);
        font-size: 0.82rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .tableRow {
        padding: 14px;
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.22);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .tableRow small {
        display: block;
        margin-top: 4px;
        color: rgba(255, 255, 255, 0.52);
      }

      .tradeHistory {
        display: grid;
        gap: 10px;
      }

      .historyRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 14px;
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.22);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .historyRow strong {
        display: block;
      }

      .historyRow span {
        display: block;
        margin-top: 4px;
        color: rgba(255, 255, 255, 0.52);
        font-size: 0.85rem;
      }

      .historyRow p {
        margin: 0;
        color: #ffd29a;
        font-weight: 900;
        white-space: nowrap;
      }

      .disclaimer h2 {
        margin-bottom: 8px;
      }

      .disclaimer p {
        margin-bottom: 0;
      }

      @media (max-width: 920px) {
        .pageShell {
          padding: 18px;
        }

        .topBar,
        .heroGrid,
        .statsGrid,
        .mainGrid {
          grid-template-columns: 1fr;
        }

        .topBar {
          align-items: flex-start;
          flex-direction: column;
        }

        .topBadges {
          justify-content: flex-start;
        }

        .stockGrid {
          grid-template-columns: 1fr;
        }

        .tradePanel {
          position: static;
        }

        .tableHeader {
          display: none;
        }

        .tableRow {
          grid-template-columns: 1fr;
        }

        .historyRow {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `}</style>
  );
}