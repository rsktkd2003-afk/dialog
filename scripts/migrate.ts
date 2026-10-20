import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "../src/lib/db/schema";
import { seedDefaults } from "../src/lib/db/seed";
import type { Db } from "../src/lib/db/types";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が設定されていません。");
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  await seedDefaults(db as unknown as Db);
  await pool.end();
  console.log("マイグレーションと初期データの投入が完了しました。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
