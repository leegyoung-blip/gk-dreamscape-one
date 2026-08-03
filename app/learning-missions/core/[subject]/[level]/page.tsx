import { notFound } from "next/navigation";
import CoreLevelClient from "./CoreLevelClient";

type CoreSubject = "english" | "math";
type PrimaryLevel = 1 | 2 | 3 | 4 | 5 | 6;

type PageProps = {
  params: Promise<{
    subject: string;
    level: string;
  }>;
};

function isCoreSubject(value: string): value is CoreSubject {
  return value === "english" || value === "math";
}

export default async function CoreLevelPage({ params }: PageProps) {
  const resolved = await params;
  const levelMatch = /^p([1-6])$/.exec(resolved.level);

  if (!isCoreSubject(resolved.subject) || !levelMatch) {
    notFound();
  }

  return (
    <CoreLevelClient
      subject={resolved.subject}
      level={Number(levelMatch[1]) as PrimaryLevel}
    />
  );
}
