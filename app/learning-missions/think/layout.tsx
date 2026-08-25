import type { ReactNode } from "react";
import LearningMissionZoneGate from "@/components/learning-missions/LearningMissionZoneGate";

export default function ThinkMissionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LearningMissionZoneGate zone="think">
      {children}
    </LearningMissionZoneGate>
  );
}
