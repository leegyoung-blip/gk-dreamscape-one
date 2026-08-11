import type { ReactNode } from "react";
import { Suspense } from "react";
import BillingSessionButton from "./_components/BillingSessionButton";

export default function BillingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}

      <Suspense fallback={null}>
        <BillingSessionButton />
      </Suspense>
    </>
  );
}
