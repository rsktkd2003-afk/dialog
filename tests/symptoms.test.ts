import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { deleteAccount } from "../src/lib/auth/service";
import { conditionLogs, symptomLogs } from "../src/lib/db/schema";
import type { Db } from "../src/lib/db/types";
import { conditionInput, getCondition, upsertCondition } from "../src/lib/repo/condition";
import { exportUserData } from "../src/lib/repo/export";
import { addSymptom, deleteSymptom, listSymptoms, symptomInput, type SymptomInput } from "../src/lib/repo/symptoms";
import { createTestDb, createTestUser } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
let alice: { id: string };
let bob: { id: string };

const base: SymptomInput = {
  date: "2026-10-20",
  site: "ankle",
  side: "right",
  kind: "pain",
  level: 4,
  situation: "landing",
  impact: "slight",
  note: null,
};

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  alice = await createTestUser(db, "alice");
  bob = await createTestUser(db, "bob");
});
afterAll(async () => close());

describe("不調記録", () => {
  it("作成し、同じ日に異なる部位を複数記録できる", async () => {
    const a = await addSymptom(db, alice.id, base);
    const b = await addSymptom(db, alice.id, { ...base, site: "knee", side: "left", kind: "discomfort", level: 2, note: "着地後に違和感" });
    const c = await addSymptom(db, alice.id, { ...base, level: 6 });
    expect(a.id).not.toBe(b.id);
    const list = await listSymptoms(db, alice.id, { from: "2026-10-20", to: "2026-10-20" });
    expect(list).toHaveLength(3);
    expect(new Set(list.map((x) => x.site))).toEqual(new Set(["ankle", "knee"]));
    expect(list.find((x) => x.id === b.id)?.note).toBe("着地後に違和感");
    expect(list.find((x) => x.id === c.id)?.level).toBe(6);
  });

  it("履歴は新しい日付順で取得でき、期間で絞り込める", async () => {
    await addSymptom(db, alice.id, { ...base, date: "2026-10-01", site: "shoulder" });
    await addSymptom(db, alice.id, { ...base, date: "2026-09-01", site: "wrist" });
    const all = await listSymptoms(db, alice.id);
    expect(all[0]!.date >= all[all.length - 1]!.date).toBe(true);
    expect(all.map((x) => x.date)).toEqual([...all.map((x) => x.date)].sort().reverse());
    expect((await listSymptoms(db, alice.id, { from: "2026-10-01" })).every((x) => x.date >= "2026-10-01")).toBe(true);
  });

  it("削除できる（2回目は対象なし）", async () => {
    const x = await addSymptom(db, alice.id, { ...base, date: "2026-10-05", site: "neck" });
    expect(await deleteSymptom(db, alice.id, x.id)).toBe(true);
    expect(await deleteSymptom(db, alice.id, x.id)).toBe(false);
    expect((await listSymptoms(db, alice.id)).some((y) => y.id === x.id)).toBe(false);
  });

  it("他のユーザーの記録は取得・削除できない", async () => {
    const x = await addSymptom(db, alice.id, { ...base, date: "2026-10-06", site: "back" });
    expect(await listSymptoms(db, bob.id)).toHaveLength(0);
    expect(await deleteSymptom(db, bob.id, x.id)).toBe(false);
    expect((await listSymptoms(db, alice.id)).some((y) => y.id === x.id)).toBe(true);
    const bobsExport = await exportUserData(db, bob.id);
    expect(bobsExport.symptomLogs).toHaveLength(0);
  });

  it("DBの制約でも程度0〜10・メモ500文字を保証する", async () => {
    await expect(db.insert(symptomLogs).values({ ...base, userId: alice.id, level: 11 })).rejects.toThrow();
    await expect(db.insert(symptomLogs).values({ ...base, userId: alice.id, note: "あ".repeat(501) })).rejects.toThrow();
  });
});

describe("入力値の検証", () => {
  const form = { date: "2026-10-20", site: "hip", side: "center", kind: "numbness", level: "0", situation: "at_rest", impact: "none", note: "" };
  it("正しい入力。空のメモは null", () => {
    const r = symptomInput.safeParse(form);
    expect(r.success && r.data.note).toBeNull();
    expect(r.success && r.data.level).toBe(0);
  });
  it("程度は0〜10の整数", () => {
    expect(symptomInput.safeParse({ ...form, level: "10" }).success).toBe(true);
    expect(symptomInput.safeParse({ ...form, level: "11" }).success).toBe(false);
    expect(symptomInput.safeParse({ ...form, level: "-1" }).success).toBe(false);
    expect(symptomInput.safeParse({ ...form, level: "2.5" }).success).toBe(false);
    expect(symptomInput.safeParse({ ...form, level: "" }).success).toBe(false);
  });
  it("選択肢にない値は拒否", () => {
    expect(symptomInput.safeParse({ ...form, site: "elbow" }).success).toBe(false);
    expect(symptomInput.safeParse({ ...form, side: "front" }).success).toBe(false);
    expect(symptomInput.safeParse({ ...form, kind: "fracture" }).success).toBe(false);
    expect(symptomInput.safeParse({ ...form, situation: "sleep" }).success).toBe(false);
    expect(symptomInput.safeParse({ ...form, impact: "severe" }).success).toBe(false);
  });
  it("メモは500文字まで", () => {
    expect(symptomInput.safeParse({ ...form, note: "あ".repeat(500) }).success).toBe(true);
    expect(symptomInput.safeParse({ ...form, note: "あ".repeat(501) }).success).toBe(false);
  });
  it("日付の形式", () => {
    expect(symptomInput.safeParse({ ...form, date: "2026-02-30" }).success).toBe(false);
    expect(symptomInput.safeParse({ ...form, date: "" }).success).toBe(false);
  });
});

describe("既存のコンディション記録との互換性", () => {
  it("日常の体調を保存し直しても、旧形式の不調記録（discomforts）は消えない", async () => {
    const u = await createTestUser(db, "legacy");
    await upsertCondition(db, u.id, {
      date: "2026-10-10", sleepHours: 7, sleepQuality: 3, fatigue: 3, soreness: 2, feeling: 3, isRestDay: false,
      discomforts: [{ site: "knee", side: "left", level: 2, note: null }], note: null,
    });
    // 新しい画面からの保存（discomforts を送らない）
    const parsed = conditionInput.parse({ date: "2026-10-10", sleepHours: "8", fatigue: "2" });
    expect(parsed.discomforts).toBeUndefined();
    await upsertCondition(db, u.id, parsed);
    const row = await getCondition(db, u.id, "2026-10-10");
    expect(row?.sleepHours).toBe(8);
    expect(row?.discomforts).toEqual([{ site: "knee", side: "left", level: 2, note: null }]);
  });

  it("discomforts なしで新規作成した日は空配列", async () => {
    const u = await createTestUser(db, "fresh");
    await upsertCondition(db, u.id, conditionInput.parse({ date: "2026-10-11", sleepHours: "7" }));
    expect((await getCondition(db, u.id, "2026-10-11"))?.discomforts).toEqual([]);
  });
});

describe("エクスポート・アカウント削除との連携", () => {
  it("エクスポートに本人の不調記録が含まれる", async () => {
    const u = await createTestUser(db, "exporter");
    await addSymptom(db, u.id, { ...base, note: "メモ" });
    const data = await exportUserData(db, u.id);
    expect(data.symptomLogs).toHaveLength(1);
    expect(data.symptomLogs[0]!.note).toBe("メモ");
  });

  it("アカウント削除で不調記録・コンディション記録も削除される", async () => {
    const u = await createTestUser(db, "leaver");
    await addSymptom(db, u.id, base);
    await upsertCondition(db, u.id, conditionInput.parse({ date: "2026-10-12", sleepHours: "7" }));
    expect(await deleteAccount(db, u.id, "correct horse battery")).toBe(true);
    expect(await db.select().from(symptomLogs).where(eq(symptomLogs.userId, u.id))).toHaveLength(0);
    expect(await db.select().from(conditionLogs).where(eq(conditionLogs.userId, u.id))).toHaveLength(0);
  });
});
