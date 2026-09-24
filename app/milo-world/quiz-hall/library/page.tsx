import { redirect } from "next/navigation";

export default function LegacyCreatorLibraryPage() {
  redirect("/milo-world/quiz-hall/communities?view=my");
}
