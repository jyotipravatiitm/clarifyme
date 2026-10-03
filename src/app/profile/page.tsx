"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Crown, Flame } from "lucide-react";
import { TRACKS } from "@/lib/content";
import { shiftDay, today, useProgress } from "@/lib/progress";
import { useFeatures } from "@/components/Features";
import { AppShell } from "@/components/shell/AppShell";
import { ProfileCard } from "@/components/auth/ProfileCard";
import { Icon } from "@/components/game/Icon";
import { GemIcon } from "@/components/game/NavIcons";
import { Mascot } from "@/components/game/Mascot";

const noop = () => () => {};

export default function ProfilePage() {
  const p = useProgress();
  const { auth } = useFeatures();
  // The week row depends on the visitor's local date, so build it after hydration.
  const now = useSyncExternalStore(noop, () => today(), () => null);
  const week = now ? Array.from({ length: 7 }, (_, i) => shiftDay(now, i - 6)) : [];
  const crowns = Object.values(p.completed).filter((c) => c.stars >= 3).length;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        {auth ? (
          <ProfileCard />
        ) : (
          <div className="card flex items-center gap-4 px-5 py-5">
            <Mascot size={80} />
            <div>
              <h1 className="text-2xl font-black">Your progress</h1>
              <p className="font-bold text-ink-soft">Saved in this browser.</p>
            </div>
          </div>
        )}

        <section>
          <h2 className="mb-3 text-xl font-black">Statistics</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={<Flame size={26} className="fill-flame text-flame" />} value={p.streak} label="Day streak" />
            <Stat icon={<GemIcon size={26} />} value={p.xp} label="Total XP" />
            <Stat icon={<Crown size={26} className="text-gold" style={{ color: "var(--gold-shade)" }} />} value={crowns} label="Perfect lessons" />
            <Stat icon={<Icon name="star" size={26} className="text-[var(--spec)]" />} value={Object.keys(p.completed).length} label="Lessons done" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-black">This week</h2>
          <div className="card flex justify-between px-4 py-4">
            {week.map((d) => {
              const xp = p.activity[d] ?? 0;
              const label = new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
              return (
                <div key={d} className="flex flex-col items-center gap-1.5">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-black"
                    style={xp ? { background: "var(--flame)", color: "#fff" } : { background: "var(--bg-soft)", color: "var(--text-soft)" }}
                    title={`${xp} XP`}
                  >
                    {xp ? <Flame size={18} className="fill-white" /> : ""}
                  </span>
                  <span className={`text-xs font-black ${d === now ? "text-ink" : "text-ink-soft"}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-black">Courses</h2>
          <ul className="flex flex-col gap-3">
            {TRACKS.map((t) => {
              const lessons = t.units.flatMap((u) => u.lessons);
              const done = lessons.filter((l) => p.completed[l.id]).length;
              return (
                <li key={t.id} className="card flex items-center gap-4 px-4 py-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl text-white" style={{ background: `var(--${t.id})` }}>
                    <Icon name={t.id} size={24} />
                  </span>
                  <div className="flex-1">
                    <p className="font-black">{t.title}</p>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-bg-soft">
                      <div className="h-full rounded-full" style={{ width: `${(done / lessons.length) * 100}%`, background: `var(--${t.id})` }} />
                    </div>
                  </div>
                  <span className="text-sm font-black text-ink-soft">
                    {done}/{lessons.length}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="text-center text-sm font-bold text-ink-soft">
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy &amp; your data
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      {icon}
      <div>
        <p className="text-xl font-black">{value}</p>
        <p className="text-sm font-bold text-ink-soft">{label}</p>
      </div>
    </div>
  );
}
