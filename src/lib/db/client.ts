import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import type { Db } from "./types";

const globalForDb = globalThis as unknown as { __pool?: Pool };

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が設定されていません。.env.example を参照してください。");
  return new Pool({ connectionString: url, max: 10 });
}

let cached: Db | null = null;

export function getDb(): Db {
  if (cached) return cached;
  const pool = globalForDb.__pool ?? createPool();
  if (process.env.NODE_ENV !== "production") globalForDb.__pool = pool;
  cached = drizzle(pool, { schema }) as unknown as Db;
  return cached;
}
