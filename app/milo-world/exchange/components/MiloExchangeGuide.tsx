"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

export type MiloExchangeGuidePage = "home" | "stocks" | "property";

export type MiloExchangeGuideStep = {
  eyebrow: string;
  title: string;
  description: string;
  tip?: string;
  target?: string;
  section?: "portfolio" | "market" | "trade";
  propertyTab?: "map" | "properties" | "resale";
};

type Props = {
  page: MiloExchangeGuidePage;
  isMobile: boolean;
  onStepChange?: (step: MiloExchangeGuideStep, index: number) => void;
};

const GUIDE_VERSIONS: Record<MiloExchangeGuidePage, string> = {
  home: "v1",
  stocks: "v2",
  property: "v11",
};

const GUIDE_STEPS: Record<MiloExchangeGuidePage, MiloExchangeGuideStep[]> = {
  home: [
    {
      eyebrow: "Milo Guide",
      title: "Welcome to the Exchange",
      description:
        "This is your Dreamscape economy hub. I’ll show you where your cash, investments, activity, rankings and social portfolio live.",
      tip: "You can close this guide anytime and reopen it from Milo in the bottom-right corner.",
    },
    {
      eyebrow: "Step 1 · Portfolio",
      title: "Start with your net worth",
      description:
        "These cards separate your available Dream Tokens from the current value of your stocks and properties. Total Net Worth combines all three.",
      target: "home-portfolio-summary",
      tip: "Cash is what you can spend immediately. Stock and property values can change with their markets.",
    },
    {
      eyebrow: "Step 3 · Stocks",
      title: "Study before you trade",
      description:
        "The Stock Exchange lets you compare fictional companies, review price history and market news, then place buy or sell orders with Dream Tokens.",
      target: "home-stock-market",
      tip: "Use the Market section inside Stocks before moving to the Trade section.",
    },
    {
      eyebrow: "Step 4 · Property",
      title: "Build a property portfolio",
      description:
        "The Property Exchange lets you explore built districts, compare prices, rent potential and supply, buy primary units, or use the resale market.",
      target: "home-property-market",
      tip: "Property units are virtual Dreamscape assets and do not represent real-world ownership.",
    },
    {
      eyebrow: "Step 5 · Activity",
      title: "Track every Exchange movement",
      description:
        "Transaction History brings stock and property Dream Token movements together so you can see what changed your cash balance.",
      target: "home-transactions",
    },
    {
      eyebrow: "Step 6 · Rankings",
      title: "Compare total portfolios",
      description:
        "The leaderboard ranks Exchange portfolios using cash, stock value and property value together rather than looking at only one market.",
      target: "home-leaderboard",
    },
    {
      eyebrow: "Step 7 · Friends",
      title: "Connect your Exchange network",
      description:
        "Add Dreamscape friends here. This gives the Exchange a social layer for comparing portfolios and future property interactions.",
      target: "home-friends",
      tip: "Friend requests remain separate from public leaderboard rankings.",
    },
  ],
  stocks: [
    {
      eyebrow: "Milo Guide",
      title: "Welcome to the Stock Exchange",
      description:
        "The Stock Exchange is split into three parts: My Portfolio, Market and Trade. I’ll walk you through the flow from reviewing your position to placing an order.",
      target: "stock-navigation",
    },
    {
      eyebrow: "Step 1 · Portfolio",
      title: "Know what you already own",
      description:
        "My Portfolio shows total value, available cash, stock market value and unrealised profit or loss before you make another decision.",
      target: "stock-portfolio-summary",
      section: "portfolio",
    },
    {
      eyebrow: "Step 3 · Allocation",
      title: "Check concentration",
      description:
        "The allocation view shows how much of your Exchange value is held as cash versus each stock. It helps you see when one holding dominates your portfolio.",
      target: "stock-allocation",
      section: "portfolio",
    },
    {
      eyebrow: "Step 4 · Market",
      title: "Compare the available stocks",
      description:
        "Choose a stock here to compare its current price, daily move and how many shares you already own.",
      target: "stock-market-list",
      section: "market",
    },
    {
      eyebrow: "Step 5 · Research",
      title: "Use the graph and news together",
      description:
        "The price timeline gives historical context while published news explains events that may matter. Upcoming teasers deliberately keep future price effects hidden until release.",
      target: "stock-analysis",
      section: "market",
      tip: "A price move by itself does not explain why it happened—read the event information too.",
    },
    {
      eyebrow: "Step 6 · Jobs & Company Health",
      title: "Companies affect the people who work there",
      description:
        "Company health and hiring conditions can affect promotions, pay and job security for Dreamscape residents. Those income changes can then affect housing decisions.",
      target: "stock-company-economy",
      section: "market",
      tip: "Only some residents work for listed companies. Dreamscape also has private, community and self-employed work.",
    },
    {
      eyebrow: "Step 7 · Trade",
      title: "Review the order before buying or selling",
      description:
        "Select a stock, enter a quantity, check the order total and your current holding, then choose Buy or Sell.",
      target: "stock-trade-panel",
      section: "trade",
      tip: "Dream Tokens have no cash value. This is a fictional market simulator.",
    },
  ],
  property: [
    {
      eyebrow: "Milo Guide",
      title: "Welcome to your Dreamscape property journey",
      description:
        "Buy properties, improve them, meet residents, agree on rent, look after tenants and sell when the time is right.",
      target: "property-tabs",
      propertyTab: "map",
      tip: "Owning a property does not automatically create income. You need a tenant and an agreement.",
    },
    {
      eyebrow: "Step 1 · Market Pulse",
      title: "Watch the districts change",
      description:
        "Demand, available supply, occupancy and recent deals now shape each district. Stronger demand can gradually lift property values and rent potential.",
      target: "property-market-pulse",
      propertyTab: "map",
      tip: "The market moves slowly. One busy day should not suddenly double a property price.",
    },
    {
      eyebrow: "Step 2 · Property Map",
      title: "Choose your first property",
      description:
        "Explore Residential Hub or Commercial Hub, compare the Dreamscape sale price with the live market value and rent potential, then choose a property to buy.",
      target: "property-world-map",
      propertyTab: "map",
    },
    {
      eyebrow: "Step 3 · Your Property",
      title: "Every property becomes unique",
      description:
        "Your upgrades, condition, tenants and maintenance choices stay with that property over time.",
      target: "property-primary-market",
      propertyTab: "map",
      tip: "Rent potential is an estimate, not automatic income.",
    },
    {
      eyebrow: "Step 4 · Portfolio",
      title: "See how your portfolio is doing",
      description:
        "My Properties shows what your portfolio is worth, how much rent is coming in, which homes are occupied and which residents need your attention.",
      target: "property-portfolio-summary",
      propertyTab: "properties",
    },
    {
      eyebrow: "Step 5 · Finding Tenants",
      title: "Set the rent and see who applies",
      description:
        "Choose a weekly rent and list a vacant property. Dreamscape residents decide whether it suits their budget, lifestyle and needs.",
      target: "property-resident-overview",
      propertyTab: "properties",
      tip: "Higher rent may earn more if accepted, but it narrows the applicant pool.",
    },
    {
      eyebrow: "Step 6 · Property Messages",
      title: "Negotiations happen like real conversations",
      description:
        "Applications, purchase offers, lease agreements, renewal negotiations, move-out notices and maintenance messages arrive on your Property Phone. Open it from the bottom-right corner.",
      target: "property-phone-launcher",
      propertyTab: "properties",
      tip: "Accept, decline or counter renewal terms directly inside the conversation.",
    },
    {
      eyebrow: "Step 7 · Reputation",
      title: "Build a reputation residents trust",
      description:
        "Fair rent, good maintenance and happy tenants build your reputation. Poor treatment makes future relationships harder.",
      target: "property-reputation",
      propertyTab: "properties",
    },
    {
      eyebrow: "Step 8 · Resident Stories",
      title: "Residents have lives of their own",
      description:
        "Careers, families, savings and businesses can change over time. Those changes may affect what a resident can afford or whether they need a different property.",
      target: "property-resident-life",
      propertyTab: "properties",
      tip: "The same resident can return later with a different income, budget and housing need.",
    },
    {
      eyebrow: "Step 9 · Jobs & Income",
      title: "A resident's job can change their housing choices",
      description:
        "Some residents work for Stock Exchange companies while others have private, community or self-employed careers. Raises, promotions and job losses can change what they can afford.",
      target: "property-employment-economy",
      propertyTab: "properties",
      tip: "A company doing well does not guarantee every employee will be promoted, and a weak period does not mean everyone loses a job.",
    },
    {
      eyebrow: "Step 10 · Business Spaces",
      title: "Commercial property can power a real business",
      description:
        "Office and retail units can now become premises for Business Builder businesses. A good fit can help the business perform, while rent becomes a real operating cost.",
      target: "property-business-spaces",
      propertyTab: "properties",
      tip: "Own the space yourself or rent it to another Dreamscape business.",
    },
    {
      eyebrow: "Step 11 · Lease Renewal",
      title: "Talk things through before a lease ends",
      description:
        "Before a lease ends, your tenant may message you about staying. You can accept, decline or suggest different rent and lease terms.",
      target: "property-managed-units",
      propertyTab: "properties",
      tip: "If no renewal is agreed, the tenant moves out and the property becomes vacant again.",
    },
    {
      eyebrow: "Step 12 · Property Care",
      title: "Take care of your property",
      description:
        "Wear and repair problems can lower value and upset tenants. Regular servicing helps keep the property in good shape.",
      target: "property-maintenance-overview",
      propertyTab: "properties",
    },
    {
      eyebrow: "Step 13 · Upgrades",
      title: "Improve it, then look after it",
      description:
        "Upgrades can make a property more attractive and valuable. Maintenance protects what you have already built.",
      target: "property-upgrade-overview",
      propertyTab: "properties",
      tip: "A premium property can still lose tenants if it is poorly managed.",
    },
    {
      eyebrow: "Step 14 · Selling",
      title: "Sell when the time feels right",
      description:
        "When you sell, the property keeps its upgrades and condition. Choose an asking price and list it for other players.",
      target: "property-my-listings",
      propertyTab: "properties",
    },
    {
      eyebrow: "Step 15 · Resale Market",
      title: "Compare real player-owned properties",
      description:
        "Every resale listing reflects how that owner developed and cared for the property, so two homes of the same type can be very different.",
      target: "property-resale-market",
      propertyTab: "resale",
    },
    {
      eyebrow: "Step 15 · The Full Loop",
      title: "Build your own property story",
      description:
        "Your choices matter, but so does the wider city. Resident demand, available supply, rent agreements and completed sales now help shape each district over time.",
      target: "property-virtual-notice",
      propertyTab: "map",
      tip: "This remains a fictional Dreamscape learning market using virtual Dream Tokens.",
    },
  ],
};

function clearGuideTargets() {
  document
    .querySelectorAll<HTMLElement>("[data-milo-guide-active='true']")
    .forEach((element) => element.removeAttribute("data-milo-guide-active"));
}

export default function MiloExchangeGuide({
  page,
  isMobile,
  onStepChange,
}: Props) {
  const steps = useMemo(() => GUIDE_STEPS[page], [page]);
  const storageKey = `dreamscape:milo-exchange-guide:${page}:${GUIDE_VERSIONS[page]}`;
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const onStepChangeRef = useRef(onStepChange);

  useEffect(() => {
    onStepChangeRef.current = onStepChange;
  }, [onStepChange]);

  useEffect(() => {
    try {
      const completed = window.localStorage.getItem(storageKey) === "complete";
      if (!completed) {
        setStepIndex(0);
        setOpen(true);
      }
    } catch {
      // localStorage can be unavailable in privacy-restricted contexts.
    }
  }, [storageKey]);

  useEffect(() => {
    if (!open) {
      clearGuideTargets();
      return;
    }

    const step = steps[stepIndex];
    onStepChangeRef.current?.(step, stepIndex);

    let cancelled = false;
    let retryTimer: number | undefined;

    function revealTarget(attempt = 0) {
      if (cancelled) return;
      clearGuideTargets();

      if (!step.target) {
        setPlacement("bottom");
        return;
      }

      const target = document.querySelector<HTMLElement>(
        `[data-milo-guide="${step.target}"]`
      );

      if (!target && attempt < 8) {
        retryTimer = window.setTimeout(() => revealTarget(attempt + 1), 90);
        return;
      }

      if (!target) return;

      target.setAttribute("data-milo-guide-active", "true");
      target.scrollIntoView({ behavior: "smooth", block: "center" });

      window.setTimeout(() => {
        if (cancelled) return;
        const rect = target.getBoundingClientRect();
        setPlacement(rect.top + rect.height / 2 < window.innerHeight / 2 ? "bottom" : "top");
      }, 260);
    }

    const startTimer = window.setTimeout(() => revealTarget(), 80);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (retryTimer) window.clearTimeout(retryTimer);
      clearGuideTargets();
    };
  }, [open, stepIndex, steps]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!open) return;
      if (event.key === "Escape") closeGuide();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function openGuide() {
    setStepIndex(0);
    setOpen(true);
  }

  function closeGuide() {
    clearGuideTargets();
    setOpen(false);
  }

  function finishGuide() {
    try {
      window.localStorage.setItem(storageKey, "complete");
    } catch {
      // Ignore storage failures; the guide remains manually reopenable.
    }
    clearGuideTargets();
    setOpen(false);
  }

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (stepIndex >= steps.length - 1) {
      finishGuide();
      return;
    }
    setStepIndex((current) => Math.min(steps.length - 1, current + 1));
  }

  const step = steps[stepIndex];

  const actionButton: CSSProperties = {
    minHeight: "40px",
    padding: "0 16px",
    borderRadius: "999px",
    border: "1px solid rgba(132,218,255,0.28)",
    background: "rgba(83,215,255,0.15)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <>
      <style>{`
        [data-milo-guide-active="true"] {
          outline: 3px solid rgba(142, 232, 255, 0.96) !important;
          outline-offset: 5px !important;
          box-shadow:
            0 0 0 8px rgba(83, 215, 255, 0.10),
            0 0 48px rgba(83, 215, 255, 0.34) !important;
          scroll-margin-top: 120px;
          transition: box-shadow 180ms ease, outline-color 180ms ease;
        }

        @media (max-width: 820px) {
          [data-milo-guide-active="true"] {
            scroll-margin-top: 190px;
          }
        }
      `}</style>

      {!open && (
        <div
          style={{
            position: "fixed",
            right: isMobile ? "12px" : page === "property" ? "auto" : "20px",
            left: isMobile ? "auto" : page === "property" ? "20px" : "auto",
            bottom: isMobile ? "12px" : "18px",
            zIndex: 65,
            display: "grid",
            justifyItems: "center",
            gap: "4px",
            filter: "drop-shadow(0 16px 34px rgba(0,0,0,0.46))",
          }}
        >
          <img
            src="/milo-world/milo-character.png"
            alt="Milo"
            style={{
              width: "auto",
              height: isMobile ? "86px" : "118px",
              objectFit: "contain",
              pointerEvents: "none",
            }}
          />
          <button
            type="button"
            onClick={openGuide}
            aria-label="Open Milo Guide"
            style={{
              minHeight: isMobile ? "36px" : "40px",
              padding: isMobile ? "0 13px" : "0 16px",
              borderRadius: "999px",
              border: "1px solid rgba(132,218,255,0.42)",
              background: "rgba(5,13,28,0.92)",
              color: "white",
              fontSize: isMobile ? "10px" : "11px",
              fontWeight: 950,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.36)",
              fontFamily: "inherit",
            }}
          >
            Milo Guide
          </button>
        </div>
      )}

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            pointerEvents: "none",
          }}
          aria-live="polite"
        >
          <aside
            style={{
              position: "absolute",
              right: isMobile ? "10px" : page === "property" ? "auto" : "22px",
              left: isMobile ? "10px" : page === "property" ? "22px" : "auto",
              top: placement === "top" ? (isMobile ? "12px" : "22px") : "auto",
              bottom: placement === "bottom" ? (isMobile ? "10px" : "22px") : "auto",
              width: isMobile ? "auto" : "min(560px, calc(100vw - 44px))",
              maxHeight: isMobile ? "44dvh" : "min(520px, 78dvh)",
              overflowY: "auto",
              borderRadius: isMobile ? "20px" : "26px",
              border: "1px solid rgba(132,218,255,0.36)",
              background: "rgba(5,13,28,0.94)",
              boxShadow:
                "0 28px 90px rgba(0,0,0,0.58), 0 0 36px rgba(83,215,255,0.12)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              padding: isMobile ? "18px" : "22px 22px 20px",
              pointerEvents: "auto",
              fontFamily:
                'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            <button
              type="button"
              onClick={closeGuide}
              aria-label="Close Milo Guide"
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "34px",
                height: "34px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.07)",
                color: "white",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              ×
            </button>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "64px minmax(0,1fr)" : "92px minmax(0,1fr)",
                gap: isMobile ? "12px" : "16px",
                alignItems: "start",
                paddingRight: "34px",
              }}
            >
              <img
                src="/milo-world/milo-character.png"
                alt="Milo"
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 14px 30px rgba(0,0,0,0.52))",
                }}
              />

              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#8ee8ff",
                    fontSize: isMobile ? "10px" : "11px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontWeight: 950,
                  }}
                >
                  {step.eyebrow}
                </p>
                <h2
                  style={{
                    margin: "7px 0 0",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: isMobile ? "24px" : "31px",
                    fontWeight: 500,
                    lineHeight: 1.08,
                    color: "white",
                  }}
                >
                  {step.title}
                </h2>
              </div>
            </div>

            <p
              style={{
                margin: isMobile ? "12px 0 0" : "14px 0 0",
                color: "rgba(255,255,255,0.78)",
                fontSize: isMobile ? "13px" : "14px",
                lineHeight: 1.58,
              }}
            >
              {step.description}
            </p>

            {step.tip && (
              <div
                style={{
                  marginTop: "11px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,209,138,0.18)",
                  background: "rgba(255,209,138,0.07)",
                  padding: "10px 12px",
                  color: "rgba(255,255,255,0.68)",
                  fontSize: isMobile ? "11px" : "12px",
                  lineHeight: 1.48,
                }}
              >
                <strong style={{ color: "#ffd18a" }}>Milo tip:</strong> {step.tip}
              </div>
            )}

            <div
              style={{
                marginTop: "16px",
                display: "flex",
                flexWrap: "wrap",
                gap: "7px",
                alignItems: "center",
              }}
            >
              {steps.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Go to guide step ${index + 1}`}
                  onClick={() => setStepIndex(index)}
                  style={{
                    width: index === stepIndex ? "24px" : "9px",
                    height: "9px",
                    padding: 0,
                    borderRadius: "999px",
                    border: 0,
                    background:
                      index === stepIndex
                        ? "#8ee8ff"
                        : index < stepIndex
                        ? "rgba(142,232,255,0.44)"
                        : "rgba(255,255,255,0.18)",
                    cursor: "pointer",
                    transition: "width 160ms ease, background 160ms ease",
                  }}
                />
              ))}
              <span
                style={{
                  marginLeft: "auto",
                  color: "rgba(255,255,255,0.42)",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                {stepIndex + 1} / {steps.length}
              </span>
            </div>

            <div
              style={{
                marginTop: "14px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "9px",
              }}
            >
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                style={{
                  ...actionButton,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  opacity: stepIndex === 0 ? 0.38 : 1,
                  cursor: stepIndex === 0 ? "not-allowed" : "pointer",
                }}
              >
                Back
              </button>
              <button type="button" onClick={goNext} style={actionButton}>
                {stepIndex === steps.length - 1 ? "Done" : "Next"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
