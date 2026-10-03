"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleHelp, Sparkles } from "lucide-react";
import { getProgressSnapshot } from "@/lib/progress";
import { markStarted } from "@/lib/started";
import { useFeatures } from "@/components/Features";
import { SignInCta } from "@/components/auth/Account";
import { openCookieSettings } from "@/components/analytics/CookieBanner";
import { Icon } from "@/components/game/Icon";
import { FogBank, Mascot } from "@/components/game/Mascot";

interface TrackChip {
  id: string;
  title: string;
  tagline: string;
}

const FUZZY_TO_CLEAR = [
  { fuzzy: "We'll reply to most urgent tickets soon.", clear: "We reply to every P1 ticket within 1 hour." },
  { fuzzy: "The door should lock after a while.", clear: "When the door has been closed for 30 s, the controller shall lock it." },
  { fuzzy: "When the user uploads the file, it is scanned.", clear: "When a user uploads a file, the server scans the file." },
];

export function Landing({ tracks }: { tracks: TrackChip[] }) {
  const router = useRouter();
  const { auth } = useFeatures();

  // Visitors who already practised in this browser skip the landing page.
  useEffect(() => {
    const p = getProgressSnapshot();
    if (p.onboarded || Object.keys(p.completed).length) {
      markStarted();
      router.replace("/learn");
    }
  }, [router]);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-4">
        <Link href="/" className="flex items-center gap-1.5" aria-label="ClarifyMe">
          <Mascot size={42} />
          <span className="text-3xl font-black tracking-tight text-brand">clarifyme</span>
        </Link>
        <div className="ml-auto">
          {auth ? (
            <SignInCta className="btn3d ghost !px-4 !py-2.5 !text-sm" from="landing_header">
              Sign in
            </SignInCta>
          ) : null}
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-6 md:grid-cols-2 md:pb-16 md:pt-12">
        <LighthouseScene />
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <h1 className="max-w-md text-3xl font-black leading-tight sm:text-4xl">The fun way to write — and think — clearly.</h1>
          <p className="mt-3 max-w-md text-lg font-bold text-ink-soft">
            Bite-size games that turn fuzzy sentences into ones that can only mean one thing. Lumi, our lighthouse, shows you exactly how a reader could get you wrong.
          </p>
          <div className="mt-7 flex w-full max-w-sm flex-col gap-3">
            <Link href="/welcome" onClick={markStarted} className="btn3d w-full">
              Get started
            </Link>
            {auth ? (
              <SignInCta className="btn3d ghost w-full !text-[var(--spec)]" from="landing_hero">
                I already have an account
              </SignInCta>
            ) : (
              <Link href="/learn" onClick={markStarted} className="btn3d ghost w-full !text-[var(--spec)]">
                Jump straight in
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Course strip, like Duolingo's language bar */}
      <nav aria-label="Courses" className="border-y-2 border-line">
        <ul className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-4">
          {tracks.map((t) => (
            <li key={t.id}>
              <Link href={`/welcome?track=${t.id}`} onClick={markStarted} className="flex items-center gap-2 font-black uppercase tracking-wider text-ink-soft hover:text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: `var(--${t.id})` }}>
                  <Icon name={t.id} size={18} />
                </span>
                {t.title === "Spec" ? "Specs" : t.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* What is it */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-black">What is ClarifyMe?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-lg font-bold text-ink-soft">
          If a sentence can mean two things, someone will read the other one. ClarifyMe is a daily workout for saying exactly what you mean — in emails, requirements, specs and arguments.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <HowCard color="writing" step="1" title="Write it" text="Write a line or two for a small task. Lumi reads it the way a lawyer, a compiler or a tired engineer would.">
            <p className="leading-8">
              Users should get a reply <mark className="mark-warn">soon</mark>.
            </p>
            <Bubble>Soon = 5 minutes or 5 days?</Bubble>
          </HowCard>
          <HowCard color="spec" step="2" title="Break it" text="Read a loose spec and hunt the corner cases it forgot — the way TLA+ hunts for a bad trace.">
            <p className="font-serif text-lg">&ldquo;The reset link expires after a while.&rdquo;</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              <li className="flex items-center gap-1.5 text-good-text">
                <CircleCheck size={16} /> How long is &ldquo;a while&rdquo;?
              </li>
              <li className="flex items-center gap-1.5 text-good-text">
                <CircleCheck size={16} /> What if it&apos;s used twice?
              </li>
              <li className="flex items-center gap-1.5 text-ink-soft">
                <CircleHelp size={16} /> 6 more hiding…
              </li>
            </ul>
          </HowCard>
          <HowCard color="thinking" step="3" title="See the counterexample" text="Instant feedback from clear rules plus an AI reader — not just a score, but the exact way you could be misread.">
            <div className="rounded-xl border-2 px-3 py-2 text-sm" style={{ borderColor: "color-mix(in srgb, var(--thinking) 35%, transparent)" }}>
              <p className="font-black uppercase tracking-wider" style={{ color: "var(--thinking-shade)" }}>
                Counterexample
              </p>
              <p>&ldquo;it&rdquo; could mean the server, not the file — and the server gets deleted.</p>
            </div>
          </HowCard>
        </div>
      </section>

      {/* Methods */}
      <section className="bg-bg-soft">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-center text-2xl font-black">Built on methods engineers already trust</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["ASD-STE100", "Simplified Technical English from aircraft maintenance manuals."],
              ["EARS", "The five requirement templates first used at Rolls-Royce."],
              ["TLA+ & Alloy", "Thinking in invariants and counterexamples, like AWS does."],
              ["Plain language", "Short sentences, active voice, no fog."],
            ].map(([name, text]) => (
              <div key={name} className="card px-4 py-4">
                <p className="font-black">{name}</p>
                <p className="text-sm font-bold text-ink-soft">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center">
            <Link href="/about" className="font-black text-brand underline underline-offset-4">
              Why this works →
            </Link>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl px-6 py-10 text-center text-white" style={{ background: "var(--brand)", boxShadow: "0 6px 0 var(--brand-shade)" }}>
          <div className="mx-auto mb-2 w-fit">
            <Mascot mood="cheer" size={130} />
          </div>
          <h2 className="text-3xl font-black">No fog allowed.</h2>
          <p className="mt-1 text-lg font-bold opacity-90">Your first lesson takes about three minutes.</p>
          <Link href="/welcome" onClick={markStarted} className="btn3d mt-6 inline-flex min-w-56 !bg-white !text-[var(--brand-shade)]" style={{ boxShadow: "0 4px 0 rgba(0,0,0,0.18)" }}>
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t-2 border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-6 text-sm font-black uppercase tracking-wider text-ink-soft">
          <Link href="/about" className="hover:text-ink">
            About
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <button type="button" onClick={openCookieSettings} className="uppercase hover:text-ink">
            Cookie settings
          </button>
        </div>
      </footer>
    </div>
  );
}

/** Lumi's beam sweeps through fog; fuzzy sentences come out crisp. */
function LighthouseScene() {
  // Even ticks show the fuzzy sentence, odd ticks the clear rewrite.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 2600);
    return () => clearInterval(t);
  }, []);
  const i = Math.floor(tick / 2) % FUZZY_TO_CLEAR.length;
  const clear = tick % 2 === 1;
  const pair = FUZZY_TO_CLEAR[i];
  return (
    <div className="relative mx-auto h-[320px] w-full max-w-md sm:h-[380px]" aria-hidden>
      <FogBank className="absolute inset-x-0 top-6 h-24 w-full opacity-80" />
      <FogBank className="absolute inset-x-0 bottom-10 h-24 w-full opacity-60" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <Mascot size={250} mood={clear ? "happy" : "idle"} />
      </div>
      <div className="absolute right-0 top-2 w-60 sm:w-64">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${i}-${clear}`}
            initial={{ opacity: 0, y: 8, filter: clear ? "blur(0px)" : "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: clear ? "blur(0px)" : "blur(1.6px)" }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45 }}
            className={`card px-4 py-3 text-sm font-extrabold ${clear ? "!border-good/60" : ""}`}
          >
            {clear ? (
              <span className="flex gap-2 text-good-text">
                <Sparkles size={18} className="shrink-0" /> {pair.clear}
              </span>
            ) : (
              <span className="text-ink-soft">{pair.fuzzy}</span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function HowCard({ color, step, title, text, children }: { color: string; step: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex min-h-40 flex-col justify-center gap-2 px-5 py-5 font-bold" style={{ background: `color-mix(in srgb, var(--${color}) 10%, var(--surface))` }}>
        {children}
      </div>
      <div className="px-5 py-4">
        <p className="text-sm font-black uppercase tracking-widest" style={{ color: `var(--${color}-shade)` }}>
          Step {step}
        </p>
        <h3 className="text-xl font-black">{title}</h3>
        <p className="font-bold text-ink-soft">{text}</p>
      </div>
    </div>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Mascot size={44} mood="think" />
      <span className="rounded-2xl border-2 border-line bg-surface px-3 py-1.5 text-sm font-black">{children}</span>
    </div>
  );
}
