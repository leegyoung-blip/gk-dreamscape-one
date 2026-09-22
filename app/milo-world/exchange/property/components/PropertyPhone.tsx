"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatDateTime,
  formatNumber,
  getResidentAvatarSrc,
  type PropertyConversation,
  type PropertyLandlordReputation,
  type PropertyMessage,
  type PropertyPurchaseOffer,
  type PropertyRentalApplication,
  type PropertyRenewalNegotiation,
  type PropertyResidentLifeProfile,
  type PropertyResidentLifeEvent,
} from "./propertyExchangeShared";

type Props = {
  conversations: PropertyConversation[];
  messages: PropertyMessage[];
  renewalNegotiations: PropertyRenewalNegotiation[];
  rentalApplications: PropertyRentalApplication[];
  purchaseOffers: PropertyPurchaseOffer[];
  reputation: PropertyLandlordReputation;
  residentLifeProfiles: PropertyResidentLifeProfile[];
  residentLifeEvents: PropertyResidentLifeEvent[];
  unreadCount: number;
  actionLoading: boolean;
  isMobile: boolean;
  openRequest: number;
  onMarkRead: (conversationId: string) => Promise<void>;
  onRespond: (
    sourceType: "rental_application" | "purchase_offer" | "renewal",
    sourceId: string,
    action: "accept" | "decline" | "reject" | "counter" | "meet_halfway" | "hold_price" | "longer_lease" | "lower_rent_longer" | "ask_budget" | "ask_best",
    counterWeeklyRent?: number,
    counterLeaseWeeks?: number
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
};

const PHONE_SRC = "/milo-world/property-exchange/dreamscape-property-phone.png";

function reputationLabel(score: number) {
  if (score >= 85) return "Exceptional";
  if (score >= 72) return "Trusted";
  if (score >= 58) return "Established";
  if (score >= 42) return "Developing";
  return "At Risk";
}

export default function PropertyPhone({
  conversations,
  messages,
  renewalNegotiations,
  rentalApplications,
  purchaseOffers,
  reputation,
  residentLifeProfiles,
  residentLifeEvents,
  unreadCount,
  actionLoading,
  isMobile,
  openRequest,
  onMarkRead,
  onRespond,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [countering, setCountering] = useState<false | "rent" | "sale">(false);
  const [counterRent, setCounterRent] = useState(0);
  const [counterWeeks, setCounterWeeks] = useState(12);
  const [showResidentProfile, setShowResidentProfile] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.conversation_id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const selectedMessages = useMemo(
    () =>
      messages.filter((item) => item.conversation_id === selectedConversationId),
    [messages, selectedConversationId]
  );

  const selectedResidentProfile = useMemo(
    () =>
      selectedConversation
        ? residentLifeProfiles.find((item) => item.resident_id === selectedConversation.resident_id) || null
        : null,
    [residentLifeProfiles, selectedConversation]
  );

  const selectedResidentAvatar = getResidentAvatarSrc(selectedResidentProfile?.avatar_key);

  const selectedResidentEvents = useMemo(
    () =>
      selectedConversation
        ? residentLifeEvents
            .filter((item) => item.resident_id === selectedConversation.resident_id)
            .slice(0, 3)
        : [],
    [residentLifeEvents, selectedConversation]
  );

  const latestMessageByConversation = useMemo(() => {
    const map = new Map<string, PropertyMessage>();
    for (const message of messages) {
      const current = map.get(message.conversation_id);
      if (!current || new Date(message.created_at).getTime() >= new Date(current.created_at).getTime()) {
        map.set(message.conversation_id, message);
      }
    }
    return map;
  }, [messages]);

  const selectedRenewal = useMemo(() => {
    if (!selectedConversationId) return null;
    return (
      renewalNegotiations
        .filter(
          (item) =>
            item.conversation_id === selectedConversationId &&
            item.status === "pending_landlord"
        )
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0] || null
    );
  }, [renewalNegotiations, selectedConversationId]);

  const pendingApplication = useMemo(() => {
    if (!selectedConversation) return null;
    const sourceIds = new Set(
      selectedMessages
        .filter((item) => item.source_type === "rental_application" && item.source_id)
        .map((item) => item.source_id as string)
    );
    return (
      rentalApplications.find(
        (item) => sourceIds.has(item.application_id) && item.status === "pending"
      ) || null
    );
  }, [rentalApplications, selectedConversation, selectedMessages]);

  const activePurchaseOffer = useMemo(() => {
    if (!selectedConversation) return null;
    const sourceIds = new Set(
      selectedMessages
        .filter((item) => item.source_type === "purchase_offer" && item.source_id)
        .map((item) => item.source_id as string)
    );
    return (
      purchaseOffers.find(
        (item) => sourceIds.has(item.offer_id) && item.status === "active"
      ) || null
    );
  }, [purchaseOffers, selectedConversation, selectedMessages]);

  useEffect(() => {
    if (openRequest > 0) setOpen(true);
  }, [openRequest]);

  useEffect(() => {
    setCountering(false);
    if (selectedRenewal) {
      setCounterRent(selectedRenewal.proposed_weekly_rent);
      setCounterWeeks(selectedRenewal.proposed_lease_weeks);
      return;
    }
    if (pendingApplication) {
      setCounterRent(pendingApplication.proposed_weekly_rent);
      setCounterWeeks(pendingApplication.lease_weeks);
      return;
    }
    if (activePurchaseOffer) {
      setCounterRent(activePurchaseOffer.offer_amount);
    }
  }, [selectedRenewal, pendingApplication, activePurchaseOffer]);

  function openConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setCountering(false);
    setShowResidentProfile(false);
    void onMarkRead(conversationId);
  }

  async function handleRefresh() {
    await onRefresh();
  }

  const frameWidth = isMobile ? "min(94vw, 390px)" : "390px";
  const frameHeight = isMobile ? "min(82dvh, 690px)" : "690px";

  return (
    <>
      {!open && (
        <button
          type="button"
          data-milo-guide="property-phone-launcher"
          onClick={() => setOpen(true)}
          aria-label={`Open tenant messages${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          style={{
            position: "fixed",
            right: isMobile ? "12px" : "22px",
            bottom: isMobile ? "12px" : "18px",
            zIndex: 170,
            width: isMobile ? "58px" : "68px",
            height: isMobile ? "102px" : "120px",
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.55))",
          }}
        >
          <img
            src={PHONE_SRC}
            alt="Property messages phone"
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "4px",
                right: "-3px",
                minWidth: "24px",
                height: "24px",
                borderRadius: "999px",
                display: "grid",
                placeItems: "center",
                padding: "0 6px",
                background: "#ff6262",
                border: "2px solid #071126",
                color: "white",
                fontSize: "11px",
                fontWeight: 950,
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          data-milo-guide="property-phone"
          style={{
            position: "fixed",
            right: isMobile ? "2.5vw" : "18px",
            bottom: isMobile ? "8px" : "12px",
            zIndex: 190,
            width: frameWidth,
            height: frameHeight,
            maxWidth: "94vw",
            maxHeight: "88dvh",
            filter: "drop-shadow(0 34px 60px rgba(0,0,0,0.66))",
          }}
        >
          <img
            src={PHONE_SRC}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "fill",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: "16%",
              right: "16%",
              top: "7.6%",
              bottom: "6.3%",
              borderRadius: isMobile ? "28px" : "32px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(180deg,#f7f9fc,#eef2f7)",
              color: "#0f172a",
            }}
          >
            <header
              style={{
                padding: "18px 14px 10px",
                background: "rgba(255,255,255,0.94)",
                borderBottom: "1px solid rgba(15,23,42,0.08)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedConversationId) setSelectedConversationId(null);
                    else setOpen(false);
                  }}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "999px",
                    border: "none",
                    background: "rgba(15,23,42,0.06)",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: 900,
                  }}
                  aria-label={selectedConversationId ? "Back to messages" : "Close phone"}
                >
                  {selectedConversationId ? "‹" : "×"}
                </button>

                <div style={{ minWidth: 0, textAlign: "center" }}>
                  <strong style={{ display: "block", fontSize: "13px", lineHeight: 1.1 }}>
                    {selectedConversation ? selectedConversation.resident_name : "Property Messages"}
                  </strong>
                  <small style={{ display: "block", marginTop: "3px", color: "#64748b", fontSize: "9px" }}>
                    {selectedConversation
                      ? `${selectedConversation.property_name} · Unit ${selectedConversation.unit_number}`
                      : `${reputationLabel(reputation.score)} landlord · ${reputation.score}/100`}
                  </small>
                </div>

                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={actionLoading}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "999px",
                    border: "none",
                    background: "rgba(15,23,42,0.06)",
                    color: "#0f172a",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    opacity: actionLoading ? 0.45 : 1,
                    fontSize: "14px",
                    fontWeight: 900,
                  }}
                  aria-label="Refresh tenant messages"
                >
                  ↻
                </button>
              </div>
            </header>

            {selectedConversation && selectedResidentProfile && (
              <div
                style={{
                  flexShrink: 0,
                  borderBottom: "1px solid rgba(15,23,42,0.08)",
                  background: "rgba(255,255,255,0.78)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowResidentProfile((value) => !value)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                    color: "#0f172a",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ minWidth: 0, display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: "8px", alignItems: "center" }}>
                    {selectedResidentAvatar ? (
                      <img src={selectedResidentAvatar} alt={selectedResidentProfile.display_name} style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ width: "34px", height: "34px", borderRadius: "50%", display: "grid", placeItems: "center", background: "#dbeafe", color: "#1d4ed8", fontWeight: 900 }}>{selectedResidentProfile.display_name.slice(0,1)}</span>
                    )}
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: "9px" }}>About this resident</strong>
                      <small style={{ display: "block", marginTop: "2px", color: "#64748b", fontSize: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {String(selectedResidentProfile.life_stage || "Resident").replaceAll("_", " ")} · {selectedResidentProfile.household_size} in {selectedResidentProfile.resident_kind === "business" ? "team" : "household"}
                        {selectedResidentProfile.move_intent ? " · thinking of moving" : ""}
                      </small>
                    </span>
                  </span>
                  <span style={{ color: "#64748b", fontSize: "11px" }}>{showResidentProfile ? "⌃" : "⌄"}</span>
                </button>

                {showResidentProfile && (
                  <div style={{ padding: "0 12px 10px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                      {[
                        ["Income", `${formatNumber(selectedResidentProfile.monthly_income)} DT/mo`],
                        ["Savings", `${formatNumber(selectedResidentProfile.savings)} DT`],
                        ["Rent budget", `${formatNumber(selectedResidentProfile.max_weekly_rent)} DT/wk`],
                        ["Budget pressure", `${selectedResidentProfile.financial_pressure}/100`],
                      ].map(([label, value]) => (
                        <div key={String(label)} style={{ borderRadius: "9px", background: "rgba(15,23,42,0.045)", padding: "6px 7px" }}>
                          <small style={{ display: "block", color: "#94a3b8", fontSize: "7px" }}>{label}</small>
                          <strong style={{ display: "block", marginTop: "2px", color: "#334155", fontSize: "8px" }}>{value}</strong>
                        </div>
                      ))}
                    </div>

                    {selectedResidentProfile.move_intent && (
                      <div style={{ marginTop: "6px", borderRadius: "9px", background: "rgba(245,158,11,0.09)", color: "#92400e", padding: "6px 7px", fontSize: "8px", lineHeight: 1.35 }}>
                        Thinking about moving: {String(selectedResidentProfile.move_reason || "life plans changed").replaceAll("_", " ")}
                      </div>
                    )}

                    {selectedResidentEvents.length > 0 && (
                      <div style={{ marginTop: "7px", display: "grid", gap: "5px" }}>
                        {selectedResidentEvents.map((event) => (
                          <div key={event.event_id} style={{ borderLeft: "2px solid #79f2ce", paddingLeft: "6px" }}>
                            <strong style={{ display: "block", color: "#334155", fontSize: "8px" }}>{event.title}</strong>
                            <small style={{ display: "block", marginTop: "1px", color: "#64748b", fontSize: "7px", lineHeight: 1.3 }}>{event.description}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!selectedConversation ? (
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 14px" }}>
                {conversations.length === 0 ? (
                  <div style={{ padding: "34px 14px", textAlign: "center", color: "#64748b", fontSize: "11px", lineHeight: 1.5 }}>
                    No messages yet. Applications, offers, repair updates and lease conversations will appear here when residents contact you.
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const latest = latestMessageByConversation.get(conversation.conversation_id);
                    return (
                      <button
                        key={conversation.conversation_id}
                        type="button"
                        onClick={() => openConversation(conversation.conversation_id)}
                        style={{
                          width: "100%",
                          border: "none",
                          borderBottom: "1px solid rgba(15,23,42,0.07)",
                          background: conversation.unread_count > 0 ? "rgba(52,152,219,0.08)" : "transparent",
                          padding: "11px 8px",
                          display: "grid",
                          gridTemplateColumns: "36px minmax(0,1fr) auto",
                          gap: "9px",
                          alignItems: "center",
                          textAlign: "left",
                          cursor: "pointer",
                          color: "#0f172a",
                        }}
                      >
                        {(() => {
                          const profile = residentLifeProfiles.find((item) => item.resident_id === conversation.resident_id);
                          const avatar = getResidentAvatarSrc(profile?.avatar_key);
                          return avatar ? (
                            <img src={avatar} alt={conversation.resident_name} style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ width: "36px", height: "36px", borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(145deg,#dbeafe,#bfdbfe)", color: "#1d4ed8", fontWeight: 950, fontSize: "13px" }}>
                              {conversation.resident_name.slice(0, 1).toUpperCase()}
                            </span>
                          );
                        })()}
                        <span style={{ minWidth: 0 }}>
                          <strong style={{ display: "block", fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {conversation.resident_name}
                          </strong>
                          <small style={{ display: "block", marginTop: "3px", color: "#64748b", fontSize: "9px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {latest?.body || conversation.subject}
                          </small>
                        </span>
                        <span style={{ display: "grid", justifyItems: "end", gap: "4px" }}>
                          <small style={{ color: "#94a3b8", fontSize: "8px" }}>
                            {new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short" }).format(new Date(conversation.last_message_at))}
                          </small>
                          {conversation.unread_count > 0 && (
                            <span style={{ minWidth: "18px", height: "18px", borderRadius: "999px", display: "grid", placeItems: "center", padding: "0 4px", background: "#2563eb", color: "white", fontSize: "8px", fontWeight: 900 }}>
                              {conversation.unread_count}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px 10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedMessages.map((message) => {
                    const mine = message.sender_type === "landlord";
                    const system = message.sender_type === "system";
                    return (
                      <div
                        key={message.message_id}
                        style={{
                          alignSelf: system ? "center" : mine ? "flex-end" : "flex-start",
                          maxWidth: system ? "90%" : "84%",
                        }}
                      >
                        <div
                          style={{
                            borderRadius: system ? "12px" : mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                            background: system ? "rgba(100,116,139,0.1)" : mine ? "#2f80ed" : "white",
                            color: system ? "#64748b" : mine ? "white" : "#0f172a",
                            border: system || mine ? "none" : "1px solid rgba(15,23,42,0.07)",
                            padding: system ? "7px 9px" : "9px 10px",
                            fontSize: system ? "9px" : "10px",
                            lineHeight: 1.45,
                            boxShadow: system || mine ? "none" : "0 3px 10px rgba(15,23,42,0.05)",
                          }}
                        >
                          {message.body}
                        </div>
                        {!system && (
                          <small style={{ display: "block", marginTop: "3px", padding: "0 3px", color: "#94a3b8", fontSize: "7px", textAlign: mine ? "right" : "left" }}>
                            {formatDateTime(message.created_at)}
                          </small>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ flexShrink: 0, padding: "8px 9px 11px", background: "rgba(255,255,255,0.97)", borderTop: "1px solid rgba(15,23,42,0.08)" }}>
                  {selectedRenewal ? (
                    <div style={{ display: "grid", gap: "7px" }}>
                      <div style={{ padding: "7px 8px", borderRadius: "10px", background: "#eff6ff", color: "#1e40af", fontSize: "9px", lineHeight: 1.4 }}>
                        Renewal offer: <strong>{formatNumber(selectedRenewal.proposed_weekly_rent)} DT/wk</strong> for <strong>{selectedRenewal.proposed_lease_weeks} weeks</strong>
                        <span style={{ display: "block", marginTop: "3px", color: "#64748b", fontSize: "8px" }}>Negotiation round {Math.min(4, selectedRenewal.round_number || 1)} of 4</span>
                      </div>
                      {countering === "rent" ? (
                        <div style={{ display: "grid", gap: "6px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                            <label style={{ display: "grid", gap: "3px", color: "#64748b", fontSize: "8px" }}>Weekly rent<input type="number" min={1} value={counterRent} onChange={(e) => setCounterRent(Math.max(1, Math.round(Number(e.target.value) || 1)))} style={phoneInput} /></label>
                            <label style={{ display: "grid", gap: "3px", color: "#64748b", fontSize: "8px" }}>Weeks<input type="number" min={1} max={104} value={counterWeeks} onChange={(e) => setCounterWeeks(Math.max(1, Math.min(104, Math.round(Number(e.target.value) || 1))))} style={phoneInput} /></label>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "5px" }}>
                            <button type="button" disabled={actionLoading} onClick={() => void onRespond("renewal", selectedRenewal.negotiation_id, "counter", counterRent, counterWeeks)} style={actionButton("#2563eb")}>Send Counter</button>
                            <button type="button" onClick={() => setCountering(false)} style={actionButton("#94a3b8")}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("renewal", selectedRenewal.negotiation_id, "accept")} style={actionButton("#16a34a")}>Accept</button>
                          <button type="button" disabled={actionLoading} onClick={() => setCountering("rent")} style={actionButton("#2563eb")}>Counter</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("renewal", selectedRenewal.negotiation_id, "meet_halfway")} style={softButton}>Meet Halfway</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("renewal", selectedRenewal.negotiation_id, "hold_price")} style={softButton}>Keep Current Rent</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("renewal", selectedRenewal.negotiation_id, "longer_lease")} style={softButton}>Longer Lease</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("renewal", selectedRenewal.negotiation_id, "lower_rent_longer")} style={softButton}>Lower Rent + Longer</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("renewal", selectedRenewal.negotiation_id, "ask_budget")} style={softButton}>Ask Their Budget</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("renewal", selectedRenewal.negotiation_id, "decline")} style={dangerSoftButton}>Decline</button>
                        </div>
                      )}
                    </div>
                  ) : pendingApplication ? (
                    <div style={{ display: "grid", gap: "7px" }}>
                      <div style={{ padding: "7px 8px", borderRadius: "10px", background: "#eff6ff", color: "#1e40af", fontSize: "9px", lineHeight: 1.4 }}>
                        Rental offer: <strong>{formatNumber(pendingApplication.proposed_weekly_rent)} DT/wk</strong> for <strong>{pendingApplication.lease_weeks} weeks</strong> · fit {pendingApplication.fit_score}/100
                        <span style={{ display: "block", marginTop: "3px", color: "#64748b", fontSize: "8px" }}>Round {Math.min(4, pendingApplication.negotiation_round || 1)} of 4</span>
                      </div>
                      {countering === "rent" ? (
                        <div style={{ display: "grid", gap: "6px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                            <label style={{ display: "grid", gap: "3px", color: "#64748b", fontSize: "8px" }}>Weekly rent<input type="number" min={1} value={counterRent} onChange={(e) => setCounterRent(Math.max(1, Math.round(Number(e.target.value) || 1)))} style={phoneInput} /></label>
                            <label style={{ display: "grid", gap: "3px", color: "#64748b", fontSize: "8px" }}>Weeks<input type="number" min={1} max={104} value={counterWeeks} onChange={(e) => setCounterWeeks(Math.max(1, Math.min(104, Math.round(Number(e.target.value) || 1))))} style={phoneInput} /></label>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "5px" }}>
                            <button type="button" disabled={actionLoading} onClick={() => void onRespond("rental_application", pendingApplication.application_id, "counter", counterRent, counterWeeks)} style={actionButton("#2563eb")}>Send Counter</button>
                            <button type="button" onClick={() => setCountering(false)} style={actionButton("#94a3b8")}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("rental_application", pendingApplication.application_id, "accept")} style={actionButton("#16a34a")}>Accept</button>
                          <button type="button" disabled={actionLoading} onClick={() => setCountering("rent")} style={actionButton("#2563eb")}>Counter</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("rental_application", pendingApplication.application_id, "meet_halfway")} style={softButton}>Meet Halfway</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("rental_application", pendingApplication.application_id, "hold_price")} style={softButton}>Hold Asking Rent</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("rental_application", pendingApplication.application_id, "longer_lease")} style={softButton}>Longer Lease</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("rental_application", pendingApplication.application_id, "lower_rent_longer")} style={softButton}>Lower Rent + Longer</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("rental_application", pendingApplication.application_id, "ask_budget")} style={softButton}>Ask Their Budget</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("rental_application", pendingApplication.application_id, "decline")} style={dangerSoftButton}>Decline</button>
                        </div>
                      )}
                    </div>
                  ) : activePurchaseOffer ? (
                    <div style={{ display: "grid", gap: "7px" }}>
                      <div style={{ padding: "7px 8px", borderRadius: "10px", background: "#fff7ed", color: "#9a3412", fontSize: "9px", lineHeight: 1.4 }}>
                        Purchase offer: <strong>{formatNumber(activePurchaseOffer.offer_amount)} DT</strong>
                        <span style={{ display: "block", marginTop: "3px", color: "#78716c", fontSize: "8px" }}>Market value when offered: {formatNumber(activePurchaseOffer.value_at_offer)} DT · Round {Math.min(4, activePurchaseOffer.negotiation_round || 1)} of 4</span>
                      </div>
                      {countering === "sale" ? (
                        <div style={{ display: "grid", gap: "6px" }}>
                          <label style={{ display: "grid", gap: "3px", color: "#64748b", fontSize: "8px" }}>Your counter price<input type="number" min={1} value={counterRent} onChange={(e) => setCounterRent(Math.max(1, Math.round(Number(e.target.value) || 1)))} style={phoneInput} /></label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "5px" }}>
                            <button type="button" disabled={actionLoading} onClick={() => void onRespond("purchase_offer", activePurchaseOffer.offer_id, "counter", counterRent)} style={actionButton("#2563eb")}>Send Counter</button>
                            <button type="button" onClick={() => setCountering(false)} style={actionButton("#94a3b8")}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("purchase_offer", activePurchaseOffer.offer_id, "accept")} style={actionButton("#16a34a")}>Accept Sale</button>
                          <button type="button" disabled={actionLoading} onClick={() => setCountering("sale")} style={actionButton("#2563eb")}>Counter Price</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("purchase_offer", activePurchaseOffer.offer_id, "meet_halfway")} style={softButton}>Meet Halfway</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("purchase_offer", activePurchaseOffer.offer_id, "hold_price")} style={softButton}>Ask Market Value</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("purchase_offer", activePurchaseOffer.offer_id, "ask_best")} style={softButton}>Ask Best Offer</button>
                          <button type="button" disabled={actionLoading} onClick={() => void onRespond("purchase_offer", activePurchaseOffer.offer_id, "reject")} style={dangerSoftButton}>Decline</button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ borderRadius: "999px", background: "#f1f5f9", padding: "9px 12px", color: "#94a3b8", fontSize: "9px", textAlign: "center" }}>
                      No response needed right now.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function actionButton(background: string) {
  return {
    minHeight: "32px",
    border: "none",
    borderRadius: "9px",
    background,
    color: "white",
    padding: "0 8px",
    fontSize: "9px",
    fontWeight: 900,
    cursor: "pointer",
  } as const;
}

const softButton = {
  minHeight: "32px",
  border: "1px solid rgba(37,99,235,0.14)",
  borderRadius: "9px",
  background: "#eef4ff",
  color: "#1d4ed8",
  padding: "0 7px",
  fontSize: "8px",
  fontWeight: 850,
  cursor: "pointer",
} as const;

const dangerSoftButton = {
  ...softButton,
  border: "1px solid rgba(220,38,38,0.12)",
  background: "#fff1f2",
  color: "#be123c",
} as const;

const phoneInput = {
  width: "100%",
  minWidth: 0,
  height: "31px",
  borderRadius: "8px",
  border: "1px solid rgba(15,23,42,0.14)",
  background: "white",
  color: "#0f172a",
  padding: "0 7px",
  fontSize: "10px",
  outline: "none",
};
