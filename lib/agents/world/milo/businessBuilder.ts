import "server-only";

import type {
  WorldAdapter,
} from "../types";

import {
  buildPayload,
  collectErrors,
  safeQuery,
} from "../utils";

type BusinessProgressRow = {
  user_id?: string | null;
  active_slot_id?: number | null;
  updated_at?: string | null;
};

export const observeMiloBusinessBuilder:
  WorldAdapter =
async ({
  admin,
  agentUserId,
  observedAt =
    new Date().toISOString(),
}) => {
  /*
   * Phase 3F observes Business Builder awareness only.
   *
   * There is currently no autonomous Business Builder execution contract, so
   * repeatedly loading the full slots JSON for all 100 agents adds database
   * and snapshot pressure without affecting a runtime decision.
   *
   * Keep the existence/current-slot state while omitting the large slot body.
   */
  const progressResult =
    await safeQuery<
      BusinessProgressRow | null
    >(
      "milo_business_builder_progress",

      admin
        .from(
          "milo_business_builder_progress",
        )
        .select(
          "user_id,active_slot_id,updated_at",
        )
        .eq(
          "user_id",
          agentUserId,
        )
        .maybeSingle(),
    );

  const errors =
    collectErrors(
      progressResult,
    );

  const progress =
    progressResult.data;

  return buildPayload({
    sourceKey:
      "milo.business_builder",

    observedAt,

    requiredOk:
      progressResult.ok,

    errors,

    data: {
      safety: {
        readOnly:
          true,

        welcomeCreditClaimed:
          false,

        businessStateMutated:
          false,

        fullSlotStateObserved:
          false,

        reason:
          "No Phase 3F autonomous Business Builder execution contract is active.",
      },

      hasCloudProgress:
        Boolean(
          progress,
        ),

      activeSlotId:
        progress
          ?.active_slot_id ??
        null,

      /*
       * Deliberately not fetching the large slots JSON during Phase 3F.
       */
      slotCount:
        null,

      slots:
        [],

      updatedAt:
        progress
          ?.updated_at ??
        null,
    },
  });
};
