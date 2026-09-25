"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorClubsLockedScreen from "@/components/milo/CreatorClubsLockedScreen";
import CreatorReputationBadge from "@/components/milo/CreatorReputationBadge";
import CreatorClubLevelBadge from "@/components/milo/creator-engine/CreatorClubLevelBadge";
import CreatorClubProgressionCard, {
  normalizeClubProgressionPayload,
  type ClubProgressionPayload,
} from "@/components/milo/creator-engine/CreatorClubProgressionCard";
import {
  getMiloQuizHallCreatorClubsAccess,
  type MiloQuizHallCreatorClubsAccess,
} from "@/lib/milo-quiz-hall-access";

type ClubDetail = {
  club_id: string;
  club_slug: string;
  club_name: string;
  topic: string | null;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  featured: boolean;
  creator_slug: string;
  creator_display_name: string;
  creator_profile_image_url: string | null;
  creator_bio: string | null;
  member_count: number;
  is_member: boolean;
  joined_at: string | null;
  created_at: string;
};

type QuizCatalogRow = {
  quiz_id: string;
  quiz_slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  total_completed_attempts: number;
  user_attempt_count: number;
  user_best_percent: number;
  user_best_points: number;
  challenge_id: string | null;
  challenge_ends_at: string | null;
  is_current_challenge: boolean;
};

type ClubLeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  quizzes_completed: number;
  total_points: number;
  average_percent: number;
  last_completed_at: string | null;
};

type ChallengeLeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  score_percent: number;
  total_points: number;
  total_response_time_ms: number;
  completed_at: string | null;
};

type HistoryRow = {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  attempt_number: number;
  correct_count: number;
  score_percent: number;
  total_points: number;
  question_timer_seconds: number;
  completed_at: string | null;
};

type ChallengeCycle = {
  club_id: string;
  quiz_id: string;
  starts_at: string;
  ends_at: string;
  difficulty: number;
  attempt_mode: "best_score";
  lifecycle_status: "scheduled" | "live" | "ended";
};

type PlayRoomAccess = {
  club_id: string;
  club_slug: string;
  club_name: string;
  member_count: number;
  unlock_threshold: number;
  size_eligible: boolean;
  member_hosting_enabled: boolean;
  is_member: boolean;
  is_owner: boolean;
  is_admin: boolean;
  can_host: boolean;
  can_enter_rooms: boolean;
  open_room_count: number;
};

type ClubPulseNotice = {
  type: string;
  title: string;
  text: string;
  priority: "high" | "normal" | "low";
};

type RoomProgressRow = {
  user_id: string;
  display_name: string;
  room_xp: number;
  rooms_completed: number;
  wins: number;
  last_played_at: string | null;
};

type ClubTab = "home" | "challenges" | "rankings" | "about";

type MemberProgress = {
  xp: number;
  levelName: string;
  nextLevelName: string | null;
  nextLevelXp: number | null;
  progressPercent: number;
  challengesCompleted: number;
  totalPoints: number;
};

const MEMBER_LEVELS = [
  { name: "Newcomer", xp: 0 },
  { name: "Regular", xp: 300 },
  { name: "Challenger", xp: 900 },
  { name: "Expert", xp: 2000 },
  { name: "Club Legend", xp: 4500 },
] as const;

function formatEnd(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatSpeed(ms: number) {
  if (!ms || ms <= 0) return "—";
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

function challengeCountdown(endsAt: string | null) {
  if (!endsAt) return "";
  const remaining = new Date(endsAt).getTime() - Date.now();
  if (remaining <= 0) return "Ended";
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  if (hours < 24) return `${Math.max(1, hours)}h left`;
  const days = Math.ceil(hours / 24);
  return `${days}d left`;
}

function clubXp(challengesCompleted: number, totalPoints: number) {
  return Math.max(
    0,
    Math.round(Number(totalPoints || 0) + Number(challengesCompleted || 0) * 100),
  );
}

function getMemberProgress(
  challengesCompleted: number,
  totalPoints: number,
): MemberProgress {
  const xp = clubXp(challengesCompleted, totalPoints);
  let levelIndex = 0;

  for (let index = 0; index < MEMBER_LEVELS.length; index += 1) {
    if (xp >= MEMBER_LEVELS[index].xp) levelIndex = index;
  }

  const level = MEMBER_LEVELS[levelIndex];
  const next = MEMBER_LEVELS[levelIndex + 1] || null;

  const progressPercent = next
    ? Math.max(
        0,
        Math.min(
          100,
          ((xp - level.xp) / Math.max(1, next.xp - level.xp)) * 100,
        ),
      )
    : 100;

  return {
    xp,
    levelName: level.name,
    nextLevelName: next?.name || null,
    nextLevelXp: next?.xp || null,
    progressPercent,
    challengesCompleted,
    totalPoints,
  };
}

function milestoneState(value: number, targets: number[]) {
  const reached = targets.filter((target) => value >= target);
  const next = targets.find((target) => value < target) || null;
  const previous = reached.length ? reached[reached.length - 1] : 0;

  return {
    reached,
    next,
    progress:
      next === null
        ? 100
        : Math.max(
            0,
            Math.min(100, ((value - previous) / Math.max(1, next - previous)) * 100),
          ),
  };
}

export default function CreatorClubPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = decodeURIComponent(String(params?.slug || ""));

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [quizzes, setQuizzes] = useState<QuizCatalogRow[]>([]);
  const [clubLeaderboard, setClubLeaderboard] = useState<ClubLeaderboardRow[]>([]);
  const [challengeLeaderboard, setChallengeLeaderboard] =
    useState<ChallengeLeaderboardRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [cycle, setCycle] = useState<ChallengeCycle | null>(null);
  const [playRoomAccess, setPlayRoomAccess] =
    useState<PlayRoomAccess | null>(null);
  const [pulseNotices, setPulseNotices] = useState<ClubPulseNotice[]>([]);
  const [clubProgression, setClubProgression] =
    useState<ClubProgressionPayload | null>(null);
  const [hallAccess, setHallAccess] =
    useState<MiloQuizHallCreatorClubsAccess | null>(null);
  const [userId, setUserId] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tab, setTab] = useState<ClubTab>("home");

  const cycleQuiz = useMemo(
    () =>
      cycle
        ? quizzes.find((quiz) => String(quiz.quiz_id) === String(cycle.quiz_id)) ||
          null
        : null,
    [cycle, quizzes],
  );

  const currentChallenge =
    cycle?.lifecycle_status === "live" ? cycleQuiz : null;
  const scheduledChallenge =
    cycle?.lifecycle_status === "scheduled" ? cycleQuiz : null;

  const totalChallengeCompletions = useMemo(
    () =>
      quizzes.reduce(
        (sum, quiz) => sum + Number(quiz.total_completed_attempts || 0),
        0,
      ),
    [quizzes],
  );

  const myClubLeaderboardRow = useMemo(
    () => clubLeaderboard.find((row) => row.user_id === userId) || null,
    [clubLeaderboard, userId],
  );

  const myChallengeLeaderboardRow = useMemo(
    () => challengeLeaderboard.find((row) => row.user_id === userId) || null,
    [challengeLeaderboard, userId],
  );

  const myProgress = useMemo(() => {
    if (myClubLeaderboardRow) {
      return getMemberProgress(
        myClubLeaderboardRow.quizzes_completed,
        myClubLeaderboardRow.total_points,
      );
    }

    if (history.length === 0) {
      return getMemberProgress(0, 0);
    }

    const bestByQuiz = new Map<string, number>();
    for (const attempt of history) {
      const currentBest = bestByQuiz.get(attempt.quiz_id) || 0;
      bestByQuiz.set(
        attempt.quiz_id,
        Math.max(currentBest, Number(attempt.total_points || 0)),
      );
    }

    return getMemberProgress(
      bestByQuiz.size,
      [...bestByQuiz.values()].reduce((sum, points) => sum + points, 0),
    );
  }, [history, myClubLeaderboardRow]);

  useEffect(() => {
    const oldBody = document.body.style.overflow;
    const oldHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    void loadClub();

    const refreshCycle = () => void loadCycleOnly();
    window.addEventListener("creator-phase3-cycle-updated", refreshCycle);

    return () => {
      document.body.style.overflow = oldBody;
      document.documentElement.style.overflow = oldHtml;
      window.removeEventListener("creator-phase3-cycle-updated", refreshCycle);
    };
  }, [slug]);

  async function loadCycleOnly() {
    if (!club?.club_id) return;
    const { data, error } = await supabase.rpc(
      "get_creator_phase3_challenge_cycle",
      { p_club_id: String(club.club_id) },
    );

    if (error) return;
    const row = Array.isArray(data) ? data[0] : data;
    setCycle(
      row
        ? {
            ...(row as ChallengeCycle),
            difficulty: Number(row.difficulty || 2),
          }
        : null,
    );
  }

  async function loadClub() {
    if (!slug) return;
    setIsLoading(true);
    setErrorMessage("");

    const accessResult = await getMiloQuizHallCreatorClubsAccess();
    setHallAccess(accessResult.access);

    if (!accessResult.access.canAccess) {
      setClub(null);
      setIsLoading(false);
      return;
    }

    const userResponse = await supabase.auth.getUser();
    const currentUser = userResponse.data.user;
    setUserId(currentUser?.id || "");
    setIsAuthenticated(Boolean(currentUser));

    const clubResponse = await supabase.rpc("get_creator_club_by_slug", {
      p_slug: slug,
    });

    if (clubResponse.error) {
      setErrorMessage(
        clubResponse.error.message || "This Creator Club could not be loaded.",
      );
      setClub(null);
      setIsLoading(false);
      return;
    }

    const raw = Array.isArray(clubResponse.data)
      ? clubResponse.data[0]
      : clubResponse.data;

    if (!raw) {
      setClub(null);
      setIsLoading(false);
      return;
    }

    const nextClub: ClubDetail = {
      ...(raw as ClubDetail),
      club_id: String(raw.club_id),
      featured: Boolean(raw.featured),
      member_count: Number(raw.member_count || 0),
      is_member: Boolean(raw.is_member),
    };

    const moderationResponse = await supabase.rpc(
      "get_creator_public_moderation_v1",
      { p_creator_slug: nextClub.creator_slug },
    );

    const moderationRow = Array.isArray(moderationResponse.data)
      ? moderationResponse.data[0]
      : moderationResponse.data;

    if (
      !moderationResponse.error &&
      moderationRow &&
      !Boolean(moderationRow.direct_access_allowed) &&
      !accessResult.access.isAdmin
    ) {
      setClub(null);
      setErrorMessage("This creator is currently paused.");
      setIsLoading(false);
      return;
    }

    setClub(nextClub);

    const [
      quizResponse,
      leaderboardResponse,
      historyResponse,
      cycleResponse,
      v2PlayCountsResponse,
      v2LeaderboardResponse,
      v2HistoryResponse,
      playAccessResponse,
      pulseResponse,
      roomProgressResponse,
      progressionResponse,
    ] = await Promise.all([
      supabase.rpc("get_creator_club_quiz_catalog", { p_club_slug: slug }),
      supabase.rpc("get_creator_club_leaderboard", {
        p_club_id: nextClub.club_id,
        p_limit: 100,
      }),
      currentUser
        ? supabase.rpc("get_my_creator_quiz_history", {
            p_club_id: nextClub.club_id,
          })
        : Promise.resolve({ data: [], error: null }),
      supabase.rpc("get_creator_phase3_challenge_cycle", {
        p_club_id: nextClub.club_id,
      }),
      supabase.rpc("get_creator_engine_play_counts_v2", {
        p_club_id: nextClub.club_id,
      }),
      supabase.rpc("get_creator_engine_club_leaderboard_v2", {
        p_club_id: nextClub.club_id,
        p_limit: 100,
      }),
      currentUser
        ? supabase.rpc("get_my_creator_engine_history_v2", {
            p_club_id: nextClub.club_id,
          })
        : Promise.resolve({ data: [], error: null }),
      supabase.rpc("get_creator_club_play_access_v2", {
        p_club_slug: slug,
      }),
      supabase.rpc("get_creator_club_pulse_v2", {
        p_club_slug: slug,
      }),
      supabase.rpc("get_creator_club_room_progress_v2", {
        p_club_id: nextClub.club_id,
      }),
      supabase.rpc("get_creator_club_progression_v1", {
        p_club_slug: slug,
      }),
    ]);

    const v2HistoryRows = v2HistoryResponse.error
      ? []
      : ((v2HistoryResponse.data || []) as HistoryRow[]).map((row) => ({
          ...row,
          attempt_id: String(row.attempt_id),
          quiz_id: String(row.quiz_id),
          attempt_number: Number(row.attempt_number || 0),
          correct_count: Number(row.correct_count || 0),
          score_percent: Number(row.score_percent || 0),
          total_points: Number(row.total_points || 0),
          question_timer_seconds: Number(row.question_timer_seconds || 0),
        }));

    const v2Counts = new Map(
      v2PlayCountsResponse.error
        ? []
        : ((v2PlayCountsResponse.data || []) as {
            quiz_id: string;
            completed_attempts: number;
          }[]).map((row) => [
            String(row.quiz_id),
            Number(row.completed_attempts || 0),
          ]),
    );

    const myV2ByQuiz = new Map<
      string,
      { attempts: number; bestPercent: number; bestPoints: number }
    >();

    for (const attempt of v2HistoryRows) {
      const current = myV2ByQuiz.get(attempt.quiz_id) || {
        attempts: 0,
        bestPercent: 0,
        bestPoints: 0,
      };

      current.attempts += 1;
      current.bestPercent = Math.max(
        current.bestPercent,
        Number(attempt.score_percent || 0),
      );
      current.bestPoints = Math.max(
        current.bestPoints,
        Number(attempt.total_points || 0),
      );
      myV2ByQuiz.set(attempt.quiz_id, current);
    }

    if (quizResponse.error) {
      setQuizzes([]);
      setErrorMessage(
        quizResponse.error.message || "Could not load creator challenges.",
      );
    } else {
      setQuizzes(
        ((quizResponse.data || []) as QuizCatalogRow[]).map((quiz) => {
          const quizId = String(quiz.quiz_id);
          const myV2 = myV2ByQuiz.get(quizId);

          return {
            ...quiz,
            quiz_id: quizId,
            total_completed_attempts:
              Number(quiz.total_completed_attempts || 0) +
              Number(v2Counts.get(quizId) || 0),
            user_attempt_count:
              Number(quiz.user_attempt_count || 0) +
              Number(myV2?.attempts || 0),
            user_best_percent: Math.max(
              Number(quiz.user_best_percent || 0),
              Number(myV2?.bestPercent || 0),
            ),
            user_best_points: Math.max(
              Number(quiz.user_best_points || 0),
              Number(myV2?.bestPoints || 0),
            ),
            is_current_challenge: false,
          };
        }),
      );
    }

    if (!progressionResponse.error && progressionResponse.data) {
      setClubProgression(
        normalizeClubProgressionPayload(progressionResponse.data),
      );
    } else {
      setClubProgression(null);
    }

    if (!playAccessResponse.error) {
      const row = Array.isArray(playAccessResponse.data)
        ? playAccessResponse.data[0]
        : playAccessResponse.data;

      setPlayRoomAccess(
        row
          ? {
              ...(row as PlayRoomAccess),
              member_count: Number(row.member_count || 0),
              unlock_threshold: Number(row.unlock_threshold || 100),
              size_eligible: Boolean(row.size_eligible),
              member_hosting_enabled: Boolean(row.member_hosting_enabled),
              is_member: Boolean(row.is_member),
              is_owner: Boolean(row.is_owner),
              is_admin: Boolean(row.is_admin),
              can_host: Boolean(row.can_host),
              can_enter_rooms: Boolean(row.can_enter_rooms),
              open_room_count: Number(row.open_room_count || 0),
            }
          : null,
      );
    } else {
      setPlayRoomAccess(null);
    }

    if (!pulseResponse.error && pulseResponse.data) {
      const payload = pulseResponse.data as unknown as {
        notices?: ClubPulseNotice[];
      };
      setPulseNotices(
        ((payload.notices || []) as ClubPulseNotice[]).map((notice) => ({
          ...notice,
          type: String(notice.type || ""),
          title: String(notice.title || ""),
          text: String(notice.text || ""),
          priority:
            notice.priority === "high" || notice.priority === "low"
              ? notice.priority
              : "normal",
        })),
      );
    } else {
      setPulseNotices([]);
    }

    const roomProgressRows = roomProgressResponse.error
      ? []
      : ((roomProgressResponse.data || []) as RoomProgressRow[]).map((row) => ({
          ...row,
          user_id: String(row.user_id),
          display_name: String(row.display_name || "Player"),
          room_xp: Number(row.room_xp || 0),
          rooms_completed: Number(row.rooms_completed || 0),
          wins: Number(row.wins || 0),
          last_played_at: row.last_played_at
            ? String(row.last_played_at)
            : null,
        }));

    const oldLeaderboardRows = leaderboardResponse.error
      ? []
      : ((leaderboardResponse.data || []) as ClubLeaderboardRow[]).map(
          (row) => ({
            ...row,
            user_id: String(row.user_id),
            rank: Number(row.rank || 0),
            quizzes_completed: Number(row.quizzes_completed || 0),
            total_points: Number(row.total_points || 0),
            average_percent: Number(row.average_percent || 0),
          }),
        );

    const v2LeaderboardRows = v2LeaderboardResponse.error
      ? []
      : ((v2LeaderboardResponse.data || []) as ClubLeaderboardRow[]).map(
          (row) => ({
            ...row,
            user_id: String(row.user_id),
            rank: Number(row.rank || 0),
            quizzes_completed: Number(row.quizzes_completed || 0),
            total_points: Number(row.total_points || 0),
            average_percent: Number(row.average_percent || 0),
          }),
        );

    const combinedLeaderboard = new Map<string, ClubLeaderboardRow>();

    for (const row of [...oldLeaderboardRows, ...v2LeaderboardRows]) {
      const existing = combinedLeaderboard.get(row.user_id);

      if (!existing) {
        combinedLeaderboard.set(row.user_id, { ...row });
        continue;
      }

      const oldQuizCount = Number(existing.quizzes_completed || 0);
      const addedQuizCount = Number(row.quizzes_completed || 0);
      const totalQuizCount = oldQuizCount + addedQuizCount;

      combinedLeaderboard.set(row.user_id, {
        ...existing,
        display_name: row.display_name || existing.display_name,
        quizzes_completed: totalQuizCount,
        total_points:
          Number(existing.total_points || 0) +
          Number(row.total_points || 0),
        average_percent:
          totalQuizCount > 0
            ? (
                (Number(existing.average_percent || 0) * oldQuizCount +
                  Number(row.average_percent || 0) * addedQuizCount) /
                totalQuizCount
              )
            : 0,
        last_completed_at:
          !existing.last_completed_at
            ? row.last_completed_at
            : !row.last_completed_at
              ? existing.last_completed_at
              : new Date(existing.last_completed_at).getTime() >=
                    new Date(row.last_completed_at).getTime()
                ? existing.last_completed_at
                : row.last_completed_at,
      });
    }

    for (const roomRow of roomProgressRows) {
      const existing = combinedLeaderboard.get(roomRow.user_id);

      if (!existing) {
        combinedLeaderboard.set(roomRow.user_id, {
          rank: 0,
          user_id: roomRow.user_id,
          display_name: roomRow.display_name,
          quizzes_completed: 0,
          total_points: roomRow.room_xp,
          average_percent: 0,
          last_completed_at: roomRow.last_played_at,
        });
        continue;
      }

      combinedLeaderboard.set(roomRow.user_id, {
        ...existing,
        display_name: existing.display_name || roomRow.display_name,
        total_points:
          Number(existing.total_points || 0) + roomRow.room_xp,
        last_completed_at:
          !existing.last_completed_at
            ? roomRow.last_played_at
            : !roomRow.last_played_at
              ? existing.last_completed_at
              : new Date(existing.last_completed_at).getTime() >=
                    new Date(roomRow.last_played_at).getTime()
                ? existing.last_completed_at
                : roomRow.last_played_at,
      });
    }

    const rankedCombined = [...combinedLeaderboard.values()]
      .sort((a, b) => {
        const pointDelta =
          Number(b.total_points || 0) - Number(a.total_points || 0);
        if (pointDelta !== 0) return pointDelta;

        const averageDelta =
          Number(b.average_percent || 0) -
          Number(a.average_percent || 0);
        if (averageDelta !== 0) return averageDelta;

        return (
          new Date(a.last_completed_at || "9999-12-31").getTime() -
          new Date(b.last_completed_at || "9999-12-31").getTime()
        );
      })
      .slice(0, 100)
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));

    setClubLeaderboard(rankedCombined);

    const oldHistoryRows = historyResponse.error
      ? []
      : ((historyResponse.data || []) as HistoryRow[]).map((row) => ({
          ...row,
          attempt_id: String(row.attempt_id),
          quiz_id: String(row.quiz_id),
          attempt_number: Number(row.attempt_number || 0),
          correct_count: Number(row.correct_count || 0),
          score_percent: Number(row.score_percent || 0),
          total_points: Number(row.total_points || 0),
          question_timer_seconds: Number(row.question_timer_seconds || 10),
        }));

    setHistory(
      [...oldHistoryRows, ...v2HistoryRows]
        .sort(
          (a, b) =>
            new Date(b.completed_at || 0).getTime() -
            new Date(a.completed_at || 0).getTime(),
        )
        .slice(0, 100),
    );

    if (!cycleResponse.error) {
      const cycleRow = Array.isArray(cycleResponse.data)
        ? cycleResponse.data[0]
        : cycleResponse.data;

      setCycle(
        cycleRow
          ? {
              ...(cycleRow as ChallengeCycle),
              quiz_id: String(cycleRow.quiz_id),
              difficulty: Number(cycleRow.difficulty || 2),
            }
          : null,
      );
    } else {
      setCycle(null);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    async function loadChallengeLeaderboard() {
      if (
        !cycleQuiz ||
        !cycle ||
        cycle.lifecycle_status !== "live" ||
        !cycleQuiz.challenge_id
      ) {
        setChallengeLeaderboard([]);
        return;
      }

      const [legacyResponse, v2Response] = await Promise.all([
        supabase.rpc("get_creator_challenge_leaderboard", {
          p_challenge_id: cycleQuiz.challenge_id,
          p_limit: 100,
        }),
        supabase.rpc("get_creator_engine_challenge_leaderboard_v2", {
          p_challenge_id: cycleQuiz.challenge_id,
          p_limit: 100,
        }),
      ]);

      const candidates = [
        ...(legacyResponse.error ? [] : (legacyResponse.data || [])),
        ...(v2Response.error ? [] : (v2Response.data || [])),
      ].map((row) => ({
        ...(row as ChallengeLeaderboardRow),
        user_id: String((row as ChallengeLeaderboardRow).user_id),
        rank: Number((row as ChallengeLeaderboardRow).rank || 0),
        score_percent: Number(
          (row as ChallengeLeaderboardRow).score_percent || 0,
        ),
        total_points: Number(
          (row as ChallengeLeaderboardRow).total_points || 0,
        ),
        total_response_time_ms: Number(
          (row as ChallengeLeaderboardRow).total_response_time_ms || 0,
        ),
      }));

      const bestByUser = new Map<string, ChallengeLeaderboardRow>();

      for (const row of candidates) {
        const existing = bestByUser.get(row.user_id);

        if (
          !existing ||
          row.total_points > existing.total_points ||
          (row.total_points === existing.total_points &&
            row.score_percent > existing.score_percent) ||
          (row.total_points === existing.total_points &&
            row.score_percent === existing.score_percent &&
            row.total_response_time_ms <
              existing.total_response_time_ms)
        ) {
          bestByUser.set(row.user_id, row);
        }
      }

      setChallengeLeaderboard(
        [...bestByUser.values()]
          .sort((a, b) => {
            if (b.total_points !== a.total_points) {
              return b.total_points - a.total_points;
            }
            if (b.score_percent !== a.score_percent) {
              return b.score_percent - a.score_percent;
            }
            return (
              a.total_response_time_ms - b.total_response_time_ms
            );
          })
          .slice(0, 100)
          .map((row, index) => ({ ...row, rank: index + 1 })),
      );
    }

    void loadChallengeLeaderboard();
  }, [cycle?.lifecycle_status, cycleQuiz?.challenge_id]);

  async function joinClub() {
    if (!club) return;

    if (!isAuthenticated) {
      const next = `/milo-world/quiz-hall/clubs/${encodeURIComponent(
        club.club_slug,
      )}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc("join_creator_club", {
      p_club_id: club.club_id,
    });

    if (error) {
      setErrorMessage(error.message || "The club could not be joined.");
      setIsSaving(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setMessage(
      row?.result_code === "already_member"
        ? "You are already a member."
        : `You joined ${club.club_name}.`,
    );
    await loadClub();
    setIsSaving(false);
  }

  async function leaveClub() {
    if (!club) return;
    if (!window.confirm(`Leave ${club.club_name}?`)) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("leave_creator_club", {
      p_club_id: club.club_id,
    });

    if (error) {
      setErrorMessage(error.message || "The club could not be left.");
    } else {
      setMessage(`You left ${club.club_name}.`);
    }

    await loadClub();
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/56">
        Opening Creator Club...
      </main>
    );
  }

  if (hallAccess && !hallAccess.canAccess) {
    return <CreatorClubsLockedScreen />;
  }

  if (!club) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.045] p-7 text-center">
          <h1 className="text-3xl font-black">Club unavailable</h1>
          <p className="mt-3 text-sm text-white/48">
            {errorMessage || "This Creator Club is not currently public."}
          </p>
          <Link
            href="/milo-world/quiz-hall/communities"
            className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100 no-underline"
          >
            Browse Creator Clubs
          </Link>
        </section>
      </main>
    );
  }

  const canPlay = Boolean(hallAccess?.isAdmin || club.is_member);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <img
        src={club.cover_image_url || "/milo-world/quiz-hall/quiz-hall-bg.png"}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-[0.20]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(251,191,36,0.10),transparent_28%),linear-gradient(180deg,rgba(2,7,17,0.80),rgba(2,7,17,0.97)_44%,#020711)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/8 bg-[#020711]/68 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/milo-world/quiz-hall/communities"
                className="inline-flex min-h-[40px] shrink-0 items-center rounded-full border border-white/12 bg-white/[0.035] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white/60 no-underline"
              >
                ← Creator Clubs
              </Link>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-[8px] font-black uppercase tracking-[0.15em] text-amber-100/58">
                  {club.topic || "Creator Club"}
                </p>
                <strong className="block truncate text-sm text-white/76">
                  {club.club_name}
                </strong>
              </div>
            </div>

            {hallAccess?.isAdmin && !hallAccess.publicAccessEnabled && (
              <span className="rounded-full border border-violet-200/18 bg-violet-400/[0.08] px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-violet-100">
                Admin Preview
              </span>
            )}
          </div>
        </header>

        <section className="club-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6 sm:pt-5">
          <div className="mx-auto w-full max-w-[1380px]">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
              <article className="relative overflow-hidden rounded-[30px] border border-white/11 bg-[#061222]/82 p-6 shadow-[0_26px_80px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-amber-200/18 bg-amber-300/[0.08] text-2xl font-black text-amber-100">
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
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/64">
                      {club.topic || "Creator Club"} · by{" "}
                      <Link
                        href={`/milo-world/quiz-hall/creators/${encodeURIComponent(
                          club.creator_slug,
                        )}`}
                        className="text-amber-100 underline decoration-amber-100/24 underline-offset-2"
                      >
                        {club.creator_display_name}
                      </Link>
                    </p>
                    <h1 className="mt-2 font-serif text-[clamp(38px,5vw,64px)] font-normal leading-[0.94]">
                      {club.club_name}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <CreatorReputationBadge creatorSlug={club.creator_slug} />
                      {clubProgression && (
                        <CreatorClubLevelBadge
                          levelNumber={clubProgression.level_number}
                          levelName={clubProgression.level_name}
                          score={clubProgression.progression_score}
                        />
                      )}
                    </div>
                    {club.tagline && (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/56">
                        {club.tagline}
                      </p>
                    )}
                  </div>
                </div>
              </article>

              <aside className="rounded-[30px] border border-emerald-200/13 bg-[linear-gradient(180deg,rgba(18,76,62,0.18),rgba(4,18,34,0.90))] p-5 backdrop-blur-xl">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-emerald-100/62">
                  Community
                </p>
                <strong className="mt-2 block text-4xl text-emerald-100">
                  {club.member_count.toLocaleString()}
                </strong>
                <span className="text-[10px] text-white/38">
                  member{club.member_count === 1 ? "" : "s"}
                </span>

                {message && (
                  <p className="mt-3 rounded-xl border border-emerald-200/14 bg-emerald-400/[0.07] px-3 py-2 text-[10px] text-emerald-100">
                    {message}
                  </p>
                )}
                {errorMessage && (
                  <p className="mt-3 rounded-xl border border-red-200/14 bg-red-400/[0.07] px-3 py-2 text-[10px] text-red-100">
                    {errorMessage}
                  </p>
                )}

                {hallAccess?.isAdmin ? (
                  <div className="mt-4 rounded-xl border border-violet-200/14 bg-violet-400/[0.07] px-3 py-3 text-center text-[9px] font-black uppercase tracking-[0.09em] text-violet-100">
                    Admin Preview Access
                  </div>
                ) : club.is_member ? (
                  <>
                    <MemberProgressCard progress={myProgress} />
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void leaveClub()}
                      className="mt-2 min-h-10 w-full rounded-full border border-white/10 bg-white/[0.035] text-[8px] font-black uppercase tracking-[0.09em] text-white/42 disabled:opacity-40"
                    >
                      Leave Club
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void joinClub()}
                    className="mt-4 min-h-11 w-full rounded-full border border-emerald-200/22 bg-emerald-400/10 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100 disabled:opacity-40"
                  >
                    {isAuthenticated ? "Join Club — Free" : "Log In to Join"}
                  </button>
                )}

                {playRoomAccess && (
                  <div className="mt-4 border-t border-white/8 pt-4">
                    <p className="text-[7px] font-black uppercase tracking-[0.10em] text-fuchsia-100/52">
                      Club Play Rooms
                    </p>

                    {playRoomAccess.size_eligible &&
                    playRoomAccess.member_hosting_enabled &&
                    playRoomAccess.can_enter_rooms ? (
                      <Link
                        href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                          club.club_slug,
                        )}/play-rooms`}
                        className="mt-2 flex min-h-11 items-center justify-between rounded-xl border border-fuchsia-200/16 bg-fuchsia-300/[0.055] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-fuchsia-100 no-underline"
                      >
                        <span>Enter Play Rooms</span>
                        <span>
                          {playRoomAccess.open_room_count > 0
                            ? `${playRoomAccess.open_room_count} open`
                            : "→"}
                        </span>
                      </Link>
                    ) : (
                      <div className="mt-2 rounded-xl border border-white/8 bg-black/12 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[9px] font-bold text-white/42">
                            {playRoomAccess.size_eligible
                              ? "100-member milestone reached"
                              : `${playRoomAccess.member_count}/${playRoomAccess.unlock_threshold} members`}
                          </span>
                          <span className="text-[8px] font-black text-fuchsia-100/50">
                            {playRoomAccess.size_eligible
                              ? "Creator setup"
                              : "Locked"}
                          </span>
                        </div>
                        {!playRoomAccess.size_eligible && (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className="h-full rounded-full bg-fuchsia-200/65"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    (playRoomAccess.member_count /
                                      Math.max(
                                        1,
                                        playRoomAccess.unlock_threshold,
                                      )) *
                                      100,
                                  ),
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </aside>
            </section>

            <nav className="mt-4 flex gap-2 overflow-x-auto rounded-[22px] border border-white/8 bg-white/[0.025] p-2 backdrop-blur-xl">
              <ClubTabButton active={tab === "home"} onClick={() => setTab("home")}>
                Home
              </ClubTabButton>
              <ClubTabButton
                active={tab === "challenges"}
                onClick={() => setTab("challenges")}
              >
                Challenges
              </ClubTabButton>
              <ClubTabButton
                active={tab === "rankings"}
                onClick={() => setTab("rankings")}
              >
                Rankings
              </ClubTabButton>
              <ClubTabButton active={tab === "about"} onClick={() => setTab("about")}>
                About
              </ClubTabButton>
            </nav>

            <div className="mt-4">
              {tab === "home" && (
                <HomeTab
                  club={club}
                  quizzes={quizzes}
                  cycle={cycle}
                  currentChallenge={currentChallenge}
                  scheduledChallenge={scheduledChallenge}
                  challengeLeaderboard={challengeLeaderboard}
                  clubLeaderboard={clubLeaderboard}
                  totalChallengeCompletions={totalChallengeCompletions}
                  canPlay={canPlay}
                  userId={userId}
                  myProgress={myProgress}
                  pulseNotices={pulseNotices}
                  clubProgression={clubProgression}
                  onJoin={() => void joinClub()}
                />
              )}

              {tab === "challenges" && (
                <ChallengesTab
                  club={club}
                  quizzes={quizzes}
                  cycle={cycle}
                  canPlay={canPlay}
                  onJoin={() => void joinClub()}
                />
              )}

              {tab === "rankings" && (
                <RankingsTab
                  cycle={cycle}
                  currentChallenge={currentChallenge}
                  challengeLeaderboard={challengeLeaderboard}
                  clubLeaderboard={clubLeaderboard}
                  history={history}
                  userId={userId}
                  myClubRow={myClubLeaderboardRow}
                  myChallengeRow={myChallengeLeaderboardRow}
                  myProgress={myProgress}
                />
              )}

              {tab === "about" && <AboutTab club={club} />}
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .club-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(126, 232, 255, 0.24)
            rgba(255, 255, 255, 0.035);
        }
        .club-scroll::-webkit-scrollbar {
          width: 7px;
        }
        .club-scroll::-webkit-scrollbar-thumb {
          background: rgba(126, 232, 255, 0.24);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}

function HomeTab({
  club,
  quizzes,
  cycle,
  currentChallenge,
  scheduledChallenge,
  challengeLeaderboard,
  clubLeaderboard,
  totalChallengeCompletions,
  canPlay,
  userId,
  myProgress,
  pulseNotices,
  clubProgression,
  onJoin,
}: {
  club: ClubDetail;
  quizzes: QuizCatalogRow[];
  cycle: ChallengeCycle | null;
  currentChallenge: QuizCatalogRow | null;
  scheduledChallenge: QuizCatalogRow | null;
  challengeLeaderboard: ChallengeLeaderboardRow[];
  clubLeaderboard: ClubLeaderboardRow[];
  totalChallengeCompletions: number;
  canPlay: boolean;
  userId: string;
  myProgress: MemberProgress;
  pulseNotices: ClubPulseNotice[];
  clubProgression: ClubProgressionPayload | null;
  onJoin: () => void;
}) {
  const memberMilestone = milestoneState(
    club.member_count,
    [10, 25, 50, 100, 250, 500, 1000],
  );
  const playMilestone = milestoneState(
    totalChallengeCompletions,
    [25, 100, 250, 500, 1000, 2500, 5000],
  );

  const recentChallenges = [...quizzes]
    .filter((quiz) => quiz.published_at)
    .sort(
      (a, b) =>
        new Date(b.published_at || 0).getTime() -
        new Date(a.published_at || 0).getTime(),
    )
    .slice(0, 3);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {pulseNotices.length > 0 && (
          <ClubPulse notices={pulseNotices} />
        )}

        {currentChallenge && cycle ? (
          <section className="relative overflow-hidden rounded-[28px] border border-amber-200/18 bg-[linear-gradient(135deg,rgba(104,60,12,0.26),rgba(30,17,4,0.52))] p-5 backdrop-blur-xl sm:p-6">
            {currentChallenge.cover_image_url && (
              <img
                src={currentChallenge.cover_image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-10"
              />
            )}
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200/18 bg-emerald-400/[0.08] px-3 py-1 text-[8px] font-black uppercase tracking-[0.09em] text-emerald-100">
                  Live Club Challenge
                </span>
                <span className="rounded-full border border-amber-200/18 bg-amber-300/[0.07] px-3 py-1 text-[8px] font-black uppercase tracking-[0.09em] text-amber-100">
                  Difficulty {cycle.difficulty}/5
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[8px] font-black uppercase tracking-[0.09em] text-white/50">
                  {challengeCountdown(cycle.ends_at)}
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-black sm:text-4xl">
                {currentChallenge.title}
              </h2>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-white/48">
                Best attempt wins. Ends {formatEnd(cycle.ends_at)}.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>Best {currentChallenge.user_best_percent}%</Badge>
                <Badge>{currentChallenge.user_best_points} pts</Badge>
                <Badge>
                  {currentChallenge.total_completed_attempts.toLocaleString()} plays
                </Badge>
              </div>

              {canPlay ? (
                <Link
                  href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                    club.club_slug,
                  )}/quiz/${encodeURIComponent(currentChallenge.quiz_slug)}`}
                  className="mt-5 inline-flex min-h-[44px] items-center rounded-full border border-amber-200/24 bg-amber-300/10 px-5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 no-underline"
                >
                  Play Current Challenge →
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onJoin}
                  className="mt-5 min-h-[44px] rounded-full border border-amber-200/20 bg-amber-300/[0.07] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100"
                >
                  Join Club to Compete
                </button>
              )}
            </div>
          </section>
        ) : scheduledChallenge && cycle ? (
          <section className="rounded-[28px] border border-cyan-200/16 bg-[linear-gradient(135deg,rgba(17,72,95,0.20),rgba(4,17,38,0.84))] p-5 sm:p-6">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/64">
              Next Club Challenge
            </p>
            <h2 className="mt-2 text-3xl font-black">
              {scheduledChallenge.title}
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/44">
              Opens {formatEnd(cycle.starts_at)} · Difficulty {cycle.difficulty}/5.
            </p>
          </section>
        ) : (
          <section className="rounded-[28px] border border-white/9 bg-white/[0.03] p-6 text-center">
            <h2 className="text-2xl font-black">No live club challenge.</h2>
            <p className="mt-2 text-xs text-white/38">
              Browse the published challenges while the creator prepares the next
              featured cycle.
            </p>
          </section>
        )}

        <section className="rounded-[28px] border border-cyan-200/12 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/58">
                Latest Challenges
              </p>
              <h2 className="mt-1 text-2xl font-black">
                New things to play
              </h2>
            </div>
            <strong className="text-3xl text-cyan-100">{quizzes.length}</strong>
          </div>

          {quizzes.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-white/8 bg-black/14 p-5 text-center text-xs text-white/38">
              This creator is still preparing the club’s first challenge.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {quizzes.slice(0, 4).map((quiz) => (
                <QuizCard
                  key={quiz.quiz_id}
                  clubSlug={club.club_slug}
                  quiz={quiz}
                  isCycleQuiz={cycle?.quiz_id === quiz.quiz_id}
                  cycleStatus={cycle?.quiz_id === quiz.quiz_id ? cycle.lifecycle_status : null}
                  canPlay={canPlay}
                  onJoin={onJoin}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-violet-200/12 bg-[linear-gradient(135deg,rgba(61,35,99,0.14),rgba(4,15,31,0.86))] p-5 sm:p-6">
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-100/58">
            Recent Club Activity
          </p>
          <h2 className="mt-1 text-2xl font-black">What has changed</h2>

          <div className="mt-4 grid gap-2">
            {cycle && cycleQuizLabel(cycle, quizzes) && (
              <ActivityRow
                title={
                  cycle.lifecycle_status === "live"
                    ? "Current challenge is live"
                    : cycle.lifecycle_status === "scheduled"
                      ? "Next challenge is scheduled"
                      : "Latest challenge cycle ended"
                }
                detail={cycleQuizLabel(cycle, quizzes)}
              />
            )}

            {recentChallenges.map((quiz) => (
              <ActivityRow
                key={quiz.quiz_id}
                title="Challenge published"
                detail={`${quiz.title} · ${formatShortDate(quiz.published_at)}`}
              />
            ))}

            {!cycle && recentChallenges.length === 0 && (
              <p className="rounded-xl border border-white/8 bg-black/14 px-4 py-4 text-[10px] text-white/34">
                Club activity will appear as challenges are published and featured.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="space-y-4">
        {clubProgression && (
          <CreatorClubProgressionCard
            progression={clubProgression}
            compact
          />
        )}

        {canPlay && userId && <MemberProgressCard progress={myProgress} large />}

        <ClubMilestones
          members={club.member_count}
          completions={totalChallengeCompletions}
          memberMilestone={memberMilestone}
          playMilestone={playMilestone}
        />

        {currentChallenge && (
          <LeaderboardPanel
            title="Challenge Leaders"
            rows={challengeLeaderboard.slice(0, 5).map((row) => ({
              user_id: row.user_id,
              rank: row.rank,
              name: row.display_name,
              primary: `${row.total_points} pts`,
              secondary: `${row.score_percent}% · ${formatSpeed(
                row.total_response_time_ms,
              )}`,
            }))}
            emptyText="No challenge scores yet."
            userId={userId}
          />
        )}

        <LeaderboardPanel
          title="Club Leaders"
          rows={clubLeaderboard.slice(0, 5).map((row) => ({
            user_id: row.user_id,
            rank: row.rank,
            name: row.display_name,
            primary: `${clubXp(
              row.quizzes_completed,
              row.total_points,
            ).toLocaleString()} XP`,
            secondary: `${row.quizzes_completed} challenges · ${row.average_percent}%`,
          }))}
          emptyText="Complete a club challenge to start the leaderboard."
          userId={userId}
        />
      </div>
    </div>
  );
}

function ChallengesTab({
  club,
  quizzes,
  cycle,
  canPlay,
  onJoin,
}: {
  club: ClubDetail;
  quizzes: QuizCatalogRow[];
  cycle: ChallengeCycle | null;
  canPlay: boolean;
  onJoin: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-cyan-200/12 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-100/58">
            Club Challenges
          </p>
          <h2 className="mt-1 text-3xl font-black">Everything you can play</h2>
        </div>
        <strong className="text-3xl text-cyan-100">{quizzes.length}</strong>
      </div>

      {quizzes.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-white/8 bg-black/14 p-8 text-center">
          <h3 className="text-xl font-black">No challenges published yet.</h3>
          <p className="mt-2 text-xs text-white/38">
            Check back when the creator publishes the first one.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.quiz_id}
              clubSlug={club.club_slug}
              quiz={quiz}
              isCycleQuiz={cycle?.quiz_id === quiz.quiz_id}
              cycleStatus={cycle?.quiz_id === quiz.quiz_id ? cycle.lifecycle_status : null}
              canPlay={canPlay}
              onJoin={onJoin}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RankingsTab({
  cycle,
  currentChallenge,
  challengeLeaderboard,
  clubLeaderboard,
  history,
  userId,
  myClubRow,
  myChallengeRow,
  myProgress,
}: {
  cycle: ChallengeCycle | null;
  currentChallenge: QuizCatalogRow | null;
  challengeLeaderboard: ChallengeLeaderboardRow[];
  clubLeaderboard: ClubLeaderboardRow[];
  history: HistoryRow[];
  userId: string;
  myClubRow: ClubLeaderboardRow | null;
  myChallengeRow: ChallengeLeaderboardRow | null;
  myProgress: MemberProgress;
}) {
  return (
    <div className="space-y-4">
      {userId && (
        <section className="grid gap-3 md:grid-cols-2">
          <MyRankCard
            eyebrow="My Club Rank"
            rank={myClubRow?.rank || null}
            title={myProgress.levelName}
            primary={`${myProgress.xp.toLocaleString()} Club XP`}
            secondary={`${myProgress.challengesCompleted} challenges completed`}
          />

          <MyRankCard
            eyebrow="My Current Challenge"
            rank={myChallengeRow?.rank || null}
            title={currentChallenge?.title || "No live challenge"}
            primary={
              myChallengeRow ? `${myChallengeRow.total_points} pts` : "—"
            }
            secondary={
              myChallengeRow
                ? `${myChallengeRow.score_percent}% · ${formatSpeed(
                    myChallengeRow.total_response_time_ms,
                  )}`
                : cycle?.lifecycle_status === "scheduled"
                  ? "The next challenge has not opened yet."
                  : "Play the live challenge to place."
            }
          />
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {currentChallenge && (
          <LeaderboardPanel
            title={`${currentChallenge.title} · Current Challenge`}
            rows={challengeLeaderboard.map((row) => ({
              user_id: row.user_id,
              rank: row.rank,
              name: row.display_name,
              primary: `${row.total_points} pts`,
              secondary: `${row.score_percent}% · ${formatSpeed(
                row.total_response_time_ms,
              )}`,
            }))}
            emptyText="No challenge scores yet."
            userId={userId}
          />
        )}

        <LeaderboardPanel
          title="All-Time Club"
          rows={clubLeaderboard.map((row) => ({
            user_id: row.user_id,
            rank: row.rank,
            name: row.display_name,
            primary: `${clubXp(
              row.quizzes_completed,
              row.total_points,
            ).toLocaleString()} XP`,
            secondary: `${row.quizzes_completed} challenges · ${row.average_percent}%`,
          }))}
          emptyText="Complete a club challenge to start the leaderboard."
          userId={userId}
        />
      </div>

      {history.length > 0 && (
        <section className="rounded-[28px] border border-violet-200/12 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6">
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-100/60">
            Your Recent Attempts
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {history.slice(0, 9).map((attempt) => (
              <div
                key={attempt.attempt_id}
                className="rounded-2xl border border-white/8 bg-black/14 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <strong className="block truncate text-[10px]">
                      {attempt.quiz_title}
                    </strong>
                    <small className="mt-1 block text-[8px] text-white/30">
                      {formatShortDate(attempt.completed_at)} · attempt{" "}
                      {attempt.attempt_number}
                    </small>
                  </span>
                  <span className="shrink-0 text-right">
                    <strong className="block text-sm text-violet-100">
                      {attempt.score_percent}%
                    </strong>
                    <small className="text-[8px] text-white/30">
                      {attempt.total_points} pts
                    </small>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AboutTab({ club }: { club: ClubDetail }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[28px] border border-white/9 bg-white/[0.035] p-6 backdrop-blur-xl sm:p-7">
        <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/34">
          About the Club
        </p>
        <h2 className="mt-2 text-3xl font-black">{club.club_name}</h2>
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-white/50">
          {club.description ||
            club.tagline ||
            "This creator has not added a full club description yet."}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <InfoBox label="Topic" value={club.topic || "Creator Club"} />
          <InfoBox label="Members" value={club.member_count.toLocaleString()} />
          <InfoBox label="Started" value={formatShortDate(club.created_at)} />
        </div>
      </section>

      <aside className="rounded-[28px] border border-amber-200/13 bg-[linear-gradient(180deg,rgba(85,47,8,0.16),rgba(4,15,30,0.9))] p-5 backdrop-blur-xl">
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/58">
          Creator
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-200/16 bg-amber-300/[0.07] text-xl font-black text-amber-100">
            {club.creator_profile_image_url ? (
              <img
                src={club.creator_profile_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              club.creator_display_name.charAt(0).toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <Link
              href={`/milo-world/quiz-hall/creators/${encodeURIComponent(
                club.creator_slug,
              )}`}
              className="block truncate text-lg font-black text-white no-underline hover:text-amber-100"
            >
              {club.creator_display_name}
            </Link>
            <span className="mt-1 block text-[9px] text-white/30">
              Club creator
            </span>
          </div>
        </div>
        <div className="mt-4">
          <CreatorReputationBadge creatorSlug={club.creator_slug} />
        </div>
        {club.creator_bio && (
          <p className="mt-4 whitespace-pre-line text-xs leading-6 text-white/42">
            {club.creator_bio}
          </p>
        )}
        <Link
          href={`/milo-world/quiz-hall/creators/${encodeURIComponent(
            club.creator_slug,
          )}`}
          className="mt-4 inline-flex min-h-9 items-center rounded-full border border-amber-200/15 bg-amber-300/[0.055] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-amber-100 no-underline"
        >
          View Creator Profile →
        </Link>
      </aside>
    </div>
  );
}

function MemberProgressCard({
  progress,
  large = false,
}: {
  progress: MemberProgress;
  large?: boolean;
}) {
  return (
    <section
      className={`rounded-[22px] border border-violet-200/14 bg-violet-400/[0.055] ${
        large ? "p-5" : "mt-4 p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[7px] font-black uppercase tracking-[0.13em] text-violet-100/58">
            My Club Progress
          </p>
          <strong className={`${large ? "mt-2 text-2xl" : "mt-1 text-lg"} block text-violet-100`}>
            {progress.levelName}
          </strong>
        </div>
        <span className="rounded-full border border-violet-200/15 bg-violet-300/[0.07] px-3 py-1.5 text-[8px] font-black text-violet-100">
          {progress.xp.toLocaleString()} XP
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/24">
        <div
          className="h-full rounded-full bg-violet-200/70"
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between gap-3 text-[8px] text-white/30">
        <span>{progress.challengesCompleted} challenges</span>
        <span>
          {progress.nextLevelXp
            ? `${progress.nextLevelXp.toLocaleString()} XP → ${
                progress.nextLevelName
              }`
            : "Highest club rank"}
        </span>
      </div>
    </section>
  );
}

function ClubPulse({
  notices,
}: {
  notices: ClubPulseNotice[];
}) {
  return (
    <section className="rounded-[24px] border border-fuchsia-200/10 bg-[linear-gradient(145deg,rgba(75,28,82,0.12),rgba(4,14,30,0.86))] p-4">
      <p className="text-[8px] font-black uppercase tracking-[0.13em] text-fuchsia-100/54">
        Club Pulse
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {notices.slice(0, 4).map((notice, index) => (
          <div
            key={`${notice.type}-${index}`}
            className={`rounded-xl border px-3 py-3 ${
              notice.priority === "high"
                ? "border-amber-200/14 bg-amber-300/[0.04]"
                : "border-white/7 bg-black/12"
            }`}
          >
            <strong className="block text-[10px] text-white/68">
              {notice.title}
            </strong>
            <p className="mt-1 text-[8px] leading-4 text-white/28">
              {notice.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ClubMilestones({
  members,
  completions,
  memberMilestone,
  playMilestone,
}: {
  members: number;
  completions: number;
  memberMilestone: ReturnType<typeof milestoneState>;
  playMilestone: ReturnType<typeof milestoneState>;
}) {
  return (
    <section className="rounded-[24px] border border-amber-200/12 bg-[linear-gradient(145deg,rgba(73,43,12,0.15),rgba(4,14,30,0.82))] p-4">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/56">
        Club Milestones
      </p>
      <h3 className="mt-1 text-xl font-black">Growing together</h3>

      <MilestoneBar
        label="Members"
        value={members}
        next={memberMilestone.next}
        progress={memberMilestone.progress}
      />
      <MilestoneBar
        label="Challenge plays"
        value={completions}
        next={playMilestone.next}
        progress={playMilestone.progress}
      />
    </section>
  );
}

function MilestoneBar({
  label,
  value,
  next,
  progress,
}: {
  label: string;
  value: number;
  next: number | null;
  progress: number;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3 text-[9px]">
        <span className="font-bold text-white/48">{label}</span>
        <strong className="text-amber-100">
          {value.toLocaleString()}
          {next ? ` / ${next.toLocaleString()}` : " · Max milestone"}
        </strong>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/24">
        <div
          className="h-full rounded-full bg-amber-200/70"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function MyRankCard({
  eyebrow,
  rank,
  title,
  primary,
  secondary,
}: {
  eyebrow: string;
  rank: number | null;
  title: string;
  primary: string;
  secondary: string;
}) {
  return (
    <section className="rounded-[24px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(14,63,83,0.16),rgba(4,14,30,0.86))] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/58">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-xl font-black">{title}</h3>
          <strong className="mt-3 block text-lg text-cyan-100">{primary}</strong>
          <p className="mt-1 text-[9px] text-white/34">{secondary}</p>
        </div>
        <span className="text-4xl font-black text-cyan-100/70">
          {rank ? `#${rank}` : "—"}
        </span>
      </div>
    </section>
  );
}

function QuizCard({
  clubSlug,
  quiz,
  isCycleQuiz,
  cycleStatus,
  canPlay,
  onJoin,
}: {
  clubSlug: string;
  quiz: QuizCatalogRow;
  isCycleQuiz: boolean;
  cycleStatus: ChallengeCycle["lifecycle_status"] | null;
  canPlay: boolean;
  onJoin: () => void;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-[22px] border p-4 ${
        isCycleQuiz && cycleStatus === "live"
          ? "border-amber-200/20 bg-amber-300/[0.045]"
          : isCycleQuiz && cycleStatus === "scheduled"
            ? "border-cyan-200/18 bg-cyan-300/[0.04]"
            : "border-white/9 bg-black/14"
      }`}
    >
      {quiz.cover_image_url && (
        <img
          src={quiz.cover_image_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-10"
        />
      )}
      <div className="relative z-10 flex min-h-[175px] flex-col">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/56">
              10 questions
              {isCycleQuiz && cycleStatus === "live"
                ? " · Live Challenge"
                : isCycleQuiz && cycleStatus === "scheduled"
                  ? " · Scheduled"
                  : ""}
            </p>
            <h3 className="mt-1 line-clamp-2 text-lg font-black leading-6">
              {quiz.title}
            </h3>
          </div>
          {quiz.user_best_percent > 0 && (
            <span className="shrink-0 rounded-full border border-emerald-200/14 bg-emerald-400/[0.07] px-2 py-1 text-[8px] font-black text-emerald-100">
              {quiz.user_best_percent}%
            </span>
          )}
        </div>

        {quiz.description && (
          <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/40">
            {quiz.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/7 pt-3">
          <span className="text-[8px] text-white/34">
            {quiz.total_completed_attempts.toLocaleString()} completed
          </span>
          {canPlay ? (
            <Link
              href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                clubSlug,
              )}/quiz/${encodeURIComponent(quiz.quiz_slug)}`}
              className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100 no-underline"
            >
              Play →
            </Link>
          ) : (
            <button
              type="button"
              onClick={onJoin}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/38"
            >
              Join to Play
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ActivityRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid grid-cols-[9px_minmax(0,1fr)] gap-3 rounded-xl border border-white/8 bg-black/14 px-4 py-3">
      <span className="mt-1.5 h-2 w-2 rounded-full bg-violet-200/70" />
      <span>
        <strong className="block text-[10px] text-white/72">{title}</strong>
        <small className="mt-1 block text-[9px] text-white/32">{detail}</small>
      </span>
    </div>
  );
}

function cycleQuizLabel(cycle: ChallengeCycle, quizzes: QuizCatalogRow[]) {
  const quiz = quizzes.find((item) => item.quiz_id === cycle.quiz_id);
  if (!quiz) return "";
  if (cycle.lifecycle_status === "live") {
    return `${quiz.title} · ${challengeCountdown(cycle.ends_at)}`;
  }
  if (cycle.lifecycle_status === "scheduled") {
    return `${quiz.title} · opens ${formatEnd(cycle.starts_at)}`;
  }
  return `${quiz.title} · ended ${formatEnd(cycle.ends_at)}`;
}

function LeaderboardPanel({
  title,
  rows,
  emptyText,
  userId,
}: {
  title: string;
  rows: {
    user_id: string;
    rank: number;
    name: string;
    primary: string;
    secondary: string;
  }[];
  emptyText: string;
  userId: string;
}) {
  const topRows = rows.slice(0, 10);
  const myRow = userId ? rows.find((row) => row.user_id === userId) || null : null;
  const myOutsideTopTen =
    myRow && !topRows.some((row) => row.user_id === myRow.user_id);

  return (
    <section className="rounded-[24px] border border-white/9 bg-black/18 p-4">
      <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/36">
        {title}
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-[10px] leading-5 text-white/34">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {topRows.map((row) => (
            <LeaderboardRow
              key={`${row.rank}-${row.user_id}`}
              row={row}
              highlight={Boolean(userId && row.user_id === userId)}
            />
          ))}

          {myOutsideTopTen && myRow && (
            <>
              <div className="px-2 py-1 text-center text-[8px] text-white/22">
                · · ·
              </div>
              <LeaderboardRow row={myRow} highlight />
            </>
          )}
        </div>
      )}
    </section>
  );
}

function LeaderboardRow({
  row,
  highlight,
}: {
  row: {
    rank: number;
    name: string;
    primary: string;
    secondary: string;
  };
  highlight: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-3 py-2 ${
        highlight
          ? "border-cyan-200/20 bg-cyan-300/[0.07]"
          : "border-white/7 bg-white/[0.025]"
      }`}
    >
      <strong
        className={`text-sm ${
          row.rank <= 3 ? "text-amber-100" : "text-white/34"
        }`}
      >
        {row.rank}
      </strong>
      <span className="min-w-0">
        <strong className="block truncate text-[10px]">
          {row.name}
          {highlight ? " · You" : ""}
        </strong>
        <small className="mt-0.5 block truncate text-[8px] text-white/28">
          {row.secondary}
        </small>
      </span>
      <strong className="text-[10px] text-cyan-100">{row.primary}</strong>
    </div>
  );
}

function ClubTabButton({
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
      className={`min-h-10 shrink-0 rounded-full border px-4 text-[8px] font-black uppercase tracking-[0.1em] transition ${
        active
          ? "border-amber-200/22 bg-amber-300/[0.08] text-amber-100"
          : "border-transparent bg-transparent text-white/36 hover:text-white/68"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-white/46">
      {children}
    </span>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/14 px-3 py-3">
      <strong className="block text-sm text-white">{value}</strong>
      <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.08em] text-white/26">
        {label}
      </span>
    </div>
  );
}
