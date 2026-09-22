"use client";

import { supabase } from "@/lib/supabase";
import type { CoreSubject } from "../CoreQuizTypes";

export type TeachingEventType =
  | "hint_opened"
  | "lesson_opened"
  | "teach_me_opened"
  | "misconception_shown"
  | "quick_check_answered";

export type TeachingEvent = {
  subject: CoreSubject;
  quizId: string;
  attemptId: string;
  questionId: string;
  eventType: TeachingEventType;
  eventKey?: string | null;
  misconceptionCode?: string | null;
  lessonType?: string | null;
  quickCheckCorrect?: boolean | null;
  metadata?: Record<string, unknown>;
};

const queued = new Map<string, TeachingEvent>();
const delivered = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function eventIdentity(event: TeachingEvent) {
  return [
    event.attemptId,
    event.questionId,
    event.eventType,
    event.eventKey || "",
  ].join(":");
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flushTeachingEvents();
  }, 650);
}

export function recordTeachingEvent(event: TeachingEvent) {
  if (
    !event.quizId ||
    !event.attemptId ||
    !event.questionId ||
    !event.eventType
  ) {
    return;
  }

  const key = eventIdentity(event);
  if (delivered.has(key) || queued.has(key)) return;

  queued.set(key, event);
  scheduleFlush();
}

export async function flushTeachingEvents() {
  if (flushing || queued.size === 0) return;
  flushing = true;

  const batch = Array.from(queued.entries());
  batch.forEach(([key]) => queued.delete(key));

  try {
    const { error } = await supabase.rpc("record_core_teaching_events", {
      p_events: batch.map(([, event]) => ({
        subject: event.subject,
        quiz_id: event.quizId,
        attempt_id: event.attemptId,
        question_id: event.questionId,
        event_type: event.eventType,
        event_key: event.eventKey || "",
        misconception_code: event.misconceptionCode || null,
        lesson_type: event.lessonType || null,
        quick_check_correct:
          typeof event.quickCheckCorrect === "boolean"
            ? event.quickCheckCorrect
            : null,
        metadata: event.metadata || {},
      })),
    });

    if (error) throw error;
    batch.forEach(([key]) => delivered.add(key));
  } catch (error) {
    // Teaching analytics must never interrupt the learner's quiz. Put the
    // events back in the queue so a later interaction can retry the batch.
    batch.forEach(([key, event]) => {
      if (!delivered.has(key)) queued.set(key, event);
    });
    console.warn("Could not record Core teaching analytics:", error);
  } finally {
    flushing = false;
  }
}
