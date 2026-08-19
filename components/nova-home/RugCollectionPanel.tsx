"use client";

import { useMemo } from "react";

export type RugCurrency = "DT" | "DG";

export type RugCatalogItem = {
  rug_key: string;
  title: string;
  description: string | null;
  currency_code: RugCurrency;
  price_amount: number;
  game_image: string;
  room_image: string | null;
  thumbnail_image: string | null;
  is_starter: boolean;
  is_placeholder: boolean;
  sort_order: number;
};

type Props = {
  open: boolean;
  catalog: RugCatalogItem[];
  ownedKeys: Set<string>;
  equippedKey: string;
  selectedKey: string | null;
  dreamTokenBalance: number;
  dreamGemBalance: number;
  loading: boolean;
  message: string;
  purchasingKey: string | null;
  equippingKey: string | null;
  onClose: () => void;
  onSelect: (rugKey: string) => void;
  onPurchase: (rugKey: string) => void;
  onEquip: (rugKey: string) => void;
};

function formatCurrency(value: number, currency: RugCurrency) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} ${currency}`;
}

export default function RugCollectionPanel({
  open,
  catalog,
  ownedKeys,
  equippedKey,
  selectedKey,
  dreamTokenBalance,
  dreamGemBalance,
  loading,
  message,
  purchasingKey,
  equippingKey,
  onClose,
  onSelect,
  onPurchase,
  onEquip,
}: Props) {
  const selected = useMemo(
    () => catalog.find((rug) => rug.rug_key === selectedKey) ?? catalog.find((rug) => rug.rug_key === equippedKey) ?? catalog[0] ?? null,
    [catalog, equippedKey, selectedKey],
  );

  if (!open) return null;

  const selectedOwned = selected
    ? selected.is_starter || ownedKeys.has(selected.rug_key)
    : false;
  const selectedEquipped = selected?.rug_key === equippedKey;
  const selectedAffordable = selected
    ? selected.currency_code === "DT"
      ? dreamTokenBalance >= selected.price_amount
      : dreamGemBalance >= selected.price_amount
    : false;
  const busy = Boolean(purchasingKey || equippingKey);

  return (
    <div className="fixed inset-0 z-[125] flex min-h-0 flex-col overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_36%_25%,rgba(48,182,225,0.15),transparent_38%),radial-gradient(circle_at_84%_74%,rgba(139,92,246,0.09),transparent_30%),linear-gradient(180deg,#061827,#020713)]" />

      <header className="relative z-10 flex h-[58px] shrink-0 items-center justify-between gap-2 border-b border-white/[0.07] bg-slate-950/72 px-2.5 backdrop-blur-xl sm:h-[68px] sm:px-4">
        <div className="min-w-0">
          <p className="text-[7px] font-black uppercase tracking-[0.16em] text-cyan-200/50 sm:text-[8px]">Comfort & Decor</p>
          <h2 className="truncate font-serif text-lg font-medium tracking-[-0.03em] text-white sm:text-2xl">Nova’s Rug Collection</h2>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="rounded-full border border-cyan-200/20 bg-cyan-300/[0.05] px-2.5 py-1.5 text-right sm:px-3">
            <p className="text-[6px] font-black uppercase tracking-[0.12em] text-cyan-200/48">DT</p>
            <p className="text-[9px] font-black text-cyan-50 sm:text-xs">{Math.round(dreamTokenBalance).toLocaleString("en-SG")}</p>
          </div>
          <div className="rounded-full border border-violet-200/20 bg-violet-300/[0.05] px-2.5 py-1.5 text-right sm:px-3">
            <p className="text-[6px] font-black uppercase tracking-[0.12em] text-violet-200/55">DG</p>
            <p className="text-[9px] font-black text-violet-50 sm:text-xs">{Math.round(dreamGemBalance).toLocaleString("en-SG")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] text-lg text-white/72 transition hover:bg-white/[0.09] sm:h-10 sm:w-10"
            aria-label="Close Rug Collection"
          >
            ×
          </button>
        </div>
      </header>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_minmax(250px,0.95fr)] gap-2 p-2 sm:gap-3 sm:p-3 lg:grid-cols-[minmax(390px,0.92fr)_minmax(0,1.08fr)]">
        <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[18px] border border-cyan-200/13 bg-slate-950/36 sm:rounded-[24px]">
          <div className="flex min-h-0 items-center justify-center overflow-hidden p-2 sm:p-4">
            {selected ? (
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[14px] border border-white/[0.06] bg-[radial-gradient(circle_at_50%_45%,rgba(73,191,226,0.09),transparent_50%),linear-gradient(180deg,#071827,#030a13)] p-2 sm:rounded-[20px] sm:p-4">
                <img
                  src={selected.game_image}
                  alt={selected.title}
                  className="max-h-full max-w-full object-contain drop-shadow-[0_24px_34px_rgba(0,0,0,0.5)]"
                  draggable={false}
                />
                {selected.is_placeholder && (
                  <span className="absolute right-2 top-2 rounded-full border border-amber-200/20 bg-amber-300/10 px-2 py-1 text-[6px] font-black uppercase tracking-[0.12em] text-amber-100 sm:text-[7px]">
                    Placeholder art
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-white/35">No rugs available.</p>
            )}
          </div>

          <div className="border-t border-white/[0.06] bg-slate-950/60 p-2.5 sm:p-4">
            {selected && (
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-black text-white sm:text-lg">{selected.title}</h3>
                    {selectedEquipped && (
                      <span className="rounded-full border border-emerald-200/18 bg-emerald-300/[0.08] px-2 py-0.5 text-[6px] font-black uppercase tracking-[0.1em] text-emerald-100 sm:text-[7px]">Equipped</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 max-w-xl text-[8px] leading-3 text-white/44 sm:text-[10px] sm:leading-4">
                    {selected.description || "A rug for Nova’s Home and Rug Rush."}
                  </p>
                  <p className={`mt-1.5 text-xs font-black sm:text-sm ${selected.currency_code === "DG" ? "text-violet-200" : "text-cyan-100"}`}>
                    {selected.is_starter ? "Starter Rug" : formatCurrency(selected.price_amount, selected.currency_code)}
                  </p>
                </div>

                <div className="shrink-0">
                  {selectedEquipped ? (
                    <span className="inline-flex min-h-9 items-center rounded-full border border-emerald-200/20 bg-emerald-300/[0.08] px-4 text-[8px] font-black uppercase tracking-[0.1em] text-emerald-100 sm:min-h-10 sm:text-[9px]">✓ Equipped</span>
                  ) : selectedOwned ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onEquip(selected.rug_key)}
                      className="min-h-9 rounded-full bg-cyan-300 px-4 text-[8px] font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-cyan-200 disabled:opacity-45 sm:min-h-10 sm:px-5 sm:text-[9px]"
                    >
                      {equippingKey === selected.rug_key ? "Equipping..." : "Equip Rug"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || !selectedAffordable}
                      onClick={() => onPurchase(selected.rug_key)}
                      className={`min-h-9 rounded-full px-4 text-[8px] font-black uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-42 sm:min-h-10 sm:px-5 sm:text-[9px] ${selectedAffordable ? selected.currency_code === "DG" ? "bg-violet-300 text-slate-950 hover:bg-violet-200" : "bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "border border-white/10 bg-white/[0.04] text-white/34"}`}
                    >
                      {purchasingKey === selected.rug_key
                        ? "Purchasing..."
                        : selectedAffordable
                          ? `Buy · ${formatCurrency(selected.price_amount, selected.currency_code)}`
                          : `Need ${formatCurrency(selected.price_amount - (selected.currency_code === "DT" ? dreamTokenBalance : dreamGemBalance), selected.currency_code)}`}
                    </button>
                  )}
                </div>
              </div>
            )}
            {message && <p className="mt-2 text-[8px] font-bold leading-3 text-amber-100/82 sm:text-[10px] sm:leading-4">{message}</p>}
          </div>
        </section>

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[18px] border border-white/[0.08] bg-slate-950/34 sm:rounded-[24px]">
          <div className="border-b border-white/[0.06] px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-[7px] font-black uppercase tracking-[0.15em] text-cyan-200/50 sm:text-[8px]">Choose your rug</p>
            <p className="mt-0.5 text-[8px] leading-3 text-white/38 sm:text-[10px] sm:leading-4">Owned rugs can be equipped instantly. The equipped rug is used automatically in Rug Rush.</p>
          </div>

          <div className="min-h-0 overflow-y-auto p-2 sm:p-3">
            {loading ? (
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="aspect-[1.25] animate-pulse rounded-[14px] border border-white/[0.06] bg-white/[0.035]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {catalog.map((rug) => {
                  const owned = rug.is_starter || ownedKeys.has(rug.rug_key);
                  const equipped = rug.rug_key === equippedKey;
                  const active = selected?.rug_key === rug.rug_key;
                  return (
                    <button
                      key={rug.rug_key}
                      type="button"
                      onClick={() => onSelect(rug.rug_key)}
                      className={`group overflow-hidden rounded-[14px] border text-left transition ${active ? "border-cyan-200/50 bg-cyan-300/[0.08] shadow-[0_0_22px_rgba(34,211,238,0.12)]" : "border-white/[0.07] bg-white/[0.025] hover:border-cyan-200/20 hover:bg-cyan-300/[0.035]"}`}
                    >
                      <div className="relative aspect-[1.34] overflow-hidden bg-slate-950/70 p-1.5">
                        <img src={rug.thumbnail_image || rug.game_image} alt="" className="h-full w-full object-contain transition duration-200 group-hover:scale-[1.025]" draggable={false} />
                        <div className="absolute left-1.5 top-1.5 flex gap-1">
                          {equipped && <span className="rounded-full bg-emerald-300 px-1.5 py-0.5 text-[5px] font-black uppercase tracking-[0.08em] text-emerald-950">Equipped</span>}
                          {rug.is_placeholder && <span className="rounded-full border border-amber-200/20 bg-slate-950/74 px-1.5 py-0.5 text-[5px] font-black uppercase tracking-[0.08em] text-amber-100">Temp</span>}
                        </div>
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="truncate text-[8px] font-black text-white sm:text-[9px]">{rug.title}</p>
                        <div className="mt-0.5 flex items-center justify-between gap-1">
                          <span className={`text-[6px] font-bold uppercase tracking-[0.08em] ${owned ? "text-emerald-200/62" : "text-white/34"}`}>{owned ? "Owned" : "Locked"}</span>
                          <span className={`text-[7px] font-black ${rug.currency_code === "DG" ? "text-violet-200" : "text-cyan-100"}`}>{rug.is_starter ? "Free" : formatCurrency(rug.price_amount, rug.currency_code)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
