"use client";

import { AppShell } from "@/components/shell/AppShell";
import { QuestRow } from "@/components/shell/StatsRail";
import { Mascot } from "@/components/game/Mascot";
import { ChestIcon } from "@/components/game/NavIcons";
import { useProgress } from "@/lib/progress";
import { questsFor } from "@/lib/quests";

export default function QuestsPage() {
  const p = useProgress();
  const quests = questsFor(p);
  const done = quests.filter((q) => q.claimed).length;
  return (
    <AppShell rail={false}>
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-4 rounded-2xl px-6 py-5 text-white" style={{ background: "var(--thinking)", boxShadow: "0 4px 0 var(--thinking-shade)" }}>
          <div className="flex-1">
            <p className="text-sm font-extrabold uppercase tracking-widest opacity-80">Daily Quests</p>
            <h1 className="text-3xl font-black">Clear some fog today</h1>
            <p className="font-bold opacity-90">Finish quests to open chests full of bonus XP. New quests every day.</p>
          </div>
          <Mascot mood={done === quests.length ? "cheer" : "happy"} size={96} />
        </div>
        <div className="card px-5 py-5">
          <ul className="flex flex-col gap-6">
            {quests.map((q) => (
              <QuestRow key={q.id} q={q} muted={p.muted} />
            ))}
          </ul>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 font-bold text-ink-soft">
          <ChestIcon size={28} /> {done} of {quests.length} chests opened today
        </p>
      </div>
    </AppShell>
  );
}
