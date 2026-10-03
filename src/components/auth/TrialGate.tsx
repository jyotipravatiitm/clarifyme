"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { History, Infinity as InfinityIcon, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";
import { Mascot } from "@/components/game/Mascot";
import { SignInCta, SignUpCta } from "./Account";

/** Shown instead of a lesson when an anonymous visitor has used every free lesson. */
export function TrialGate({ used }: { used: number }) {
  useEffect(() => track("trial_gate_shown", { used }), [used]);
  const perks = [
    { icon: InfinityIcon, text: "Unlimited lessons on every track" },
    { icon: History, text: "Review every answer, counterexample and score" },
    { icon: Sparkles, text: `Your ${used} guest lesson${used === 1 ? "" : "s"} come with you` },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-md flex-col items-center gap-5 pt-8 text-center">
      <Mascot mood="cheer" size={150} />
      <div>
        <h1 className="text-3xl font-black">You finished {used} free lessons!</h1>
        <p className="mt-2 text-lg font-bold text-ink-soft">That is real progress. Create a free account to keep your streak going.</p>
      </div>
      <ul className="card flex w-full flex-col gap-3 px-5 py-4 text-left">
        {perks.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 font-extrabold">
            <Icon size={22} className="shrink-0 text-brand" /> {text}
          </li>
        ))}
      </ul>
      <div className="flex w-full flex-col gap-3">
        <SignUpCta className="btn3d w-full" from="trial_gate">
          Create a free profile
        </SignUpCta>
        <SignInCta className="btn3d ghost w-full" from="trial_gate">
          I already have an account
        </SignInCta>
      </div>
    </motion.div>
  );
}
