import { redirect } from "next/navigation";

export default async function LegacyCreatorPackPage({
  params,
}: {
  params: Promise<{ slug: string; packSlug: string }>;
}) {
  const { slug } = await params;
  redirect(
    `/milo-world/quiz-hall/clubs/${encodeURIComponent(
      decodeURIComponent(String(slug || "")),
    )}`,
  );
}
