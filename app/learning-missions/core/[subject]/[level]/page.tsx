import { notFound } from "next/navigation";
import CoreLevelClient from "./CoreLevelClient";

type PageProps = {
  params: Promise<{
    subject: string;
    level: string;
  }>;
};

export default async function CoreLevelPage({ params }: PageProps) {
  const resolved = await params;
  const levelMatch = /^p([1-6])$/.exec(resolved.level);

  if (
    (resolved.subject !== "english" &&
      resolved.subject !== "math") ||
    !levelMatch
  ) {
    notFound();
  }

  return (
    <CoreLevelClient
      subject={resolved.subject as "english" | "math"}
      level={
        Number(levelMatch[1]) as 1 | 2 | 3 | 4 | 5 | 6
      }
    />
  );
}
