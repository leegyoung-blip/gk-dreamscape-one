import "server-only";

import { createHash } from "crypto";
import type {
  OrchestratorDayPlan,
  OrchestratorSessionPlan,
} from "@/lib/agents/orchestrator/types";

function hashInt(seed: string) {
  return createHash("sha256")
    .update(seed)
    .digest()
    .readUInt32BE(0);
}

function integerInRange(seed: string, minimum: number, maximum: number) {
  if (maximum <= minimum) return minimum;
  return minimum + (hashInt(seed) % (maximum - minimum + 1));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function buildOrchestratorDayPlan({
  agentUserId,
  simulationDayIndex,
  simulationDayDurationMinutes,
  minSessions,
  maxSessions,
  minDecisions,
  maxDecisions,
}: {
  agentUserId: string;
  simulationDayIndex: number;
  simulationDayDurationMinutes: number;
  minSessions: number;
  maxSessions: number;
  minDecisions: number;
  maxDecisions: number;
}): OrchestratorDayPlan {
  const duration = Math.max(1, Math.floor(simulationDayDurationMinutes));
  const sessionCount = integerInRange(
    `${agentUserId}:${simulationDayIndex}:session-count`,
    minSessions,
    maxSessions,
  );

  const spacing = duration / (sessionCount + 1);
  const jitterWindow = Math.max(1, Math.min(10, Math.floor(spacing * 0.22)));

  const sessions: OrchestratorSessionPlan[] = [];

  for (let index = 0; index < sessionCount; index += 1) {
    const sessionNumber = index + 1;
    const baseMinute = Math.round(spacing * sessionNumber);
    const jitter = integerInRange(
      `${agentUserId}:${simulationDayIndex}:session:${sessionNumber}:jitter`,
      -jitterWindow,
      jitterWindow,
    );

    const dueMinute = clamp(baseMinute + jitter, 0, Math.max(0, duration - 1));
    const plannedDecisions = integerInRange(
      `${agentUserId}:${simulationDayIndex}:session:${sessionNumber}:decisions`,
      minDecisions,
      maxDecisions,
    );

    sessions.push({
      sessionNumber,
      dueMinute,
      plannedDecisions,
    });
  }

  sessions.sort((left, right) => {
    if (left.dueMinute !== right.dueMinute) return left.dueMinute - right.dueMinute;
    return left.sessionNumber - right.sessionNumber;
  });

  return {
    simulationDayIndex,
    sessionCount,
    sessions,
  };
}

export function simulationClock({
  epochIso,
  simulationDayDurationMinutes,
  now = new Date(),
}: {
  epochIso: string;
  simulationDayDurationMinutes: number;
  now?: Date;
}) {
  const epoch = new Date(epochIso).getTime();
  const duration = Math.max(1, simulationDayDurationMinutes);
  const elapsedMinutes = Math.max(0, (now.getTime() - epoch) / 60000);

  return {
    simulationDayIndex: Math.floor(elapsedMinutes / duration),
    minuteInSimulationDay: Math.floor(elapsedMinutes % duration),
  };
}
