import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export type AuthUserChange = {
  event: AuthChangeEvent;
  userId: string | null;
  previousUserId: string | null;
};

type AuthStateSource = {
  auth: {
    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void,
    ) => { data: { subscription: { unsubscribe: () => void } } };
  };
};

/*
 * Subscribe to auth changes that affect page data: the signed-in user changed
 * (login, logout or switching accounts).
 *
 * Callers must perform their own initial load. Supabase emits INITIAL_SESSION
 * to every new listener, so reacting to it re-ran each page's initial load a
 * second time. A listener registered while the client is still initialising
 * (normal on a hard page load) also receives the session-recovery SIGNED_IN
 * first. Every event up to and including INITIAL_SESSION therefore only
 * records the known user; the caller's own initial load already waits for
 * initialisation, because every Supabase auth call does.
 *
 * Same-user events (TOKEN_REFRESHED, USER_UPDATED, and the SIGNED_IN that
 * Supabase re-emits when a tab regains focus) do not change whose data is
 * shown and are ignored. Window focus and wallet events are handled separately
 * by each page and are unaffected.
 *
 * Nothing is cached or shared between users: each subscription only tracks the
 * user id it last saw.
 */
export function onAuthUserChange(
  client: AuthStateSource,
  callback: (change: AuthUserChange) => void,
): () => void {
  let initialised = false;
  let knownUserId: string | null = null;

  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((event, session) => {
    const userId = session?.user?.id ?? null;

    if (!initialised) {
      knownUserId = userId;
      if (event === "INITIAL_SESSION") initialised = true;
      return;
    }

    if (userId === knownUserId) return;

    const previousUserId = knownUserId;
    knownUserId = userId;
    callback({ event, userId, previousUserId });
  });

  return () => subscription.unsubscribe();
}
