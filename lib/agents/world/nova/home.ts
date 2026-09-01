import "server-only";

import type { WorldAdapter } from "../types";
import { buildPayload, collectErrors, rows, safeQuery } from "../utils";

type GenericRow = Record<string, unknown>;

export const observeNovaHome: WorldAdapter = async ({
  admin,
  agentUserId,
  observedAt = new Date().toISOString(),
}) => {
  const [
    zoneCatalogResult,
    zoneUnlocksResult,
    characterCatalogResult,
    characterUnlocksResult,
    wardrobeCatalogResult,
    wardrobeOwnershipResult,
    wardrobeEquippedResult,
    rugCatalogResult,
    rugOwnershipResult,
    rugEquippedResult,
    toolCatalogResult,
    toolOwnershipResult,
    toolEquippedResult,
  ] = await Promise.all([
    safeQuery<GenericRow[]>(
      "nova_home_zone_catalog",
      admin
        .from("nova_home_zone_catalog")
        .select(
          "zone_key,area_key,title,subtitle,dt_cost,sort_order,is_active,created_at,updated_at",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ),
    safeQuery<GenericRow[]>(
      "nova_home_zone_unlocks",
      admin
        .from("nova_home_zone_unlocks")
        .select("zone_key,cost_paid,unlocked_at")
        .eq("user_id", agentUserId),
    ),
    safeQuery<GenericRow[]>(
      "nova_home_character_catalog",
      admin
        .from("nova_home_character_catalog")
        .select(
          "character_key,title,description,dt_cost,is_starter,sort_order,is_active",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ),
    safeQuery<GenericRow[]>(
      "nova_home_character_unlocks",
      admin
        .from("nova_home_character_unlocks")
        .select("character_key")
        .eq("user_id", agentUserId),
    ),
    safeQuery<GenericRow[]>(
      "nova_home_wardrobe_catalog",
      admin
        .from("nova_home_wardrobe_catalog")
        .select(
          "item_key,character_key,category,accessory_slot,title,description,dt_cost,is_starter,sort_order,is_active",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(1000),
    ),
    safeQuery<GenericRow[]>(
      "nova_home_wardrobe_ownership",
      admin
        .from("nova_home_wardrobe_ownership")
        .select("item_key")
        .eq("user_id", agentUserId),
    ),
    safeQuery<GenericRow[]>(
      "nova_home_wardrobe_equipped",
      admin
        .from("nova_home_wardrobe_equipped")
        .select("character_key,category,equip_slot,item_key")
        .eq("user_id", agentUserId),
    ),
    safeQuery<GenericRow[]>(
      "nova_home_rug_catalog",
      admin
        .from("nova_home_rug_catalog")
        .select(
          "rug_key,title,description,currency_code,price_amount,is_starter,is_placeholder,sort_order,is_active",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ),
    safeQuery<GenericRow[]>(
      "nova_home_rug_ownership",
      admin
        .from("nova_home_rug_ownership")
        .select("rug_key")
        .eq("user_id", agentUserId),
    ),
    safeQuery<GenericRow | null>(
      "nova_home_rug_equipped",
      admin
        .from("nova_home_rug_equipped")
        .select("rug_key")
        .eq("user_id", agentUserId)
        .maybeSingle(),
    ),
    safeQuery<GenericRow[]>(
      "nova_home_cleaning_tool_catalog",
      admin
        .from("nova_home_cleaning_tool_catalog")
        .select(
          "cleaning_tool_key,title,description,currency_code,price_amount,power_multiplier,is_starter,is_placeholder,sort_order,is_active",
        )
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ),
    safeQuery<GenericRow[]>(
      "nova_home_cleaning_tool_ownership",
      admin
        .from("nova_home_cleaning_tool_ownership")
        .select("cleaning_tool_key")
        .eq("user_id", agentUserId),
    ),
    safeQuery<GenericRow | null>(
      "nova_home_cleaning_tool_equipped",
      admin
        .from("nova_home_cleaning_tool_equipped")
        .select("cleaning_tool_key")
        .eq("user_id", agentUserId)
        .maybeSingle(),
    ),
  ]);

  const errors = collectErrors(
    zoneCatalogResult,
    zoneUnlocksResult,
    characterCatalogResult,
    characterUnlocksResult,
    wardrobeCatalogResult,
    wardrobeOwnershipResult,
    wardrobeEquippedResult,
    rugCatalogResult,
    rugOwnershipResult,
    rugEquippedResult,
    toolCatalogResult,
    toolOwnershipResult,
    toolEquippedResult,
  );

  return buildPayload({
    sourceKey: "nova.home",
    observedAt,
    requiredOk:
      zoneCatalogResult.ok &&
      zoneUnlocksResult.ok &&
      wardrobeCatalogResult.ok &&
      wardrobeOwnershipResult.ok,
    errors,
    data: {
      safety: {
        readOnly: true,
        purchasesExecuted: false,
        equipmentChanged: false,
      },
      zones: {
        catalog: rows(zoneCatalogResult.data),
        owned: rows(zoneUnlocksResult.data),
      },
      characters: {
        catalog: rows(characterCatalogResult.data),
        unlocked: rows(characterUnlocksResult.data),
      },
      wardrobe: {
        catalog: rows(wardrobeCatalogResult.data),
        owned: rows(wardrobeOwnershipResult.data),
        equipped: rows(wardrobeEquippedResult.data),
      },
      rugs: {
        catalog: rows(rugCatalogResult.data),
        owned: rows(rugOwnershipResult.data),
        equipped: rugEquippedResult.data,
      },
      cleaningTools: {
        catalog: rows(toolCatalogResult.data),
        owned: rows(toolOwnershipResult.data),
        equipped: toolEquippedResult.data,
      },
    },
  });
};
