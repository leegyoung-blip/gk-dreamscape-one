import LearningAccessGate from "@/components/access/LearningAccessGate";

export default function ScienceMissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LearningAccessGate zone="science">
      {children}
    </LearningAccessGate>
  );
}
