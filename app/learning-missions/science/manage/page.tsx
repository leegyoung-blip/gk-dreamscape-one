import { redirect } from "next/navigation";

export default function LegacyScienceManagerRedirect() {
  redirect("/curriculum-developer?section=operations&operationsTab=science");
}
