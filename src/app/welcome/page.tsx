import type { Metadata } from "next";
import { TRACKS } from "@/lib/content";
import { Welcome } from "@/components/landing/Welcome";

export const metadata: Metadata = { title: "Welcome · ClarifyMe" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { track } = await searchParams;
  const tracks = TRACKS.map((t) => ({ id: t.id, title: t.title, tagline: t.tagline, firstLesson: t.units[0].lessons[0].id }));
  const initial = tracks.some((t) => t.id === track) ? (track as (typeof tracks)[number]["id"]) : null;
  return <Welcome tracks={tracks} initialTrack={initial} />;
}
