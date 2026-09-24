"use client";

import { supabase } from "@/lib/supabase";

export type CreatorIdentity = {
  creator_partner_id: string;
  display_name: string;
  slug: string;
  status: string;
};

export type OwnedCreatorClub = {
  club_id: string;
  club_name: string;
  club_slug: string;
  topic: string | null;
  status: string;
};

export function creatorSlugify(value: string, max = 40) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

export async function getMyCreatorIdentity() {
  const { data, error } = await supabase.rpc("get_my_creator_partner");
  const row = Array.isArray(data) ? data[0] : data;

  return {
    creator: row ? (row as CreatorIdentity) : null,
    error: error?.message || "",
  };
}

export async function getMyOwnedCreatorClubs() {
  const { data, error } = await supabase.rpc("creator_get_my_clubs");

  return {
    clubs: ((data || []) as OwnedCreatorClub[]).map((club) => ({
      ...club,
      club_id: String(club.club_id),
      club_name: String(club.club_name || ""),
      club_slug: String(club.club_slug || ""),
      topic: club.topic ? String(club.topic) : null,
      status: String(club.status || "draft"),
    })),
    error: error?.message || "",
  };
}

export async function selfRegisterCreator(input: {
  displayName: string;
  slug: string;
  profileImageUrl?: string;
  bio?: string;
}) {
  const { data, error } = await supabase.rpc("creator_self_register_v2", {
    p_display_name: input.displayName.trim(),
    p_slug: creatorSlugify(input.slug),
    p_profile_image_url: input.profileImageUrl?.trim() || null,
    p_bio: input.bio?.trim() || null,
    p_rules_version: "creator-rules-v1",
  });

  return {
    data,
    error: error?.message || "",
  };
}

export async function selfCreateCreatorClub(input: {
  name: string;
  slug: string;
  topic: string;
  tagline?: string;
  description?: string;
  logoImageUrl?: string;
  coverImageUrl?: string;
}) {
  const { data, error } = await supabase.rpc("creator_create_club_v2", {
    p_club_name: input.name.trim(),
    p_club_slug: creatorSlugify(input.slug, 70),
    p_topic: input.topic.trim(),
    p_tagline: input.tagline?.trim() || null,
    p_description: input.description?.trim() || null,
    p_logo_image_url: input.logoImageUrl?.trim() || null,
    p_cover_image_url: input.coverImageUrl?.trim() || null,
  });

  return {
    data,
    error: error?.message || "",
  };
}
