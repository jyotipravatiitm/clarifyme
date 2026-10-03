"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, History, Info, Volume2, VolumeX } from "lucide-react";
import { setMuted, useProgress } from "@/lib/progress";
import { useFeatures } from "@/components/Features";
import { AccountButton, ProgressSync } from "@/components/auth/Account";
import { Mascot } from "@/components/game/Mascot";
import { TopBar } from "@/components/game/TopBar";
import { StatsRail } from "./StatsRail";

const NAV = [
  { href: "/", label: "Learn", icon: BookOpen },
  { href: "/history", label: "Review", icon: History },
  { href: "/about", label: "Why it works", icon: Info },
];

/**
 * Page frame. Desktop (lg+): left sidebar, centered content, right stats rail.
 * Phone/tablet: top bar with stats, content, bottom tab bar.
 */
export function AppShell({ children, rail = true }: { children: React.ReactNode; rail?: boolean }) {
  const pathname = usePathname();
  const { auth } = useFeatures();
  const p = useProgress();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-dvh">
      {auth && <ProgressSync />}
      <div className="lg:hidden">
        <TopBar />
      </div>
      <div className="mx-auto flex max-w-[1280px]">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 border-r-2 border-line px-4 py-6 lg:flex">
          <Link href="/" className="mb-6 flex items-center gap-2 px-2" aria-label="ClarifyMe home">
            <Mascot size={44} />
            <span className="text-3xl font-black tracking-tight text-brand">clarifyme</span>
          </Link>
          <nav aria-label="Main" className="flex flex-col gap-1.5">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={`flex items-center gap-4 rounded-2xl border-2 px-4 py-3 text-sm font-black uppercase tracking-wider transition-colors ${
                  active(href) ? "border-brand/50 bg-brand-tint text-brand-shade" : "border-transparent text-ink-soft hover:bg-bg-soft"
                }`}
                style={active(href) ? { color: "var(--brand-shade)" } : undefined}
              >
                <Icon size={26} strokeWidth={2.5} /> {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <button type="button" onClick={() => setMuted(!p.muted)} className="flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-wider text-ink-soft hover:bg-bg-soft">
              {p.muted ? <VolumeX size={24} /> : <Volume2 size={24} />} {p.muted ? "Sound off" : "Sound on"}
            </button>
            {auth && <AccountButton />}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 lg:px-10 lg:pb-16 lg:pt-8">{children}</main>

        {rail && (
          <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 overflow-y-auto px-4 py-8 xl:block">
            <StatsRail />
          </aside>
        )}
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex border-t-2 border-line bg-bg/95 backdrop-blur lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-extrabold ${active(href) ? "text-brand" : "text-ink-soft"}`}
          >
            <Icon size={24} strokeWidth={2.5} />
            {label === "Why it works" ? "About" : label}
          </Link>
        ))}
        {auth && (
          <div className="flex flex-1 items-center justify-center py-2 text-ink-soft">
            <AccountButton compact />
          </div>
        )}
      </nav>
    </div>
  );
}
