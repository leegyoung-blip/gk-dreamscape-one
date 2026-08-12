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

type AreaKey = "area-1" | "area-2";

type ZoneKey =
  | "bed-zone"
  | "desk-zone"
  | "display-zone"
  | "extra-zone"
  | "door-zone";

type ZoneVisual = {
  key: ZoneKey;
  fallbackTitle: string;
  fallbackSubtitle: string;
  fallbackCost: number;
  maskImage: string;
  accent: string;
  isAreaExit?: boolean;
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

const AREA_1_IMAGE = "/activities/nova-home/area-1/area-1-furnished.png";
const AREA_2_PLACEHOLDER_IMAGE = "/activities/nova-home/area-2-placeholder.png";

const ZONE_VISUALS: ZoneVisual[] = [
  {
    key: "bed-zone",
    fallbackTitle: "Sleep Zone",
    fallbackSubtitle: "Unlock Nova's bed and rest corner.",
    fallbackCost: 200,
    maskImage: "/activities/nova-home/area-1/zone-bed-locked.png",
    accent: "#6ee7ff",
  },
  {
    key: "desk-zone",
    fallbackTitle: "Workstation",
    fallbackSubtitle: "Unlock Nova's desk, chair, and main computer.",
    fallbackCost: 300,
    maskImage: "/activities/nova-home/area-1/zone-desk-locked.png",
    accent: "#7dd3fc",
  },
  {
    key: "display-zone",
    fallbackTitle: "Display Shelf",
    fallbackSubtitle: "Unlock books, models, trophies, and collectibles.",
    fallbackCost: 150,
    maskImage: "/activities/nova-home/area-1/zone-display-locked.png",
    accent: "#a5b4fc",
  },
  {
    key: "extra-zone",
    fallbackTitle: "Comfort & Decor",
    fallbackSubtitle:
      "Unlock the rug, wall art, plant, speaker, and extra room details.",
    fallbackCost: 100,
    maskImage: "/activities/nova-home/area-1/zone-extra-locked.png",
    accent: "#c4b5fd",
  },
  {
    key: "door-zone",
    fallbackTitle: "Area 2 Expansion",
    fallbackSubtitle:
      "Unlock Nova's connecting doorway and continue into Area 2.",
    fallbackCost: 1500,
    maskImage: "/activities/nova-home/area-1/zone-door-locked.png",
    accent: "#fbbf24",
    isAreaExit: true,
  },
];

// Put the doorway first because it sits close to the right-side decor mask.
const HIT_TEST_ORDER: ZoneKey[] = [
  "door-zone",
  "display-zone",
  "desk-zone",
  "bed-zone",
  "extra-zone",
];

const ROOM_ZONE_KEYS: ZoneKey[] = [
  "bed-zone",
  "desk-zone",
  "display-zone",
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

  const [currentArea, setCurrentArea] = useState<AreaKey>("area-1");
  const [area2ImageFailed, setArea2ImageFailed] = useState(false);
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
    const catalog = new Map<string, ZoneCatalogRow>(
      catalogRows.map((row) => [row.zone_key, row]),
    );

    return ZONE_VISUALS.map((visual) => {
      const row = catalog.get(visual.key);

      return {
        ...visual,
        title: row?.title || visual.fallbackTitle,
        subtitle: row?.subtitle || visual.fallbackSubtitle,
        dtCost: Number(row?.dt_cost ?? visual.fallbackCost),
      };
    });
  }, [catalogRows]);

  const zoneMap = useMemo<Map<ZoneKey, ZoneView>>(
    () => new Map<ZoneKey, ZoneView>(zones.map((zone) => [zone.key, zone])),
    [zones],
  );

  const activeZoneKey = selectedZoneKey ?? hoveredZoneKey;
  const activeZone = activeZoneKey ? zoneMap.get(activeZoneKey) ?? null : null;
  const roomUnlockedCount = ROOM_ZONE_KEYS.filter((key) =>
    unlockedZones.has(key),
  ).length;
  const area2Unlocked = unlockedZones.has("door-zone");

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
      console.warn("Could not load Nova Home role:", profileResult.error.message);
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
        "Nova Home zone tables are not ready. Run SQL 302 before testing unlocks.",
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
          `Nova Home catalog is missing: ${missing.join(", ")}. Run SQL 302 to repair and seed Area 1.`,
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
    if (maskLoading || purchasingZoneKey || currentArea !== "area-1") return;
    const key = getZoneAtClientPoint(event.clientX, event.clientY);
    setHoveredZoneKey(key);
  }

  function handlePointerLeave() {
    setHoveredZoneKey(null);
  }

  function handleZoneTap(event: ReactPointerEvent<HTMLDivElement>) {
    if (maskLoading || purchasingZoneKey || currentArea !== "area-1") return;

    const key = getZoneAtClientPoint(event.clientX, event.clientY);
    if (!key) {
      setSelectedZoneKey(null);
      setMessage("");
      return;
    }

    setSelectedZoneKey(key);
    setMessage("");
  }

  function selectZone(zoneKey: ZoneKey) {
    setSelectedZoneKey(zoneKey);
    setHoveredZoneKey(zoneKey);
    setMessage("");
  }

  function enterArea2() {
    if (!area2Unlocked) return;
    setSelectedZoneKey(null);
    setHoveredZoneKey(null);
    setMessage("");
    setCurrentArea("area-2");
  }

  async function purchaseZone(zoneKey: ZoneKey) {
    const zone = zoneMap.get(zoneKey);
    if (!zone || purchasingZoneKey || setupError) return;

    if (unlockedZones.has(zoneKey)) {
      if (zone.isAreaExit) enterArea2();
      return;
    }

    if (dreamTokenBalance < zone.dtCost) {
      setMessage(
        `You need ${formatDT(zone.dtCost - dreamTokenBalance)} more to unlock ${zone.title}.`,
      );
      return;
    }

    const confirmed = window.confirm(
      zone.isAreaExit
        ? `Unlock Area 2 for ${formatDT(zone.dtCost)}?`
        : `Unlock ${zone.title} for ${formatDT(zone.dtCost)}?`,
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
    setMessage(
      result.already_owned
        ? `${zone.title} was already unlocked.`
        : `${zone.title} unlocked for ${formatDT(result.cost_paid)}.`,
    );

    window.dispatchEvent(new Event("dream-tokens-updated"));

    if (zone.isAreaExit) {
      window.setTimeout(() => {
        setCurrentArea("area-2");
        setSelectedZoneKey(null);
        setHoveredZoneKey(null);
        setMessage("");
      }, 650);
    }
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

      <header className="relative z-30 border-b border-white/[0.06] bg-slate-950/42 px-3 py-3 backdrop-blur-xl sm:px-5 lg:px-7">
        <div className="mx-auto grid w-full max-w-[1800px] gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                currentArea === "area-2"
                  ? setCurrentArea("area-1")
                  : router.push("/inventor")
              }
              className="flex h-11 items-center gap-2 rounded-full border border-cyan-200/35 bg-slate-950/65 px-4 text-xs font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition hover:bg-cyan-300/10"
            >
              <span aria-hidden="true">←</span>
              {currentArea === "area-2" ? "Area 1" : "Nova’s World"}
            </button>
          </div>

          <div className="min-w-0 md:px-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-2xl font-medium tracking-[-0.035em] text-white sm:text-3xl">
                Nova’s Home
              </h1>
              <span className="text-[9px] font-black uppercase tracking-[0.17em] text-cyan-300/75 sm:text-[10px]">
                Admin Preview
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-[11px] leading-5 text-white/50 sm:text-xs">
              {currentArea === "area-1"
                ? "Choose a darkened room zone, view its DT price, and unlock it to reveal the furnishing beneath."
                : "Area 2 is unlocked. This is the next connected expansion of Nova’s Home."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <div className="rounded-full border border-cyan-200/30 bg-slate-950/72 px-4 py-2 text-right shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-200/55">
                Dream Tokens
              </p>
              <p className="mt-0.5 text-sm font-black text-cyan-50">
                {balanceLoading ? "Loading..." : formatDT(dreamTokenBalance)}
              </p>
            </div>

            <div className="rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 text-right">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/38">
                Starter Quarters
              </p>
              <p className="mt-0.5 text-sm font-black text-white">
                {roomUnlockedCount}/4 furnished
              </p>
            </div>

            <div
              className={`rounded-full border px-4 py-2 text-right ${
                area2Unlocked
                  ? "border-emerald-200/20 bg-emerald-300/[0.07]"
                  : "border-amber-200/18 bg-amber-300/[0.05]"
              }`}
            >
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/38">
                Area 2
              </p>
              <p
                className={`mt-0.5 text-sm font-black ${
                  area2Unlocked ? "text-emerald-100" : "text-amber-100/75"
                }`}
              >
                {area2Unlocked ? "Unlocked" : "Locked"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-[1800px] px-3 pb-6 pt-3 sm:px-5 lg:px-7">
        {setupError && (
          <div className="mb-3 rounded-[16px] border border-amber-200/28 bg-amber-300/[0.08] px-4 py-3 text-sm leading-6 text-amber-50/88">
            {setupError}
          </div>
        )}

        {currentArea === "area-1" ? (
          <div className="grid items-start gap-3 md:grid-cols-[205px_minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="grid grid-cols-2 gap-2 md:sticky md:top-3 md:grid-cols-1">
              <div className="col-span-2 mb-1 md:col-span-1">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200/55">
                  Area 1 · Starter Quarters
                </p>
                <p className="mt-1 text-[11px] leading-5 text-white/40">
                  Select a zone to inspect or unlock it.
                </p>
              </div>

              {zones.map((zone) => {
                const unlocked = unlockedZones.has(zone.key);
                const selected = selectedZoneKey === zone.key;
                const affordable = dreamTokenBalance >= zone.dtCost;

                return (
                  <button
                    key={zone.key}
                    type="button"
                    onMouseEnter={() => setHoveredZoneKey(zone.key)}
                    onMouseLeave={() => setHoveredZoneKey(null)}
                    onClick={() => selectZone(zone.key)}
                    className={`group rounded-[16px] border px-3 py-3 text-left transition ${
                      selected
                        ? "border-cyan-200/52 bg-cyan-300/[0.1] shadow-[0_0_24px_rgba(83,215,255,0.11)]"
                        : unlocked
                          ? "border-emerald-200/15 bg-emerald-300/[0.045]"
                          : zone.isAreaExit
                            ? "border-amber-200/16 bg-amber-300/[0.035] hover:border-amber-200/30"
                            : "border-white/9 bg-white/[0.025] hover:border-cyan-200/24 hover:bg-cyan-300/[0.045]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-white sm:text-sm">
                          {zone.title}
                        </p>
                        <p
                          className={`mt-1 text-[9px] font-bold uppercase tracking-[0.1em] ${
                            unlocked
                              ? "text-emerald-200/65"
                              : affordable
                                ? zone.isAreaExit
                                  ? "text-amber-200/65"
                                  : "text-cyan-200/58"
                                : "text-white/28"
                          }`}
                        >
                          {unlocked
                            ? zone.isAreaExit
                              ? "Enter Area 2"
                              : "Unlocked"
                            : affordable
                              ? "Available"
                              : "Save more DT"}
                        </p>
                      </div>

                      <strong
                        className={`shrink-0 text-[10px] ${
                          unlocked
                            ? "text-emerald-200"
                            : zone.isAreaExit
                              ? "text-amber-200"
                              : affordable
                                ? "text-cyan-200"
                                : "text-white/30"
                        }`}
                      >
                        {unlocked ? "✓" : formatDT(zone.dtCost)}
                      </strong>
                    </div>
                  </button>
                );
              })}
            </aside>

            <div className="min-w-0">
              <div
                ref={stageRef}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onPointerUp={handleZoneTap}
                className={`relative isolate w-full touch-manipulation select-none overflow-hidden rounded-[20px] border border-cyan-200/18 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.56)] sm:rounded-[24px] ${
                  activeZoneKey ? "cursor-pointer" : "cursor-default"
                }`}
                style={{ aspectRatio: "1535 / 1024" }}
                aria-label="Interactive Nova Home Area 1"
              >
                <img
                  src={AREA_1_IMAGE}
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
                        opacity: hovered || selected ? 0.6 : 1,
                        filter:
                          hovered || selected
                            ? `drop-shadow(0 0 7px ${zone.accent}) drop-shadow(0 0 16px rgba(83,215,255,0.34))`
                            : "none",
                      }}
                    />
                  );
                })}

                {maskLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/34 backdrop-blur-[1px]">
                    <div className="rounded-full border border-cyan-200/24 bg-slate-950/78 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100 backdrop-blur-xl">
                      Loading room zones...
                    </div>
                  </div>
                )}

                {!maskLoading && activeZone && (
                  <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 w-[min(620px,calc(100%-20px))] -translate-x-1/2 sm:bottom-4">
                    <div
                      onPointerMove={(event) => event.stopPropagation()}
                      onPointerUp={(event) => event.stopPropagation()}
                      className={`pointer-events-auto rounded-[20px] border px-4 py-3 shadow-[0_24px_62px_rgba(0,0,0,0.52)] backdrop-blur-xl sm:px-5 sm:py-4 ${
                        unlockedZones.has(activeZone.key)
                          ? "border-emerald-200/24 bg-emerald-950/88"
                          : activeZone.isAreaExit
                            ? "border-amber-200/28 bg-slate-950/90"
                            : "border-cyan-200/30 bg-slate-950/90"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p
                            className={`text-[9px] font-black uppercase tracking-[0.15em] ${
                              activeZone.isAreaExit
                                ? "text-amber-200/65"
                                : "text-cyan-200/58"
                            }`}
                          >
                            {unlockedZones.has(activeZone.key)
                              ? activeZone.isAreaExit
                                ? "Expansion Unlocked"
                                : "Zone Unlocked"
                              : activeZone.isAreaExit
                                ? "Home Expansion"
                                : "Room Upgrade"}
                          </p>

                          <h2 className="mt-1 text-base font-black text-white sm:text-lg">
                            {activeZone.title}
                          </h2>

                          <p className="mt-1 max-w-md text-[11px] leading-5 text-white/50 sm:text-xs">
                            {activeZone.subtitle}
                          </p>

                          {message && selectedZoneKey === activeZone.key && (
                            <p className="mt-2 text-[10px] font-bold leading-5 text-amber-100/85 sm:text-xs">
                              {message}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 sm:min-w-[185px] sm:text-right">
                          {unlockedZones.has(activeZone.key) ? (
                            activeZone.isAreaExit ? (
                              <button
                                type="button"
                                onClick={enterArea2}
                                className="min-h-11 w-full rounded-full bg-emerald-300 px-5 text-[11px] font-black uppercase tracking-[0.1em] text-slate-950 transition hover:bg-emerald-200 sm:w-auto"
                              >
                                Enter Area 2 →
                              </button>
                            ) : (
                              <span className="inline-flex min-h-11 items-center rounded-full border border-emerald-200/24 bg-emerald-300/10 px-5 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-100">
                                ✓ Unlocked
                              </span>
                            )
                          ) : selectedZoneKey === activeZone.key ? (
                            <button
                              type="button"
                              disabled={
                                purchasingZoneKey === activeZone.key ||
                                catalogLoading ||
                                Boolean(setupError) ||
                                dreamTokenBalance < activeZone.dtCost
                              }
                              onClick={() => purchaseZone(activeZone.key)}
                              className={`min-h-11 w-full rounded-full px-5 text-[11px] font-black uppercase tracking-[0.1em] transition sm:w-auto ${
                                dreamTokenBalance >= activeZone.dtCost &&
                                !setupError
                                  ? activeZone.isAreaExit
                                    ? "bg-amber-300 text-slate-950 hover:bg-amber-200 disabled:opacity-55"
                                    : "bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:opacity-55"
                                  : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/32"
                              }`}
                            >
                              {purchasingZoneKey === activeZone.key
                                ? "Unlocking..."
                                : dreamTokenBalance >= activeZone.dtCost
                                  ? `Unlock · ${formatDT(activeZone.dtCost)}`
                                  : `Need ${formatDT(activeZone.dtCost - dreamTokenBalance)}`}
                            </button>
                          ) : (
                            <div>
                              <p
                                className={`text-xl font-black sm:text-2xl ${
                                  activeZone.isAreaExit
                                    ? "text-amber-100"
                                    : "text-cyan-100"
                                }`}
                              >
                                {catalogLoading
                                  ? "..."
                                  : formatDT(activeZone.dtCost)}
                              </p>
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/34">
                                Click zone to unlock
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] leading-4 text-white/28 sm:text-[10px]">
                <p>
                  Hover uses the exact alpha shape of each Photoshop lock PNG.
                </p>
                <p className="shrink-0">{userEmail || "admin"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[1535px]">
            <div
              className="relative isolate overflow-hidden rounded-[24px] border border-emerald-200/18 bg-[radial-gradient(circle_at_50%_35%,rgba(30,150,190,0.17),transparent_45%),linear-gradient(145deg,#07172a,#020713)] shadow-[0_30px_100px_rgba(0,0,0,0.56)]"
              style={{ aspectRatio: "1535 / 1024" }}
            >
              {!area2ImageFailed && (
                <img
                  src={AREA_2_PLACEHOLDER_IMAGE}
                  alt="Nova Home Area 2 placeholder"
                  className="absolute inset-0 h-full w-full object-cover"
                  draggable={false}
                  onError={() => setArea2ImageFailed(true)}
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/42" />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                <div className="max-w-xl rounded-[22px] border border-emerald-200/22 bg-slate-950/82 p-5 backdrop-blur-xl sm:p-6">
                  <p className="text-[9px] font-black uppercase tracking-[0.17em] text-emerald-200/72">
                    Connected Expansion
                  </p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    Area 2 Unlocked
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-white/52 sm:text-sm">
                    The doorway purchase now carries the player into Area 2. We
                    can replace this placeholder with the final Area 2 artwork
                    and upgrade system when we build that room.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentArea("area-1")}
                    className="mt-4 min-h-11 rounded-full border border-emerald-200/24 bg-emerald-300/10 px-5 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-100 hover:bg-emerald-300/16"
                  >
                    ← Return to Area 1
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
