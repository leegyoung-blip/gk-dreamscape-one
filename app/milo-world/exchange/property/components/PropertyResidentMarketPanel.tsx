"use client";

import { useMemo, useState } from "react";
import {
  formatDateTime,
  formatNumber,
  formatShortDate,
  getResidentAvatarSrc,
  type PropertyLease,
  type PropertyPurchaseOffer,
  type PropertyRentalApplication,
  type PropertyRentalListing,
  type PropertyTabStyles,
  type PropertyUnit,
  type PropertyUnitMarketSetting,
  type PropertyResidentLifeProfile,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  unit: PropertyUnit;
  rentalListing: PropertyRentalListing | null;
  applications: PropertyRentalApplication[];
  lease: PropertyLease | null;
  purchaseOffers: PropertyPurchaseOffer[];
  marketSetting: PropertyUnitMarketSetting | null;
  isPlayerResaleActive: boolean;
  residentLifeProfiles: PropertyResidentLifeProfile[];
  actionLoading: boolean;
  isMobile: boolean;
  onCreateRentalListing: (
    unitId: string,
    askingWeeklyRent: number,
    openToPurchaseOffers: boolean
  ) => Promise<void>;
  onCancelRentalListing: (listingId: string) => Promise<void>;
  onTogglePurchaseOffers: (unitId: string, enabled: boolean) => Promise<void>;
  onOpenMessages: () => void;
};

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent fit";
  if (score >= 65) return "Strong fit";
  if (score >= 50) return "Possible fit";
  return "Weak fit";
}

export default function PropertyResidentMarketPanel({
  unit,
  rentalListing,
  applications,
  lease,
  purchaseOffers,
  marketSetting,
  isPlayerResaleActive,
  residentLifeProfiles,
  actionLoading,
  isMobile,
  glassPanel,
  primaryButton,
  secondaryButton,
  onCreateRentalListing,
  onCancelRentalListing,
  onTogglePurchaseOffers,
  onOpenMessages,
}: Props) {
  const [askingRent, setAskingRent] = useState(unit.rental_potential);
  const [openToOffers, setOpenToOffers] = useState(
    Boolean(marketSetting?.open_to_purchase_offers)
  );
  const [localMessage, setLocalMessage] = useState("");

  const pendingApplications = useMemo(
    () => applications.filter((item) => item.status === "pending"),
    [applications]
  );

  const activeOffers = useMemo(
    () => purchaseOffers.filter((item) => item.status === "active"),
    [purchaseOffers]
  );

  function residentAvatar(residentId: string) {
    const profile = residentLifeProfiles.find((item) => item.resident_id === residentId);
    return getResidentAvatarSrc(profile?.avatar_key);
  }

  if (isPlayerResaleActive) {
    return (
      <div
        data-milo-guide="property-resident-market"
        style={{
          padding: isMobile ? "22px" : "28px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, rgba(255,209,138,0.04), rgba(5,13,28,0.12))",
        }}
      >
        <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.18em" }}>
          For Sale
        </p>
        <h3 style={{ margin: "8px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "30px" : "38px", fontWeight: 500 }}>
          This unit is currently for sale
        </h3>
        <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.56)", fontSize: "13px", lineHeight: 1.6, maxWidth: "760px" }}>
          This property is listed for sale, so rental applications and resident purchase offers are paused. Cancel the sale listing if you want to rent it out again.
        </p>
      </div>
    );
  }

  const suggestedLow = Math.max(1, Math.round(unit.rental_potential * 0.9));
  const suggestedHigh = Math.max(suggestedLow, Math.round(unit.rental_potential * 1.1));

  async function listForRent() {
    const rent = Math.round(Number(askingRent || 0));
    setLocalMessage("");

    if (rent <= 0) {
      setLocalMessage("Enter a weekly rent greater than 0 DT.");
      return;
    }

    if (rent > Math.max(unit.rental_potential * 3, 1)) {
      setLocalMessage(
        "That rent is much higher than this property’s current potential. Try a lower amount so residents have a realistic chance of applying."
      );
      return;
    }

    await onCreateRentalListing(unit.unit_id, rent, openToOffers);
  }

  const statusLabel = lease
    ? "Occupied"
    : rentalListing?.status === "active"
    ? "Listed for Rent"
    : "Vacant";

  const statusColor = lease
    ? "#79f2ce"
    : rentalListing?.status === "active"
    ? "#8ee8ff"
    : "#ffd18a";

  return (
    <div
      data-milo-guide="property-resident-market"
      style={{
        padding: isMobile ? "22px" : "28px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(121,242,206,0.025), rgba(5,13,28,0.12))",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "flex-end",
          gap: "12px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#79f2ce",
              fontSize: "11px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            Rent & Resident Interest
          </p>
          <h3
            style={{
              margin: "8px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "30px" : "38px",
              fontWeight: 500,
            }}
          >
            Rent it to Dreamscape residents
          </h3>
          <p
            style={{
              margin: "9px 0 0",
              maxWidth: "760px",
              color: "rgba(255,255,255,0.52)",
              fontSize: "13px",
              lineHeight: 1.55,
            }}
          >
            Set the weekly rent, then see who is interested. Residents look at price, location and the quality of the property before deciding whether to apply.
          </p>
        </div>

        <span
          style={{
            borderRadius: "999px",
            padding: "7px 11px",
            background: `${statusColor}14`,
            border: `1px solid ${statusColor}38`,
            color: statusColor,
            fontSize: "11px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {statusLabel}
        </span>
      </div>

      {localMessage && (
        <p
          style={{
            margin: "14px 0 0",
            color: "#ffb0b0",
            fontWeight: 800,
            fontSize: "12px",
          }}
        >
          {localMessage}
        </p>
      )}

      {lease ? (
        <section
          data-milo-guide="property-active-lease"
          style={{
            ...glassPanel,
            marginTop: "18px",
            padding: isMobile ? "18px" : "22px",
            border: "1px solid rgba(121,242,206,0.2)",
            background:
              "linear-gradient(145deg, rgba(121,242,206,0.08), rgba(5,13,28,0.72))",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "58px minmax(0,1fr)", gap: "12px", alignItems: "center" }}>
              {residentAvatar(lease.resident_id) ? (
                <img src={residentAvatar(lease.resident_id) || ""} alt={lease.resident_name} style={{ width: "58px", height: "58px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(121,242,206,0.35)" }} />
              ) : (
                <span style={{ width: "58px", height: "58px", borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(121,242,206,0.14)", color: "#79f2ce", fontWeight: 950, fontSize: "20px" }}>{lease.resident_name.slice(0,1)}</span>
              )}
              <div>
                <span style={{ color: "#79f2ce", fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>Current Tenant</span>
                <h4 style={{ margin: "6px 0 0", fontSize: "22px" }}>{lease.resident_name}</h4>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "12px" }}>{lease.occupation}</p>
              </div>
            </div>
            <strong style={{ color: "#8ee8ff", fontSize: "22px" }}>
              {formatNumber(lease.weekly_rent)} DT/wk
            </strong>
          </div>

          <p
            style={{
              margin: "13px 0 0",
              color: "rgba(255,255,255,0.58)",
              fontSize: "12px",
              lineHeight: 1.55,
            }}
          >
            {lease.bio}
          </p>

          <div
            style={{
              marginTop: "16px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr 1fr"
                : "repeat(4, minmax(0,1fr))",
              gap: "9px",
            }}
          >
            {[
              ["Lease Ends", formatShortDate(lease.end_date)],
              [
                "Next Rent",
                lease.next_rent_due_on
                  ? formatShortDate(lease.next_rent_due_on)
                  : "—",
              ],
              ["Weeks Paid", `${lease.paid_weeks}/${lease.lease_weeks}`],
              ["Rent Earned", `${formatNumber(lease.total_rent_paid)} DT`],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.05)",
                  padding: "12px",
                }}
              >
                <small style={{ color: "rgba(255,255,255,0.42)" }}>
                  {label}
                </small>
                <strong style={{ display: "block", marginTop: "5px" }}>
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "14px",
              borderRadius: "14px",
              border: "1px solid rgba(255,209,138,0.14)",
              background: "rgba(255,209,138,0.05)",
              padding: "12px",
              color: "rgba(255,255,255,0.55)",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            Keep the property in good condition and respond to repairs quickly to keep your tenant happy and more likely to stay.
          </div>

          <button
            type="button"
            onClick={onOpenMessages}
            style={{ ...primaryButton, width: "100%", minHeight: "40px", marginTop: "12px" }}
          >
            Read Messages
          </button>
        </section>
      ) : rentalListing?.status === "active" ? (
        <>
          <section
            style={{
              marginTop: "18px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(0,0.8fr) minmax(0,1.2fr)",
              gap: "14px",
              alignItems: "start",
            }}
          >
            <div
              style={{
                ...glassPanel,
                padding: "18px",
                border: "1px solid rgba(142,232,255,0.16)",
              }}
            >
              <span
                style={{
                  color: "#8ee8ff",
                  fontSize: "10px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Listed for Rent
              </span>
              <strong
                style={{ display: "block", marginTop: "8px", fontSize: "26px" }}
              >
                {formatNumber(rentalListing.asking_weekly_rent)} DT/wk
              </strong>
              <p
                style={{
                  margin: "7px 0 0",
                  color: "rgba(255,255,255,0.46)",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                Suggested rent when listed: {formatNumber(
                  rentalListing.market_rent_at_listing
                )} DT/wk
              </p>
              <p
                style={{
                  margin: "5px 0 0",
                  color: "rgba(255,255,255,0.42)",
                  fontSize: "11px",
                }}
              >
                Expires {formatDateTime(rentalListing.expires_at)}
              </p>
              <button
                type="button"
                onClick={() => void onCancelRentalListing(rentalListing.listing_id)}
                disabled={actionLoading}
                style={{
                  ...secondaryButton,
                  width: "100%",
                  minHeight: "40px",
                  marginTop: "14px",
                  opacity: actionLoading ? 0.55 : 1,
                }}
              >
                Cancel Rental Listing
              </button>
            </div>

            <div data-milo-guide="property-rental-applications">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      color: "#ffd18a",
                      fontSize: "10px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                    }}
                  >
                    Rental Applicants
                  </span>
                  <strong style={{ display: "block", marginTop: "5px" }}>
                    {pendingApplications.length} waiting
                  </strong>
                </div>
              </div>

              {pendingApplications.length === 0 ? (
                <div
                  style={{
                    marginTop: "10px",
                    minHeight: "120px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "16px",
                    border: "1px dashed rgba(142,232,255,0.15)",
                    color: "rgba(255,255,255,0.45)",
                    textAlign: "center",
                    padding: "18px",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  No applications yet. Try checking again later, or adjust the rent if the property is not attracting interest.
                </div>
              ) : (
                <div style={{ marginTop: "10px", display: "grid", gap: "10px" }}>
                  {pendingApplications.map((application) => (
                    <article
                      key={application.application_id}
                      style={{
                        borderRadius: "17px",
                        border: "1px solid rgba(255,255,255,0.09)",
                        background: "rgba(255,255,255,0.045)",
                        padding: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr)", gap: "10px", alignItems: "center" }}>
                          {residentAvatar(application.resident_id) ? (
                            <img src={residentAvatar(application.resident_id) || ""} alt={application.resident_name} style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.16)" }} />
                          ) : (
                            <span style={{ width: "48px", height: "48px", borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(142,232,255,0.12)", color: "#8ee8ff", fontWeight: 950 }}>{application.resident_name.slice(0,1)}</span>
                          )}
                          <span>
                            <strong style={{ display: "block", fontSize: "15px" }}>{application.resident_name}</strong>
                            <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>{application.occupation} · Reliability {application.reliability}/100</small>
                          </span>
                        </div>
                        <span
                          style={{
                            borderRadius: "999px",
                            padding: "6px 8px",
                            background: "rgba(121,242,206,0.08)",
                            color: "#79f2ce",
                            fontSize: "10px",
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {scoreLabel(application.fit_score)} · {application.fit_score}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "10px 0 0",
                          color: "rgba(255,255,255,0.5)",
                          fontSize: "12px",
                          lineHeight: 1.5,
                        }}
                      >
                        {application.bio}
                      </p>

                      <div
                        style={{
                          marginTop: "11px",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.04)",
                            padding: "10px",
                          }}
                        >
                          <small style={{ color: "rgba(255,255,255,0.4)" }}>
                            Offered Rent
                          </small>
                          <strong
                            style={{
                              display: "block",
                              marginTop: "4px",
                              color: "#8ee8ff",
                            }}
                          >
                            {formatNumber(application.proposed_weekly_rent)} DT/wk
                          </strong>
                        </div>
                        <div
                          style={{
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.04)",
                            padding: "10px",
                          }}
                        >
                          <small style={{ color: "rgba(255,255,255,0.4)" }}>
                            Lease Length
                          </small>
                          <strong style={{ display: "block", marginTop: "4px" }}>
                            {application.lease_weeks} weeks
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onOpenMessages}
                        disabled={actionLoading}
                        style={{ ...primaryButton, width: "100%", minHeight: "38px", marginTop: "10px" }}
                      >
                        Read Message
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "14px",
          }}
        >
          <div
            style={{
              ...glassPanel,
              padding: "18px",
              border: "1px solid rgba(142,232,255,0.16)",
            }}
          >
            <span
              style={{
                color: "#8ee8ff",
                fontSize: "10px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Choose Your Rent
            </span>
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                alignItems: "flex-end",
              }}
            >
              <div>
                <small style={{ color: "rgba(255,255,255,0.42)" }}>
                  Suggested range
                </small>
                <strong style={{ display: "block", marginTop: "4px" }}>
                  {formatNumber(suggestedLow)}–{formatNumber(suggestedHigh)} DT/wk
                </strong>
              </div>
              <small style={{ color: "rgba(255,255,255,0.4)" }}>
                Potential {formatNumber(unit.rental_potential)}
              </small>
            </div>

            <input
              type="number"
              min={1}
              value={askingRent}
              onChange={(event) =>
                setAskingRent(Math.max(1, Math.round(Number(event.target.value) || 1)))
              }
              style={{
                width: "100%",
                height: "48px",
                marginTop: "12px",
                borderRadius: "14px",
                border: "1px solid rgba(132,218,255,0.22)",
                background: "rgba(255,255,255,0.07)",
                color: "white",
                padding: "0 14px",
                fontSize: "16px",
                outline: "none",
              }}
            />

            <label
              style={{
                marginTop: "12px",
                display: "grid",
                gridTemplateColumns: "20px 1fr",
                gap: "10px",
                color: "rgba(255,255,255,0.58)",
                fontSize: "12px",
                lineHeight: 1.45,
              }}
            >
              <input
                type="checkbox"
                checked={openToOffers}
                onChange={(event) => setOpenToOffers(event.target.checked)}
              />
              <span>
                Also allow Dreamscape residents to make purchase offers while the
                unit is vacant.
              </span>
            </label>

            <button
              type="button"
              onClick={() => void listForRent()}
              disabled={actionLoading}
              style={{
                ...primaryButton,
                width: "100%",
                minHeight: "42px",
                marginTop: "14px",
                opacity: actionLoading ? 0.55 : 1,
              }}
            >
              List for {formatNumber(askingRent)} DT/week
            </button>
          </div>

          <div
            style={{
              borderRadius: "18px",
              border: "1px solid rgba(255,209,138,0.14)",
              background: "rgba(255,209,138,0.045)",
              padding: "18px",
            }}
          >
            <span
              style={{
                color: "#ffd18a",
                fontSize: "10px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Finding the Right Price
            </span>
            <p
              style={{
                margin: "9px 0 0",
                color: "rgba(255,255,255,0.58)",
                fontSize: "12px",
                lineHeight: 1.55,
              }}
            >
              A higher asking rent can earn more if somebody accepts it, but fewer
              residents can afford it. A lower rent attracts a wider pool and can
              reduce vacancy time.
            </p>
          </div>
        </section>
      )}

      {!lease && (
        <section
          data-milo-guide="property-purchase-offers"
          style={{
            marginTop: "18px",
            borderRadius: "18px",
            border: "1px solid rgba(255,209,138,0.16)",
            background: "rgba(255,209,138,0.045)",
            padding: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <span
                style={{
                  color: "#ffd18a",
                  fontSize: "10px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Purchase Offers
              </span>
              <strong style={{ display: "block", marginTop: "5px" }}>
                Let residents make offers
              </strong>
            </div>
            <button
              type="button"
              onClick={async () => {
                const next = !Boolean(marketSetting?.open_to_purchase_offers);
                await onTogglePurchaseOffers(unit.unit_id, next);
                setOpenToOffers(next);
              }}
              disabled={actionLoading}
              style={{
                ...secondaryButton,
                minHeight: "38px",
                padding: "0 13px",
                color: marketSetting?.open_to_purchase_offers
                  ? "#79f2ce"
                  : "white",
              }}
            >
              {marketSetting?.open_to_purchase_offers ? "Offers On" : "Offers Off"}
            </button>
          </div>

          {activeOffers.length > 0 && (
            <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
              {activeOffers.map((offer) => {
                const difference = offer.offer_amount - unit.current_value;
                const pct = unit.current_value
                  ? Math.round((difference / unit.current_value) * 100)
                  : 0;

                return (
                  <article
                    key={offer.offer_id}
                    style={{
                      borderRadius: "16px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.045)",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ display: "grid", gridTemplateColumns: "46px minmax(0,1fr)", gap: "10px", alignItems: "center" }}>
                        {residentAvatar(offer.resident_id) ? (
                          <img src={residentAvatar(offer.resident_id) || ""} alt={offer.resident_name} style={{ width: "46px", height: "46px", borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,209,138,0.25)" }} />
                        ) : (
                          <span style={{ width: "46px", height: "46px", borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(255,209,138,0.12)", color: "#ffd18a", fontWeight: 950 }}>{offer.resident_name.slice(0,1)}</span>
                        )}
                        <span>
                          <strong style={{ display: "block" }}>{offer.resident_name}</strong>
                          <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.44)" }}>{offer.occupation} · expires {formatDateTime(offer.expires_at)}</small>
                        </span>
                      </span>
                      <span style={{ textAlign: "right" }}>
                        <strong style={{ display: "block", color: "#ffd18a" }}>
                          {formatNumber(offer.offer_amount)} DT
                        </strong>
                        <small
                          style={{
                            display: "block",
                            marginTop: "4px",
                            color: difference >= 0 ? "#79f2ce" : "#ffb0b0",
                          }}
                        >
                          {difference >= 0 ? "+" : ""}
                          {pct}% vs value
                        </small>
                      </span>
                    </div>

                    <p
                      style={{
                        margin: "10px 0 0",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "12px",
                        lineHeight: 1.5,
                      }}
                    >
                      {offer.bio}
                    </p>

                    <button
                      type="button"
                      onClick={onOpenMessages}
                      disabled={actionLoading}
                      style={{ ...primaryButton, width: "100%", minHeight: "38px", marginTop: "10px" }}
                    >
                      Read Offer
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
