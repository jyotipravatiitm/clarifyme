import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getActor } from "@/server/actor";
import { deleteUserData } from "@/server/sessions";

/** Deletes the signed-in user's sessions, answers and progress. The Clerk account itself is deleted from the profile menu. */
export async function DELETE() {
  const db = getDb();
  const { userId } = await getActor();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (db) await deleteUserData(db, userId);
  return NextResponse.json({ ok: true });
}
