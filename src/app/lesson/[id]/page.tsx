import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getChallenge, getLesson, toPublic } from "@/lib/content";
import { LessonRunner } from "@/components/lesson/LessonRunner";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const ref = getLesson((await params).id);
  return { title: ref ? `${ref.lesson.title} · ClarifyMe` : "ClarifyMe" };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ref = getLesson(id);
  if (!ref) notFound();
  const steps = ref.lesson.steps.map((s) => toPublic(getChallenge(s)!));
  return (
    <LessonRunner
      lesson={{ id: ref.lesson.id, title: ref.lesson.title, trackId: ref.track.id, trackTitle: ref.track.title }}
      steps={steps}
    />
  );
}
