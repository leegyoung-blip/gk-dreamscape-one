import { notFound } from "next/navigation";
import CoreQuizPlayer from "./CoreQuizPlayer";

type PageProps = {
  params: Promise<{
    subject: string;
    level: string;
    quizId: string;
  }>;
};

export default async function CoreQuizRoute({ params }: PageProps) {
  const resolved = await params;
  const levelMatch = /^p([1-6])$/.exec(resolved.level);

  if (
    (resolved.subject !== "english" &&
      resolved.subject !== "math") ||
    !levelMatch ||
    !resolved.quizId
  ) {
    notFound();
  }

  return (
    <CoreQuizPlayer
      subject={resolved.subject as "english" | "math"}
      level={Number(levelMatch[1])}
      quizId={resolved.quizId}
    />
  );
}
