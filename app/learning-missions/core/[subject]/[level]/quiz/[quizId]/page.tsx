import { notFound } from "next/navigation";
import CoreQuizPlayer from "./CoreQuizPlayer";

type CoreSubject = "english" | "math";

type PageProps = {
  params: Promise<{
    subject: string;
    level: string;
    quizId: string;
  }>;
};

const CORE_SUBJECTS = new Set<CoreSubject>(["english", "math"]);

function isCoreSubject(value: string): value is CoreSubject {
  return CORE_SUBJECTS.has(value as CoreSubject);
}

export default async function CoreQuizRoute({ params }: PageProps) {
  const resolved = await params;
  const levelMatch = /^p([1-6])$/.exec(resolved.level);

  if (!isCoreSubject(resolved.subject) || !levelMatch || !resolved.quizId) {
    notFound();
  }

  return (
    <CoreQuizPlayer
      subject={resolved.subject}
      level={Number(levelMatch[1])}
      quizId={resolved.quizId}
    />
  );
}
