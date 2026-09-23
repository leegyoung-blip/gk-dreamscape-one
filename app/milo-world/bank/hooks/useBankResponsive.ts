"use client";

import { useEffect, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";

export function useBankResponsive() {
  const [screenMode, setScreenMode] = useState<BankScreenMode>("desktop");

  useEffect(() => {
    function updateMode() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isNarrowLandscape = width / Math.max(height, 1) < 1.45;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1180 || isNarrowLandscape) {
        setScreenMode("compact");
      } else {
        setScreenMode("desktop");
      }
    }

    updateMode();
    window.addEventListener("resize", updateMode);
    return () => window.removeEventListener("resize", updateMode);
  }, []);

  return screenMode;
}
