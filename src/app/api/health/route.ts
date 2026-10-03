import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  try {
    if (db) await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: db ? "up" : "off" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
