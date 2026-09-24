import { supabase } from "@/lib/supabase";
import type {
  MoneyLabCompletionResult,
  MoneyLabLessonKey,
  MoneyLabProgress,
} from "./money-lab-types";

type ProgressRow = {
  lesson_key: string;
  completed_at: string;
  reward_amount: number | string;
};

type CompletionRow = ProgressRow & {
  newly_completed: boolean;
};

function toProgress(row: ProgressRow): MoneyLabProgress {
  return {
    lessonKey: row.lesson_key as MoneyLabLessonKey,
    completedAt: row.completed_at,
    rewardAmount: Number(row.reward_amount || 0),
  };
}

export async function listMoneyLabProgress() {
  const { data, error } = await supabase
    .from("milo_bank_money_lab_progress")
    .select("lesson_key,completed_at,reward_amount")
    .order("completed_at", { ascending: true });

  if (error) throw error;
  return ((data || []) as ProgressRow[]).map(toProgress);
}

export async function completeMoneyLabLesson(
  lessonKey: MoneyLabLessonKey,
): Promise<MoneyLabCompletionResult> {
  const { data, error } = await supabase.rpc(
    "complete_milo_bank_money_lab_lesson",
    { p_lesson_key: lessonKey },
  );

  if (error) throw error;

  const raw = Array.isArray(data) ? data[0] : data;
  const row = raw as CompletionRow | undefined;
  if (!row) throw new Error("Money Lab completion did not return a result.");

  return {
    ...toProgress(row),
    newlyCompleted: Boolean(row.newly_completed),
  };
}
