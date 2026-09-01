import "server-only";

import type { WorldAdapter } from "../types";
import { buildPayload, collectErrors, safeQuery } from "../utils";

type BusinessProgressRow = {
  user_id?: string | null;
  slots?: unknown;
  active_slot_id?: number | null;
  updated_at?: string | null;
};

export const observeMiloBusinessBuilder: WorldAdapter = async ({
  admin,
  agentUserId,
  observedAt = new Date().toISOString(),
}) => {
  const progressResult = await safeQuery<BusinessProgressRow | null>(
    "milo_business_builder_progress",
    admin
      .from("milo_business_builder_progress")
      .select("user_id,slots,active_slot_id,updated_at")
      .eq("user_id", agentUserId)
      .maybeSingle(),
  );

  const errors = collectErrors(progressResult);
  const progress = progressResult.data;
  const slots = Array.isArray(progress?.slots) ? progress?.slots : [];

  return buildPayload({
    sourceKey: "milo.business_builder",
    observedAt,
    requiredOk: progressResult.ok,
    errors,
    data: {
      safety: {
        readOnly: true,
        welcomeCreditClaimed: false,
        businessStateMutated: false,
      },
      hasCloudProgress: Boolean(progress),
      activeSlotId: progress?.active_slot_id ?? null,
      slotCount: slots.length,
      slots,
      updatedAt: progress?.updated_at ?? null,
    },
  });
};
