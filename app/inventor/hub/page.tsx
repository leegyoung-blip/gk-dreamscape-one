"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ZoneKey =
  | "bed-zone"
  | "desk-zone"
  | "display-zone"
  | "extra-zone";

type ZoneVisual = {
  key: ZoneKey;
  fallbackTitle: string;
  fallbackSubtitle: string;
  maskImage: string;
  accent: string;
};

type ZoneCatalogRow = {
  zone_key: string;
  title: string;
  subtitle: string | null;
  dt_cost: number;
  sort_order: number;
};

type ZoneUnlockRow = {
  zone_key: string;
};

type PurchaseResult = {
  zone_key: string;
  cost_paid: number;
  new_balance: number;
  already_owned: boolean;
};

type ZoneView = ZoneVisual & {
  title: string;
  subtitle: string;
  dtCost: number;
};

type MaskPixels = {
  width: number;
  height: number;
  alpha: Uint8ClampedArray;
};

const AREA_IMAGE = "/activities/nova-home/area-1/area-1-furnished.png";

const ZONE_VISUALS: ZoneVisual[] = [
  {
    key: "bed-zone",
    fallbackTitle: "Sleep Zone",
    fallbackSubtitle: "Unlock Nova's bed and rest corner.",
    maskImage: "/activities/nova-home/area-1/zone-bed-locked.png",
    accent: "#6ee7ff",
  },
  {
    key: "desk-zone",
    fallbackTitle: "Workstation",
    fallbackSubtitle: "Unlock Nova's desk, chair, and main computer.",
    maskImage: "/activities/nova-home/area-1/zone-desk-locked.png",
    accent: "#7dd3fc",
  },
  {
    key: "display-zone",
    fallbackTitle: "Display Shelf",
    fallbackSubtitle: "Unlock books, models, trophies, and collectibles.",
    maskImage: "/activities/nova-home/area-1/zone-display-locked.png",
    accent: "#a5b4fc",
  },
  {
    key: "extra-zone",
    fallbackTitle: "Comfort & Decor",
    fallbackSubtitle: "Unlock the rug, wall art, plant, speaker, and extra details.",
    maskImage: "/activities/nova-home/area-1/zone-extra-locked.png",
    accent: "#c4b5fd",
  },
];

const HIT_TEST_ORDER: ZoneKey[] = [
  "display-zone",
  "desk-zone",
  "bed-zone",
  "extra-zone",
];

function formatDT(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DT`;
}

function normaliseRole(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function getPurchaseResult(data: unknown): PurchaseResult | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const result = row as Record<string, unknown>;
  const zoneKey = String(result.zone_key || "");
  const costPaid = Number(result.cost_paid);
  const newBalance = Number(result.new_balance);
  const alreadyOwned = Boolean(result.already_owned);

  if (!zoneKey || !Number.isFinite(costPaid) || !Number.isFinite(newBalance)) {
    return null;
  }

  return {
    zone_key: zoneKey,
    cost_paid: costPaid,
    new_balance: newBalance,
    already_owned: alreadyOwned,
  };
}

export default function NovaHomePage() {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const maskPixelsRef = useRef<Map<ZoneKey, MaskPixels>>(new Map());

  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dreamTokenBalance, setDreamTokenBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [maskLoading, setMaskLoading] = useState(true);
  const [catalogRows, setCatalogRows] = useState<ZoneCatalogRow[]>([]);
  const [unlockedZones, setUnlockedZones] = useState<Set<ZoneKey>>(
    () => new Set(),
  );
  const [hoveredZoneKey, setHoveredZoneKey] = useState<ZoneKey | null>(null);
  const [selectedZoneKey, setSelectedZoneKey] = useState<ZoneKey | null>(null);
  const [purchasingZoneKey, setPurchasingZoneKey] = useState<ZoneKey | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [setupError, setSetupError] = useState("");

  const zones = useMemo<ZoneView[]>(() => {
    const catalog = new Map(
      catalogRows.map((row) => [row.zone_key, row] as const),
    );

    return ZONE_VISUALS.map((visual) => {
      const row = catalog.get(visual.key);

      return {
        ...visual,
        title: row?.title || visual.fallbackTitle,
        subtitle: row?.subtitle || visual.fallbackSubtitle,
        dtCost: Number(row?.dt_cost ?? 0),
      };
    });
  }, [catalogRows]);

  const zoneMap = useMemo(
    () => new Map(zones.map((zone) => [zone.key, zone] as const)),
    [zones],
  );

  const activeZoneKey = selectedZoneKey || hoveredZoneKey;
  const activeZone = activeZoneKey ? zoneMap.get(activeZoneKey) ?? null : null;
  const activeZoneUnlocked = activeZoneKey
    ? unlockedZones.has(activeZoneKey)
    : false;
  const unlockedCount = unlockedZones.size;
  const allZonesUnlocked = unlockedCount >= ZONE_VISUALS.length;

  const loadNovaHome = useCallback(async () => {
    setBalanceLoading(true);
    setCatalogLoading(true);
    setSetupError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserEmail(null);
      setIsAdmin(false);
      setAuthChecked(true);
      setBalanceLoading(false);
      setCatalogLoading(false);
      router.replace("/login");
      return;
    }

    setUserEmail(user.email ?? null);

    const [profileResult, balanceResult, catalogResult, unlockResult] =
      await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual"),
        supabase
          .from("nova_home_zone_catalog")
          .select("zone_key,title,subtitle,dt_cost,sort_order")
          .eq("area_key", "area-1")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("nova_home_zone_unlocks")
          .select("zone_key")
          .eq("user_id", user.id),
      ]);

    const admin = normaliseRole(profileResult.data?.role) === "admin";
    setIsAdmin(admin);
    setAuthChecked(true);

    if (!admin) {
      setBalanceLoading(false);
      setCatalogLoading(false);
      router.replace("/inventor");
      return;
    }

    if (profileResult.error) {
      console.warn(
        "Could not load Nova Home role:",
        profileResult.error.message,
      );
    }

    if (balanceResult.error) {
      console.warn(
        "Could not load Dream Token balance:",
        balanceResult.error.message,
      );
      setDreamTokenBalance(0);
    } else {
      const total = (balanceResult.data || []).reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0,
      );
      setDreamTokenBalance(total);
    }

    if (catalogResult.error) {
      console.warn(
        "Could not load Nova Home zone catalog:",
        catalogResult.error.message,
      );
      setCatalogRows([]);
      setSetupError(
        "Nova Home zone tables are not ready yet. Run the Nova Home SQL migration before testing purchases.",
      );
    } else {
      const rows = (catalogResult.data || []).map((row) => ({
        zone_key: String(row.zone_key),
        title: String(row.title || ""),
        subtitle: row.subtitle ? String(row.subtitle) : null,
        dt_cost: Number(row.dt_cost || 0),
        sort_order: Number(row.sort_order || 0),
      }));
      setCatalogRows(rows);

      const requiredKeys = new Set(ZONE_VISUALS.map((zone) => zone.key));
      const receivedKeys = new Set(rows.map((row) => row.zone_key));
      const missing = [...requiredKeys].filter((key) => !receivedKeys.has(key));

      if (missing.length > 0) {
        setSetupError(
          `Nova Home catalog is missing: ${missing.join(", ")}. Re-run the seed section of the SQL migration.`,
        );
      }
    }

    if (unlockResult.error) {
      console.warn(
        "Could not load Nova Home unlocks:",
        unlockResult.error.message,
      );
      setUnlockedZones(new Set());
    } else {
      const validZoneKeys = new Set<ZoneKey>(
        ZONE_VISUALS.map((zone) => zone.key),
      );
      const owned = new Set<ZoneKey>();

      ((unlockResult.data || []) as ZoneUnlockRow[]).forEach((row) => {
        const key = String(row.zone_key) as ZoneKey;
        if (validZoneKeys.has(key)) owned.add(key);
      });

      setUnlockedZones(owned);
    }

    setBalanceLoading(false);
    setCatalogLoading(false);
  }, [router]);

  useEffect(() => {
    loadNovaHome();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadNovaHome();
    });

    function refreshFromWalletEvent() {
      loadNovaHome();
    }

    window.addEventListener("focus", refreshFromWalletEvent);
    window.addEventListener("dream-tokens-updated", refreshFromWalletEvent);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshFromWalletEvent);
      window.removeEventListener(
        "dream-tokens-updated",
        refreshFromWalletEvent,
      );
    };
  }, [loadNovaHome]);

  useEffect(() => {
    let cancelled = false;

    async function loadMasks() {
      setMaskLoading(true);
      const loaded = new Map<ZoneKey, MaskPixels>();

      await Promise.all(
        ZONE_VISUALS.map(
          (zone) =>
            new Promise<void>((resolve) => {
              const image = new Image();
              image.decoding = "async";
              image.onload = () => {
                if (cancelled) {
                  resolve();
                  return;
                }

                const canvas = document.createElement("canvas");
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext("2d", {
                  willReadFrequently: true,
                });

                if (!context) {
                  resolve();
                  return;
                }

                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0);
                const imageData = context.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height,
                );
                const alpha = new Uint8ClampedArray(
                  canvas.width * canvas.height,
                );

                for (let pixel = 0; pixel < alpha.length; pixel += 1) {
                  alpha[pixel] = imageData.data[pixel * 4 + 3];
                }

                loaded.set(zone.key, {
                  width: canvas.width,
                  height: canvas.height,
                  alpha,
                });

                resolve();
              };
              image.onerror = () => resolve();
              image.src = zone.maskImage;
            }),
        ),
      );

      if (cancelled) return;
      maskPixelsRef.current = loaded;
      setMaskLoading(false);
    }

    loadMasks();

    return () => {
      cancelled = true;
    };
  }, []);

  const getZoneAtClientPoint = useCallback(
    (clientX: number, clientY: number): ZoneKey | null => {
      const stage = stageRef.current;
      if (!stage) return null;

      const rect = stage.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom ||
        rect.width <= 0 ||
        rect.height <= 0
      ) {
        return null;
      }

      const xRatio = (clientX - rect.left) / rect.width;
      const yRatio = (clientY - rect.top) / rect.height;

      for (const key of HIT_TEST_ORDER) {
        const mask = maskPixelsRef.current.get(key);
        if (!mask) continue;

        const x = Math.min(
          mask.width - 1,
          Math.max(0, Math.floor(xRatio * mask.width)),
        );
        const y = Math.min(
          mask.height - 1,
          Math.max(0, Math.floor(yRatio * mask.height)),
        );
        const alpha = mask.alpha[y * mask.width + x];

        if (alpha > 18) return key;
      }

      return null;
    },
    [],
  );

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (maskLoading || purchasingZoneKey) return;
    const key = getZoneAtClientPoint(event.clientX, event.clientY);
    setHoveredZoneKey(key);
  }

  function handlePointerLeave() {
    setHoveredZoneKey(null);
  }

  function handleZoneTap(event: ReactPointerEvent<HTMLDivElement>) {
    if (maskLoading || purchasingZoneKey) return;

    const key = getZoneAtClientPoint(event.clientX, event.clientY);
    if (!key) {
      setSelectedZoneKey(null);
      return;
    }

    setSelectedZoneKey(key);
    setMessage("");
  }

  async function purchaseZone(zoneKey: ZoneKey) {
    const zone = zoneMap.get(zoneKey);
    if (!zone || purchasingZoneKey || setupError) return;

    if (unlockedZones.has(zoneKey)) {
      setMessage(`${zone.title} is already unlocked.`);
      return;
    }

    if (dreamTokenBalance < zone.dtCost) {
      setMessage(
        `You need ${formatDT(zone.dtCost - dreamTokenBalance)} more to unlock ${zone.title}.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Unlock ${zone.title} for ${formatDT(zone.dtCost)}?`,
    );
    if (!confirmed) return;

    setPurchasingZoneKey(zoneKey);
    setMessage("");

    const { data, error } = await supabase.rpc("purchase_nova_home_zone", {
      p_zone_key: zoneKey,
    });

    setPurchasingZoneKey(null);

    if (error) {
      setMessage(error.message || "The zone could not be unlocked.");
      return;
    }

    const result = getPurchaseResult(data);
    if (!result) {
      setMessage("The purchase completed, but the result could not be read.");
      await loadNovaHome();
      return;
    }

    setUnlockedZones((current) => {
      const next = new Set(current);
      next.add(zoneKey);
      return next;
    });
    setDreamTokenBalance(Math.max(0, result.new_balance));
    setSelectedZoneKey(null);
    setHoveredZoneKey(null);
    setMessage(
      result.already_owned
        ? `${zone.title} was already unlocked.`
        : `${zone.title} unlocked for ${formatDT(result.cost_paid)}.`,
    );

    window.dispatchEvent(new Event("dream-tokens-updated"));
  }

  if (!authChecked || !isAdmin) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#020713] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full border border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_28px_rgba(83,215,255,0.28)]" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-cyan-200/70">
            Checking Nova Home access
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(39,145,190,0.16),transparent_38%),linear-gradient(180deg,#04101d_0%,#020713_72%)]" />

      <header className="relative z-30 flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.push("/inventor")}
          className="flex h-11 items-center gap-2 rounded-full border border-cyan-200/35 bg-slate-950/65 px-4 text-xs font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-cyan-300/10"
        >
          <span aria-hidden="true">←</span>
          Nova’s World
        </button>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-cyan-200/30 bg-slate-950/72 px-4 py-2 text-right shadow-[0_14px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-200/55">
              Dream Tokens
            </p>
            <p className="mt-0.5 text-sm font-black text-cyan-50">
              {balanceLoading ? "Loading..." : formatDT(dreamTokenBalance)}
            </p>
          </div>

          <div className="rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 text-right backdrop-blur-xl">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/38">
              Area 1
            </p>
            <p className="mt-0.5 text-sm font-black text-white">
              {unlockedCount}/4 unlocked
            </p>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-[1600px] px-3 pb-10 sm:px-6 lg:px-8">
        <div className="pb-5 pt-2 text-center sm:pb-7 sm:pt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300 sm:text-xs">
            Admin Development Preview
          </p>
          <h1 className="mt-2 font-serif text-4xl font-medium tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Nova’s Home
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/58 sm:text-base">
            Hover over a darkened part of Nova’s room to see its Dream Token
            unlock price. Tap or click a zone to purchase it.
          </p>
        </div>

        {setupError && (
          <div className="mx-auto mb-4 max-w-4xl rounded-[18px] border border-amber-200/28 bg-amber-300/[0.08] px-4 py-3 text-sm leading-6 text-amber-50/88">
            {setupError}
          </div>
        )}

        <div className="mx-auto w-full max-w-[1535px]">
          <div
            ref={stageRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerUp={handleZoneTap}
            className={`relative isolate w-full touch-manipulation select-none overflow-hidden rounded-[22px] border border-cyan-200/18 bg-black shadow-[0_32px_100px_rgba(0,0,0,0.58)] sm:rounded-[28px] ${
              activeZoneKey ? "cursor-pointer" : "cursor-default"
            }`}
            style={{ aspectRatio: "1535 / 1024" }}
            aria-label="Interactive Nova Home Area 1"
          >
            <img
              src={AREA_IMAGE}
              alt="Nova's fully furnished starter room"
              className="pointer-events-none absolute inset-0 h-full w-full"
              draggable={false}
            />

            {zones.map((zone) => {
              if (unlockedZones.has(zone.key)) return null;
              const hovered = hoveredZoneKey === zone.key;
              const selected = selectedZoneKey === zone.key;

              return (
                <img
                  key={zone.key}
                  src={zone.maskImage}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full transition duration-150"
                  draggable={false}
                  style={{
                    opacity: hovered || selected ? 0.62 : 1,
                    filter:
                      hovered || selected
                        ? `drop-shadow(0 0 8px ${zone.accent}) drop-shadow(0 0 18px rgba(83,215,255,0.45))`
                        : "none",
                  }}
                />
              );
            })}

            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 sm:left-5 sm:top-5">
              <span className="rounded-full border border-white/14 bg-slate-950/70 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-white/72 backdrop-blur-xl sm:text-[10px]">
                Area 1 · Starter Quarters
              </span>
              {allZonesUnlocked && (
                <span className="rounded-full border border-emerald-200/24 bg-emerald-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-emerald-100 backdrop-blur-xl sm:text-[10px]">
                  Fully Unlocked
                </span>
              )}
            </div>

            {maskLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/34 backdrop-blur-[1px]">
                <div className="rounded-full border border-cyan-200/24 bg-slate-950/78 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 backdrop-blur-xl">
                  Loading room zones...
                </div>
              </div>
            )}

            {!maskLoading && activeZone && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 w-[min(440px,calc(100%-24px))] -translate-x-1/2 sm:bottom-5">
                <div
                  className={`rounded-[20px] border px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.46)] backdrop-blur-xl sm:px-5 sm:py-4 ${
                    activeZoneUnlocked
                      ? "border-emerald-200/25 bg-emerald-950/80"
                      : "border-cyan-200/30 bg-slate-950/84"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-200/58">
                        {activeZoneUnlocked ? "Unlocked" : "Unlock Zone"}
                      </p>
                      <h2 className="mt-1 truncate text-base font-black text-white sm:text-lg">
                        {activeZone.title}
                      </h2>
                      <p className="mt-1 hidden text-xs leading-5 text-white/50 sm:block">
                        {activeZone.subtitle}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      {activeZoneUnlocked ? (
                        <span className="inline-flex rounded-full border border-emerald-200/24 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100">
                          ✓ Owned
                        </span>
                      ) : (
                        <>
                          <p className="text-xl font-black text-cyan-100 sm:text-2xl">
                            {catalogLoading
                              ? "..."
                              : formatDT(activeZone.dtCost)}
                          </p>
                          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/34">
                            Click to select
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto mt-5 grid max-w-[1535px] grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {zones.map((zone) => {
            const unlocked = unlockedZones.has(zone.key);
            const selected = selectedZoneKey === zone.key;
            const affordable = dreamTokenBalance >= zone.dtCost;

            return (
              <button
                key={zone.key}
                type="button"
                onClick={() => {
                  setSelectedZoneKey(zone.key);
                  setMessage("");
                }}
                className={`rounded-[16px] border px-3 py-3 text-left transition sm:rounded-[18px] sm:px-4 ${
                  selected
                    ? "border-cyan-200/58 bg-cyan-300/[0.09] shadow-[0_0_24px_rgba(83,215,255,0.12)]"
                    : unlocked
                      ? "border-emerald-200/16 bg-emerald-300/[0.045]"
                      : "border-white/10 bg-white/[0.025] hover:border-cyan-200/24"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-white sm:text-sm">
                      {zone.title}
                    </p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.11em] text-white/34">
                      {unlocked
                        ? "Unlocked"
                        : affordable
                          ? "Ready to unlock"
                          : "Save more DT"}
                    </p>
                  </div>
                  <strong
                    className={`shrink-0 text-[10px] sm:text-xs ${
                      unlocked
                        ? "text-emerald-200"
                        : affordable
                          ? "text-cyan-200"
                          : "text-white/34"
                    }`}
                  >
                    {unlocked ? "✓" : formatDT(zone.dtCost)}
                  </strong>
                </div>
              </button>
            );
          })}
        </div>

        {selectedZoneKey && zoneMap.get(selectedZoneKey) && (
          <div className="mx-auto mt-4 max-w-2xl rounded-[22px] border border-cyan-200/18 bg-slate-950/72 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5">
            {(() => {
              const zone = zoneMap.get(selectedZoneKey)!;
              const unlocked = unlockedZones.has(zone.key);
              const affordable = dreamTokenBalance >= zone.dtCost;
              const purchasing = purchasingZoneKey === zone.key;

              return (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/52">
                      {unlocked ? "Zone Owned" : "Selected Upgrade"}
                    </p>
                    <h2 className="mt-1 text-xl font-black">{zone.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-white/48">
                      {zone.subtitle}
                    </p>
                  </div>

                  {unlocked ? (
                    <div className="shrink-0 rounded-full border border-emerald-200/22 bg-emerald-300/10 px-5 py-3 text-xs font-black uppercase tracking-[0.1em] text-emerald-100">
                      ✓ Unlocked
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        purchasing ||
                        catalogLoading ||
                        Boolean(setupError) ||
                        !affordable
                      }
                      onClick={() => purchaseZone(zone.key)}
                      className={`min-h-12 shrink-0 rounded-full px-6 text-xs font-black uppercase tracking-[0.1em] transition ${
                        affordable && !setupError
                          ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:opacity-55"
                          : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/32"
                      }`}
                    >
                      {purchasing
                        ? "Unlocking..."
                        : affordable
                          ? `Unlock · ${formatDT(zone.dtCost)}`
                          : `Need ${formatDT(zone.dtCost - dreamTokenBalance)}`}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {message && (
          <div className="mx-auto mt-4 max-w-2xl rounded-[18px] border border-white/12 bg-white/[0.04] px-4 py-3 text-center text-xs leading-5 text-white/68">
            {message}
          </div>
        )}

        <div className="mx-auto mt-5 flex max-w-[1535px] flex-col gap-2 rounded-[18px] border border-white/8 bg-white/[0.02] px-4 py-3 text-[10px] leading-5 text-white/34 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
          <p>
            The Area 2 doorway remains part of the room artwork and will be wired
            to the next home expansion later.
          </p>
          <p className="shrink-0">Signed in as {userEmail || "admin"}</p>
        </div>
      </section>
    </main>
  );
}
