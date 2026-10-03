"use client";

import { motion } from "motion/react";
import { CircleAlert, CircleCheck, Star } from "lucide-react";
import { BottomPortal } from "./BottomPortal";

export function FeedbackSheet({
  tone,
  title,
  stars,
  children,
  actions,
}: {
  tone: "good" | "bad";
  title: string;
  stars?: number;
  children?: React.ReactNode;
  actions: React.ReactNode;
}) {
  const good = tone === "good";
  return (
    <BottomPortal>
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className={`fixed inset-x-0 bottom-0 z-40 border-t-2 ${good ? "border-good/40 bg-good-bg" : "border-bad/40 bg-bad-bg"}`}
    >
      <div className="mx-auto flex max-h-[62dvh] max-w-2xl flex-col gap-3 overflow-y-auto px-4 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.1 }}>
            {good ? <CircleCheck size={36} className="fill-good text-good-bg" /> : <CircleAlert size={36} className="fill-bad text-bad-bg" />}
          </motion.span>
          <h2 className={`text-2xl font-black ${good ? "text-good-text" : "text-bad-text"}`}>{title}</h2>
          {stars !== undefined && stars > 0 && (
            <span className="ml-auto flex gap-0.5" aria-label={`${stars} of 3 stars`}>
              {[0, 1, 2].map((s) => (
                <motion.span key={s} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12, delay: 0.25 + s * 0.15 }}>
                  <Star size={28} strokeWidth={2.5} className={s < stars ? "fill-gold" : "text-line"} style={s < stars ? { color: "var(--gold-shade)" } : undefined} />
                </motion.span>
              ))}
            </span>
          )}
        </div>
        {children && <div className={`flex flex-col gap-3 font-bold ${good ? "text-good-text" : "text-bad-text"}`}>{children}</div>}
        <div className={`sticky -bottom-5 -mx-4 -mb-5 flex flex-wrap justify-end gap-3 px-4 pb-5 pt-3 ${good ? "bg-good-bg" : "bg-bad-bg"}`}>{actions}</div>
      </div>
    </motion.div>
    </BottomPortal>
  );
}
