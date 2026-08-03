import { notFound } from "next/navigation";
import CoreQuizPlayer from "./CoreQuizPlayer";

type CoreSubject = "english" | "math";
type PrimaryLevel = 1 | 2 | 3 | 4 | 5 | 6;

type PageProps = {
  params: Promise<{
    subject: string;
    level: string;
    quizId: string;
  }>;
};

function isCoreSubject(value: string): value is CoreSubject {
  return value === "english" || value === "math";
}

export default async function CoreQuizRoute({ params }: PageProps) {
  const resolved = await params;
  const levelMatch = /^p([1-6])$/.exec(resolved.level);

  if (
    !isCoreSubject(resolved.subject) ||
    !levelMatch ||
    !resolved.quizId
  ) {
    notFound();
  }

  return (
    <CoreQuizPlayer
      subject={resolved.subject}
      level={Number(levelMatch[1]) as PrimaryLevel}
      quizId={resolved.quizId}
    />
  );
}
