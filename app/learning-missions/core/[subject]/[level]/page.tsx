import { notFound } from "next/navigation";
import CoreLevelClient from "./CoreLevelClient";
import {
  isCoreSubject,
  parsePrimaryLevel,
} from "@/lib/core-missions/catalogue";

type PageProps = {
  params: Promise<{
    subject: string;
    level: string;
  }>;
};

export default async function CoreLevelPage({ params }: PageProps) {
  const resolved = await params;
  const level = parsePrimaryLevel(resolved.level);

  if (!isCoreSubject(resolved.subject) || !level) {
    notFound();
  }

  return <CoreLevelClient subject={resolved.subject} level={level} />;
}
