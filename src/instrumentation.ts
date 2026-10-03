/** Runs once when the Next.js server boots: apply database migrations. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL || process.env.SKIP_MIGRATIONS === "1") return;
  const { getDb } = await import("./db");
  const { runMigrations } = await import("./db/migrate");
  const db = getDb();
  if (!db) return;
  try {
    await runMigrations(db);
    console.log("[db] migrations applied");
  } catch (err) {
    console.error("[db] migration failed", err);
    throw err;
  }
}
