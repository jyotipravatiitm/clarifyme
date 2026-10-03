import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { DB } from "./index";

/** Applies pending SQL migrations from ./drizzle. Safe to call on every boot. */
export async function runMigrations(db: DB, folder = path.join(process.cwd(), "drizzle")): Promise<void> {
  await migrate(db, { migrationsFolder: folder });
}
