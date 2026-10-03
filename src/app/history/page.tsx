import Link from "next/link";
import type { Metadata } from "next";
import { History as HistoryIcon, LogIn } from "lucide-react";
import { getDb } from "@/db";
import { getLesson } from "@/lib/content";
import { AppShell } from "@/components/shell/AppShell";
import { Mascot } from "@/components/game/Mascot";
import { HistoryList, type HistoryItem } from "@/components/review/HistoryList";
import { peekActor } from "@/server/actor";
import { clerkEnabled } from "@/server/config";
import { listSessions } from "@/server/sessions";

export const metadata: Metadata = { title: "Review · ClarifyMe" };

export default async function HistoryPage() {
  const db = getDb();
  const { userId } = await peekActor();

  let body: React.ReactNode;
  if (!clerkEnabled() || !db) {
    body = <Empty title="Session history is not set up here" text="This copy of ClarifyMe runs without accounts or a database, so answers are not saved. Progress still lives in your browser." />;
  } else if (!userId) {
    body = (
      <Empty title="Sign in to review your sessions" text="Every answer you write, the counterexamples, and your scores are saved to your account. Lessons you played as a guest come with you.">
        <div className="flex gap-3">
          <Link href="/sign-in?redirect_url=/history" className="btn3d">
            <LogIn size={18} /> Sign in
          </Link>
          <Link href="/sign-up?redirect_url=/history" className="btn3d ghost">
            Create account
          </Link>
        </div>
      </Empty>
    );
  } else {
    const sessions = await listSessions(db, userId);
    const items: HistoryItem[] = sessions.map((s) => {
      const ref = getLesson(s.lessonId);
      return {
        id: s.id,
        lessonTitle: ref?.lesson.title ?? s.lessonId,
        icon: ref?.lesson.icon ?? "star",
        trackId: s.trackId,
        trackTitle: ref?.track.title ?? s.trackId,
        status: s.status,
        stars: s.stars,
        xp: s.xp,
        attemptCount: s.attemptCount,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
      };
    });
    body = items.length ? (
      <HistoryList items={items} />
    ) : (
      <Empty title="Nothing to review yet" text="Finish a lesson and every answer you wrote will show up here, with the judge's feedback.">
        <Link href="/learn" className="btn3d">
          Start a lesson
        </Link>
      </Empty>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 flex items-center gap-2 text-3xl font-black">
          <HistoryIcon size={30} className="text-brand" /> Review
        </h1>
        <p className="mb-6 font-bold text-ink-soft">Look back at what you wrote and how a careful reader took it.</p>
        {body}
      </div>
    </AppShell>
  );
}

function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-10 text-center">
      <Mascot mood="idle" size={110} />
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="max-w-md font-bold text-ink-soft">{text}</p>
      {children}
    </div>
  );
}
