"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { EnglishMasteryHookState } from "@/lib/nova-plus/english-mastery-types";

const EMPTY_STATE: EnglishMasteryHookState = {
  profile: null,
  loading: false,
  refreshing: false,
  error: null,
  refresh: async () => {},
};

const EnglishMasteryContext =
  createContext<EnglishMasteryHookState>(EMPTY_STATE);

export function EnglishMasteryProvider({
  value,
  children,
}: {
  value: EnglishMasteryHookState;
  children: ReactNode;
}) {
  return (
    <EnglishMasteryContext.Provider value={value}>
      {children}
    </EnglishMasteryContext.Provider>
  );
}

export function useEnglishMastery() {
  return useContext(EnglishMasteryContext);
}
