import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../../src/lib/db/schema";
import { seedDefaults } from "../../src/lib/db/seed";
import type { Db } from "../../src/lib/db/types";
import { createUser } from "../../src/lib/auth/service";

export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Db;
  await migrate(drizzle(client, { schema }), { migrationsFolder: "./drizzle" });
  await seedDefaults(db);
  return { db, close: () => client.close() };
}

export async function createTestUser(db: Db, name: string) {
  const r = await createUser(db, { email: `${name}@example.com`, password: "correct horse battery", displayName: name });
  if (!r.ok) throw new Error("user creation failed");
  return r.user;
}
