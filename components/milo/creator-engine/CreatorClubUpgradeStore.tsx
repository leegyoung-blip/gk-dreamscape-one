"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  clubUpgradeCardStyle,
  roomUpgradeBackdropStyle,
} from "@/components/milo/creator-engine/CreatorClubUpgradeStyle";

type StoreCategory = "club_style" | "creator_tool" | "room_style" | "growth";
type StoreScope = "club" | "creator";
type StorePurchaseType = "permanent" | "consumable";

type StoreItem = {
  item_key: string;
  display_name: string;
  description: string;
  category: StoreCategory;
  purchase_type: StorePurchaseType;
  scope: StoreScope;
  slot_key: "club_theme" | "club_frame" | "room_theme" | null;
  effect_key: string;
  price_dt: number;
  min_club_level: number;
  eligible: boolean;
  unlocked: boolean;
};

type Equipped = {
  club_theme_key: string | null;
  club_frame_key: string | null;
  room_theme_key: string | null;
};

type SpotlightState = {
  active: boolean;
  ends_at: string | null;
  cooldown_ends_at: string | null;
};

type StoreClub = {
  club_id: string;
  club_slug: string;
  club_name: string;
  club_status: string;
  level_number: number;
  level_name: string;
  wallet_dt: number;
  equipped: Equipped;
  spotlight: SpotlightState;
  items: StoreItem[];
};

type AdminItem = {
  item_key: string;
  display_name: string;
  description: string;
  category: StoreCategory;
  purchase_type: StorePurchaseType;
  scope: StoreScope;
  slot_key: string | null;
  effect_key: string;
  price_dt: number;
  min_club_level: number;
  sort_order: number;
  is_active: boolean;
};

const CATEGORY_ORDER: { key: StoreCategory; label: string; text: string }[] = [
  {
    key: "club_style",
    label: "Club Style",
    text: "Cosmetic themes and frames for the public club experience.",
  },
  {
    key: "creator_tool",
    label: "Creator Tools",
    text: "Permanent productivity tools shared across your Creator identity.",
  },
  {
    key: "room_style",
    label: "Play Rooms",
    text: "Cosmetic stage treatments for internal multiplayer rooms.",
  },
  {
    key: "growth",
    label: "Growth",
    text: "Controlled exposure opportunities. DT never buys ranking or members.",
  },
];

function normalizeStoreClub(value: unknown): StoreClub | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const equipped =
    row.equipped && typeof row.equipped === "object"
      ? (row.equipped as Record<string, unknown>)
      : {};
  const spotlight =
    row.spotlight && typeof row.spotlight === "object"
      ? (row.spotlight as Record<string, unknown>)
      : {};

  return {
    club_id: String(row.club_id || ""),
    club_slug: String(row.club_slug || ""),
    club_name: String(row.club_name || "Creator Club"),
    club_status: String(row.club_status || "draft"),
    level_number: Number(row.level_number || 1),
    level_name: String(row.level_name || "Starter Club"),
    wallet_dt: Number(row.wallet_dt || 0),
    equipped: {
      club_theme_key: equipped.club_theme_key
        ? String(equipped.club_theme_key)
        : null,
      club_frame_key: equipped.club_frame_key
        ? String(equipped.club_frame_key)
        : null,
      room_theme_key: equipped.room_theme_key
        ? String(equipped.room_theme_key)
        : null,
    },
    spotlight: {
      active: Boolean(spotlight.active),
      ends_at: spotlight.ends_at ? String(spotlight.ends_at) : null,
      cooldown_ends_at: spotlight.cooldown_ends_at
        ? String(spotlight.cooldown_ends_at)
        : null,
    },
    items: ((row.items || []) as unknown[]).map((item) => {
      const next = item as Record<string, unknown>;
      return {
        item_key: String(next.item_key || ""),
        display_name: String(next.display_name || "Club Upgrade"),
        description: String(next.description || ""),
        category: String(next.category || "club_style") as StoreCategory,
        purchase_type: String(
          next.purchase_type || "permanent",
        ) as StorePurchaseType,
        scope: String(next.scope || "club") as StoreScope,
        slot_key: next.slot_key
          ? (String(next.slot_key) as StoreItem["slot_key"])
          : null,
        effect_key: String(next.effect_key || ""),
        price_dt: Number(next.price_dt || 0),
        min_club_level: Number(next.min_club_level || 1),
        eligible: Boolean(next.eligible),
        unlocked: Boolean(next.unlocked),
      };
    }),
  };
}

function remainingLabel(value: string | null) {
  if (!value) return "";
  const ms = new Date(value).getTime() - Date.now();
  if (ms <= 0) return "Available now";
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h remaining`;
  return `${Math.ceil(hours / 24)}d remaining`;
}

export default function CreatorClubUpgradeStore() {
  const [clubs, setClubs] = useState<StoreClub[]>([]);
  const [selectedClubId, setSelectedClubId] = useState("");
  const [category, setCategory] = useState<StoreCategory>("club_style");
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminItems, setAdminItems] = useState<AdminItem[]>([]);

  const selectedClub = useMemo(
    () =>
      clubs.find((club) => club.club_id === selectedClubId) || clubs[0] || null,
    [clubs, selectedClubId],
  );

  const visibleItems = useMemo(
    () => selectedClub?.items.filter((item) => item.category === category) || [],
    [selectedClub, category],
  );

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setIsLoading(true);
    setErrorMessage("");

    const [storeResponse, adminResponse] = await Promise.all([
      supabase.rpc("get_my_creator_club_upgrade_store_v1"),
      supabase.rpc("creator_discovery_is_admin_v1"),
    ]);

    if (storeResponse.error) {
      setClubs([]);
      setErrorMessage(
        storeResponse.error.message || "Club Upgrade Store could not be loaded.",
      );
    } else {
      const rows = ((storeResponse.data || []) as unknown[])
        .map(normalizeStoreClub)
        .filter((club): club is StoreClub => Boolean(club));
      setClubs(rows);
      setSelectedClubId((current) =>
        current && rows.some((club) => club.club_id === current)
          ? current
          : rows[0]?.club_id || "",
      );
    }

    setIsAdmin(Boolean(adminResponse.data));
    setIsLoading(false);
  }

  async function purchase(item: StoreItem) {
    if (!selectedClub) return;

    if (
      !window.confirm(
        `Spend ${item.price_dt.toLocaleString()} DT on ${item.display_name}?`,
      )
    ) {
      return;
    }

    setSavingKey(item.item_key);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_purchase_club_upgrade_v1",
      {
        p_club_id: selectedClub.club_id,
        p_item_key: item.item_key,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Club Upgrade could not be purchased.");
      setSavingKey("");
      return;
    }

    const payload = (data || {}) as Record<string, unknown>;
    const spent = Number(payload.amount_spent_dt || item.price_dt);
    setMessage(`${item.display_name} unlocked for ${spent.toLocaleString()} DT.`);
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await load();
    setSavingKey("");
  }

  async function equip(item: StoreItem) {
    if (!selectedClub || !item.slot_key) return;

    setSavingKey(item.item_key);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_equip_club_upgrade_v1",
      {
        p_club_id: selectedClub.club_id,
        p_slot_key: item.slot_key,
        p_item_key: item.item_key,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Club Upgrade could not be equipped.");
      setSavingKey("");
      return;
    }

    setMessage(`${item.display_name} equipped on ${selectedClub.club_name}.`);
    await load();
    setSavingKey("");
  }

  async function resetSlot(slot: NonNullable<StoreItem["slot_key"]>) {
    if (!selectedClub) return;

    setSavingKey(`reset:${slot}`);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "creator_equip_club_upgrade_v1",
      {
        p_club_id: selectedClub.club_id,
        p_slot_key: slot,
        p_item_key: null,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Default style could not be restored.");
      setSavingKey("");
      return;
    }

    setMessage("Default presentation restored for that slot.");
    await load();
    setSavingKey("");
  }

  async function activateSpotlight(item: StoreItem) {
    if (!selectedClub) return;

    if (
      !window.confirm(
        `Spend ${item.price_dt.toLocaleString()} DT to enter ${selectedClub.club_name} into the 24-hour Spotlight rotation? This buys rotation eligibility, not guaranteed prominence.`,
      )
    ) {
      return;
    }

    setSavingKey(item.item_key);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_activate_club_spotlight_v1",
      { p_club_id: selectedClub.club_id },
    );

    if (error) {
      setErrorMessage(error.message || "Spotlight Entry could not be activated.");
      setSavingKey("");
      return;
    }

    const payload = (data || {}) as Record<string, unknown>;
    setMessage(
      `Spotlight rotation entry active until ${new Date(
        String(payload.ends_at || Date.now()),
      ).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}.`,
    );
    window.dispatchEvent(new Event("dream-tokens-updated"));
    await load();
    setSavingKey("");
  }

  async function loadAdminCatalog() {
    setAdminOpen((current) => !current);
    if (adminItems.length > 0) return;

    const { data, error } = await supabase.rpc(
      "admin_get_creator_club_upgrade_catalog_v1",
    );

    if (error) {
      setErrorMessage(error.message || "Admin upgrade catalogue could not load.");
      return;
    }

    setAdminItems(
      ((data || []) as AdminItem[]).map((item) => ({
        ...item,
        price_dt: Number(item.price_dt || 0),
        min_club_level: Number(item.min_club_level || 1),
        sort_order: Number(item.sort_order || 0),
        is_active: Boolean(item.is_active),
      })),
    );
  }

  async function saveAdminItem(item: AdminItem) {
    setSavingKey(`admin:${item.item_key}`);
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_update_creator_club_upgrade_item_v1",
      {
        p_item_key: item.item_key,
        p_price_dt: item.price_dt,
        p_min_club_level: item.min_club_level,
        p_is_active: item.is_active,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Upgrade catalogue item could not save.");
      setSavingKey("");
      return;
    }

    setMessage(`${item.display_name} economy settings saved.`);
    setSavingKey("");
    await load();
  }

  if (isLoading) {
    return (
      <section className="shrink-0 rounded-[26px] border border-amber-200/12 bg-amber-300/[0.035] p-5 text-xs text-white/40">
        Loading Club Upgrade Store...
      </section>
    );
  }

  if (clubs.length === 0) {
    return null;
  }

  return (
    <section className="shrink-0 rounded-[28px] border border-amber-200/12 bg-[linear-gradient(145deg,rgba(83,52,9,0.13),rgba(3,13,29,0.92))] p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-amber-100/58">
            Phase 7 · DT Reinvestment
          </p>
          <h2 className="mt-1 text-2xl font-black">Club Upgrade Store</h2>
          <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/36">
            Spend earned DT on tools, presentation and controlled exposure.
            Upgrades never buy Club Level, Creator REP, members or leaderboard points.
          </p>
        </div>

        <div className="rounded-[18px] border border-amber-200/12 bg-amber-300/[0.035] px-4 py-3 text-right">
          <strong className="block text-xl text-amber-100">
            {(selectedClub?.wallet_dt || 0).toLocaleString()} DT
          </strong>
          <span className="text-[7px] font-black uppercase tracking-[0.08em] text-white/24">
            Dream Token wallet
          </span>
        </div>
      </div>

      {(message || errorMessage) && (
        <div className="mt-3">
          {message && (
            <p className="rounded-xl border border-emerald-200/12 bg-emerald-400/[0.05] px-3 py-2 text-[9px] text-emerald-100">
              {message}
            </p>
          )}
          {errorMessage && (
            <p className="rounded-xl border border-red-200/12 bg-red-400/[0.05] px-3 py-2 text-[9px] text-red-100">
              {errorMessage}
            </p>
          )}
        </div>
      )}

      {clubs.length > 1 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {clubs.map((club) => (
            <button
              key={club.club_id}
              type="button"
              onClick={() => setSelectedClubId(club.club_id)}
              className={`min-h-9 shrink-0 rounded-full border px-4 text-[8px] font-black uppercase tracking-[0.08em] ${
                selectedClub?.club_id === club.club_id
                  ? "border-amber-200/20 bg-amber-300/[0.065] text-amber-100"
                  : "border-white/8 bg-white/[0.025] text-white/30"
              }`}
            >
              {club.club_name}
            </button>
          ))}
        </div>
      )}

      {selectedClub && (
        <>
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[22px] border border-white/8 bg-black/14 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-200/12 bg-cyan-300/[0.04] px-3 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-cyan-100">
                  Level {selectedClub.level_number} · {selectedClub.level_name}
                </span>
                {selectedClub.spotlight.active && (
                  <span className="rounded-full border border-fuchsia-200/14 bg-fuchsia-300/[0.05] px-3 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-fuchsia-100">
                    Spotlight active · {remainingLabel(selectedClub.spotlight.ends_at)}
                  </span>
                )}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <EquippedChip
                  label="Club Theme"
                  value={equippedDisplayName(selectedClub, "club_theme")}
                  onReset={
                    selectedClub.equipped.club_theme_key
                      ? () => void resetSlot("club_theme")
                      : undefined
                  }
                />
                <EquippedChip
                  label="Club Frame"
                  value={equippedDisplayName(selectedClub, "club_frame")}
                  onReset={
                    selectedClub.equipped.club_frame_key
                      ? () => void resetSlot("club_frame")
                      : undefined
                  }
                />
                <EquippedChip
                  label="Room Theme"
                  value={equippedDisplayName(selectedClub, "room_theme")}
                  onReset={
                    selectedClub.equipped.room_theme_key
                      ? () => void resetSlot("room_theme")
                      : undefined
                  }
                />
              </div>
            </div>

            <UpgradePreview club={selectedClub} />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_ORDER.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setCategory(item.key)}
                className={`min-h-9 shrink-0 rounded-full border px-4 text-[8px] font-black uppercase tracking-[0.08em] ${
                  category === item.key
                    ? "border-amber-200/20 bg-amber-300/[0.065] text-amber-100"
                    : "border-white/8 bg-white/[0.025] text-white/30"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="mt-2 text-[8px] text-white/26">
            {CATEGORY_ORDER.find((item) => item.key === category)?.text}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => {
              const equipped = isItemEquipped(selectedClub, item);
              const cooldownActive = Boolean(
                selectedClub.spotlight.cooldown_ends_at &&
                  new Date(selectedClub.spotlight.cooldown_ends_at).getTime() >
                    Date.now(),
              );

              return (
                <article
                  key={item.item_key}
                  className={`rounded-[20px] border p-4 ${
                    equipped
                      ? "border-emerald-200/14 bg-emerald-400/[0.04]"
                      : item.unlocked
                        ? "border-cyan-200/12 bg-cyan-300/[0.03]"
                        : "border-white/8 bg-black/14"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <strong className="block text-sm text-white/82">
                        {item.display_name}
                      </strong>
                      <p className="mt-2 text-[9px] leading-4 text-white/32">
                        {item.description}
                      </p>
                    </span>
                    <span className="shrink-0 rounded-full border border-amber-200/12 bg-amber-300/[0.04] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.07em] text-amber-100">
                      {item.purchase_type === "permanent" && item.unlocked
                        ? "Owned"
                        : `${item.price_dt.toLocaleString()} DT`}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <SmallPill>Level {item.min_club_level}+</SmallPill>
                    <SmallPill>
                      {item.scope === "creator" ? "Creator-wide" : "This club"}
                    </SmallPill>
                    {equipped && <SmallPill>Equipped</SmallPill>}
                  </div>

                  <div className="mt-4">
                    {!item.eligible && !item.unlocked ? (
                      <DisabledAction>
                        Unlocks at Club Level {item.min_club_level}
                      </DisabledAction>
                    ) : item.purchase_type === "consumable" ? (
                      selectedClub.spotlight.active ? (
                        <DisabledAction>
                          Active · {remainingLabel(selectedClub.spotlight.ends_at)}
                        </DisabledAction>
                      ) : cooldownActive ? (
                        <DisabledAction>
                          Cooldown · {remainingLabel(selectedClub.spotlight.cooldown_ends_at)}
                        </DisabledAction>
                      ) : (
                        <StoreAction
                          disabled={savingKey === item.item_key}
                          onClick={() => void activateSpotlight(item)}
                        >
                          {savingKey === item.item_key
                            ? "Activating..."
                            : "Enter Spotlight Rotation"}
                        </StoreAction>
                      )
                    ) : item.unlocked ? (
                      item.slot_key ? (
                        equipped ? (
                          <DisabledAction>Currently Equipped</DisabledAction>
                        ) : (
                          <StoreAction
                            disabled={savingKey === item.item_key}
                            onClick={() => void equip(item)}
                          >
                            {savingKey === item.item_key ? "Equipping..." : "Equip"}
                          </StoreAction>
                        )
                      ) : (
                        <DisabledAction>Permanent Tool Unlocked</DisabledAction>
                      )
                    ) : (
                      <StoreAction
                        disabled={
                          savingKey === item.item_key ||
                          selectedClub.wallet_dt < item.price_dt
                        }
                        onClick={() => void purchase(item)}
                      >
                        {selectedClub.wallet_dt < item.price_dt
                          ? `Need ${(
                              item.price_dt - selectedClub.wallet_dt
                            ).toLocaleString()} more DT`
                          : savingKey === item.item_key
                            ? "Purchasing..."
                            : `Unlock · ${item.price_dt.toLocaleString()} DT`}
                      </StoreAction>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {isAdmin && (
        <div className="mt-5 border-t border-white/8 pt-4">
          <button
            type="button"
            onClick={() => void loadAdminCatalog()}
            className="rounded-full border border-violet-200/14 bg-violet-300/[0.045] px-4 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-violet-100"
          >
            {adminOpen ? "Hide Admin Economy Controls" : "Admin Economy Controls"}
          </button>

          {adminOpen && (
            <div className="mt-3 grid gap-2">
              {adminItems.map((item, index) => (
                <div
                  key={item.item_key}
                  className="grid gap-2 rounded-[16px] border border-white/8 bg-black/14 p-3 lg:grid-cols-[minmax(0,1fr)_120px_120px_120px] lg:items-end"
                >
                  <div>
                    <strong className="block text-[10px] text-white/68">
                      {item.display_name}
                    </strong>
                    <span className="mt-1 block text-[7px] text-white/24">
                      {item.item_key}
                    </span>
                  </div>

                  <label>
                    <span className={fieldLabel}>Price DT</span>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={item.price_dt}
                      onChange={(event) =>
                        setAdminItems((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  price_dt: Number(event.target.value || 0),
                                }
                              : row,
                          ),
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className={fieldLabel}>Min Level</span>
                    <select
                      value={item.min_club_level}
                      onChange={(event) =>
                        setAdminItems((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? {
                                  ...row,
                                  min_club_level: Number(event.target.value),
                                }
                              : row,
                          ),
                        )
                      }
                      className={inputClass}
                    >
                      {[1, 2, 3, 4, 5].map((level) => (
                        <option key={level} value={level}>
                          Level {level}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAdminItems((current) =>
                          current.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, is_active: !row.is_active }
                              : row,
                          ),
                        )
                      }
                      className={`min-h-10 flex-1 rounded-xl border text-[7px] font-black uppercase tracking-[0.07em] ${
                        item.is_active
                          ? "border-emerald-200/14 bg-emerald-400/[0.05] text-emerald-100"
                          : "border-white/8 bg-white/[0.025] text-white/28"
                      }`}
                    >
                      {item.is_active ? "Active" : "Off"}
                    </button>
                    <button
                      type="button"
                      disabled={savingKey === `admin:${item.item_key}`}
                      onClick={() => void saveAdminItem(item)}
                      className="min-h-10 rounded-xl border border-violet-200/14 bg-violet-300/[0.05] px-3 text-[7px] font-black uppercase tracking-[0.07em] text-violet-100 disabled:opacity-35"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function equippedDisplayName(
  club: StoreClub,
  slot: NonNullable<StoreItem["slot_key"]>,
) {
  const effectKey =
    slot === "club_theme"
      ? club.equipped.club_theme_key
      : slot === "club_frame"
        ? club.equipped.club_frame_key
        : club.equipped.room_theme_key;

  if (!effectKey) return "Default";

  return (
    club.items.find(
      (item) => item.slot_key === slot && item.effect_key === effectKey,
    )?.display_name || effectKey.replaceAll("_", " ")
  );
}

function isItemEquipped(club: StoreClub, item: StoreItem) {
  if (!item.slot_key) return false;
  if (item.slot_key === "club_theme") {
    return club.equipped.club_theme_key === item.effect_key;
  }
  if (item.slot_key === "club_frame") {
    return club.equipped.club_frame_key === item.effect_key;
  }
  return club.equipped.room_theme_key === item.effect_key;
}

function UpgradePreview({ club }: { club: StoreClub }) {
  return (
    <div
      className="relative min-h-[170px] overflow-hidden rounded-[22px] border border-white/10 bg-[#061327] p-4"
      style={clubUpgradeCardStyle(
        club.equipped.club_theme_key,
        club.equipped.club_frame_key,
      )}
    >
      <div className="relative z-10">
        <p className="text-[7px] font-black uppercase tracking-[0.10em] text-white/28">
          Live Style Preview
        </p>
        <h3 className="mt-2 text-xl font-black">{club.club_name}</h3>
        <p className="mt-2 text-[9px] leading-4 text-white/34">
          Themes and frames change presentation only. Club performance still
          comes from members and real engagement.
        </p>
        <div
          className="mt-4 h-12 rounded-xl border border-white/8 bg-black/16"
          style={roomUpgradeBackdropStyle(club.equipped.room_theme_key)}
        />
      </div>
    </div>
  );
}

function EquippedChip({
  label,
  value,
  onReset,
}: {
  label: string;
  value: string;
  onReset?: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/7 bg-black/12 px-3 py-3">
      <span className="block text-[6px] font-black uppercase tracking-[0.08em] text-white/22">
        {label}
      </span>
      <strong className="mt-1 block truncate text-[9px] text-white/54">
        {value.replaceAll("_", " ")}
      </strong>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 text-[7px] font-black uppercase tracking-[0.07em] text-cyan-100/48"
        >
          Restore default
        </button>
      )}
    </div>
  );
}

function SmallPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[6px] font-black uppercase tracking-[0.06em] text-white/30">
      {children}
    </span>
  );
}

function StoreAction({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-10 w-full rounded-full border border-amber-200/18 bg-amber-300/[0.06] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-amber-100 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function DisabledAction({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-center rounded-full border border-white/7 bg-white/[0.02] px-4 text-center text-[7px] font-black uppercase tracking-[0.07em] text-white/24">
      {children}
    </div>
  );
}

const fieldLabel =
  "mb-1.5 block text-[6px] font-black uppercase tracking-[0.08em] text-white/24";
const inputClass =
  "h-10 w-full rounded-xl border border-white/9 bg-[#061327] px-3 text-[9px] text-white outline-none focus:border-violet-200/24";
