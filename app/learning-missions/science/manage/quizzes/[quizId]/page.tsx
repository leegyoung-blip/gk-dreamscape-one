import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ quizId: string }>;
};

export default async function LegacyScienceQuizEditorRedirect({
  params,
}: PageProps) {
  const { quizId } = await params;
  redirect(
    `/curriculum-developer?section=operations&operationsTab=science&quizId=${encodeURIComponent(quizId)}`,
  );
}
