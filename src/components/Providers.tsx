"use client";

import { MotionConfig } from "motion/react";

/** Honors the OS "reduce motion" setting for every Motion animation. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
