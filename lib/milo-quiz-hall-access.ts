"use client";

import { supabase } from "@/lib/supabase";

export type MiloQuizHallCreatorClubsAccess = {
  publicAccessEnabled: boolean;
  isAdmin: boolean;
  canAccess: boolean;
};

export async function getMiloQuizHallCreatorClubsAccess(): Promise<{
  access: MiloQuizHallCreatorClubsAccess;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc(
    "get_milo_quiz_hall_creator_clubs_access",
  );

  if (error) {
    return {
      access: {
        publicAccessEnabled: false,
        isAdmin: false,
        canAccess: false,
      },
      error: error.message || "Could not load Quiz Hall access settings.",
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const publicAccessEnabled = Boolean(row?.public_access_enabled);
  const isAdmin = Boolean(row?.is_admin);

  return {
    access: {
      publicAccessEnabled,
      isAdmin,
      canAccess: publicAccessEnabled || isAdmin,
    },
    error: null,
  };
}

export async function setMiloQuizHallCreatorClubsPublicAccess(
  enabled: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc(
    "admin_set_milo_quiz_hall_creator_clubs_access",
    {
      p_public_access_enabled: enabled,
    },
  );

  return {
    error: error?.message || null,
  };
}
