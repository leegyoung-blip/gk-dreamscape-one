import { supabase } from "@/lib/supabase";
import type { FinancialAdvisorId } from "./financial-learning-engine-types";

type PreferenceRow = {
  guide_avatar: string | null;
};

export async function getFinancialAdvisorPreference(): Promise<FinancialAdvisorId | null> {
  const { data, error } = await supabase
    .from("milo_finance_learning_preferences")
    .select("guide_avatar")
    .maybeSingle();

  if (error) throw error;
  const value = (data as PreferenceRow | null)?.guide_avatar;
  return value === "nova" || value === "milo" ? value : null;
}

export async function saveFinancialAdvisorPreference(guideAvatar: FinancialAdvisorId) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) throw new Error("Authentication required");

  const { error } = await supabase
    .from("milo_finance_learning_preferences")
    .upsert(
      {
        user_id: userId,
        guide_avatar: guideAvatar,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) throw error;
}
