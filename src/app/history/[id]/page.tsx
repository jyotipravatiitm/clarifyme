import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ChevronLeft, RotateCcw, Star } from "lucide-react";
import { getDb } from "@/db";
import { getChallenge, getLesson } from "@/lib/content";
import { AppShell } from "@/components/shell/AppShell";
import { AttemptView, type AttemptData } from "@/components/review/AttemptView";
import { peekActor } from "@/server/actor";
import { getSessionDetail } from "@/server/sessions";

export const metadata: Metadata = { title: "Session · ClarifyMe" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const { userId } = await peekActor();
  if (!db) notFound();
  if (!userId) redirect(`/sign-in?redirect_url=/history/${id}`);
  const detail = await getSessionDetail(db, userId, id);
  if (!detail) notFound();
  const { session, attempts } = detail;
  const ref = getLesson(session.lessonId);

  // Group attempts by challenge, in lesson order.
  const order = ref?.lesson.steps ?? [...new Set(attempts.map((a) => a.challengeId))];
  const byChallenge = order
    .map((cid) => ({ cid, title: getChallenge(cid)?.title ?? cid, prompt: getChallenge(cid)?.prompt, list: attempts.filter((a) => a.challengeId === cid) }))
    .filter((g) => g.list.length);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link href="/history" className="mb-4 inline-flex items-center gap-1 font-extrabold text-ink-soft hover:text-ink">
          <ChevronLeft size={20} /> All sessions
        </Link>
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <p className="text-sm font-black uppercase tracking-widest" style={{ color: `var(--${session.trackId}-shade)` }}>
              {ref?.track.title} · {session.startedAt.toLocaleDateString("en", { dateStyle: "medium" })}
            </p>
            <h1 className="text-3xl font-black">{ref?.lesson.title ?? session.lessonId}</h1>
            {session.status === "completed" && (
              <p className="mt-1 flex items-center gap-2 font-extrabold text-ink-soft">
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((s) => (
                    <Star key={s} size={18} strokeWidth={2.5} className={s < (session.stars ?? 0) ? "fill-gold text-gold" : "text-line"} />
                  ))}
                </span>
                +{session.xp ?? 0} XP
              </p>
            )}
          </div>
          <Link href={`/lesson/${session.lessonId}`} className="btn3d">
            <RotateCcw size={18} /> Retry lesson
          </Link>
        </div>

        <div className="flex flex-col gap-10">
          {byChallenge.map((g) => (
            <section key={g.cid}>
              <h2 className="text-xl font-black">{g.title}</h2>
              {g.prompt && <p className="mb-3 font-bold text-ink-soft">{g.prompt}</p>}
              <div className="flex flex-col gap-3">
                {g.list.map((a, i) => (
                  <AttemptView
                    key={a.id}
                    n={i + 1}
                    a={{ id: a.id, kind: a.kind, input: a.input as AttemptData["input"], result: a.result as AttemptData["result"], pass: a.pass, stars: a.stars, createdAt: a.createdAt.toISOString() }}
                  />
                ))}
              </div>
            </section>
          ))}
          {!byChallenge.length && <p className="font-bold text-ink-soft">No answers were checked in this session.</p>}
        </div>
      </div>
    </AppShell>
  );
}
