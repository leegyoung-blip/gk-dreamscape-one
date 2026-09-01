import "server-only";

import { createHash } from "crypto";

import type {
  AgentExecutableActionKey,
  SyntheticPerformanceProfile,
} from "@/lib/agents/execution/types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function deterministicOffset(seed: string) {
  const digest = createHash("sha256").update(seed).digest();
  const normalized = digest.readUInt32BE(0) / 0xffffffff;
  return (normalized - 0.5) * 0.1;
}

export function buildSyntheticPerformanceProfile({
  agentCode,
  accountRole,
  archetype,
  primaryLevel,
  actionKey,
  actionRequestId,
}: {
  agentCode: string;
  accountRole: string;
  archetype: string | null;
  primaryLevel: number | null;
  actionKey: AgentExecutableActionKey;
  actionRequestId: string;
}): SyntheticPerformanceProfile {
  let accuracy = accountRole === "student" ? 0.68 : 0.62;
  const basis: string[] = [`role:${accountRole}`];
  const cleanArchetype = String(archetype || "balanced").trim().toLowerCase();

  switch (cleanArchetype) {
    case "strategist":
      accuracy += 0.08;
      basis.push("strategist:+0.08");
      break;
    case "competitive":
      accuracy += 0.05;
      basis.push("competitive:+0.05");
      break;
    case "explorer":
      accuracy += 0.02;
      basis.push("explorer:+0.02");
      break;
    case "rover_specialist":
      if (actionKey === "nova.rover.run_challenge") {
        accuracy += 0.12;
        basis.push("rover_specialist:+0.12");
      }
      break;
    case "casual":
      accuracy -= 0.08;
      basis.push("casual:-0.08");
      break;
    default:
      basis.push(`${cleanArchetype}:neutral`);
      break;
  }

  if (primaryLevel !== null && Number.isFinite(primaryLevel)) {
    accuracy += Math.min(0.04, Math.max(0, (primaryLevel - 1) * 0.006));
    basis.push(`primary_level:${primaryLevel}`);
  }

  if (actionKey === "nova.think.attempt_activity") {
    accuracy -= 0.03;
    basis.push("think_difficulty:-0.03");
  }

  if (actionKey === "nova.knowledge_arena.attempt_quiz") {
    accuracy -= 0.01;
    basis.push("knowledge_arena:-0.01");
  }

  const seed = `phase3c:${agentCode}:${actionRequestId}:${actionKey}`;
  const variation = deterministicOffset(seed);
  accuracy += variation;
  basis.push(`deterministic_variation:${variation.toFixed(3)}`);
  accuracy = clamp(accuracy, 0.42, 0.92);

  return {
    accuracy: Number(accuracy.toFixed(4)),
    expectedAccuracyPercent: Math.round(accuracy * 100),
    seed,
    basis,
  };
}
