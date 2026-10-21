/*
 * PERF-2C-5: one refresh policy per page-data loader.
 *
 * Pages reloaded everything on every window focus, and many also reloaded on
 * the SIGNED_IN that Supabase re-emits whenever a tab becomes visible, so one
 * return to a tab ran the same queries two or three times. A scheduler wraps a
 * page's existing load function and decides when it runs:
 *
 * - refresh(): an explicit change (wallet events after rewards, purchases or
 *   admin adjustments; objectives; savings). Never skipped. A change that
 *   arrives while a load is running queues exactly one more load afterwards,
 *   so the newest data is always fetched and bursts (Dream Tokens + Dream Gems
 *   events dispatched together) cost one extra load, not one per event.
 * - force(): the signed-in user changed. Starts immediately even if a load is
 *   running; the page's own stale-response guard drops the older reply.
 * - revalidate(): the user came back to the tab (focus / visibility). Skipped
 *   while a load is running, or when the last load started less than
 *   `freshnessMs` ago and no wallet change was announced by another tab since.
 *
 * Use this only for page data. Access gates (route access, zone release,
 * entitlement RPCs) keep revalidating on every focus and must not use it.
 *
 * Nothing is cached: the scheduler only remembers when it last started a load.
 */

export const FOCUS_REVALIDATE_AFTER_MS = 30_000;

// Changes worth announcing to other tabs: wallet balances (rewards,
// purchases) and membership / access grants.
const WALLET_EVENTS = [
  "dream-tokens-updated",
  "dream-gems-updated",
  "dreamscape-membership-updated",
  "dreamscape-access-changed",
] as const;
const CHANNEL_NAME = "dreamscape-refresh";

let walletChangedElsewhereAt = Number.NEGATIVE_INFINITY;
let crossTabRelayInstalled = false;

/*
 * Wallet events are dispatched only in the tab where the change happened.
 * Relay a "something changed" notice (no data, no user id) to other tabs so
 * their next focus revalidates even inside the freshness window. Receiving a
 * notice never starts a request by itself.
 */
function installCrossTabWalletRelay() {
  if (crossTabRelayInstalled || typeof window === "undefined") return;
  crossTabRelayInstalled = true;
  if (typeof BroadcastChannel === "undefined") return;

  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return;
  }

  channel.onmessage = (event: MessageEvent) => {
    if (event.data?.type === "wallet-changed") {
      walletChangedElsewhereAt = Date.now();
    }
  };

  const announce = () => {
    try {
      channel.postMessage({ type: "wallet-changed" });
    } catch {
      // Another tab will still revalidate once its freshness window ends.
    }
  };

  for (const eventName of WALLET_EVENTS) {
    window.addEventListener(eventName, announce);
  }
}

export type RefreshScheduler = {
  refresh: () => void;
  force: () => void;
  revalidate: () => void;
};

export type RefreshSchedulerOptions = {
  freshnessMs?: number;
  /** The page already loaded this data itself (outside the scheduler) just now. */
  loadedAt?: number;
  now?: () => number;
  externalChangeAt?: () => number;
};

export function createRefreshScheduler(
  load: () => unknown,
  options: RefreshSchedulerOptions = {},
): RefreshScheduler {
  const freshnessMs = options.freshnessMs ?? FOCUS_REVALIDATE_AFTER_MS;
  const now = options.now ?? Date.now;
  const externalChangeAt =
    options.externalChangeAt ?? (() => walletChangedElsewhereAt);

  installCrossTabWalletRelay();

  let latestRun = 0;
  let running = false;
  let queued = false;
  // A refresh waits one microtask so events dispatched together (Dream Tokens
  // then Dream Gems in the same handler) share one load.
  let scheduled = false;
  let lastStartedAt = options.loadedAt ?? Number.NEGATIVE_INFINITY;

  function start() {
    const run = ++latestRun;
    running = true;
    queued = false;
    scheduled = false;
    lastStartedAt = now();

    void Promise.resolve()
      .then(() => load())
      .catch(() => {
        // Loaders report their own errors; a failure must not block later loads.
      })
      .finally(() => {
        if (run !== latestRun) return;
        running = false;
        if (queued) start();
      });
  }

  return {
    refresh() {
      if (running) {
        queued = true;
        return;
      }
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        if (!scheduled) return; // force() already started a load.
        if (running) {
          scheduled = false;
          queued = true;
          return;
        }
        start();
      });
    },
    force() {
      start();
    },
    revalidate() {
      if (running || scheduled) return;
      const changedElsewhere = externalChangeAt() >= lastStartedAt;
      if (!changedElsewhere && now() - lastStartedAt < freshnessMs) return;
      start();
    },
  };
}

/*
 * Call `onReturn` when the user comes back to the tab: window focus, or the
 * page becoming visible (mobile browsers do not always fire focus). Desktop
 * tab switches fire both; the scheduler's revalidate() runs at most one load.
 */
export function onTabReturn(onReturn: () => void): () => void {
  const handleFocus = () => onReturn();
  const handleVisibility = () => {
    if (document.visibilityState === "visible") onReturn();
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}
