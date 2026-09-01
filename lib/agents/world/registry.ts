import "server-only";

import { observeMiloBusinessBuilder } from "./milo/businessBuilder";
import { observeMiloCategories } from "./milo/categories";
import { observeMiloExchange } from "./milo/exchange";
import { observeNovaHome } from "./nova/home";
import { observeNovaKnowledgeArena } from "./nova/knowledgeArena";
import { observeNovaLearning } from "./nova/learning";
import { observeNovaRover } from "./nova/rover";
import { observeNovaThink } from "./nova/think";
import type {
  WorldAdapter,
  WorldAdapterContext,
  WorldAdapterPayload,
  WorldObservationSourceKey,
} from "./types";
import { WORLD_OBSERVATION_SOURCE_KEYS } from "./types";

export const WORLD_ADAPTERS: Record<
  WorldObservationSourceKey,
  WorldAdapter
> = {
  "nova.learning": observeNovaLearning,
  "nova.knowledge_arena": observeNovaKnowledgeArena,
  "nova.rover": observeNovaRover,
  "nova.home": observeNovaHome,
  "nova.think": observeNovaThink,
  "milo.categories": observeMiloCategories,
  "milo.exchange": observeMiloExchange,
  "milo.business_builder": observeMiloBusinessBuilder,
};

export async function observeWorldSources(
  context: WorldAdapterContext,
): Promise<WorldAdapterPayload[]> {
  const observedAt = context.observedAt || new Date().toISOString();

  return Promise.all(
    WORLD_OBSERVATION_SOURCE_KEYS.map((sourceKey) =>
      WORLD_ADAPTERS[sourceKey]({
        ...context,
        observedAt,
      }),
    ),
  );
}

export async function observeWorldSource(
  sourceKey: WorldObservationSourceKey,
  context: WorldAdapterContext,
): Promise<WorldAdapterPayload> {
  return WORLD_ADAPTERS[sourceKey](context);
}
