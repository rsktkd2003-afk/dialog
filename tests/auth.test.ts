import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  LOCK_MS,
  MAX_FAILED_LOGINS,
  SESSION_TTL_MS,
  authenticate,
  changePassword,
  createSession,
  createUser,
  deleteAccount,
  deleteSession,
  hashToken,
  validateSession,
} from "../src/lib/auth/service";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { bodyMeasurements, sessions, users } from "../src/lib/db/schema";
import type { Db } from "../src/lib/db/types";
import { addBodyMeasurement } from "../src/lib/repo/body";
import { createFood, createRecipe } from "../src/lib/repo/meals";
import { createWorkout, listExercises } from "../src/lib/repo/training";
import { createTestDb } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(async () => close());

describe("password", () => {
  it("ハッシュと検証", async () => {
    const h = await hashPassword("password-123");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("password-123", h)).toBe(true);
    expect(await verifyPassword("password-124", h)).toBe(false);
    expect(await verifyPassword("password-123", "broken")).toBe(false);
  });
  it("同じパスワードでもソルトにより異なるハッシュ", async () => {
    expect(await hashPassword("same-password")).not.toBe(await hashPassword("same-password"));
  });
});

describe("登録とログイン", () => {
  it("メールアドレスは正規化し、重複登録できない", async () => {
    const a = await createUser(db, { email: " Taro@Example.com ", password: "pass-word-1", displayName: "太郎" });
    expect(a.ok && a.user.email).toBe("taro@example.com");
    const b = await createUser(db, { email: "taro@example.com", password: "pass-word-2", displayName: "別人" });
    expect(b).toEqual({ ok: false, reason: "email_taken" });
  });

  it("正しいパスワードでのみ認証", async () => {
    expect((await authenticate(db, "TARO@example.com", "pass-word-1")).ok).toBe(true);
    expect(await authenticate(db, "taro@example.com", "wrong")).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticate(db, "nobody@example.com", "pass-word-1")).toEqual({ ok: false, reason: "invalid" });
  });

  it("連続失敗でロックし、時間経過で解除", async () => {
    await createUser(db, { email: "lock@example.com", password: "pass-word-1", displayName: "lock" });
    const now = new Date("2026-10-20T00:00:00Z");
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) {
      expect((await authenticate(db, "lock@example.com", "bad", now)).ok).toBe(false);
    }
    expect(await authenticate(db, "lock@example.com", "bad", now)).toEqual({ ok: false, reason: "locked" });
    // ロック中は正しいパスワードでも拒否
    expect(await authenticate(db, "lock@example.com", "pass-word-1", now)).toEqual({ ok: false, reason: "locked" });
    const later = new Date(now.getTime() + LOCK_MS + 1000);
    expect((await authenticate(db, "lock@example.com", "pass-word-1", later)).ok).toBe(true);
  });
});

describe("セッション", () => {
  it("DBにはトークンのハッシュのみ保存", async () => {
    const r = await createUser(db, { email: "sess@example.com", password: "pass-word-1", displayName: "s" });
    if (!r.ok) throw new Error();
    const { token } = await createSession(db, r.user.id);
    const rows = await db.select().from(sessions).where(eq(sessions.userId, r.user.id));
    expect(rows[0]!.id).toBe(hashToken(token));
    expect(rows[0]!.id).not.toBe(token);
    expect((await validateSession(db, token))?.user.id).toBe(r.user.id);
    expect(await validateSession(db, token + "x")).toBeNull();
    expect(await validateSession(db, "")).toBeNull();
  });

  it("期限切れは無効、期限が近いと延長", async () => {
    const r = await createUser(db, { email: "exp@example.com", password: "pass-word-1", displayName: "e" });
    if (!r.ok) throw new Error();
    const t0 = new Date("2026-01-01T00:00:00Z");
    const { token } = await createSession(db, r.user.id, t0);
    const near = new Date(t0.getTime() + SESSION_TTL_MS - 24 * 3600 * 1000);
    expect((await validateSession(db, token, near))?.renewed).toBe(true);
    const beyond = new Date(near.getTime() + SESSION_TTL_MS + 1000);
    expect(await validateSession(db, token, beyond)).toBeNull();
  });

  it("ログアウトでセッション削除", async () => {
    const r = await createUser(db, { email: "out@example.com", password: "pass-word-1", displayName: "o" });
    if (!r.ok) throw new Error();
    const { token } = await createSession(db, r.user.id);
    await deleteSession(db, token);
    expect(await validateSession(db, token)).toBeNull();
  });

  it("パスワード変更で既存セッションを無効化", async () => {
    const r = await createUser(db, { email: "chg@example.com", password: "pass-word-1", displayName: "c" });
    if (!r.ok) throw new Error();
    const { token } = await createSession(db, r.user.id);
    expect(await changePassword(db, r.user.id, "wrong", "new-pass-word")).toBe(false);
    expect(await changePassword(db, r.user.id, "pass-word-1", "new-pass-word")).toBe(true);
    expect(await validateSession(db, token)).toBeNull();
    expect((await authenticate(db, "chg@example.com", "new-pass-word")).ok).toBe(true);
  });
});

describe("アカウント削除", () => {
  it("パスワード確認後、関連データをすべて削除", async () => {
    const r = await createUser(db, { email: "del@example.com", password: "pass-word-1", displayName: "d" });
    if (!r.ok) throw new Error();
    const uid = r.user.id;
    await addBodyMeasurement(db, uid, {
      date: "2026-10-01", weightKg: 70, bodyFatPct: null, bodyFatMethod: null, waistCm: null, neckCm: null,
      chestCm: null, hipCm: null, thighCm: null, calfCm: null, note: null,
    });
    const food = await createFood(db, uid, {
      name: "鶏むね", brand: null, category: "ingredient", basis: "per100g", servingG: null, servingLabel: null,
      energyKcal: 100, proteinG: 20, fatG: 2, carbsG: 0, source: "user_label",
    });
    await createRecipe(db, uid, { name: "レシピ", servings: 1, items: [{ foodId: food.id, amount: 100, unit: "g" }] });
    const ex = (await listExercises(db, uid))[0]!;
    await createWorkout(db, uid, {
      date: "2026-10-01", title: null, split: "lower", durationMin: 60, sessionRpe: 7, note: null,
      sets: [{ exerciseId: ex.id, side: "both", weightKg: 80, reps: 5, rpe: null, rir: null, restSec: null }],
    });
    expect(await deleteAccount(db, uid, "wrong")).toBe(false);
    expect(await deleteAccount(db, uid, "pass-word-1")).toBe(true);
    expect(await db.select().from(users).where(eq(users.id, uid))).toHaveLength(0);
    expect(await db.select().from(bodyMeasurements).where(eq(bodyMeasurements.userId, uid))).toHaveLength(0);
    // 共通種目は残る
    expect((await listExercises(db, "00000000-0000-0000-0000-000000000000")).length).toBeGreaterThan(0);
  });
});
