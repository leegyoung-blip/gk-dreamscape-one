"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CreatorClubsLockedScreen from "@/components/milo/CreatorClubsLockedScreen";
import CreatorDiscoveryAdminPanel from "@/components/milo/CreatorDiscoveryAdminPanel";
import CreatorClubLevelBadge from "@/components/milo/creator-engine/CreatorClubLevelBadge";
import CreatorOfficialClubsAdminPanel from "@/components/milo/creator-engine/CreatorOfficialClubsAdminPanel";
import {
  clubUpgradeCardStyle,
} from "@/components/milo/creator-engine/CreatorClubUpgradeStyle";
import {
  getMiloQuizHallCreatorClubsAccess,
  type MiloQuizHallCreatorClubsAccess,
} from "@/lib/milo-quiz-hall-access";
import {
  creatorSlugify,
  getMyCreatorIdentity,
  selfCreateCreatorClub,
  selfRegisterCreator,
  type CreatorIdentity,
  type OwnedCreatorClub,
} from "@/lib/milo-creator-phase2";

type ClubDirectoryRow = {
  club_id: string;
  club_slug: string;
  club_name: string;
  topic: string | null;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  featured: boolean;
  creator_partner_id: string;
  creator_slug: string;
  creator_display_name: string;
  creator_profile_image_url: string | null;
  member_count: number;
  is_member: boolean;
  joined_at: string | null;
  club_level_number?: number;
  club_level_name?: string;
  club_progression_score?: number;
  club_theme_key?: string | null;
  club_frame_key?: string | null;
  club_theme_name?: string | null;
  club_frame_name?: string | null;

  is_official?: boolean;
  official_badge_image_url?: string | null;
  creator_rewards_enabled?: boolean;
  creator_reputation_enabled?: boolean;
};


type DiscoveryRow = {
  section_key:
    | "dreamscape_picks"
    | "trending"
    | "rising_creators"
    | "most_played"
    | "high_retention"
    | "new_promising";
  section_rank: number;

  club_id: string;
  club_slug: string;
  club_name: string;
  topic: string | null;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;

  creator_partner_id: string;
  creator_slug: string;
  creator_display_name: string;
  creator_profile_image_url: string | null;

  member_count: number;
  is_member: boolean;
  joined_at: string | null;

  reputation_score: number;
  level_name: string;
  unique_players: number;
  repeat_players: number;
  total_plays: number;
  published_challenges: number;
  active_weeks: number;

  recent_member_growth: number;
  recent_unique_player_growth: number;
  recent_play_growth: number;
  recent_reputation_growth: number;
  repeat_rate: number;

  discovery_score: number;
  dreamscape_pick: boolean;
  reason_label: string;

  club_level_number?: number;
  club_level_name?: string;
  club_progression_score?: number;
  club_theme_key?: string | null;
  club_frame_key?: string | null;
  club_theme_name?: string | null;
  club_frame_name?: string | null;
};

type ClubProgressionDirectoryRow = {
  club_id: string;
  club_slug: string;
  level_number: number;
  level_key: string;
  level_name: string;
  badge_label: string;
  progression_score: number;
  updated_at: string;
};

type UpgradeDirectoryRow = {
  club_id: string;
  club_slug: string;
  club_theme_key: string | null;
  club_frame_key: string | null;
  room_theme_key: string | null;
  club_theme_name: string | null;
  club_frame_name: string | null;
  room_theme_name: string | null;
};

type SpotlightRow = {
  club_id: string;
  club_slug: string;
  club_name: string;
  topic: string | null;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  creator_partner_id: string;
  creator_slug: string;
  creator_display_name: string;
  creator_profile_image_url: string | null;
  member_count: number;
  is_member: boolean;
  club_level_number: number;
  club_level_name: string;
  progression_score: number;
  club_theme_key: string | null;
  club_frame_key: string | null;
  club_theme_name: string | null;
  club_frame_name: string | null;
  spotlight_ends_at: string;
  active_pool_size: number;
};

type ViewMode = "discover" | "my" | "create";

const CREATOR_CLUBS_GUIDE_STORAGE_KEY =
  "dreamscape:creator-clubs-milo-guide-v1";

type CreatorGuideTarget = "discover" | "my" | "create" | "studio";

type CreatorClubsGuideStep = {
  eyebrow: string;
  title: string;
  text: string;
  view?: ViewMode;
  target?: CreatorGuideTarget;
  actionLabel?: string;
};

const CREATOR_CLUBS_GUIDE_STEPS: CreatorClubsGuideStep[] = [
  {
    eyebrow: "Welcome to Creator Clubs",
    title: "I’ll help you find your way around.",
    text:
      "Creator Clubs has three main areas: Discover for finding communities, My Clubs for the clubs you follow or own, and Create for building something of your own.",
  },
  {
    eyebrow: "Discover",
    title: "Find communities built around what you enjoy.",
    text:
      "Start with Dreamscape Originals, browse community clubs, search by interest and join the ones you want to follow.",
    view: "discover",
    target: "discover",
    actionLabel: "Show Discover",
  },
  {
    eyebrow: "My Clubs",
    title: "Your communities live here.",
    text:
      "My Clubs keeps the clubs you have joined together with clubs you own, so you can get back to them quickly.",
    view: "my",
    target: "my",
    actionLabel: "Show My Clubs",
  },
  {
    eyebrow: "Create",
    title: "Ready to build your own club?",
    text:
      "Create your public creator identity, choose a club topic and background, then build challenges for your community.",
    view: "create",
    target: "create",
    actionLabel: "Show Create",
  },
  {
    eyebrow: "Creator Studio",
    title: "Build, grow and reinvest.",
    text:
      "Once you own a club, Creator Studio is where you build challenges, monitor engagement, grow Club Level and Creator Reputation, and use creator rewards.",
    target: "studio",
    actionLabel: "Open Creator Studio",
  },
];

function formatDreamTokens(value: number) {
  return Math.max(0, Math.round(Number(value || 0))).toLocaleString("en-SG");
}

const INTERESTS = [
  "Football",
  "K-Pop",
  "Science & Technology",
  "Sports",
  "Animals & Nature",
  "World & History",
  "Games & Strategy",
  "Entertainment",
  "Cars & Machines",
  "Creative Skills",
];

const EMPTY_CREATOR = {
  displayName: "",
  slug: "",
  profileImageUrl: "",
  bio: "",
  rulesAccepted: false,
};

const DEFAULT_CREATOR_BACKGROUND_URL =
  "/milo-world/quiz-hall/backgrounds/dreamscape-core-glow.png";

type ClubCreateForm = {
  name: string;
  slug: string;
  topic: string;
  tagline: string;
  description: string;
  logoFile: File | null;

  // User-facing semantic: one club background used across the club and
  // all creator challenges. It is still stored in the legacy
  // `cover_image_url` database field to avoid a schema migration.
  backgroundFile: File | null;
  backgroundPresetUrl: string;
};

const EMPTY_CLUB: ClubCreateForm = {
  name: "",
  slug: "",
  topic: INTERESTS[0],
  tagline: "",
  description: "",
  logoFile: null,
  backgroundFile: null,
  backgroundPresetUrl: DEFAULT_CREATOR_BACKGROUND_URL,
};

const CREATOR_CLUB_MEDIA_BUCKET = "creator-club-media";
const MAX_CREATOR_IMAGE_BYTES = 5 * 1024 * 1024;
const CREATOR_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type CreatorBackgroundPreset = {
  key: string;
  label: string;
  imageUrl: string;
};

// Preset-ready by design. We will populate this with the generic Dreamscape
// themes in the next asset pass without changing the creation flow again.
const CREATOR_BACKGROUND_PRESETS: CreatorBackgroundPreset[] = [
  {
    key: "dreamscape-core-glow",
    label: "Dreamscape Core Glow",
    imageUrl: "/milo-world/quiz-hall/backgrounds/dreamscape-core-glow.png",
  },
  {
    key: "knowledge-grid",
    label: "Knowledge Grid",
    imageUrl: "/milo-world/quiz-hall/backgrounds/knowledge-grid.png",
  },
  {
    key: "neon-horizon",
    label: "Neon Horizon",
    imageUrl: "/milo-world/quiz-hall/backgrounds/neon-horizon.png",
  },
  {
    key: "adventure-map",
    label: "Adventure Map",
    imageUrl: "/milo-world/quiz-hall/backgrounds/adventure-map.png",
  },
  {
    key: "cosmic-arena",
    label: "Cosmic Arena",
    imageUrl: "/milo-world/quiz-hall/backgrounds/cosmic-arena.png",
  },
];

function safeFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().trim() || "";
  if (["png", "jpg", "jpeg", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function uploadCreatorClubMedia(
  file: File,
  clubSlug: string,
  kind: "logo" | "background",
) {
  if (!CREATOR_IMAGE_TYPES.has(file.type)) {
    throw new Error("Use a PNG, JPG or WebP image.");
  }

  if (file.size > MAX_CREATOR_IMAGE_BYTES) {
    throw new Error("Image files must be 5 MB or smaller.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Log in again before uploading club images.");
  }

  const extension = safeFileExtension(file);
  const path = `${user.id}/${clubSlug}/${kind}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(CREATOR_CLUB_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Image upload failed.");
  }

  const { data } = supabase.storage
    .from(CREATOR_CLUB_MEDIA_BUCKET)
    .getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error("Image uploaded but its public URL could not be created.");
  }

  return data.publicUrl;
}

export default function CreatorClubsPage() {
  const router = useRouter();

  const [clubs, setClubs] = useState<ClubDirectoryRow[]>([]);
  const [discoverableClubs, setDiscoverableClubs] = useState<ClubDirectoryRow[]>([]);
  const [officialClubs, setOfficialClubs] = useState<ClubDirectoryRow[]>([]);
  const [ownedClubs, setOwnedClubs] = useState<OwnedCreatorClub[]>([]);
  const [discoveryRows, setDiscoveryRows] = useState<DiscoveryRow[]>([]);
  const [spotlightRows, setSpotlightRows] = useState<SpotlightRow[]>([]);
  const [creator, setCreator] = useState<CreatorIdentity | null>(null);
  const [hallAccess, setHallAccess] =
    useState<MiloQuizHallCreatorClubsAccess | null>(null);

  const [view, setView] = useState<ViewMode>("discover");
  const [search, setSearch] = useState("");
  const [interest, setInterest] = useState("All");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dreamTokenBalance, setDreamTokenBalance] = useState(0);
  const [dreamTokenLoading, setDreamTokenLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [creatorForm, setCreatorForm] = useState(EMPTY_CREATOR);
  const [creatorSlugTouched, setCreatorSlugTouched] = useState(false);
  const [clubForm, setClubForm] = useState(EMPTY_CLUB);
  const [clubSlugTouched, setClubSlugTouched] = useState(false);

  useEffect(() => {
    const oldBody = document.body.style.overflow;
    const oldHtml = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const query = new URLSearchParams(window.location.search);
    const requestedView = query.get("view");
    if (
      requestedView === "discover" ||
      requestedView === "my" ||
      requestedView === "create"
    ) {
      setView(requestedView);
    }

    void loadPage();

    try {
      const hasSeenGuide = window.localStorage.getItem(
        CREATOR_CLUBS_GUIDE_STORAGE_KEY,
      );
      if (!hasSeenGuide) {
        window.setTimeout(() => setGuideOpen(true), 450);
      }
    } catch {
      // The guide remains available from the left navigation if localStorage
      // is unavailable.
    }

    return () => {
      document.body.style.overflow = oldBody;
      document.documentElement.style.overflow = oldHtml;
    };
  }, []);

  async function loadPage() {
    setIsLoading(true);
    setErrorMessage("");

    const accessResult = await getMiloQuizHallCreatorClubsAccess();
    setHallAccess(accessResult.access);

    if (!accessResult.access.canAccess) {
      setClubs([]);
      setDiscoverableClubs([]);
      setOfficialClubs([]);
      setOwnedClubs([]);
      setDiscoveryRows([]);
      setSpotlightRows([]);
      setCreator(null);
      setUserEmail(null);
      setDreamTokenBalance(0);
      setDreamTokenLoading(false);
      setIsLoading(false);
      return;
    }

    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;
    setIsAuthenticated(Boolean(user));
    setUserEmail(user?.email ?? null);
    setDreamTokenLoading(Boolean(user));

    const tokenBalancePromise = user
      ? supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual")
      : Promise.resolve({ data: [], error: null });

    const [
      clubsResponse,
      discoverableResponse,
      discoveryResponse,
      progressionResponse,
      upgradeResponse,
      spotlightResponse,
      officialResponse,
      tokenBalanceResponse,
    ] = await Promise.all([
      supabase.rpc("get_creator_club_directory"),
      supabase.rpc("get_creator_discovery_directory_v1"),
      supabase.rpc("get_creator_discovery_sections_v1"),
      supabase.rpc("get_creator_club_progression_directory_v1"),
      supabase.rpc("get_creator_club_upgrade_directory_v1"),
      supabase.rpc("get_creator_spotlight_rotation_v1"),
      supabase.rpc("get_creator_official_club_directory_v1"),
      tokenBalancePromise,
    ]);

    if (!user) {
      setDreamTokenBalance(0);
      setDreamTokenLoading(false);
    } else if (tokenBalanceResponse.error) {
      console.warn(
        "Could not load Dream Token balance:",
        tokenBalanceResponse.error.message,
      );
      setDreamTokenBalance(0);
      setDreamTokenLoading(false);
    } else {
      const balance = (tokenBalanceResponse.data || []).reduce(
        (total, row) => total + Number(row.amount || 0),
        0,
      );
      setDreamTokenBalance(Math.max(0, balance));
      setDreamTokenLoading(false);
    }

    const clubProgressionMap = new Map<
      string,
      ClubProgressionDirectoryRow
    >(
      progressionResponse.error
        ? []
        : ((progressionResponse.data || []) as ClubProgressionDirectoryRow[]).map(
            (row) => [
              String(row.club_slug),
              {
                ...row,
                club_id: String(row.club_id),
                club_slug: String(row.club_slug),
                level_number: Number(row.level_number || 1),
                level_name: String(row.level_name || "Starter Club"),
                progression_score: Number(row.progression_score || 0),
              },
            ],
          ),
    );

    const upgradeMap = new Map<string, UpgradeDirectoryRow>(
      upgradeResponse.error
        ? []
        : ((upgradeResponse.data || []) as UpgradeDirectoryRow[]).map((row) => [
            String(row.club_slug),
            {
              ...row,
              club_id: String(row.club_id),
              club_slug: String(row.club_slug),
              club_theme_key: row.club_theme_key ? String(row.club_theme_key) : null,
              club_frame_key: row.club_frame_key ? String(row.club_frame_key) : null,
              room_theme_key: row.room_theme_key ? String(row.room_theme_key) : null,
              club_theme_name: row.club_theme_name ? String(row.club_theme_name) : null,
              club_frame_name: row.club_frame_name ? String(row.club_frame_name) : null,
              room_theme_name: row.room_theme_name ? String(row.room_theme_name) : null,
            },
          ]),
    );

    function withClubLevel<T extends { club_slug: string }>(row: T) {
      const progression = clubProgressionMap.get(String(row.club_slug));
      const upgrade = upgradeMap.get(String(row.club_slug));

      return {
        ...row,
        club_level_number: progression?.level_number || 1,
        club_level_name: progression?.level_name || "Starter Club",
        club_progression_score: progression?.progression_score || 0,
        club_theme_key: upgrade?.club_theme_key || null,
        club_frame_key: upgrade?.club_frame_key || null,
        club_theme_name: upgrade?.club_theme_name || null,
        club_frame_name: upgrade?.club_frame_name || null,
      };
    }

    if (clubsResponse.error) {
      setClubs([]);
      setErrorMessage(
        clubsResponse.error.message || "Creator Clubs could not be loaded.",
      );
    } else {
      setClubs(
        ((clubsResponse.data || []) as ClubDirectoryRow[]).map((club) =>
          withClubLevel({
            ...club,
            featured: Boolean(club.featured),
            member_count: Number(club.member_count || 0),
            is_member: Boolean(club.is_member),
          }),
        ),
      );
    }

    if (discoverableResponse.error) {
      setDiscoverableClubs([]);
      if (!clubsResponse.error) {
        setErrorMessage(
          discoverableResponse.error.message ||
            "The public Creator Club directory could not be loaded.",
        );
      }
    } else {
      setDiscoverableClubs(
        ((discoverableResponse.data || []) as ClubDirectoryRow[]).map((club) =>
          withClubLevel({
            ...club,
            featured: Boolean(club.featured),
            member_count: Number(club.member_count || 0),
            is_member: Boolean(club.is_member),
          }),
        ),
      );
    }

    if (discoveryResponse.error) {
      setDiscoveryRows([]);
      if (!clubsResponse.error) {
        setErrorMessage(
          discoveryResponse.error.message ||
            "Smart discovery could not be loaded.",
        );
      }
    } else {
      setDiscoveryRows(
        ((discoveryResponse.data || []) as DiscoveryRow[]).map((row) =>
          withClubLevel({
          ...row,
          section_rank: Number(row.section_rank || 0),
          member_count: Number(row.member_count || 0),
          is_member: Boolean(row.is_member),
          reputation_score: Number(row.reputation_score || 0),
          unique_players: Number(row.unique_players || 0),
          repeat_players: Number(row.repeat_players || 0),
          total_plays: Number(row.total_plays || 0),
          published_challenges: Number(row.published_challenges || 0),
          active_weeks: Number(row.active_weeks || 0),
          recent_member_growth: Number(row.recent_member_growth || 0),
          recent_unique_player_growth: Number(
            row.recent_unique_player_growth || 0,
          ),
          recent_play_growth: Number(row.recent_play_growth || 0),
          recent_reputation_growth: Number(
            row.recent_reputation_growth || 0,
          ),
          repeat_rate: Number(row.repeat_rate || 0),
          discovery_score: Number(row.discovery_score || 0),
          dreamscape_pick: Boolean(row.dreamscape_pick),
          }),
        ),
      );
    }

    setOfficialClubs(
      officialResponse.error
        ? []
        : ((officialResponse.data || []) as ClubDirectoryRow[]).map((club) => ({
            ...club,
            club_id: String(club.club_id),
            club_slug: String(club.club_slug),
            club_name: String(club.club_name),
            featured: true,
            member_count: Number(club.member_count || 0),
            is_member: Boolean(club.is_member),
            is_official: true,
            creator_display_name: String(
              club.creator_display_name || "Dreamscape",
            ),
            official_badge_image_url: club.official_badge_image_url
              ? String(club.official_badge_image_url)
              : "/milo-world/quiz-hall/official-clubs/dreamscape-official-club-badge.png",
          })),
    );

    setSpotlightRows(
      spotlightResponse.error
        ? []
        : ((spotlightResponse.data || []) as SpotlightRow[]).map((row) => ({
            ...row,
            club_id: String(row.club_id),
            club_slug: String(row.club_slug),
            club_name: String(row.club_name || "Creator Club"),
            member_count: Number(row.member_count || 0),
            is_member: Boolean(row.is_member),
            club_level_number: Number(row.club_level_number || 1),
            club_level_name: String(row.club_level_name || "Starter Club"),
            progression_score: Number(row.progression_score || 0),
            active_pool_size: Number(row.active_pool_size || 0),
            spotlight_ends_at: String(row.spotlight_ends_at || ""),
            club_theme_key: row.club_theme_key ? String(row.club_theme_key) : null,
            club_frame_key: row.club_frame_key ? String(row.club_frame_key) : null,
            club_theme_name: row.club_theme_name ? String(row.club_theme_name) : null,
            club_frame_name: row.club_frame_name ? String(row.club_frame_name) : null,
          })),
    );

    if (user) {
      const [creatorResult, ownedResponse] = await Promise.all([
        getMyCreatorIdentity(),
        supabase.rpc("creator_get_my_owned_clubs_v3"),
      ]);

      setCreator(creatorResult.creator);

      if (ownedResponse.error) {
        setOwnedClubs([]);
        if (!clubsResponse.error) {
          setErrorMessage(
            ownedResponse.error.message || "Your owned clubs could not be loaded.",
          );
        }
      } else {
        setOwnedClubs(
          ((ownedResponse.data || []) as OwnedCreatorClub[]).map((club) => ({
            ...club,
            club_id: String(club.club_id),
            club_slug: String(club.club_slug),
            club_name: String(club.club_name),
            topic: club.topic ? String(club.topic) : null,
            status: String(club.status || "draft"),
          })),
        );
      }

      if (creatorResult.error && !clubsResponse.error) {
        setErrorMessage(creatorResult.error);
      }
    } else {
      setCreator(null);
      setOwnedClubs([]);
    }

    setIsLoading(false);
  }

  const filteredClubs = useMemo(() => {
    const term = search.trim().toLowerCase();
    const browse = [...officialClubs, ...discoverableClubs];

    return browse.filter((club) => {
      if (
        interest !== "All" &&
        String(club.topic || "").toLowerCase() !== interest.toLowerCase()
      ) {
        return false;
      }

      if (!term) return true;

      return [
        club.club_name,
        club.topic,
        club.tagline,
        club.description,
        club.creator_display_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [discoverableClubs, officialClubs, interest, search]);

  const joinedClubs = [
    ...officialClubs.filter((club) => club.is_member),
    ...clubs.filter((club) => club.is_member),
  ];

  function selectView(next: ViewMode) {
    setView(next);
    setMessage("");
    setErrorMessage("");
    window.history.replaceState(
      {},
      "",
      `/milo-world/quiz-hall/communities?view=${next}`,
    );
  }

  async function createCreatorIdentity() {
    if (!isAuthenticated) {
      router.push(
        `/login?next=${encodeURIComponent(
          "/milo-world/quiz-hall/communities?view=create",
        )}`,
      );
      return;
    }

    if (creatorForm.displayName.trim().length < 3) {
      setErrorMessage("Creator display name must be at least 3 characters.");
      return;
    }

    const cleanSlug = creatorSlugify(creatorForm.slug);
    if (cleanSlug.length < 3) {
      setErrorMessage("Choose a creator handle with at least 3 characters.");
      return;
    }

    if (!creatorForm.rulesAccepted) {
      setErrorMessage("Accept the Creator Rules before continuing.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const result = await selfRegisterCreator({
      displayName: creatorForm.displayName,
      slug: cleanSlug,
      profileImageUrl: creatorForm.profileImageUrl,
      bio: creatorForm.bio,
    });

    if (result.error) {
      setErrorMessage(result.error);
      setIsSaving(false);
      return;
    }

    setMessage("Creator identity created. Now build your first club.");
    await loadPage();
    setIsSaving(false);
  }

  async function createClub() {
    if (!creator) {
      setErrorMessage("Create your creator identity first.");
      return;
    }

    if (ownedClubs.length >= 1) {
      setErrorMessage(
        "You already have a Creator Club. Continue setting it up in Creator Studio.",
      );
      return;
    }

    if (clubForm.name.trim().length < 3) {
      setErrorMessage("Club name must be at least 3 characters.");
      return;
    }

    const cleanSlug = creatorSlugify(clubForm.slug, 70);
    if (cleanSlug.length < 3) {
      setErrorMessage("Choose a club URL with at least 3 characters.");
      return;
    }

    if (!clubForm.topic) {
      setErrorMessage("Choose an interest for the club.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    let logoImageUrl = "";

    // `coverImageUrl` is the legacy API/database field name.
    // Product/UI semantics are now "Club Background".
    let backgroundImageUrl =
      clubForm.backgroundPresetUrl.trim() || DEFAULT_CREATOR_BACKGROUND_URL;

    try {
      if (clubForm.logoFile) {
        logoImageUrl = await uploadCreatorClubMedia(
          clubForm.logoFile,
          cleanSlug,
          "logo",
        );
      }

      if (clubForm.backgroundFile) {
        backgroundImageUrl = await uploadCreatorClubMedia(
          clubForm.backgroundFile,
          cleanSlug,
          "background",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Club image upload failed.",
      );
      setIsSaving(false);
      return;
    }

    const result = await selfCreateCreatorClub({
      name: clubForm.name,
      slug: cleanSlug,
      topic: clubForm.topic,
      tagline: clubForm.tagline,
      description: clubForm.description,
      logoImageUrl,
      coverImageUrl: backgroundImageUrl,
    });

    if (result.error) {
      setErrorMessage(result.error);
      setIsSaving(false);
      return;
    }

    setMessage(
      "Club created. Continue in Creator Studio to build its first challenge.",
    );
    setClubForm(EMPTY_CLUB);
    setClubSlugTouched(false);
    await loadPage();
    setIsSaving(false);
    router.push("/milo-world/quiz-hall/creator-studio?view=overview");
  }

  useEffect(() => {
    if (!guideOpen) return;

    const current = CREATOR_CLUBS_GUIDE_STEPS[
      Math.min(Math.max(guideStep, 0), CREATOR_CLUBS_GUIDE_STEPS.length - 1)
    ];

    if (current?.target && window.innerWidth < 768) {
      setMobileNavOpen(true);
    }
  }, [guideOpen, guideStep]);

  function closeGuide() {
    setGuideOpen(false);
    setMobileNavOpen(false);
    try {
      window.localStorage.setItem(CREATOR_CLUBS_GUIDE_STORAGE_KEY, "true");
    } catch {
      // Closing still works without localStorage.
    }
  }

  function navigateGuideTo(targetView: ViewMode) {
    selectView(targetView);
    setMobileNavOpen(false);
  }

  function openGuide() {
    setGuideStep(0);
    setMobileNavOpen(false);
    setGuideOpen(true);
  }

  if (!isLoading && hallAccess && !hallAccess.canAccess) {
    return <CreatorClubsLockedScreen />;
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <img
        src="/milo-world/quiz-hall/quiz-hall-bg.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.18]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.10),transparent_32%),linear-gradient(115deg,rgba(2,7,17,0.98)_0%,rgba(2,7,17,0.94)_58%,rgba(2,7,17,0.88)_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/8 bg-[#020711]/78 px-3 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex w-full items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              aria-label="Open Creator Clubs navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-200/18 bg-cyan-300/[0.05] text-base text-cyan-50 md:hidden"
            >
              ☰
            </button>

            <Link
              href="/milo-world/quiz-hall"
              className="hidden min-h-[40px] shrink-0 items-center rounded-full border border-white/12 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white/62 no-underline sm:inline-flex"
            >
              ← Quiz Hall
            </Link>

            <div className="mr-auto min-w-0">
              <p className="hidden truncate text-[8px] font-black uppercase tracking-[0.18em] text-amber-100/60 sm:block">
                Milo’s Creator Economy
              </p>
              <h1 className="truncate font-serif text-xl font-normal sm:text-2xl lg:text-3xl">
                Creator Clubs
              </h1>
            </div>

            <Link
              href={isAuthenticated ? "/milo-world/bank" : "/login"}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-cyan-200/28 bg-cyan-300/[0.065] px-3 text-[8px] font-black uppercase tracking-[0.07em] text-cyan-100 no-underline sm:px-4 sm:text-[9px]"
              aria-label="Dream Token balance"
            >
              <span aria-hidden="true" className="text-cyan-200">
                ◈
              </span>
              <strong>
                {dreamTokenLoading
                  ? "… DT"
                  : isAuthenticated
                    ? `${formatDreamTokens(dreamTokenBalance)} DT`
                    : "— DT"}
              </strong>
            </Link>

            <Link
              href={isAuthenticated ? "/profile" : "/login"}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-white/14 bg-white/[0.045] px-3 text-[7px] font-black uppercase tracking-[0.06em] text-white/72 no-underline sm:px-4 sm:text-[9px] sm:tracking-[0.09em]"
            >
              My Account
            </Link>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[210px] shrink-0 flex-col border-r border-white/8 bg-[#020711]/66 p-3 backdrop-blur-xl md:flex lg:w-[232px] lg:p-4">
            <CreatorClubsSideNavigation
              view={view}
              hasCreatorStudio={Boolean(creator && ownedClubs.length > 0)}
              onSelect={(nextView) => {
                selectView(nextView);
                setMobileNavOpen(false);
              }}
              onGuide={openGuide}
            />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">

        {(message || errorMessage) && (
          <div className="mt-3 w-full shrink-0 px-4 sm:px-6">
            {message && (
              <p className="rounded-2xl border border-emerald-200/16 bg-emerald-400/[0.07] px-4 py-3 text-xs text-emerald-100">
                {message}
              </p>
            )}
            {errorMessage && (
              <p className="rounded-2xl border border-red-200/16 bg-red-400/[0.07] px-4 py-3 text-xs text-red-100">
                {errorMessage}
              </p>
            )}
          </div>
        )}

        <section className="dream-club-scroll min-h-0 w-full flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6">
          {hallAccess?.isAdmin && (
            <div className="mb-4 grid gap-3">
              <CreatorOfficialClubsAdminPanel onChanged={() => void loadPage()} />
              <CreatorDiscoveryAdminPanel onChanged={() => void loadPage()} />
            </div>
          )}

          {isLoading ? (
            <LoadingGrid />
          ) : view === "discover" ? (
            <DiscoverView
              clubs={filteredClubs}
              officialClubs={officialClubs}
              discoveryRows={discoveryRows}
              spotlightRows={spotlightRows}
              search={search}
              interest={interest}
              onSearch={setSearch}
              onInterest={setInterest}
            />
          ) : view === "my" ? (
            <MyClubsView
              isAuthenticated={isAuthenticated}
              creator={creator}
              ownedClubs={ownedClubs}
              joinedClubs={joinedClubs}
              onCreate={() => selectView("create")}
            />
          ) : (
            <CreateView
              isAuthenticated={isAuthenticated}
              creator={creator}
              ownedClubs={ownedClubs}
              creatorForm={creatorForm}
              creatorSlugTouched={creatorSlugTouched}
              clubForm={clubForm}
              clubSlugTouched={clubSlugTouched}
              isSaving={isSaving}
              setCreatorForm={setCreatorForm}
              setCreatorSlugTouched={setCreatorSlugTouched}
              setClubForm={setClubForm}
              setClubSlugTouched={setClubSlugTouched}
              onCreatorSubmit={() => void createCreatorIdentity()}
              onClubSubmit={() => void createClub()}
              onLogin={() =>
                router.push(
                  `/login?next=${encodeURIComponent(
                    "/milo-world/quiz-hall/communities?view=create",
                  )}`,
                )
              }
            />
          )}
        </section>
          </div>
        </div>
      </div>

      {mobileNavOpen && (
        <CreatorClubsMobileNavigation
          view={view}
          hasCreatorStudio={Boolean(creator && ownedClubs.length > 0)}
          onClose={() => setMobileNavOpen(false)}
          onSelect={(nextView) => {
            selectView(nextView);
            setMobileNavOpen(false);
          }}
          onGuide={openGuide}
        />
      )}

      <button
        type="button"
        aria-label="Open Milo guide"
        onClick={openGuide}
        className="fixed bottom-4 left-4 z-40 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-cyan-200/32 bg-[#041426]/94 shadow-[0_18px_50px_rgba(0,0,0,0.48),0_0_26px_rgba(34,211,238,0.18)] md:hidden"
      >
        <img
          src="/milo-world/milo-character.png"
          alt=""
          className="h-[66px] w-auto translate-y-1 object-contain"
        />
      </button>

      {guideOpen && (
        <CreatorClubsMiloGuide
          step={guideStep}
          hasCreatorStudio={Boolean(creator && ownedClubs.length > 0)}
          onStepChange={setGuideStep}
          onNavigate={navigateGuideTo}
          onClose={closeGuide}
        />
      )}

      <style jsx>{`
        .dream-club-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(126, 232, 255, 0.28)
            rgba(255, 255, 255, 0.04);
        }

        .dream-club-scroll::-webkit-scrollbar {
          width: 7px;
        }

        .dream-club-scroll::-webkit-scrollbar-thumb {
          background: rgba(126, 232, 255, 0.28);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}

function DiscoverView({
  clubs,
  officialClubs,
  discoveryRows,
  spotlightRows,
  search,
  interest,
  onSearch,
  onInterest,
}: {
  clubs: ClubDirectoryRow[];
  officialClubs: ClubDirectoryRow[];
  discoveryRows: DiscoveryRow[];
  spotlightRows: SpotlightRow[];
  search: string;
  interest: string;
  onSearch: (value: string) => void;
  onInterest: (value: string) => void;
}) {
  const isFiltering = Boolean(search.trim()) || interest !== "All";

  const sections = {
    dreamscape_picks: discoveryRows.filter(
      (row) => row.section_key === "dreamscape_picks",
    ),
    trending: discoveryRows.filter((row) => row.section_key === "trending"),
    rising_creators: discoveryRows.filter(
      (row) => row.section_key === "rising_creators",
    ),
    most_played: discoveryRows.filter(
      (row) => row.section_key === "most_played",
    ),
    high_retention: discoveryRows.filter(
      (row) => row.section_key === "high_retention",
    ),
    new_promising: discoveryRows.filter(
      (row) => row.section_key === "new_promising",
    ),
  };

  const hero =
    sections.dreamscape_picks[0] || sections.trending[0] || discoveryRows[0] || null;

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search clubs, creators or interests..."
          className="h-11 min-w-0 flex-1 rounded-full border border-white/12 bg-white/[0.05] px-5 text-xs text-white outline-none placeholder:text-white/30 focus:border-cyan-200/34"
        />

        <div className="flex gap-2 overflow-x-auto">
          {["All", ...INTERESTS].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onInterest(item)}
              className={`h-11 shrink-0 rounded-full border px-4 text-[8px] font-black uppercase tracking-[0.09em] transition ${
                interest === item
                  ? "border-cyan-200/28 bg-cyan-300/10 text-cyan-100"
                  : "border-white/10 bg-white/[0.035] text-white/42 hover:text-white/72"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {isFiltering ? (
        <section className="mt-5">
          <SectionHeading
            eyebrow="Explore All"
            title={`${clubs.length} club${clubs.length === 1 ? "" : "s"} found`}
          />
          {clubs.length === 0 ? (
            <EmptyState
              title="No Creator Clubs match that search."
              text="Try another interest or a broader search."
            />
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clubs.map((club) => (
                <ClubCard key={club.club_id} club={club} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {officialClubs.length > 0 && (
            <DreamscapeOriginalsSection clubs={officialClubs} />
          )}

          {spotlightRows.length > 0 && (
            <SpotlightSection rows={spotlightRows} />
          )}

          {discoveryRows.length === 0 ? (
            <section className="mt-5">
              <EmptyState
                title="Smart discovery is warming up."
                text="Creator Clubs remain available below while reputation and engagement signals begin to build."
              />
              {clubs.length > 0 && (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {clubs.slice(0, 9).map((club) => (
                    <ClubCard key={club.club_id} club={club} />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <>
              {hero && <DiscoveryHero row={hero} />}

          <DiscoverySection
            eyebrow="Trending Now"
            title="Clubs gaining genuine momentum"
            rows={sections.trending.filter((row) => row.club_id !== hero?.club_id)}
          />

          <CreatorDiscoverySection
            eyebrow="Rising Creators"
            title="Creators building an audience"
            rows={sections.rising_creators}
          />

          <DiscoverySection
            eyebrow="Most Played This Week"
            title="Where the activity is"
            rows={sections.most_played}
          />

          <DiscoverySection
            eyebrow="High Retention"
            title="Clubs people come back to"
            rows={sections.high_retention}
          />

          <DiscoverySection
            eyebrow="New & Promising"
            title="Make room for newer creators"
            rows={sections.new_promising}
          />

              {sections.dreamscape_picks.length > 1 && (
                <DiscoverySection
                  eyebrow="Dreamscape Picks"
                  title="Selected by Dreamscape"
                  rows={sections.dreamscape_picks.filter(
                    (row) => row.club_id !== hero?.club_id,
                  )}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function DreamscapeOriginalsSection({
  clubs,
}: {
  clubs: ClubDirectoryRow[];
}) {
  return (
    <section className="mt-5 rounded-[30px] border border-amber-200/13 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.08),transparent_32%),linear-gradient(145deg,rgba(31,22,8,0.56),rgba(3,12,28,0.94))] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Dreamscape Originals"
          title="Start with an official community"
        />
        <p className="max-w-xl text-[9px] leading-4 text-white/30 sm:text-right">
          Created by Dreamscape. Member counts, plays and reactions begin at
          zero and grow only from real community activity.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {clubs.map((club) => (
          <Link
            key={club.club_id}
            href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
              club.club_slug,
            )}`}
            className="group relative min-h-[290px] overflow-hidden rounded-[26px] border border-amber-200/16 bg-[#061222] p-5 text-white no-underline shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-amber-200/28 sm:p-6"
          >
            {club.cover_image_url && (
              <img
                src={club.cover_image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-32 transition duration-500 group-hover:scale-[1.02]"
              />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,17,0.96)_0%,rgba(2,7,17,0.78)_56%,rgba(2,7,17,0.40)_100%)]" />

            <div className="relative z-10 flex h-full min-h-[242px] max-w-xl flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/12 bg-black/20">
                    {club.logo_image_url ? (
                      <img
                        src={club.logo_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      club.club_name.charAt(0)
                    )}
                  </span>
                  <span>
                    <p className="text-[8px] font-black uppercase tracking-[0.13em] text-amber-100/66">
                      {club.topic || "Dreamscape Original"}
                    </p>
                    <strong className="mt-1 block text-[9px] text-white/34">
                      by Dreamscape
                    </strong>
                  </span>
                </div>

                <span className="flex items-center gap-1.5 rounded-full border border-amber-200/20 bg-amber-300/[0.08] px-2.5 py-1.5 text-[7px] font-black uppercase tracking-[0.07em] text-amber-100">
                  <img
                    src={
                      club.official_badge_image_url ||
                      "/milo-world/quiz-hall/official-clubs/dreamscape-official-club-badge.png"
                    }
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  Official
                </span>
              </div>

              <h3 className="mt-6 font-serif text-[clamp(34px,4vw,52px)] font-normal leading-[0.94]">
                {club.club_name}
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/52">
                {club.tagline || club.description}
              </p>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/9 pt-4">
                <span className="text-[9px] font-bold text-amber-100/62">
                  Explore Club →
                </span>
                <span className="text-[9px] font-bold text-white/38">
                  {club.member_count.toLocaleString()} genuine members
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SpotlightSection({ rows }: { rows: SpotlightRow[] }) {
  const poolSize = rows[0]?.active_pool_size || rows.length;

  return (
    <section className="mt-5 rounded-[28px] border border-fuchsia-200/12 bg-fuchsia-300/[0.025] p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Creator Spotlight Rotation"
          title="Clubs reinvesting in visibility"
        />
        <p className="max-w-xl text-[9px] leading-4 text-white/28 sm:text-right">
          Spotlight is a 24-hour rotation opportunity. DT buys entry into the pool,
          not members, ranking points or guaranteed prominence.
          {poolSize > 6 ? ` ${poolSize} clubs are currently rotating.` : ""}
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <SpotlightCard key={row.club_id} row={row} />
        ))}
      </div>
    </section>
  );
}

function SpotlightCard({ row }: { row: SpotlightRow }) {
  return (
    <Link
      href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(row.club_slug)}`}
      className="group relative min-h-[235px] overflow-hidden rounded-[24px] border border-fuchsia-200/16 bg-[linear-gradient(145deg,rgba(76,24,82,0.18),rgba(4,14,30,0.90))] p-5 text-white no-underline transition hover:-translate-y-0.5"
      style={clubUpgradeCardStyle(row.club_theme_key, row.club_frame_key)}
    >
      {row.cover_image_url && (
        <>
          <img
            src={row.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-15 transition duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,22,.38),rgba(4,8,22,.96))]" />
        </>
      )}

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full border border-fuchsia-200/18 bg-fuchsia-300/[0.06] px-3 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-fuchsia-100">
            Spotlight Rotation
          </span>
          <CreatorClubLevelBadge
            levelNumber={row.club_level_number}
            levelName={row.club_level_name}
            compact
          />
        </div>

        <p className="mt-4 text-[8px] font-black uppercase tracking-[0.11em] text-fuchsia-100/54">
          {row.topic || "Creator Club"}
        </p>
        <h3 className="mt-1 line-clamp-2 text-xl font-black leading-6">
          {row.club_name}
        </h3>
        <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-white/38">
          {row.tagline || row.description || "A creator-led community inside Milo’s Quiz Hall."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/8 pt-4">
          <span className="truncate text-[9px] text-white/32">
            by {row.creator_display_name}
          </span>
          <span className="shrink-0 text-[9px] font-bold text-fuchsia-100/58">
            {row.member_count.toLocaleString()} members
          </span>
        </div>
      </div>
    </Link>
  );
}

function DiscoveryHero({ row }: { row: DiscoveryRow }) {
  return (
    <section className="mt-5">
      <SectionHeading
        eyebrow={row.dreamscape_pick ? "Dreamscape Pick" : "Trending Now"}
        title="A club worth exploring"
      />

      <Link
        href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(row.club_slug)}`}
        className="group relative mt-3 block min-h-[330px] overflow-hidden rounded-[30px] border border-amber-200/18 bg-[linear-gradient(135deg,rgba(73,45,13,0.54),rgba(3,12,29,0.94))] p-6 text-white no-underline shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:p-8"
        style={clubUpgradeCardStyle(row.club_theme_key, row.club_frame_key)}
      >
        {row.cover_image_url && (
          <img
            src={row.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-27 transition duration-500 group-hover:scale-[1.02]"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,17,0.97)_0%,rgba(2,7,17,0.80)_54%,rgba(2,7,17,0.42)_100%)]" />

        <div className="relative z-10 flex min-h-[278px] max-w-3xl flex-col justify-end">
          <div className="flex flex-wrap items-center gap-2">
            <DiscoveryPill>{row.reason_label}</DiscoveryPill>
            <CreatorClubLevelBadge
              levelNumber={row.club_level_number || 1}
              levelName={row.club_level_name || "Starter Club"}
              compact
            />
            <DiscoveryPill>{row.level_name} creator</DiscoveryPill>
            <DiscoveryPill>{row.reputation_score} REP</DiscoveryPill>
          </div>

          <p className="mt-5 text-[9px] font-black uppercase tracking-[0.17em] text-amber-100/70">
            {row.topic || "Creator Club"} · by {row.creator_display_name}
          </p>
          <h3 className="mt-3 font-serif text-[clamp(40px,5vw,70px)] font-normal leading-[0.94]">
            {row.club_name}
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58">
            {row.tagline ||
              row.description ||
              "A creator-led community inside Milo’s Quiz Hall."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-amber-200/18 bg-amber-300/[0.08] px-4 py-2 text-[8px] font-black uppercase tracking-[0.09em] text-amber-100">
              Explore Club →
            </span>
            <span className="text-[10px] font-bold text-white/38">
              {row.member_count.toLocaleString()} members ·{" "}
              {row.total_plays.toLocaleString()} plays
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

function DiscoverySection({
  eyebrow,
  title,
  rows,
}: {
  eyebrow: string;
  title: string;
  rows: DiscoveryRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-7">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.slice(0, 6).map((row) => (
          <DiscoveryClubCard key={`${row.section_key}-${row.club_id}`} row={row} />
        ))}
      </div>
    </section>
  );
}

function CreatorDiscoverySection({
  eyebrow,
  title,
  rows,
}: {
  eyebrow: string;
  title: string;
  rows: DiscoveryRow[];
}) {
  if (rows.length === 0) return null;

  const unique = rows.filter(
    (row, index, list) =>
      list.findIndex(
        (candidate) => candidate.creator_partner_id === row.creator_partner_id,
      ) === index,
  );

  return (
    <section className="mt-7">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {unique.slice(0, 6).map((row) => (
          <Link
            key={row.creator_partner_id}
            href={`/milo-world/quiz-hall/creators/${encodeURIComponent(
              row.creator_slug,
            )}`}
            className="rounded-[24px] border border-violet-200/12 bg-[linear-gradient(145deg,rgba(61,37,98,0.18),rgba(4,15,31,0.87))] p-5 text-white no-underline transition hover:-translate-y-0.5 hover:border-violet-200/24"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-violet-200/16 bg-violet-300/[0.07] text-xl font-black text-violet-100">
                {row.creator_profile_image_url ? (
                  <img
                    src={row.creator_profile_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  row.creator_display_name.charAt(0).toUpperCase()
                )}
              </span>

              <div className="min-w-0">
                <p className="truncate text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/58">
                  {row.level_name}
                </p>
                <h3 className="mt-1 truncate text-xl font-black">
                  {row.creator_display_name}
                </h3>
                <p className="mt-1 truncate text-[9px] text-white/28">
                  @{row.creator_slug}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniMetric label="REP" value={row.reputation_score} />
              <MiniMetric label="Players" value={row.unique_players} />
              <MiniMetric label="Return" value={`${Math.round(row.repeat_rate * 100)}%`} />
            </div>

            <p className="mt-4 text-[9px] font-bold text-violet-100/68">
              {row.reason_label} →
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DiscoveryClubCard({ row }: { row: DiscoveryRow }) {
  return (
    <Link
      href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(row.club_slug)}`}
      className="group relative min-h-[270px] overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-5 text-white no-underline shadow-[0_22px_60px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-cyan-200/26"
      style={clubUpgradeCardStyle(row.club_theme_key, row.club_frame_key)}
    >
      {row.cover_image_url && (
        <>
          <img
            src={row.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-17 transition duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,24,0.43),rgba(3,10,24,0.97))]" />
        </>
      )}

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-200/18 bg-amber-300/[0.08] text-lg font-black text-amber-100">
            {row.logo_image_url ? (
              <img
                src={row.logo_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              row.club_name.charAt(0).toUpperCase()
            )}
          </span>

          <CreatorClubLevelBadge
            levelNumber={row.club_level_number || 1}
            levelName={row.club_level_name || "Starter Club"}
            compact
          />
        </div>

        <p className="mt-4 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100/62">
          {row.topic || "Creator Club"}
        </p>
        <h3 className="mt-1 line-clamp-2 text-xl font-black leading-6">
          {row.club_name}
        </h3>
        <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-white/42">
          {row.tagline ||
            row.description ||
            "A creator-led community inside Milo’s Quiz Hall."}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <DiscoveryPill>{row.reason_label}</DiscoveryPill>
          <DiscoveryPill>{row.level_name} creator</DiscoveryPill>
          <DiscoveryPill>{row.reputation_score} REP</DiscoveryPill>
          {row.club_theme_name && <DiscoveryPill>{row.club_theme_name}</DiscoveryPill>}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/8 pt-4">
          <span className="truncate text-[9px] font-bold text-white/36">
            by {row.creator_display_name}
          </span>
          <span className="shrink-0 text-[9px] font-bold text-cyan-100/58">
            {row.member_count.toLocaleString()} members
          </span>
        </div>
      </div>
    </Link>
  );
}

function DiscoveryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-black/18 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.07em] text-white/50">
      {children}
    </span>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/14 px-2 py-2 text-center">
      <strong className="block text-sm text-violet-100">
        {typeof value === "number" ? value.toLocaleString() : value}
      </strong>
      <span className="mt-1 block text-[6px] font-black uppercase tracking-[0.08em] text-white/24">
        {label}
      </span>
    </div>
  );
}

function MyClubsView({
  isAuthenticated,
  creator,
  ownedClubs,
  joinedClubs,
  onCreate,
}: {
  isAuthenticated: boolean;
  creator: CreatorIdentity | null;
  ownedClubs: OwnedCreatorClub[];
  joinedClubs: ClubDirectoryRow[];
  onCreate: () => void;
}) {
  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Log in to see your clubs."
        text="Joined clubs and creator ownership are attached to your Dreamscape account."
      />
    );
  }

  return (
    <div className="grid gap-5">
      <section>
        <div className="flex items-end justify-between gap-3">
          <SectionHeading eyebrow="Ownership" title="Clubs I Own" />
          {creator && ownedClubs.length === 0 && (
            <button
              type="button"
              onClick={onCreate}
              className="min-h-10 rounded-full border border-amber-200/20 bg-amber-300/[0.08] px-4 text-[8px] font-black uppercase tracking-[0.09em] text-amber-100"
            >
              Create Club
            </button>
          )}
        </div>

        {ownedClubs.length === 0 ? (
          <EmptyState
            title={creator ? "Your club starts here." : "Become a creator first."}
            text={
              creator
                ? "Your owned club will appear here. Continue setup in Creator Studio."
                : "Create a creator identity, then launch your first club."
            }
          />
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {ownedClubs.map((club) => (
              <article
                key={club.club_id}
                className="rounded-[26px] border border-amber-200/14 bg-[linear-gradient(145deg,rgba(74,43,11,0.17),rgba(4,15,32,0.90))] p-5"
              >
                <p className="text-[8px] font-black uppercase tracking-[0.13em] text-amber-100/62">
                  {club.topic || "Creator Club"}
                </p>
                <h3 className="mt-2 text-2xl font-black">{club.club_name}</h3>
                <span className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/44">
                  {club.status}
                </span>

                <div className="mt-5 border-t border-white/8 pt-4">
                  <p className="mb-3 text-[9px] leading-4 text-white/34">
                    {club.status === "draft"
                      ? "Your club is still being set up. Build its first challenge before publishing."
                      : "Manage challenges, community growth and club settings in Creator Studio."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/milo-world/quiz-hall/creator-studio?view=overview"
                      className="rounded-full border border-amber-200/22 bg-amber-300/[0.09] px-4 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-amber-100 no-underline"
                    >
                      Continue Setup →
                    </Link>
                    <Link
                      href="/milo-world/quiz-hall/creator-studio?view=challenges"
                      className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-4 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100 no-underline"
                    >
                      Create Challenge
                    </Link>
                    <Link
                      href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                        club.club_slug,
                      )}`}
                      className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-white/48 no-underline"
                    >
                      View Club
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading eyebrow="Membership" title="Clubs I Joined" />

        {joinedClubs.length === 0 ? (
          <EmptyState
            title="No joined clubs yet."
            text="Browse Discover and join communities around things you enjoy."
          />
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {joinedClubs.map((club) => (
              <ClubCard key={club.club_id} club={club} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CreateView({
  isAuthenticated,
  creator,
  ownedClubs,
  creatorForm,
  creatorSlugTouched,
  clubForm,
  clubSlugTouched,
  isSaving,
  setCreatorForm,
  setCreatorSlugTouched,
  setClubForm,
  setClubSlugTouched,
  onCreatorSubmit,
  onClubSubmit,
  onLogin,
}: {
  isAuthenticated: boolean;
  creator: CreatorIdentity | null;
  ownedClubs: OwnedCreatorClub[];
  creatorForm: typeof EMPTY_CREATOR;
  creatorSlugTouched: boolean;
  clubForm: ClubCreateForm;
  clubSlugTouched: boolean;
  isSaving: boolean;
  setCreatorForm: React.Dispatch<React.SetStateAction<typeof EMPTY_CREATOR>>;
  setCreatorSlugTouched: React.Dispatch<React.SetStateAction<boolean>>;
  setClubForm: React.Dispatch<React.SetStateAction<ClubCreateForm>>;
  setClubSlugTouched: React.Dispatch<React.SetStateAction<boolean>>;
  onCreatorSubmit: () => void;
  onClubSubmit: () => void;
  onLogin: () => void;
}) {
  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-3xl rounded-[30px] border border-amber-200/14 bg-[linear-gradient(145deg,rgba(66,39,12,0.28),rgba(4,15,32,0.92))] p-7 text-center sm:p-9">
        <p className="text-[9px] font-black uppercase tracking-[0.17em] text-amber-100/62">
          Creator access
        </p>
        <h2 className="mt-3 font-serif text-4xl font-normal">
          Build something people want to return to.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/48">
          Log in first. Your creator identity, club ownership and future creator
          reputation all stay attached to your Dreamscape account.
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="mt-6 min-h-11 rounded-full border border-amber-200/22 bg-amber-300/10 px-6 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100"
        >
          Log In to Start
        </button>
      </section>
    );
  }

  if (!creator) {
    return (
      <section className="w-full rounded-[30px] border border-violet-200/14 bg-[linear-gradient(145deg,rgba(52,31,90,0.24),rgba(4,15,32,0.93))] p-6 sm:p-8 lg:px-10">
        <StepHeader
          number="01"
          eyebrow="Creator Identity"
          title="First, decide who you are as a creator."
          text="This is the public identity attached to the challenges and club you build. It is separate from your login name."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Creator display name">
            <input
              value={creatorForm.displayName}
              onChange={(event) => {
                const value = event.target.value;
                setCreatorForm((current) => ({
                  ...current,
                  displayName: value,
                  slug: creatorSlugTouched
                    ? current.slug
                    : creatorSlugify(value),
                }));
              }}
              maxLength={40}
              placeholder="e.g. Atlas Builder"
              className={inputClass}
            />
          </Field>

          <Field label="Creator handle">
            <input
              value={creatorForm.slug}
              onChange={(event) => {
                setCreatorSlugTouched(true);
                setCreatorForm((current) => ({
                  ...current,
                  slug: creatorSlugify(event.target.value),
                }));
              }}
              maxLength={40}
              placeholder="atlas-builder"
              className={inputClass}
            />
          </Field>

          <Field label="Avatar image URL · optional">
            <input
              value={creatorForm.profileImageUrl}
              onChange={(event) =>
                setCreatorForm((current) => ({
                  ...current,
                  profileImageUrl: event.target.value,
                }))
              }
              placeholder="https://..."
              className={inputClass}
            />
          </Field>

          <Field label="Short creator bio · optional" span>
            <textarea
              value={creatorForm.bio}
              onChange={(event) =>
                setCreatorForm((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
              rows={3}
              maxLength={320}
              placeholder="What do you enjoy creating or teaching?"
              className={textareaClass}
            />
          </Field>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/9 bg-black/14 p-4">
          <input
            type="checkbox"
            checked={creatorForm.rulesAccepted}
            onChange={(event) =>
              setCreatorForm((current) => ({
                ...current,
                rulesAccepted: event.target.checked,
              }))
            }
            className="mt-0.5"
          />
          <span className="text-xs leading-5 text-white/54">
            I will create appropriate, original challenges and understand that
            Dreamscape can review, pause or remove creator content that does not
            meet the Creator Rules.
          </span>
        </label>

        <button
          type="button"
          disabled={isSaving}
          onClick={onCreatorSubmit}
          className={primaryButton}
        >
          {isSaving ? "Creating..." : "Create Creator Identity →"}
        </button>
      </section>
    );
  }

  if (ownedClubs.length > 0) {
    const club = ownedClubs[0];
    return (
      <section className="w-full rounded-[30px] border border-emerald-200/14 bg-[linear-gradient(145deg,rgba(17,71,58,0.20),rgba(4,15,32,0.93))] p-7 sm:p-9 lg:px-10">
        <StepHeader
          number="02"
          eyebrow="Club Ownership"
          title="You already own your Phase 2 club."
          text="For now, every creator focuses on one community. Build it well before the platform introduces additional club slots."
        />

        <div className="mt-6 rounded-[24px] border border-white/9 bg-black/14 p-5">
          <p className="text-[8px] font-black uppercase tracking-[0.13em] text-emerald-100/62">
            {club.topic || "Creator Club"} · {club.status}
          </p>
          <h3 className="mt-2 text-3xl font-black">{club.club_name}</h3>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/milo-world/quiz-hall/creator-studio"
              className="rounded-full border border-amber-200/20 bg-amber-300/[0.08] px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.09em] text-amber-100 no-underline"
            >
              Open Creator Studio →
            </Link>
            <Link
              href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                club.club_slug,
              )}`}
              className="rounded-full border border-white/10 bg-white/[0.035] px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.09em] text-white/54 no-underline"
            >
              View Club
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full rounded-[30px] border border-amber-200/14 bg-[linear-gradient(145deg,rgba(73,43,12,0.22),rgba(4,15,32,0.93))] p-6 sm:p-8 lg:px-10 lg:py-9">
      <StepHeader
        number="02"
        eyebrow={`Creator · ${creator.display_name}`}
        title="Build your first club."
        text="Set up the club people will discover, join and return to."
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Club name">
          <input
            value={clubForm.name}
            onChange={(event) => {
              const value = event.target.value;
              setClubForm((current) => ({
                ...current,
                name: value,
                slug: clubSlugTouched ? current.slug : creatorSlugify(value, 70),
              }));
            }}
            maxLength={70}
            placeholder="e.g. Space Explorers"
            className={inputClass}
          />
        </Field>

        <Field label="Club URL">
          <input
            value={clubForm.slug}
            onChange={(event) => {
              setClubSlugTouched(true);
              setClubForm((current) => ({
                ...current,
                slug: creatorSlugify(event.target.value, 70),
              }));
            }}
            maxLength={70}
            placeholder="space-explorers"
            className={inputClass}
          />
        </Field>

        <Field label="Interest">
          <select
            value={clubForm.topic}
            onChange={(event) =>
              setClubForm((current) => ({
                ...current,
                topic: event.target.value,
              }))
            }
            className={inputClass}
          >
            {INTERESTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tagline">
          <input
            value={clubForm.tagline}
            onChange={(event) =>
              setClubForm((current) => ({
                ...current,
                tagline: event.target.value,
              }))
            }
            maxLength={120}
            placeholder="One sentence people will remember."
            className={inputClass}
          />
        </Field>

        <Field label="Club logo · optional">
          <DeviceImagePicker
            kind="logo"
            file={clubForm.logoFile}
            recommended="Square image · PNG, JPG or WebP · max 5 MB"
            onChange={(file) =>
              setClubForm((current) => ({
                ...current,
                logoFile: file,
              }))
            }
          />
        </Field>

        <Field label="Club background · optional">
          <CreatorBackgroundPicker
            file={clubForm.backgroundFile}
            presetUrl={clubForm.backgroundPresetUrl}
            presets={CREATOR_BACKGROUND_PRESETS}
            onFileChange={(file) =>
              setClubForm((current) => ({
                ...current,
                backgroundFile: file,
                backgroundPresetUrl: file
                  ? ""
                  : current.backgroundPresetUrl || DEFAULT_CREATOR_BACKGROUND_URL,
              }))
            }
            onPresetChange={(imageUrl) =>
              setClubForm((current) => ({
                ...current,
                backgroundPresetUrl: imageUrl,
                backgroundFile: imageUrl ? null : current.backgroundFile,
              }))
            }
          />
        </Field>

        <Field label="What is this club for?" span>
          <textarea
            value={clubForm.description}
            onChange={(event) =>
              setClubForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            rows={4}
            maxLength={1200}
            placeholder="Tell future members what they can expect to learn, play or compete in."
            className={textareaClass}
          />
        </Field>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.035] p-4">
        <p className="text-[8px] font-black uppercase tracking-[0.13em] text-cyan-100/58">
          Before publishing
        </p>
        <p className="mt-2 text-xs leading-5 text-white/46">
          Your club starts as a draft. Add its first challenge in Creator Studio,
          then submit it for Dreamscape review when it is ready.
        </p>
      </div>

      <button
        type="button"
        disabled={isSaving}
        onClick={onClubSubmit}
        className={`${primaryButton} w-full justify-center sm:w-auto`}
      >
        {isSaving ? "Uploading & Creating..." : "Create Draft Club →"}
      </button>
    </section>
  );
}

function CreatorBackgroundPicker({
  file,
  presetUrl,
  presets,
  onFileChange,
  onPresetChange,
}: {
  file: File | null;
  presetUrl: string;
  presets: CreatorBackgroundPreset[];
  onFileChange: (file: File | null) => void;
  onPresetChange: (imageUrl: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07152d] p-3">
      <div className="flex flex-col gap-3">
        <div className="flex min-h-[54px] items-center gap-3">
          <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center rounded-xl border border-cyan-200/18 bg-cyan-300/[0.06] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.09]">
            Upload Background
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] || null;
                onFileChange(nextFile);
                event.currentTarget.value = "";
              }}
            />
          </label>

          <div className="min-w-0 flex-1">
            <strong className="block truncate text-[10px] text-white/78">
              {file
                ? file.name
                : presetUrl
                  ? "Dreamscape background selected"
                  : "Dreamscape Core Glow"}
            </strong>
            <small className="mt-1 block text-[8px] leading-4 text-white/28">
              16:9 recommended · PNG, JPG or WebP · max 5 MB. This background
              appears behind your club and all of its quizzes.
            </small>
          </div>

          {(file || presetUrl) && (
            <button
              type="button"
              onClick={() => {
                onFileChange(null);
                onPresetChange(DEFAULT_CREATOR_BACKGROUND_URL);
              }}
              className="min-h-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[7px] font-black uppercase tracking-[0.07em] text-white/42"
            >
              Reset
            </button>
          )}
        </div>

        {presets.length > 0 ? (
          <div className="border-t border-white/8 pt-3">
            <p className="mb-2 text-[7px] font-black uppercase tracking-[0.08em] text-white/30">
              Or choose a Dreamscape theme
            </p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => onPresetChange(preset.imageUrl)}
                  className={`relative min-h-[82px] overflow-hidden rounded-xl border text-left ${
                    presetUrl === preset.imageUrl
                      ? "border-cyan-200/34"
                      : "border-white/9"
                  }`}
                >
                  <img
                    src={preset.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-54"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
                  <span className="relative z-10 flex min-h-[82px] items-end p-3 text-[8px] font-black uppercase tracking-[0.07em] text-white">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="border-t border-white/8 pt-3 text-[8px] leading-4 text-white/25">
            Dreamscape Core Glow is selected by default. You can keep it,
            choose another Dreamscape theme, or upload your own background.
          </p>
        )}
      </div>
    </div>
  );
}

function DeviceImagePicker({
  kind,
  file,
  recommended,
  onChange,
}: {
  kind: "logo";
  file: File | null;
  recommended: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07152d] p-3">
      <div className="flex min-h-[54px] items-center gap-3">
        <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center rounded-xl border border-cyan-200/18 bg-cyan-300/[0.06] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.09]">
          Choose File
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              onChange(nextFile);
              event.currentTarget.value = "";
            }}
          />
        </label>

        <div className="min-w-0 flex-1">
          <strong className="block truncate text-[10px] text-white/78">
            {file ? file.name : `No ${kind} selected`}
          </strong>
          <small className="mt-1 block text-[8px] leading-4 text-white/28">
            {recommended}
          </small>
        </div>

        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-9 shrink-0 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-[7px] font-black uppercase tracking-[0.07em] text-white/42"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function ClubCard({ club }: { club: ClubDirectoryRow }) {
  return (
    <Link
      href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(club.club_slug)}`}
      className="group relative min-h-[250px] overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-5 text-white no-underline shadow-[0_22px_60px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-cyan-200/26"
      style={clubUpgradeCardStyle(club.club_theme_key, club.club_frame_key)}
    >
      {club.cover_image_url && (
        <>
          <img
            src={club.cover_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-17 transition duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,24,0.42),rgba(3,10,24,0.96))]" />
        </>
      )}

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-200/18 bg-amber-300/[0.08] text-lg font-black text-amber-100">
            {club.logo_image_url ? (
              <img
                src={club.logo_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              club.club_name.charAt(0).toUpperCase()
            )}
          </span>

          <div className="min-w-0">
            <p className="truncate text-[8px] font-black uppercase tracking-[0.12em] text-amber-100/64">
              {club.topic || "Creator Club"}
            </p>
            <h3 className="mt-1 line-clamp-2 text-xl font-black leading-6">
              {club.club_name}
            </h3>
          </div>
          </div>

          {club.is_official ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200/18 bg-amber-300/[0.07] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.07em] text-amber-100">
              <img
                src={
                  club.official_badge_image_url ||
                  "/milo-world/quiz-hall/official-clubs/dreamscape-official-club-badge.png"
                }
                alt=""
                className="h-4 w-4 rounded-full object-cover"
              />
              Official
            </span>
          ) : (
            <CreatorClubLevelBadge
              levelNumber={club.club_level_number || 1}
              levelName={club.club_level_name || "Starter Club"}
              compact
            />
          )}
        </div>

        <p className="mt-4 line-clamp-3 text-[11px] leading-5 text-white/48">
          {club.tagline ||
            club.description ||
            "A creator-led community inside Milo’s Quiz Hall."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/8 pt-4">
          <span className="truncate text-[9px] font-bold text-white/40">
            by {club.creator_display_name}
          </span>
          <span className="shrink-0 text-[9px] font-bold text-cyan-100/58">
            {club.member_count.toLocaleString()} members
          </span>
        </div>
      </div>
    </Link>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/58">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
    </div>
  );
}

function StepHeader({
  number,
  eyebrow,
  title,
  text,
}: {
  number: string;
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[56px_minmax(0,1fr)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/18 bg-amber-300/[0.07] text-sm font-black text-amber-100">
        {number}
      </span>
      <div>
        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-100/58">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-serif text-3xl font-normal sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48">{text}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  span = false,
  children,
}: {
  label: string;
  span?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={span ? "md:col-span-2" : ""}>
      <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.11em] text-white/36">
        {label}
      </span>
      {children}
    </label>
  );
}

function CreatorClubsSideNavigation({
  view,
  hasCreatorStudio,
  onSelect,
  onGuide,
}: {
  view: ViewMode;
  hasCreatorStudio: boolean;
  onSelect: (view: ViewMode) => void;
  onGuide: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div>
        <p className="px-2 pb-2 pt-1 text-[7px] font-black uppercase tracking-[0.16em] text-white/28">
          Creator Clubs
        </p>

        <div className="grid gap-2">
          <CreatorSideButton
            icon="⌕"
            label="Discover"
            description="Find communities"
            active={view === "discover"}
            guideTarget="discover"
            onClick={() => onSelect("discover")}
          />
          <CreatorSideButton
            icon="◎"
            label="My Clubs"
            description="Joined & owned"
            active={view === "my"}
            guideTarget="my"
            onClick={() => onSelect("my")}
          />
          <CreatorSideButton
            icon="+"
            label="Create"
            description="Build your club"
            active={view === "create"}
            guideTarget="create"
            onClick={() => onSelect("create")}
          />
        </div>

        {hasCreatorStudio && (
          <div className="mt-4 border-t border-white/8 pt-4">
            <p className="px-2 pb-2 text-[7px] font-black uppercase tracking-[0.16em] text-white/28">
              Creator Tools
            </p>
            <Link
              href="/milo-world/quiz-hall/creator-studio"
              data-creator-guide-target="studio"
              className="flex min-h-[54px] items-center gap-3 rounded-2xl border border-amber-200/14 bg-amber-300/[0.045] px-3 text-white no-underline transition hover:border-amber-200/28 hover:bg-amber-300/[0.07]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-300/[0.08] text-sm text-amber-100">
                ✦
              </span>
              <span className="min-w-0">
                <strong className="block text-[9px] font-black uppercase tracking-[0.07em] text-amber-100">
                  Creator Studio
                </strong>
                <small className="mt-1 block text-[8px] text-white/28">
                  Challenges & growth
                </small>
              </span>
            </Link>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-white/8 pt-4">
        <button
          type="button"
          onClick={onGuide}
          className="flex w-full items-center gap-3 rounded-[20px] border border-cyan-200/14 bg-cyan-300/[0.045] p-3 text-left transition hover:border-cyan-200/28 hover:bg-cyan-300/[0.07]"
        >
          <span className="flex h-12 w-12 shrink-0 items-end justify-center overflow-hidden rounded-2xl border border-cyan-200/14 bg-[#06182d]">
            <img
              src="/milo-world/milo-character.png"
              alt=""
              className="h-[58px] w-auto translate-y-1 object-contain"
            />
          </span>
          <span className="min-w-0">
            <strong className="block text-[9px] font-black uppercase tracking-[0.08em] text-cyan-100">
              Milo Guide
            </strong>
            <small className="mt-1 block text-[8px] leading-4 text-white/32">
              Show me around
            </small>
          </span>
        </button>
      </div>
    </div>
  );
}

function CreatorSideButton({
  icon,
  label,
  description,
  active,
  guideTarget,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  active: boolean;
  guideTarget: CreatorGuideTarget;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-creator-guide-target={guideTarget}
      onClick={onClick}
      className={`flex min-h-[58px] w-full items-center gap-3 rounded-2xl border px-3 text-left transition ${
        active
          ? "border-cyan-200/24 bg-cyan-300/[0.075] text-cyan-50"
          : "border-white/8 bg-white/[0.025] text-white/50 hover:border-white/14 hover:bg-white/[0.045] hover:text-white/78"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
          active ? "bg-cyan-300/[0.10] text-cyan-100" : "bg-white/[0.035]"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <strong className="block text-[9px] font-black uppercase tracking-[0.08em]">
          {label}
        </strong>
        <small className="mt-1 block text-[8px] text-white/28">
          {description}
        </small>
      </span>
    </button>
  );
}

function CreatorClubsMobileNavigation({
  view,
  hasCreatorStudio,
  onClose,
  onSelect,
  onGuide,
}: {
  view: ViewMode;
  hasCreatorStudio: boolean;
  onClose: () => void;
  onSelect: (view: ViewMode) => void;
  onGuide: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] md:hidden">
      <button
        type="button"
        aria-label="Close Creator Clubs navigation"
        onClick={onClose}
        className="absolute inset-0 border-0 bg-black/68 backdrop-blur-[2px]"
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(310px,88vw)] flex-col border-r border-cyan-200/16 bg-[linear-gradient(180deg,rgba(3,14,29,0.995),rgba(2,8,19,0.995))] p-4 shadow-[24px_0_80px_rgba(0,0,0,0.62)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span>
            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-amber-100/48">
              Milo’s Creator Economy
            </p>
            <strong className="mt-1 block font-serif text-2xl font-normal">
              Creator Clubs
            </strong>
          </span>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-lg text-white/62"
          >
            ×
          </button>
        </div>

        <CreatorClubsSideNavigation
          view={view}
          hasCreatorStudio={hasCreatorStudio}
          onSelect={onSelect}
          onGuide={() => {
            onClose();
            onGuide();
          }}
        />
      </aside>
    </div>
  );
}

function CreatorClubsMiloGuide({
  step,
  hasCreatorStudio,
  onStepChange,
  onNavigate,
  onClose,
}: {
  step: number;
  hasCreatorStudio: boolean;
  onStepChange: (step: number) => void;
  onNavigate: (view: ViewMode) => void;
  onClose: () => void;
}) {
  const safeStep = Math.min(
    Math.max(step, 0),
    CREATOR_CLUBS_GUIDE_STEPS.length - 1,
  );
  const current = CREATOR_CLUBS_GUIDE_STEPS[safeStep];
  const isLast = safeStep === CREATOR_CLUBS_GUIDE_STEPS.length - 1;

  const [targetRect, setTargetRect] = useState<{
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  } | null>(null);
  const [viewport, setViewport] = useState({
    width: 1280,
    height: 800,
  });

  const effectiveTarget =
    current.target === "studio" && !hasCreatorStudio
      ? undefined
      : current.target;

  useEffect(() => {
    function locateTarget() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      if (!effectiveTarget) {
        setTargetRect(null);
        return;
      }

      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-creator-guide-target="${effectiveTarget}"]`,
        ),
      );

      const visibleNode = nodes.find((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden"
        );
      });

      if (!visibleNode) {
        setTargetRect(null);
        return;
      }

      visibleNode.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });

      const rect = visibleNode.getBoundingClientRect();
      const padding = 7;

      setTargetRect({
        left: Math.max(4, rect.left - padding),
        top: Math.max(4, rect.top - padding),
        right: Math.min(window.innerWidth - 4, rect.right + padding),
        bottom: Math.min(window.innerHeight - 4, rect.bottom + padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    }

    const frame = window.requestAnimationFrame(locateTarget);
    const settle = window.setTimeout(locateTarget, 120);
    window.addEventListener("resize", locateTarget);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener("resize", locateTarget);
    };
  }, [effectiveTarget, safeStep]);

  function handlePrimaryAction() {
    if (current.view) {
      onNavigate(current.view);
    }

    if (isLast && hasCreatorStudio) {
      window.location.href = "/milo-world/quiz-hall/creator-studio";
      return;
    }

    if (isLast) {
      onClose();
      return;
    }

    onStepChange(safeStep + 1);
  }

  const isDesktopTarget = Boolean(targetRect && viewport.width >= 768);
  const guideWidth = Math.min(520, Math.max(340, viewport.width - 280));

  const desktopLeft = targetRect
    ? Math.min(
        Math.max(targetRect.right + 18, 248),
        Math.max(12, viewport.width - guideWidth - 18),
      )
    : 0;

  const desktopTop = targetRect
    ? Math.max(
        82,
        Math.min(
          targetRect.top - 18,
          Math.max(82, viewport.height - 350),
        ),
      )
    : 0;

  return (
    <div className="fixed inset-0 z-[110] pointer-events-none">
      {targetRect ? (
        <div
          aria-hidden="true"
          className="fixed z-[111] rounded-[20px] border-2 border-cyan-200/75 bg-transparent shadow-[0_0_0_9999px_rgba(1,4,11,0.78),0_0_34px_rgba(34,211,238,0.34)] transition-all duration-200"
          style={{
            left: targetRect.left,
            top: targetRect.top,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[111] bg-[#01040b]/72 backdrop-blur-[3px]" />
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Milo Creator Clubs guide"
        className={`fixed z-[112] pointer-events-auto rounded-[26px] border border-cyan-200/28 bg-[linear-gradient(145deg,rgba(4,20,39,0.99),rgba(3,9,24,0.995))] px-5 pb-5 pt-5 shadow-[0_34px_100px_rgba(0,0,0,0.68),0_0_44px_rgba(34,211,238,0.13)] sm:px-6 sm:pb-6 sm:pl-[156px] sm:pt-6 ${
          isDesktopTarget
            ? ""
            : "bottom-4 left-1/2 w-[min(650px,calc(100vw-24px))] -translate-x-1/2"
        }`}
        style={
          isDesktopTarget
            ? {
                left: desktopLeft,
                top: desktopTop,
                width: guideWidth,
              }
            : undefined
        }
      >
        <button
          type="button"
          aria-label="Close Milo guide"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] text-lg text-white/56"
        >
          ×
        </button>

        <img
          src="/milo-world/milo-character.png"
          alt="Milo"
          className="mx-auto mb-2 h-[100px] w-auto object-contain sm:absolute sm:bottom-[-6px] sm:left-4 sm:mb-0 sm:h-[158px]"
        />

        <p className="pr-10 text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/58">
          {current.eyebrow}
        </p>
        <h2 className="mt-2 max-w-xl font-serif text-[clamp(25px,3vw,36px)] font-normal leading-[1.02]">
          {current.title}
        </h2>
        <p className="mt-3 max-w-xl text-[10px] leading-5 text-white/48 sm:text-[11px]">
          {current.text}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
          <div
            aria-label={`Guide step ${safeStep + 1} of ${CREATOR_CLUBS_GUIDE_STEPS.length}`}
            className="flex items-center gap-1.5"
          >
            {CREATOR_CLUBS_GUIDE_STEPS.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === safeStep
                    ? "w-6 bg-cyan-200"
                    : "w-1.5 bg-white/18"
                }`}
              />
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {safeStep > 0 && (
              <button
                type="button"
                onClick={() => onStepChange(safeStep - 1)}
                className="min-h-9 rounded-full border border-white/12 bg-white/[0.035] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-white/52"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="min-h-9 rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-5 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100"
            >
              {isLast
                ? hasCreatorStudio
                  ? "Open Creator Studio →"
                  : "Got it"
                : current.actionLabel || "Next"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-3 flex min-h-[220px] items-center justify-center rounded-[26px] border border-white/9 bg-white/[0.03] p-7 text-center">
      <div className="max-w-lg">
        <h3 className="text-2xl font-black">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-white/42">{text}</p>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="h-[250px] animate-pulse rounded-[26px] border border-white/8 bg-white/[0.035]"
        />
      ))}
    </div>
  );
}

const inputClass =
  "h-11 w-full min-w-0 rounded-2xl border border-white/10 bg-[#061632]/80 px-4 text-xs text-white outline-none transition placeholder:text-white/26 focus:border-amber-200/30";

const textareaClass =
  "w-full resize-none rounded-2xl border border-white/10 bg-[#061632]/80 px-4 py-3 text-xs leading-5 text-white outline-none transition placeholder:text-white/26 focus:border-amber-200/30";

const primaryButton =
  "mt-6 min-h-11 rounded-full border border-amber-200/22 bg-amber-300/10 px-6 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-38";
