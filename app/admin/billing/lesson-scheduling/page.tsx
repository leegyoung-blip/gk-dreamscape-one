import { redirect } from "next/navigation";

export default function LegacyLessonSchedulingRedirect() {
  redirect("/admin/billing/gkp/lesson-scheduling");
}
