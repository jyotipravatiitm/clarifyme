import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TRACKS } from "@/lib/content";
import { Landing } from "@/components/landing/Landing";
import { peekActor } from "@/server/actor";

export const dynamic = "force-dynamic";

/** New visitors see the landing page; anyone who has started (or signed in) goes straight to the path. */
export default async function Home() {
  const jar = await cookies();
  const { userId } = await peekActor();
  if (userId || jar.get("cm_started")) redirect("/learn");
  return <Landing tracks={TRACKS.map(({ id, title, tagline }) => ({ id, title, tagline }))} />;
}
