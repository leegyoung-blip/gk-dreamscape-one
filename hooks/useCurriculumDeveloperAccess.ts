"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CurriculumRole } from "@/app/curriculum-developer/types";

type AccessStatus = "checking" | "allowed" | "locked";

function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function useCurriculumDeveloperAccess() {
  const [status, setStatus] = useState<AccessStatus>("checking");
  const [role, setRole] = useState<CurriculumRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      setStatus("checking");
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user) {
        setUserId(null);
        setRole(null);
        setStatus("locked");
        if (authError) setError(authError.message);
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, tier")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError || !profile) {
        setRole(null);
        setStatus("locked");
        setError(profileError?.message || "Profile not found.");
        return;
      }

      const cleanRole = normaliseRole(profile.role || profile.tier);

      if (cleanRole === "admin" || cleanRole === "curriculum_lead") {
        setRole(cleanRole as CurriculumRole);
        setStatus("allowed");
        return;
      }

      setRole(null);
      setStatus("locked");
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  return { status, role, userId, error };
}
