import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured",
  );
}

/*
 * Browser Supabase client.
 *
 * IMPORTANT:
 * Use @supabase/ssr rather than @supabase/supabase-js directly.
 * createBrowserClient keeps the authenticated session in cookies so
 * Next.js Server Components / Server Actions can read the same session.
 */
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
);
