import type { ReactNode } from "react";
import BillingSessionButton from "./_components/BillingSessionButton";

export default function BillingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <BillingSessionButton />
    </>
  );
}
