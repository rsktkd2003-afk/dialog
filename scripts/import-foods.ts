/**
 * 共通食品データ（全ユーザーが検索できる食品）をCSVから取り込む。
 *
 * 想定データ：文部科学省「日本食品標準成分表（八訂）増補2023年」などを、
 * 利用条件（出典の記載など）を確認したうえで下記の列に変換したもの。
 * 本スクリプトはデータ本体を含まない。値は100g（可食部）あたりで記載する。
 *
 * CSVの列（1行目はヘッダー）:
 *   source_ref,name,energy_kcal,protein_g,fat_g,carbs_g
 *   source_ref : 食品番号など、元データで一意な識別子（再実行時の更新キー）
 *   空欄・「-」は「不明」として null で取り込む（0にはしない）。「Tr」は微量として0。
 *
 * 使い方: DATABASE_URL=... npm run foods:import -- ./foods.csv
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/lib/db/schema";
import { foods } from "../src/lib/db/schema";

const HEADER = ["source_ref", "name", "energy_kcal", "protein_g", "fat_g", "carbs_g"];

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * 成分表の記号の扱い：「-」・空欄＝未測定（null）、「Tr」＝微量（0）、
 * 括弧付きの値（例「(0)」「(1.2)」）＝推定値として括弧を外した数値。
 */
function num(v: string | undefined, max: number, line: number, col: string): number | null {
  if (v == null || v === "" || v === "-") return null;
  const t = v.replace(/^\((.*)\)$/, "$1");
  if (t === "Tr") return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`${line}行目 ${col}: 値が不正です (${v})`);
  return n;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("CSVファイルのパスを指定してください");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が設定されていません。");
  const lines = readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = parseCsvLine(lines[0] ?? "");
  if (HEADER.some((h, i) => header[i] !== h)) throw new Error(`ヘッダーは ${HEADER.join(",")} にしてください`);

  const rows = lines.slice(1).map((l, i) => {
    const c = parseCsvLine(l);
    const ln = i + 2;
    if (!c[0] || !c[1]) throw new Error(`${ln}行目: source_ref と name は必須です`);
    return {
      sourceRef: c[0],
      name: c[1],
      energyKcal: num(c[2], 900, ln, "energy_kcal"),
      proteinG: num(c[3], 100, ln, "protein_g"),
      fatG: num(c[4], 100, ln, "fat_g"),
      carbsG: num(c[5], 100, ln, "carbs_g"),
    };
  });

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  let n = 0;
  for (const r of rows) {
    await db
      .insert(foods)
      .values({ ...r, ownerUserId: null, category: "ingredient", basis: "per100g", source: "mext" })
      .onConflictDoUpdate({
        target: [foods.source, foods.sourceRef],
        targetWhere: sql`${foods.ownerUserId} is null`,
        set: { name: r.name, energyKcal: r.energyKcal, proteinG: r.proteinG, fatG: r.fatG, carbsG: r.carbsG },
      });
    n++;
  }
  await pool.end();
  console.log(`${n}件を取り込みました。`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
