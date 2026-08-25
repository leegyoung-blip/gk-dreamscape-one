import LearningAccessGate from "@/components/access/LearningAccessGate";
import LearningMissionZoneGate from "@/components/learning-missions/LearningMissionZoneGate";

export default function CoreMissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LearningMissionZoneGate zone="core">
      <LearningAccessGate zone="core">
        {children}
      </LearningAccessGate>
    </LearningMissionZoneGate>
  );
}
