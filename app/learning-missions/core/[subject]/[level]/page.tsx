import { notFound } from "next/navigation";
import CoreLevelClient from "./CoreLevelClient";

export type CoreSubject = "english" | "math";
export type PrimaryLevel = 1 | 2 | 3 | 4 | 5 | 6;

type PageProps = {
  params: Promise<{
    subject: string;
    level: string;
  }>;
};

export default async function CoreLevelRoute({ params }: PageProps) {
  const resolved = await params;
  const subject = resolved.subject;
  const levelMatch = /^p([1-6])$/.exec(resolved.level);

  if (
    (subject !== "english" && subject !== "math") ||
    !levelMatch
  ) {
    notFound();
  }

  return (
    <CoreLevelClient
      subject={subject as CoreSubject}
      level={Number(levelMatch[1]) as PrimaryLevel} quizId={""}    />
  );
}
