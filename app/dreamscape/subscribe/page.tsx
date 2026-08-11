import { Suspense } from "react";
import DreamscapeSubscribeClient from "./DreamscapeSubscribeClient";

export default function DreamscapeSubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#020813] text-white">
          Loading Dreamscape subscription…
        </main>
      }
    >
      <DreamscapeSubscribeClient />
    </Suspense>
  );
}
