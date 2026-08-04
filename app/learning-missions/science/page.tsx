import type { Metadata } from "next";
import ScienceMissionsClient from "./ScienceMissionsClient";

export const metadata: Metadata = {
  title: "Science Missions | Dreamscape One",
  description: "Explore Primary 1 to Primary 6 Science Missions.",
};

export default function ScienceMissionsPage() {
  return <ScienceMissionsClient />;
}
