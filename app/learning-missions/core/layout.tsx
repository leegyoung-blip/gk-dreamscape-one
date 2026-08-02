import LearningAccessGate from "@/components/access/LearningAccessGate";

export default function CoreMissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LearningAccessGate zone="core">
      {children}
    </LearningAccessGate>
  );
}
