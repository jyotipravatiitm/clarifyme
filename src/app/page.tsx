import { TRACKS } from "@/lib/content";
import { aiStatus } from "@/lib/ai/status";
import { HomeClient } from "@/components/game/HomeClient";

export const dynamic = "force-dynamic";

export default function Home() {
  const ai = aiStatus();
  return <HomeClient tracks={TRACKS} aiLabel={ai.label} aiOn={ai.jev || ai.llm} />;
}
