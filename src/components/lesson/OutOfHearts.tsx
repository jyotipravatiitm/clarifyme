"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { HeartCrack } from "lucide-react";
import { Mascot } from "@/components/game/Mascot";

export function OutOfHearts({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5 pt-10 text-center">
      <Mascot mood="sad" size={150} />
      <h1 className="flex items-center gap-2 text-3xl font-black text-heart">
        <HeartCrack size={32} /> Out of hearts
      </h1>
      <p className="max-w-sm text-lg font-bold text-ink-soft">Clear writing is hard. That&apos;s the point! Start the lesson again, and use a hint if you get stuck.</p>
      <div className="flex gap-3">
        <Link href="/" className="btn3d ghost">
          Back to path
        </Link>
        <button type="button" className="btn3d" onClick={onRetry} autoFocus>
          Try again
        </button>
      </div>
    </motion.div>
  );
}
