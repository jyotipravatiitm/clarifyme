"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

/**
 * Renders fixed bottom bars into <body>, so animated (transformed) parents
 * cannot turn `position: fixed` into "fixed to the parent".
 */
export function BottomPortal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
