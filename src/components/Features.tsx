"use client";

import { createContext, useContext } from "react";

/** Which optional integrations this deployment has. Decided on the server from env vars. */
export interface Features {
  auth: boolean;
  db: boolean;
  analytics: boolean;
}

const FeaturesContext = createContext<Features>({ auth: false, db: false, analytics: false });

export function FeaturesProvider({ value, children }: { value: Features; children: React.ReactNode }) {
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): Features {
  return useContext(FeaturesContext);
}
