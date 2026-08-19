"use client";

import { useEffect, useMemo, useState } from "react";
import { useNovaHomeActivityLayout } from "@/components/nova-home/NovaHomeActivityShell";

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

export type CleaningToolCatalogItem = {
  cleaning_tool_key: string;
  title: string;
  description: string | null;
  currency_code: RugCurrency;
  price_amount: number;
  power_multiplier: number;
  game_image: string;
  thumbnail_image: string | null;
  is_starter: boolean;
  is_placeholder: boolean;
  sort_order: number;
};

type CatalogTab = "rugs" | "tools";

type Props = {
  open: boolean;

  rugCatalog: RugCatalogItem[];
  rugOwnedKeys: Set<string>;
  equippedRugKey: string;
  selectedRugKey: string | null;
  rugPurchasingKey: string | null;
  rugEquippingKey: string | null;
  onSelectRug: (rugKey: string) => void;
  onPurchaseRug: (rugKey: string) => void;
  onEquipRug: (rugKey: string) => void;

  cleaningToolCatalog: CleaningToolCatalogItem[];
  cleaningToolOwnedKeys: Set<string>;
  equippedCleaningToolKey: string;
  selectedCleaningToolKey: string | null;
  cleaningToolPurchasingKey: string | null;
  cleaningToolEquippingKey: string | null;
  onSelectCleaningTool: (cleaningToolKey: string) => void;
  onPurchaseCleaningTool: (cleaningToolKey: string) => void;
  onEquipCleaningTool: (cleaningToolKey: string) => void;

  dreamTokenBalance: number;
  dreamGemBalance: number;
  loading: boolean;
  message: string;
  onClose: () => void;
};

function formatCurrency(value: number, currency: RugCurrency) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} ${currency}`;
}

function powerLabel(multiplier: number) {
  const percentage = Math.max(0, Math.round((Number(multiplier || 1) - 1) * 100));
  return percentage <= 0 ? "Standard Power" : `+${percentage}% Power`;
}

function CurrencyPill({
  currency,
  value,
}: {
  currency: RugCurrency;
  value: number;
}) {
  const violet = currency === "DG";
  return (
    <div
      className={`flex min-w-[86px] items-center gap-2 rounded-full border px-3 py-2 shadow-[0_10px_26px_rgba(0,0,0,0.24)] ${
        violet
          ? "border-violet-300/25 bg-violet-300/[0.08]"
          : "border-cyan-300/25 bg-cyan-300/[0.08]"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
          violet
            ? "bg-violet-300 text-slate-950"
            : "bg-amber-300 text-slate-950"
        }`}
      >
        {currency}
      </span>
      <span className="text-[12px] font-black leading-none text-white sm:text-[14px]">
        {Math.round(value).toLocaleString("en-SG")}
      </span>
    </div>
  );
}

export default function RugCollectionPanel({
  open,
  rugCatalog,
  rugOwnedKeys,
  equippedRugKey,
  selectedRugKey,
  rugPurchasingKey,
  rugEquippingKey,
  onSelectRug,
  onPurchaseRug,
  onEquipRug,
  cleaningToolCatalog,
  cleaningToolOwnedKeys,
  equippedCleaningToolKey,
  selectedCleaningToolKey,
  cleaningToolPurchasingKey,
  cleaningToolEquippingKey,
  onSelectCleaningTool,
  onPurchaseCleaningTool,
  onEquipCleaningTool,
  dreamTokenBalance,
  dreamGemBalance,
  loading,
  message,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<CatalogTab>("rugs");
  const { compactLandscape } = useNovaHomeActivityLayout();

  useEffect(() => {
    if (open) setActiveTab("rugs");
  }, [open]);

  const selectedRug = useMemo(
    () =>
      rugCatalog.find((rug) => rug.rug_key === selectedRugKey) ??
      rugCatalog.find((rug) => rug.rug_key === equippedRugKey) ??
      rugCatalog[0] ??
      null,
    [rugCatalog, equippedRugKey, selectedRugKey],
  );

  const selectedTool = useMemo(
    () =>
      cleaningToolCatalog.find(
        (tool) => tool.cleaning_tool_key === selectedCleaningToolKey,
      ) ??
      cleaningToolCatalog.find(
        (tool) => tool.cleaning_tool_key === equippedCleaningToolKey,
      ) ??
      cleaningToolCatalog[0] ??
      null,
    [
      cleaningToolCatalog,
      equippedCleaningToolKey,
      selectedCleaningToolKey,
    ],
  );

  if (!open) return null;

  const selected = activeTab === "rugs" ? selectedRug : selectedTool;
  const selectedCurrency = selected?.currency_code ?? "DT";
  const selectedPrice = selected?.price_amount ?? 0;
  const selectedStarter = selected?.is_starter ?? false;
  const selectedImage = selected
    ? activeTab === "rugs"
      ? selected.game_image
      : selected.game_image
    : "";
  const selectedOwned = selected
    ? activeTab === "rugs"
      ? selectedStarter || rugOwnedKeys.has((selected as RugCatalogItem).rug_key)
      : selectedStarter ||
        cleaningToolOwnedKeys.has(
          (selected as CleaningToolCatalogItem).cleaning_tool_key,
        )
    : false;
  const selectedEquipped = selected
    ? activeTab === "rugs"
      ? (selected as RugCatalogItem).rug_key === equippedRugKey
      : (selected as CleaningToolCatalogItem).cleaning_tool_key ===
        equippedCleaningToolKey
    : false;
  const selectedAffordable =
    selectedCurrency === "DG"
      ? dreamGemBalance >= selectedPrice
      : dreamTokenBalance >= selectedPrice;

  const busy = Boolean(
    rugPurchasingKey ||
      rugEquippingKey ||
      cleaningToolPurchasingKey ||
      cleaningToolEquippingKey,
  );

  const selectKey = selected
    ? activeTab === "rugs"
      ? (selected as RugCatalogItem).rug_key
      : (selected as CleaningToolCatalogItem).cleaning_tool_key
    : "";

  function runSelectedAction() {
    if (!selected || !selectKey) return;
    if (selectedEquipped) return;
    if (activeTab === "rugs") {
      if (selectedOwned) onEquipRug(selectKey);
      else onPurchaseRug(selectKey);
    } else if (selectedOwned) {
      onEquipCleaningTool(selectKey);
    } else {
      onPurchaseCleaningTool(selectKey);
    }
  }

  const selectedActionBusy =
    activeTab === "rugs"
      ? rugPurchasingKey === selectKey || rugEquippingKey === selectKey
      : cleaningToolPurchasingKey === selectKey ||
        cleaningToolEquippingKey === selectKey;

  if (compactLandscape) {
    return (
      <div className="fixed inset-0 z-[125] flex h-[100dvh] max-h-[100dvh] w-[100vw] flex-col overflow-hidden bg-[#020713] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(37,192,242,0.15),transparent_34%),radial-gradient(circle_at_82%_72%,rgba(139,92,246,0.12),transparent_31%),linear-gradient(180deg,#061827,#020713)]" />

        <header
          className="relative z-10 flex h-[46px] shrink-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-slate-950/82 px-2 backdrop-blur-xl"
          style={{
            paddingLeft: "max(8px, env(safe-area-inset-left))",
            paddingRight: "max(8px, env(safe-area-inset-right))",
          }}
        >
          <div className="min-w-0">
            <p className="text-[7px] font-black uppercase tracking-[0.14em] text-cyan-200/58">Comfort & Decor</p>
            <h2 className="truncate font-serif text-[18px] font-semibold leading-none tracking-[-0.03em] text-white">Nova’s Rug Collection</h2>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-cyan-300/22 bg-cyan-300/[0.07] px-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 text-[8px] font-black text-slate-950">DT</span>
              <span className="text-[10px] font-black text-white">{Math.round(dreamTokenBalance).toLocaleString("en-SG")}</span>
            </div>
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-violet-300/22 bg-violet-300/[0.07] px-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-300 text-[8px] font-black text-slate-950">DG</span>
              <span className="text-[10px] font-black text-white">{Math.round(dreamGemBalance).toLocaleString("en-SG")}</span>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/14 bg-white/[0.055] text-lg text-white/80" aria-label="Close Rug Collection">×</button>
          </div>
        </header>

        <div
          className="relative z-10 grid min-h-0 flex-1 grid-cols-[minmax(225px,0.76fr)_minmax(0,1.24fr)] gap-2 p-2"
          style={{
            paddingLeft: "max(8px, env(safe-area-inset-left))",
            paddingRight: "max(8px, env(safe-area-inset-right))",
            paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          }}
        >
          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[16px] border border-cyan-200/15 bg-slate-950/44 shadow-[0_20px_46px_rgba(0,0,0,0.28)]">
            <div className="flex min-h-0 items-center justify-center overflow-hidden p-1.5">
              {selected ? (
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[12px] border border-white/[0.07] bg-[radial-gradient(circle_at_50%_44%,rgba(73,191,226,0.12),transparent_52%),linear-gradient(180deg,#071b2c,#030a13)] p-2">
                  <img
                    src={selectedImage}
                    alt={selected.title}
                    className={`object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.52)] ${activeTab === "tools" ? "max-h-[82%] max-w-[82%] scale-[1.08]" : "max-h-full max-w-full"}`}
                    draggable={false}
                  />
                  <div className="absolute left-2 top-2 flex gap-1">
                    <span className="rounded-full border border-cyan-200/20 bg-slate-950/80 px-2 py-1 text-[7px] font-black uppercase tracking-[0.09em] text-cyan-100">{activeTab === "rugs" ? "Rug" : "Tool"}</span>
                    {selectedEquipped && <span className="rounded-full bg-emerald-300 px-2 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-emerald-950">✓ Equipped</span>}
                  </div>
                  {activeTab === "tools" && selectedTool && (
                    <div className="absolute bottom-2 right-2 rounded-full border border-amber-200/18 bg-slate-950/86 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.07em] text-amber-100">{powerLabel(selectedTool.power_multiplier)}</div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] font-bold text-white/38">Nothing available yet.</p>
              )}
            </div>

            <div className="border-t border-white/[0.07] bg-slate-950/70 px-2.5 py-2">
              {selected && (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-[13px] font-black text-white">{selected.title}</h3>
                        {selectedStarter && <span className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.07em] text-cyan-100">Starter</span>}
                      </div>
                      <p className="mt-0.5 truncate text-[8px] text-white/48">{selected.description || (activeTab === "rugs" ? "Nova Home rug." : "Rug Rush cleaning tool.")}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-[10px] font-black ${selectedCurrency === "DG" ? "text-violet-200" : "text-cyan-100"}`}>{selectedStarter ? "Free starter" : formatCurrency(selectedPrice, selectedCurrency)}</span>
                        {activeTab === "tools" && selectedTool && <span className="text-[8px] font-black uppercase text-amber-100/78">{powerLabel(selectedTool.power_multiplier)}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy || selectedEquipped || (!selectedOwned && !selectedAffordable)}
                      onClick={runSelectedAction}
                      className={`h-8 min-w-[88px] shrink-0 rounded-full px-3 text-[8px] font-black uppercase tracking-[0.07em] ${selectedEquipped ? "border border-emerald-200/18 bg-emerald-300/[0.08] text-emerald-100" : selectedOwned ? "bg-cyan-300 text-slate-950" : selectedAffordable ? selectedCurrency === "DG" ? "bg-violet-300 text-slate-950" : "bg-cyan-300 text-slate-950" : "border border-white/10 bg-white/[0.04] text-white/35"} disabled:opacity-50`}
                    >
                      {selectedActionBusy ? "..." : selectedEquipped ? "Equipped" : selectedOwned ? "Equip" : selectedAffordable ? "Buy" : "Locked"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="grid min-h-0 grid-rows-[38px_minmax(0,1fr)] overflow-hidden rounded-[16px] border border-white/[0.09] bg-slate-950/40">
            <div className="flex items-center gap-1.5 border-b border-white/[0.07] p-1.5">
              <button type="button" onClick={() => setActiveTab("rugs")} className={`flex h-full flex-1 items-center justify-center gap-1.5 rounded-[10px] border px-2 text-[10px] font-black uppercase tracking-[0.08em] ${activeTab === "rugs" ? "border-cyan-200/45 bg-cyan-300/[0.12] text-cyan-50" : "border-white/[0.08] bg-white/[0.025] text-white/48"}`}>▱ Rugs</button>
              <button type="button" onClick={() => setActiveTab("tools")} className={`flex h-full flex-1 items-center justify-center gap-1.5 rounded-[10px] border px-2 text-[10px] font-black uppercase tracking-[0.08em] ${activeTab === "tools" ? "border-violet-200/45 bg-violet-300/[0.12] text-violet-50" : "border-white/[0.08] bg-white/[0.025] text-white/48"}`}>✦ Cleaning Tools</button>
            </div>

            <div className="min-h-0 overflow-y-auto overscroll-contain p-1.5" style={{ WebkitOverflowScrolling: "touch" }}>
              {loading ? (
                <div className="grid grid-cols-3 gap-1.5">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[116px] animate-pulse rounded-[12px] border border-white/[0.06] bg-white/[0.035]" />)}</div>
              ) : activeTab === "rugs" ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {rugCatalog.map((rug) => {
                    const owned = rug.is_starter || rugOwnedKeys.has(rug.rug_key);
                    const equipped = rug.rug_key === equippedRugKey;
                    const active = selectedRug?.rug_key === rug.rug_key;
                    const affordable = rug.currency_code === "DG" ? dreamGemBalance >= rug.price_amount : dreamTokenBalance >= rug.price_amount;
                    const cardBusy = rugPurchasingKey === rug.rug_key || rugEquippingKey === rug.rug_key;
                    return (
                      <article key={rug.rug_key} onClick={() => onSelectRug(rug.rug_key)} className={`cursor-pointer overflow-hidden rounded-[12px] border ${active ? "border-cyan-200/55 bg-cyan-300/[0.08]" : "border-white/[0.08] bg-white/[0.025]"}`}>
                        <div className="relative flex h-[74px] items-center justify-center overflow-hidden bg-slate-950/72 p-1.5">
                          <img src={rug.thumbnail_image || rug.game_image} alt="" className="h-full w-full object-contain" draggable={false} />
                          <div className="absolute left-1 top-1 flex gap-1">
                            {equipped && <span className="rounded-full bg-emerald-300 px-1.5 py-0.5 text-[6px] font-black uppercase text-emerald-950">Equipped</span>}
                            {rug.is_placeholder && <span className="rounded-full border border-amber-200/18 bg-slate-950/82 px-1.5 py-0.5 text-[6px] font-black uppercase text-amber-100">Temp</span>}
                          </div>
                        </div>
                        <div className="p-1.5">
                          <p className="truncate text-[10px] font-black text-white">{rug.title}</p>
                          <div className="mt-1 flex items-center justify-between gap-1">
                            <span className={`truncate text-[8px] font-black ${rug.currency_code === "DG" ? "text-violet-200" : "text-cyan-100"}`}>{rug.is_starter ? "Starter" : formatCurrency(rug.price_amount, rug.currency_code)}</span>
                            <button type="button" disabled={busy || equipped || (!owned && !affordable)} onClick={(event) => { event.stopPropagation(); onSelectRug(rug.rug_key); if (equipped) return; if (owned) onEquipRug(rug.rug_key); else onPurchaseRug(rug.rug_key); }} className={`h-6 min-w-[48px] rounded-full px-2 text-[7px] font-black uppercase ${equipped ? "border border-emerald-200/16 bg-emerald-300/[0.07] text-emerald-100" : owned ? "bg-cyan-300 text-slate-950" : rug.currency_code === "DG" ? "bg-violet-300 text-slate-950" : "bg-cyan-300 text-slate-950"} disabled:opacity-45`}>{cardBusy ? "..." : equipped ? "On" : owned ? "Equip" : "Buy"}</button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {cleaningToolCatalog.map((tool) => {
                    const owned = tool.is_starter || cleaningToolOwnedKeys.has(tool.cleaning_tool_key);
                    const equipped = tool.cleaning_tool_key === equippedCleaningToolKey;
                    const active = selectedTool?.cleaning_tool_key === tool.cleaning_tool_key;
                    const affordable = tool.currency_code === "DG" ? dreamGemBalance >= tool.price_amount : dreamTokenBalance >= tool.price_amount;
                    const cardBusy = cleaningToolPurchasingKey === tool.cleaning_tool_key || cleaningToolEquippingKey === tool.cleaning_tool_key;
                    return (
                      <article key={tool.cleaning_tool_key} onClick={() => onSelectCleaningTool(tool.cleaning_tool_key)} className={`cursor-pointer overflow-hidden rounded-[12px] border ${active ? "border-violet-200/55 bg-violet-300/[0.08]" : "border-white/[0.08] bg-white/[0.025]"}`}>
                        <div className="relative flex h-[84px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_48%,rgba(72,197,255,0.11),transparent_55%),#050d19] p-1.5">
                          <img src={tool.thumbnail_image || tool.game_image} alt="" className={`object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.45)] ${tool.cleaning_tool_key === "yellow-sponge" ? "h-[92%] w-[92%] scale-[1.1]" : "h-[84%] w-[92%]"}`} draggable={false} />
                          <div className="absolute left-1 top-1 flex gap-1">
                            {equipped && <span className="rounded-full bg-emerald-300 px-1.5 py-0.5 text-[6px] font-black uppercase text-emerald-950">Equipped</span>}
                            {tool.is_placeholder && <span className="rounded-full border border-violet-200/18 bg-slate-950/82 px-1.5 py-0.5 text-[6px] font-black uppercase text-violet-100">Temp</span>}
                          </div>
                          <span className="absolute bottom-1 right-1 rounded-full border border-amber-200/15 bg-slate-950/86 px-1.5 py-0.5 text-[7px] font-black uppercase text-amber-100">{powerLabel(tool.power_multiplier)}</span>
                        </div>
                        <div className="p-1.5">
                          <p className="truncate text-[10px] font-black text-white">{tool.title}</p>
                          <div className="mt-1 flex items-center justify-between gap-1">
                            <span className={`truncate text-[8px] font-black ${tool.currency_code === "DG" ? "text-violet-200" : "text-cyan-100"}`}>{tool.is_starter ? "Starter" : formatCurrency(tool.price_amount, tool.currency_code)}</span>
                            <button type="button" disabled={busy || equipped || (!owned && !affordable)} onClick={(event) => { event.stopPropagation(); onSelectCleaningTool(tool.cleaning_tool_key); if (equipped) return; if (owned) onEquipCleaningTool(tool.cleaning_tool_key); else onPurchaseCleaningTool(tool.cleaning_tool_key); }} className={`h-6 min-w-[48px] rounded-full px-2 text-[7px] font-black uppercase ${equipped ? "border border-emerald-200/16 bg-emerald-300/[0.07] text-emerald-100" : owned ? "bg-cyan-300 text-slate-950" : tool.currency_code === "DG" ? "bg-violet-300 text-slate-950" : "bg-cyan-300 text-slate-950"} disabled:opacity-45`}>{cardBusy ? "..." : equipped ? "On" : owned ? "Equip" : "Buy"}</button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {message && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-30 max-w-[70vw] -translate-x-1/2 rounded-full border border-amber-200/16 bg-amber-950/92 px-3 py-1.5 text-center text-[8px] font-bold text-amber-100 shadow-xl backdrop-blur-xl">{message}</div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[125] flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(37,192,242,0.15),transparent_34%),radial-gradient(circle_at_82%_72%,rgba(139,92,246,0.12),transparent_31%),linear-gradient(180deg,#061827,#020713)]" />

      <header className="relative z-10 flex h-[66px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-slate-950/78 px-3 backdrop-blur-xl sm:h-[76px] sm:px-5 lg:px-6">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-200/58 sm:text-[10px]">
            Comfort & Decor
          </p>
          <h2 className="truncate font-serif text-[22px] font-semibold tracking-[-0.035em] text-white sm:text-[28px] lg:text-[32px]">
            Nova’s Rug Collection
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <CurrencyPill currency="DT" value={dreamTokenBalance} />
          <CurrencyPill currency="DG" value={dreamGemBalance} />
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.055] text-[24px] leading-none text-white/80 transition hover:bg-white/[0.11] sm:h-12 sm:w-12"
            aria-label="Close Rug Collection"
          >
            ×
          </button>
        </div>
      </header>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-[minmax(310px,0.88fr)_minmax(0,1.12fr)] gap-3 p-3 sm:gap-4 sm:p-4 xl:grid-cols-[minmax(430px,0.9fr)_minmax(0,1.1fr)]">
        <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[22px] border border-cyan-200/15 bg-slate-950/42 shadow-[0_26px_64px_rgba(0,0,0,0.26)] sm:rounded-[28px]">
          <div className="flex min-h-0 items-center justify-center overflow-hidden p-3 sm:p-5">
            {selected ? (
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[18px] border border-white/[0.07] bg-[radial-gradient(circle_at_50%_44%,rgba(73,191,226,0.12),transparent_52%),linear-gradient(180deg,#071b2c,#030a13)] p-3 sm:rounded-[24px] sm:p-5">
                <img
                  src={selectedImage}
                  alt={selected.title}
                  className={`object-contain drop-shadow-[0_26px_40px_rgba(0,0,0,0.54)] ${
                    activeTab === "tools"
                      ? "max-h-[82%] max-w-[86%] scale-[1.08] sm:scale-[1.16]"
                      : "max-h-full max-w-full"
                  }`}
                  draggable={false}
                />

                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-200/20 bg-slate-950/78 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.11em] text-cyan-100 sm:text-[10px]">
                    {activeTab === "rugs" ? "Rug Preview" : "Cleaning Tool"}
                  </span>
                  {selectedEquipped && (
                    <span className="rounded-full bg-emerald-300 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-950 sm:text-[10px]">
                      ✓ Equipped
                    </span>
                  )}
                </div>

                {activeTab === "tools" && selectedTool && (
                  <div className="absolute bottom-3 right-3 rounded-[14px] border border-amber-200/18 bg-slate-950/84 px-3 py-2 text-right shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
                    <p className="text-[9px] font-black uppercase tracking-[0.11em] text-amber-100/64 sm:text-[10px]">
                      Cleaning Power
                    </p>
                    <p className="mt-0.5 text-[18px] font-black text-amber-100 sm:text-[22px]">
                      {powerLabel(selectedTool.power_multiplier)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm font-bold text-white/38">Nothing available yet.</p>
            )}
          </div>

          <div className="border-t border-white/[0.07] bg-slate-950/66 p-4 sm:p-5">
            {selected && (
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-[18px] font-black text-white sm:text-[22px]">
                      {selected.title}
                    </h3>
                    {selectedStarter && (
                      <span className="rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100">
                        Starter
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 max-w-2xl text-[11px] leading-[1.45] text-white/53 sm:text-[13px]">
                    {selected.description ||
                      (activeTab === "rugs"
                        ? "A rug for Nova’s Home and Rug Rush."
                        : "A cleaning tool for Rug Rush.")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p
                      className={`text-[14px] font-black sm:text-[16px] ${
                        selectedCurrency === "DG"
                          ? "text-violet-200"
                          : "text-cyan-100"
                      }`}
                    >
                      {selectedStarter
                        ? "Free starter item"
                        : formatCurrency(selectedPrice, selectedCurrency)}
                    </p>
                    {activeTab === "tools" && selectedTool && (
                      <span className="rounded-full border border-amber-200/16 bg-amber-300/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-100 sm:text-[11px]">
                        {powerLabel(selectedTool.power_multiplier)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    busy ||
                    selectedEquipped ||
                    (!selectedOwned && !selectedAffordable)
                  }
                  onClick={runSelectedAction}
                  className={`min-h-12 min-w-[132px] shrink-0 rounded-full px-5 text-[11px] font-black uppercase tracking-[0.09em] transition sm:min-h-14 sm:min-w-[154px] sm:px-6 sm:text-[12px] ${
                    selectedEquipped
                      ? "border border-emerald-200/22 bg-emerald-300/[0.09] text-emerald-100"
                      : selectedOwned
                        ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                        : selectedAffordable
                          ? selectedCurrency === "DG"
                            ? "bg-violet-300 text-slate-950 hover:bg-violet-200"
                            : "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                          : "border border-white/10 bg-white/[0.04] text-white/35"
                  } disabled:cursor-not-allowed disabled:opacity-55`}
                >
                  {selectedActionBusy
                    ? "Working..."
                    : selectedEquipped
                      ? "✓ Equipped"
                      : selectedOwned
                        ? "Equip"
                        : selectedAffordable
                          ? `Buy · ${formatCurrency(selectedPrice, selectedCurrency)}`
                          : `Need ${formatCurrency(
                              selectedPrice -
                                (selectedCurrency === "DG"
                                  ? dreamGemBalance
                                  : dreamTokenBalance),
                              selectedCurrency,
                            )}`}
                </button>
              </div>
            )}

            {message && (
              <p className="mt-3 rounded-[12px] border border-amber-200/12 bg-amber-300/[0.055] px-3 py-2 text-[11px] font-bold leading-4 text-amber-100/88 sm:text-[12px]">
                {message}
              </p>
            )}
          </div>
        </section>

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[22px] border border-white/[0.09] bg-slate-950/38 sm:rounded-[28px]">
          <div className="flex items-center gap-2 border-b border-white/[0.07] p-3 sm:p-4">
            <button
              type="button"
              onClick={() => setActiveTab("rugs")}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border px-4 text-[12px] font-black uppercase tracking-[0.09em] transition sm:min-h-12 sm:text-[13px] ${
                activeTab === "rugs"
                  ? "border-cyan-200/45 bg-cyan-300/[0.12] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                  : "border-white/[0.08] bg-white/[0.025] text-white/48 hover:bg-white/[0.055]"
              }`}
            >
              <span aria-hidden="true">▱</span>
              Rugs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tools")}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border px-4 text-[12px] font-black uppercase tracking-[0.09em] transition sm:min-h-12 sm:text-[13px] ${
                activeTab === "tools"
                  ? "border-violet-200/45 bg-violet-300/[0.12] text-violet-50 shadow-[0_0_24px_rgba(139,92,246,0.14)]"
                  : "border-white/[0.08] bg-white/[0.025] text-white/48 hover:bg-white/[0.055]"
              }`}
            >
              <span aria-hidden="true">✦</span>
              Cleaning Tools
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto p-3 sm:p-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[1.04] animate-pulse rounded-[18px] border border-white/[0.06] bg-white/[0.035]"
                  />
                ))}
              </div>
            ) : activeTab === "rugs" ? (
              <div>
                <div className="mb-3">
                  <p className="text-[12px] font-black uppercase tracking-[0.11em] text-cyan-100 sm:text-[13px]">
                    Choose your rug
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-white/46 sm:text-[12px]">
                    Buy and equip different rugs. Your equipped rug is used automatically in Rug Rush.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  {rugCatalog.map((rug) => {
                    const owned = rug.is_starter || rugOwnedKeys.has(rug.rug_key);
                    const equipped = rug.rug_key === equippedRugKey;
                    const active = selectedRug?.rug_key === rug.rug_key;
                    const affordable =
                      rug.currency_code === "DG"
                        ? dreamGemBalance >= rug.price_amount
                        : dreamTokenBalance >= rug.price_amount;
                    const cardBusy =
                      rugPurchasingKey === rug.rug_key ||
                      rugEquippingKey === rug.rug_key;

                    return (
                      <article
                        key={rug.rug_key}
                        onClick={() => onSelectRug(rug.rug_key)}
                        className={`group cursor-pointer overflow-hidden rounded-[18px] border text-left transition ${
                          active
                            ? "border-cyan-200/55 bg-cyan-300/[0.08] shadow-[0_0_26px_rgba(34,211,238,0.13)]"
                            : "border-white/[0.08] bg-white/[0.025] hover:border-cyan-200/24 hover:bg-cyan-300/[0.035]"
                        }`}
                      >
                        <div className="relative aspect-[1.28] overflow-hidden bg-slate-950/72 p-2.5">
                          <img
                            src={rug.thumbnail_image || rug.game_image}
                            alt=""
                            className="h-full w-full object-contain transition duration-200 group-hover:scale-[1.025]"
                            draggable={false}
                          />
                          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                            {equipped && (
                              <span className="rounded-full bg-emerald-300 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-950">
                                Equipped
                              </span>
                            )}
                            {rug.is_placeholder && (
                              <span className="rounded-full border border-amber-200/20 bg-slate-950/80 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-amber-100">
                                Temp Art
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3">
                          <p className="truncate text-[13px] font-black text-white sm:text-[14px]">
                            {rug.title}
                          </p>
                          <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-white/44 sm:text-[11px]">
                            {rug.description || "Nova Home rug."}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span
                              className={`text-[11px] font-black ${
                                rug.currency_code === "DG"
                                  ? "text-violet-200"
                                  : "text-cyan-100"
                              }`}
                            >
                              {rug.is_starter
                                ? "Starter"
                                : formatCurrency(rug.price_amount, rug.currency_code)}
                            </span>
                            <button
                              type="button"
                              disabled={busy || equipped || (!owned && !affordable)}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectRug(rug.rug_key);
                                if (equipped) return;
                                if (owned) onEquipRug(rug.rug_key);
                                else onPurchaseRug(rug.rug_key);
                              }}
                              className={`min-h-9 rounded-full px-3 text-[9px] font-black uppercase tracking-[0.07em] transition ${
                                equipped
                                  ? "border border-emerald-200/18 bg-emerald-300/[0.07] text-emerald-100"
                                  : owned
                                    ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                                    : rug.currency_code === "DG"
                                      ? "bg-violet-300 text-slate-950 hover:bg-violet-200"
                                      : "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                              } disabled:cursor-not-allowed disabled:opacity-45`}
                            >
                              {cardBusy
                                ? "..."
                                : equipped
                                  ? "Equipped"
                                  : owned
                                    ? "Equip"
                                    : "Buy"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-[0.11em] text-violet-100 sm:text-[13px]">
                      Cleaning tools
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-white/46 sm:text-[12px]">
                      Stronger tools remove dirt faster. Your equipped tool is used automatically in Rug Rush.
                    </p>
                  </div>
                  <span className="hidden rounded-full border border-amber-200/15 bg-amber-300/[0.055] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-amber-100 xl:inline-flex">
                    Better tool = faster cleaning
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {cleaningToolCatalog.map((tool) => {
                    const owned =
                      tool.is_starter ||
                      cleaningToolOwnedKeys.has(tool.cleaning_tool_key);
                    const equipped =
                      tool.cleaning_tool_key === equippedCleaningToolKey;
                    const active =
                      selectedTool?.cleaning_tool_key === tool.cleaning_tool_key;
                    const affordable =
                      tool.currency_code === "DG"
                        ? dreamGemBalance >= tool.price_amount
                        : dreamTokenBalance >= tool.price_amount;
                    const cardBusy =
                      cleaningToolPurchasingKey === tool.cleaning_tool_key ||
                      cleaningToolEquippingKey === tool.cleaning_tool_key;

                    return (
                      <article
                        key={tool.cleaning_tool_key}
                        onClick={() => onSelectCleaningTool(tool.cleaning_tool_key)}
                        className={`group cursor-pointer overflow-hidden rounded-[20px] border transition ${
                          active
                            ? "border-violet-200/55 bg-violet-300/[0.085] shadow-[0_0_28px_rgba(139,92,246,0.14)]"
                            : "border-white/[0.08] bg-white/[0.025] hover:border-violet-200/22 hover:bg-violet-300/[0.035]"
                        }`}
                      >
                        <div className="relative flex aspect-[1.08] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_48%,rgba(72,197,255,0.11),transparent_55%),#050d19] p-3">
                          <img
                            src={tool.thumbnail_image || tool.game_image}
                            alt=""
                            className={`object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.46)] transition duration-200 group-hover:scale-[1.045] ${
                              tool.cleaning_tool_key === "yellow-sponge"
                                ? "h-[84%] w-[84%] scale-[1.12]"
                                : "h-[78%] w-[88%]"
                            }`}
                            draggable={false}
                          />
                          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                            {equipped && (
                              <span className="rounded-full bg-emerald-300 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-950">
                                Equipped
                              </span>
                            )}
                            {tool.is_placeholder && (
                              <span className="rounded-full border border-violet-200/20 bg-slate-950/80 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-violet-100">
                                Temp Art
                              </span>
                            )}
                          </div>
                          <span className="absolute bottom-2 right-2 rounded-full border border-amber-200/16 bg-slate-950/84 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.07em] text-amber-100">
                            {powerLabel(tool.power_multiplier)}
                          </span>
                        </div>

                        <div className="p-3 sm:p-3.5">
                          <p className="truncate text-[14px] font-black text-white sm:text-[15px]">
                            {tool.title}
                          </p>
                          <p className="mt-1 line-clamp-2 min-h-[32px] text-[10px] leading-4 text-white/47 sm:text-[11px]">
                            {tool.description || "Rug Rush cleaning tool."}
                          </p>

                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <span
                              className={`text-[12px] font-black ${
                                tool.currency_code === "DG"
                                  ? "text-violet-200"
                                  : "text-cyan-100"
                              }`}
                            >
                              {tool.is_starter
                                ? "Starter"
                                : formatCurrency(
                                    tool.price_amount,
                                    tool.currency_code,
                                  )}
                            </span>
                            <button
                              type="button"
                              disabled={busy || equipped || (!owned && !affordable)}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectCleaningTool(tool.cleaning_tool_key);
                                if (equipped) return;
                                if (owned)
                                  onEquipCleaningTool(tool.cleaning_tool_key);
                                else
                                  onPurchaseCleaningTool(tool.cleaning_tool_key);
                              }}
                              className={`min-h-10 min-w-[70px] rounded-full px-3 text-[10px] font-black uppercase tracking-[0.07em] transition ${
                                equipped
                                  ? "border border-emerald-200/18 bg-emerald-300/[0.07] text-emerald-100"
                                  : owned
                                    ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                                    : tool.currency_code === "DG"
                                      ? "bg-violet-300 text-slate-950 hover:bg-violet-200"
                                      : "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                              } disabled:cursor-not-allowed disabled:opacity-45`}
                            >
                              {cardBusy
                                ? "..."
                                : equipped
                                  ? "Equipped"
                                  : owned
                                    ? "Equip"
                                    : "Buy"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
