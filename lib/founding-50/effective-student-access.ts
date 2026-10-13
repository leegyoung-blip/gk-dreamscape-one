/**
 * Read-only, authenticated Student Access override for the exact selected
 * Founding 50 beta learner. Never turn this into a synthetic paid subscription.
 */
import { supabase } from "@/lib/supabase";

export async function hasFounding50StudentAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc(
    "f50_current_actor_is_selected_student",
  );
  if (error) {
    console.warn("Founding 50 learner access check failed:", error.message);
    return false;
  }
  return data === true;
}
