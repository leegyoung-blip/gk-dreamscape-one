import LearningAccessGate from "@/components/access/LearningAccessGate";
import LearningMissionZoneGate from "@/components/learning-missions/LearningMissionZoneGate";

export default function ScienceMissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LearningMissionZoneGate zone="science">
      <LearningAccessGate zone="science">
        {children}
      </LearningAccessGate>
    </LearningMissionZoneGate>
  );
}
