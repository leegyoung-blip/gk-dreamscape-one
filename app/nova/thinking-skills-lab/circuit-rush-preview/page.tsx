import type { Metadata } from "next";
import CircuitRushGame from "@/components/nova/think-lab/CircuitRushGame";

export const metadata: Metadata = {
  title: "Circuit Rush — Practice Preview | DREAMSCAPE",
  description: "Try NOVA's Circuit Rush match-three puzzle without spending or earning Dream Tokens.",
  robots: { index: false, follow: false },
};

export default function CircuitRushPreviewPage() {
  return <CircuitRushGame />;
}
