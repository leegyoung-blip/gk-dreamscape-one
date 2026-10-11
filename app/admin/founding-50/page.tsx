import { redirect } from "next/navigation";

export default function Founding50AdminRedirect() {
  redirect("/admin?section=founding-50");
}
