import { Suspense } from "react";
import NovaPlusDashboard from "@/components/nova-plus/NovaPlusDashboard";

export default function NovaPlusPage() {
  return (
    <Suspense fallback={null}>
      <NovaPlusDashboard />
    </Suspense>
  );
}
