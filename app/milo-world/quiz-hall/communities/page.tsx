"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CreatorClubsLockedScreen from "@/components/milo/CreatorClubsLockedScreen";
import CreatorDiscoveryAdminPanel from "@/components/milo/CreatorDiscoveryAdminPanel";
import {
  getMiloQuizHallCreatorClubsAccess,
  type MiloQuizHallCreatorClubsAccess,
} from "@/lib/milo-quiz-hall-access";
import {
  creatorSlugify,
  getMyCreatorIdentity,
  getMyOwnedCreatorClubs,
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
};

type ViewMode = "discover" | "my" | "create";

const INTERESTS = [
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

const EMPTY_CLUB = {
  name: "",
  slug: "",
  topic: INTERESTS[0],
  tagline: "",
  description: "",
  logoImageUrl: "",
  coverImageUrl: "",
};

export default function CreatorClubsPage() {
  const router = useRouter();

  const [clubs, setClubs] = useState<ClubDirectoryRow[]>([]);
  const [discoverableClubs, setDiscoverableClubs] = useState<ClubDirectoryRow[]>([]);
  const [ownedClubs, setOwnedClubs] = useState<OwnedCreatorClub[]>([]);
  const [discoveryRows, setDiscoveryRows] = useState<DiscoveryRow[]>([]);
  const [creator, setCreator] = useState<CreatorIdentity | null>(null);
  const [hallAccess, setHallAccess] =
    useState<MiloQuizHallCreatorClubsAccess | null>(null);

  const [view, setView] = useState<ViewMode>("discover");
  const [search, setSearch] = useState("");
  const [interest, setInterest] = useState("All");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
      setOwnedClubs([]);
      setDiscoveryRows([]);
      setCreator(null);
      setIsLoading(false);
      return;
    }

    const userResponse = await supabase.auth.getUser();
    const user = userResponse.data.user;
    setIsAuthenticated(Boolean(user));

    const [clubsResponse, discoverableResponse, discoveryResponse] =
      await Promise.all([
        supabase.rpc("get_creator_club_directory"),
        supabase.rpc("get_creator_discovery_directory_v1"),
        supabase.rpc("get_creator_discovery_sections_v1"),
      ]);

    if (clubsResponse.error) {
      setClubs([]);
      setErrorMessage(
        clubsResponse.error.message || "Creator Clubs could not be loaded.",
      );
    } else {
      setClubs(
        ((clubsResponse.data || []) as ClubDirectoryRow[]).map((club) => ({
          ...club,
          featured: Boolean(club.featured),
          member_count: Number(club.member_count || 0),
          is_member: Boolean(club.is_member),
        })),
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
        ((discoverableResponse.data || []) as ClubDirectoryRow[]).map((club) => ({
          ...club,
          featured: Boolean(club.featured),
          member_count: Number(club.member_count || 0),
          is_member: Boolean(club.is_member),
        })),
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
        ((discoveryResponse.data || []) as DiscoveryRow[]).map((row) => ({
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
        })),
      );
    }

    if (user) {
      const [creatorResult, ownedResult] = await Promise.all([
        getMyCreatorIdentity(),
        getMyOwnedCreatorClubs(),
      ]);

      setCreator(creatorResult.creator);
      setOwnedClubs(ownedResult.clubs);

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

    return discoverableClubs.filter((club) => {
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
  }, [discoverableClubs, interest, search]);

  const joinedClubs = clubs.filter((club) => club.is_member);

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
        "Phase 2 allows one Creator Club per creator. Open your existing club in Creator Studio.",
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

    const result = await selfCreateCreatorClub({
      name: clubForm.name,
      slug: cleanSlug,
      topic: clubForm.topic,
      tagline: clubForm.tagline,
      description: clubForm.description,
      logoImageUrl: clubForm.logoImageUrl,
      coverImageUrl: clubForm.coverImageUrl,
    });

    if (result.error) {
      setErrorMessage(result.error);
      setIsSaving(false);
      return;
    }

    setMessage(
      "Club created as a draft. Open Creator Studio to build its first challenge.",
    );
    setClubForm(EMPTY_CLUB);
    setClubSlugTouched(false);
    await loadPage();
    setIsSaving(false);
    setView("my");
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
        <header className="shrink-0 border-b border-white/8 bg-[#020711]/62 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/milo-world/quiz-hall"
                className="inline-flex min-h-[40px] shrink-0 items-center rounded-full border border-white/12 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white/62 no-underline"
              >
                ← Quiz Hall
              </Link>

              <div className="min-w-0">
                <p className="truncate text-[8px] font-black uppercase tracking-[0.18em] text-amber-100/60">
                  Milo’s Creator Economy
                </p>
                <h1 className="truncate font-serif text-2xl font-normal sm:text-3xl">
                  Creator Clubs
                </h1>
              </div>
            </div>

            {creator && ownedClubs.length > 0 && (
              <Link
                href="/milo-world/quiz-hall/creator-studio"
                className="hidden min-h-[40px] items-center rounded-full border border-amber-200/20 bg-amber-300/[0.08] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 no-underline sm:inline-flex"
              >
                Creator Studio →
              </Link>
            )}
          </div>
        </header>

        <section className="mx-auto w-full max-w-[1360px] shrink-0 px-4 pt-4 sm:px-6 sm:pt-5">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/62">
                  Know something · Build something
                </p>
                <h2 className="mt-2 max-w-3xl font-serif text-[clamp(32px,4vw,54px)] font-normal leading-[0.98]">
                  Find your people. Build something worth following.
                </h2>
                <p className="mt-3 max-w-3xl text-xs leading-6 text-white/48 sm:text-sm">
                  Join communities around the things you enjoy, compete in
                  creator challenges, or build one club of your own and grow it
                  over time.
                </p>
              </div>

              <nav className="flex shrink-0 gap-2 overflow-x-auto">
                <TopTab active={view === "discover"} onClick={() => selectView("discover")}>
                  Discover
                </TopTab>
                <TopTab active={view === "my"} onClick={() => selectView("my")}>
                  My Clubs
                </TopTab>
                <TopTab active={view === "create"} onClick={() => selectView("create")}>
                  Create
                </TopTab>
              </nav>
            </div>
          </div>
        </section>

        {(message || errorMessage) && (
          <div className="mx-auto mt-3 w-full max-w-[1360px] shrink-0 px-4 sm:px-6">
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

        <section className="dream-club-scroll mx-auto min-h-0 w-full max-w-[1360px] flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6">
          {hallAccess?.isAdmin && (
            <div className="mb-4">
              <CreatorDiscoveryAdminPanel onChanged={() => void loadPage()} />
            </div>
          )}

          {isLoading ? (
            <LoadingGrid />
          ) : view === "discover" ? (
            <DiscoverView
              clubs={filteredClubs}
              discoveryRows={discoveryRows}
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
  discoveryRows,
  search,
  interest,
  onSearch,
  onInterest,
}: {
  clubs: ClubDirectoryRow[];
  discoveryRows: DiscoveryRow[];
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
      ) : discoveryRows.length === 0 ? (
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
    </div>
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
          <div className="flex flex-wrap gap-2">
            <DiscoveryPill>{row.reason_label}</DiscoveryPill>
            <DiscoveryPill>{row.level_name}</DiscoveryPill>
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

          <span className="rounded-full border border-cyan-200/14 bg-cyan-300/[0.06] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.08em] text-cyan-100">
            {row.level_name}
          </span>
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
          <DiscoveryPill>{row.reputation_score} REP</DiscoveryPill>
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
                ? "Phase 2 gives each creator one club to build deliberately."
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

                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/8 pt-4">
                  <Link
                    href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                      club.club_slug,
                    )}`}
                    className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-4 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100 no-underline"
                  >
                    View Club
                  </Link>
                  <Link
                    href="/milo-world/quiz-hall/creator-studio"
                    className="rounded-full border border-amber-200/18 bg-amber-300/[0.07] px-4 py-2 text-[8px] font-black uppercase tracking-[0.08em] text-amber-100 no-underline"
                  >
                    Open Studio →
                  </Link>
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
  clubForm: typeof EMPTY_CLUB;
  clubSlugTouched: boolean;
  isSaving: boolean;
  setCreatorForm: React.Dispatch<React.SetStateAction<typeof EMPTY_CREATOR>>;
  setCreatorSlugTouched: React.Dispatch<React.SetStateAction<boolean>>;
  setClubForm: React.Dispatch<React.SetStateAction<typeof EMPTY_CLUB>>;
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
      <section className="mx-auto max-w-4xl rounded-[30px] border border-violet-200/14 bg-[linear-gradient(145deg,rgba(52,31,90,0.24),rgba(4,15,32,0.93))] p-6 sm:p-8">
        <StepHeader
          number="01"
          eyebrow="Creator Identity"
          title="First, decide who you are as a creator."
          text="This is the public identity attached to the challenges and club you build. It is separate from your login name."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2">
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
      <section className="mx-auto max-w-4xl rounded-[30px] border border-emerald-200/14 bg-[linear-gradient(145deg,rgba(17,71,58,0.20),rgba(4,15,32,0.93))] p-7 sm:p-9">
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
    <section className="mx-auto max-w-5xl rounded-[30px] border border-amber-200/14 bg-[linear-gradient(145deg,rgba(73,43,12,0.22),rgba(4,15,32,0.93))] p-6 sm:p-8">
      <StepHeader
        number="02"
        eyebrow={`Creator · ${creator.display_name}`}
        title="Now build your first club."
        text="Choose one subject you genuinely care about. Your first challenges, members and creator reputation will all grow from this club."
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

        <Field label="Club logo URL · optional">
          <input
            value={clubForm.logoImageUrl}
            onChange={(event) =>
              setClubForm((current) => ({
                ...current,
                logoImageUrl: event.target.value,
              }))
            }
            placeholder="https://..."
            className={inputClass}
          />
        </Field>

        <Field label="Cover image URL · optional">
          <input
            value={clubForm.coverImageUrl}
            onChange={(event) =>
              setClubForm((current) => ({
                ...current,
                coverImageUrl: event.target.value,
              }))
            }
            placeholder="https://..."
            className={inputClass}
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
          Phase 2 launch rule
        </p>
        <p className="mt-2 text-xs leading-5 text-white/46">
          Your club is created as a draft. Build its first challenge in Creator
          Studio before it is submitted for public review.
        </p>
      </div>

      <button
        type="button"
        disabled={isSaving}
        onClick={onClubSubmit}
        className={primaryButton}
      >
        {isSaving ? "Creating..." : "Create Draft Club →"}
      </button>
    </section>
  );
}

function ClubCard({ club }: { club: ClubDirectoryRow }) {
  return (
    <Link
      href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(club.club_slug)}`}
      className="group relative min-h-[250px] overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-5 text-white no-underline shadow-[0_22px_60px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-cyan-200/26"
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
        <div className="flex items-start gap-3">
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

function TopTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full border px-4 text-[8px] font-black uppercase tracking-[0.1em] transition ${
        active
          ? "border-amber-200/24 bg-amber-300/[0.09] text-amber-100"
          : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white/70"
      }`}
    >
      {children}
    </button>
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
