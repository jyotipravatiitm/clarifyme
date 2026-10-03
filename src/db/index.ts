import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __clarifymeDb?: { url: string; db: DB } };

/** Returns the database, or null when DATABASE_URL is not set (history and server trial are then off). */
export function getDb(): DB | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (globalForDb.__clarifymeDb?.url !== url) {
    const client = postgres(url, { max: Number(process.env.DATABASE_POOL_SIZE ?? 10), idle_timeout: 30, prepare: false });
    globalForDb.__clarifymeDb = { url, db: drizzle(client, { schema }) };
  }
  return globalForDb.__clarifymeDb.db;
}

export { schema };
