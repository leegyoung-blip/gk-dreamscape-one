import { notFound } from "next/navigation";
import CoreTopicClient from "./CoreTopicClient";
import {
  isCoreSubject,
  parsePrimaryLevel,
} from "@/lib/core-missions/catalogue";

type PageProps = {
  params: Promise<{
    subject: string;
    level: string;
    topic: string;
  }>;
};

export default async function CoreTopicPage({ params }: PageProps) {
  const resolved = await params;
  const level = parsePrimaryLevel(resolved.level);

  if (!isCoreSubject(resolved.subject) || !level || !resolved.topic) {
    notFound();
  }

  return (
    <CoreTopicClient
      subject={resolved.subject}
      level={level}
      topicSlug={resolved.topic}
    />
  );
}
