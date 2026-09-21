"use client";

import { useParams } from "next/navigation";
import NovaCheckPlayer from "@/components/nova-plus/NovaCheckPlayer";

export default function NovaCheckPage() {
  const params =
    useParams<{
      cycleId: string | string[];
    }>();

  const rawCycleId =
    params?.cycleId;

  const cycleId =
    Array.isArray(rawCycleId)
      ? rawCycleId[0]
      : String(rawCycleId || "");

  if (!cycleId) {
    return null;
  }

  return (
    <NovaCheckPlayer
      cycleId={cycleId}
    />
  );
}
