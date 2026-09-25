import type { CSSProperties } from "react";

export type CreatorClubUpgradeAppearance = {
  club_theme_key: string | null;
  club_frame_key: string | null;
  room_theme_key: string | null;
  club_theme_name: string | null;
  club_frame_name: string | null;
  room_theme_name: string | null;
};

export const EMPTY_CLUB_UPGRADE_APPEARANCE: CreatorClubUpgradeAppearance = {
  club_theme_key: null,
  club_frame_key: null,
  room_theme_key: null,
  club_theme_name: null,
  club_frame_name: null,
  room_theme_name: null,
};

export function normalizeCreatorClubUpgradeAppearance(
  value: unknown,
): CreatorClubUpgradeAppearance {
  if (!value || typeof value !== "object") {
    return EMPTY_CLUB_UPGRADE_APPEARANCE;
  }

  const row = value as Record<string, unknown>;

  return {
    club_theme_key: row.club_theme_key ? String(row.club_theme_key) : null,
    club_frame_key: row.club_frame_key ? String(row.club_frame_key) : null,
    room_theme_key: row.room_theme_key ? String(row.room_theme_key) : null,
    club_theme_name: row.club_theme_name ? String(row.club_theme_name) : null,
    club_frame_name: row.club_frame_name ? String(row.club_frame_name) : null,
    room_theme_name: row.room_theme_name ? String(row.room_theme_name) : null,
  };
}

export function clubUpgradeBackdropStyle(
  themeKey: string | null | undefined,
): CSSProperties {
  switch (themeKey) {
    case "neon_circuit":
      return {
        background:
          "radial-gradient(circle at 14% 8%, rgba(34,211,238,.18), transparent 32%), radial-gradient(circle at 82% 18%, rgba(139,92,246,.16), transparent 34%), linear-gradient(180deg,#020914 0%,#020711 100%)",
      };
    case "aurora_glass":
      return {
        background:
          "radial-gradient(circle at 10% 4%, rgba(45,212,191,.18), transparent 32%), radial-gradient(circle at 78% 8%, rgba(99,102,241,.19), transparent 37%), radial-gradient(circle at 48% 88%, rgba(217,70,239,.10), transparent 34%), linear-gradient(180deg,#03101a 0%,#020711 100%)",
      };
    case "solar_forge":
      return {
        background:
          "radial-gradient(circle at 18% 4%, rgba(251,191,36,.20), transparent 30%), radial-gradient(circle at 82% 10%, rgba(168,85,247,.14), transparent 34%), linear-gradient(180deg,#120a08 0%,#050711 58%,#020711 100%)",
      };
    default:
      return {};
  }
}

export function clubUpgradeCardStyle(
  themeKey: string | null | undefined,
  frameKey: string | null | undefined,
): CSSProperties {
  const base: CSSProperties = {};

  switch (themeKey) {
    case "neon_circuit":
      base.background =
        "linear-gradient(145deg, rgba(8,48,68,.86), rgba(24,11,52,.80))";
      break;
    case "aurora_glass":
      base.background =
        "linear-gradient(145deg, rgba(7,55,59,.74), rgba(18,25,69,.78))";
      break;
    case "solar_forge":
      base.background =
        "linear-gradient(145deg, rgba(72,39,8,.74), rgba(45,15,61,.76))";
      break;
  }

  switch (frameKey) {
    case "pulse":
      base.borderColor = "rgba(103,232,249,.38)";
      base.boxShadow =
        "0 0 0 1px rgba(103,232,249,.10), 0 24px 80px rgba(6,182,212,.14)";
      break;
    case "prism":
      base.borderColor = "rgba(216,180,254,.44)";
      base.boxShadow =
        "0 0 0 1px rgba(253,224,71,.08), 0 0 42px rgba(168,85,247,.15), 0 28px 88px rgba(0,0,0,.34)";
      break;
  }

  return base;
}

export function roomUpgradeBackdropStyle(
  roomThemeKey: string | null | undefined,
): CSSProperties {
  switch (roomThemeKey) {
    case "arcade_grid":
      return {
        background:
          "linear-gradient(rgba(34,211,238,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(217,70,239,.045) 1px, transparent 1px), radial-gradient(circle at 50% 0%, rgba(34,211,238,.14), transparent 42%), #020711",
        backgroundSize: "34px 34px, 34px 34px, auto, auto",
      };
    case "cosmic_arena":
      return {
        background:
          "radial-gradient(circle at 20% 10%, rgba(139,92,246,.22), transparent 32%), radial-gradient(circle at 84% 20%, rgba(236,72,153,.14), transparent 30%), radial-gradient(circle at 52% 86%, rgba(34,211,238,.10), transparent 28%), linear-gradient(180deg,#07051a 0%,#020711 100%)",
      };
    default:
      return {};
  }
}

export function upgradeAccentLabel(
  appearance: CreatorClubUpgradeAppearance,
) {
  return (
    appearance.club_theme_name ||
    appearance.club_frame_name ||
    appearance.room_theme_name ||
    null
  );
}
