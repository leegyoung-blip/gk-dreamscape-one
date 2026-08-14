import { notFound } from "next/navigation";
import RoverChallengeClient from "../RoverChallengeClient";
import { isRoverLevelId } from "../levels";

type PageProps = {
  params: Promise<{ level: string }>;
};

export default async function RoverChallengeLevelPage({ params }: PageProps) {
  const { level } = await params;
  const parsedLevel = Number(level);

  if (!Number.isInteger(parsedLevel) || !isRoverLevelId(parsedLevel)) {
    notFound();
  }

  return <RoverChallengeClient levelId={parsedLevel} />;
}
