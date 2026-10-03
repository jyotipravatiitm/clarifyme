import { NextResponse } from "next/server";
import { getActor } from "@/server/actor";
import { trialFor } from "@/server/trial";

export async function GET() {
  return NextResponse.json(await trialFor(await getActor()), { headers: { "Cache-Control": "no-store" } });
}
