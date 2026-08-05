"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

export type NovaFeatureKey =
  | "nova_weekly_analytics_enabled"
  | "nova_weekly_plan_enabled"
  | "nova_weekly_email_enabled"
  | "nova_learning_profile_enabled"
  | "nova_granular_insights_enabled"
  | "nova_age_context_enabled"
  | "curriculum_lead_skill_catalogue_enabled"
  | "curriculum_lead_mapping_enabled"
  | "curriculum_rollout_workspace_enabled"
  | "nova_health_monitoring_enabled";

export type NovaFeatureFlag = {
  flag_key: string;
  display_name: string;
  description: string;
  enabled: boolean;
  effective_enabled: boolean;
  rollout_percentage: number;
  allowed_roles: string[];
  subject_scope: string[];
  primary_level_scope: number[];
  config: Record<string, unknown>;
  updated_at: string | null;
};

const FALLBACKS: Record<NovaFeatureKey, boolean> = {
  nova_weekly_analytics_enabled: true,
  nova_weekly_plan_enabled: true,
  nova_weekly_email_enabled: true,
  nova_learning_profile_enabled: true,
  nova_granular_insights_enabled: true,
  nova_age_context_enabled: true,
  curriculum_lead_skill_catalogue_enabled: true,
  curriculum_lead_mapping_enabled: true,
  curriculum_rollout_workspace_enabled: true,
  nova_health_monitoring_enabled: true,
};

function parseFlags(
  value: unknown,
): Record<string, NovaFeatureFlag> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, NovaFeatureFlag> = {};

  for (const [key, raw] of Object.entries(source)) {
    if (!raw || typeof raw !== "object") continue;

    const row = raw as Record<string, unknown>;

    result[key] = {
      flag_key: String(row.flag_key || key),
      display_name: String(row.display_name || key),
      description: String(row.description || ""),
      enabled: Boolean(row.enabled),
      effective_enabled: Boolean(
        row.effective_enabled,
      ),
      rollout_percentage: Number(
        row.rollout_percentage || 0,
      ),
      allowed_roles: Array.isArray(row.allowed_roles)
        ? row.allowed_roles.map(String)
        : [],
      subject_scope: Array.isArray(row.subject_scope)
        ? row.subject_scope.map(String)
        : [],
      primary_level_scope: Array.isArray(
        row.primary_level_scope,
      )
        ? row.primary_level_scope.map(Number)
        : [],
      config:
        row.config && typeof row.config === "object"
          ? (row.config as Record<string, unknown>)
          : {},
      updated_at: row.updated_at
        ? String(row.updated_at)
        : null,
    };
  }

  return result;
}

export function useNovaFeatureFlags(
  refreshKey?: string | null,
) {
  const [flags, setFlags] = useState<
    Record<string, NovaFeatureFlag>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFlags({});
      setLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(
      "get_my_nova_feature_flags",
    );

    if (rpcError) {
      console.warn(
        "Nova feature flags unavailable:",
        rpcError.message,
      );
      setFlags({});
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setFlags(parseFlags(data));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const isEnabled = useCallback(
    (
      key: NovaFeatureKey,
      fallback = FALLBACKS[key],
    ) => {
      const flag = flags[key];

      if (!flag) return fallback;

      return flag.effective_enabled;
    },
    [flags],
  );

  return useMemo(
    () => ({
      flags,
      loading,
      error,
      refresh,
      isEnabled,
    }),
    [error, flags, isEnabled, loading, refresh],
  );
}
