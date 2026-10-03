"use client";

import { AnimatePresence, motion } from "motion/react";
import { Mascot, type Mood } from "@/components/game/Mascot";

export function PromptBubble({ mood, children, aside }: { mood: Mood; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Mascot mood={mood} size={88} className="shrink-0" />
      <div className="card relative mt-2 flex-1 px-4 py-3 text-lg font-bold leading-snug">
        <span className="absolute -left-[9px] top-6 h-4 w-4 rotate-45 border-b-2 border-l-2 border-line bg-surface" aria-hidden />
        {children}
        <AnimatePresence>
          {aside && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              {aside}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
