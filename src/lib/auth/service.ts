import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { sessions, users } from "../db/schema";
import type { Db } from "../db/types";
import { getDummyHash, hashPassword, verifyPassword } from "./password";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** 有効期限の残りがこれを下回ったら延長する */
const SESSION_RENEW_MS = 15 * 24 * 60 * 60 * 1000;
export const MAX_FAILED_LOGINS = 10;
export const LOCK_MS = 15 * 60 * 1000;

export type SessionUser = { id: string; email: string; displayName: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUser(
  db: Db,
  input: { email: string; password: string; displayName: string },
): Promise<{ ok: true; user: SessionUser } | { ok: false; reason: "email_taken" }> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const rows = await db
    .insert(users)
    .values({ email, passwordHash, displayName: input.displayName.trim() })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id, email: users.email, displayName: users.displayName });
  const user = rows[0];
  if (!user) return { ok: false, reason: "email_taken" };
  return { ok: true, user };
}

export type AuthResult = { ok: true; user: SessionUser } | { ok: false; reason: "invalid" | "locked" };

export async function authenticate(db: Db, emailInput: string, password: string, now = new Date()): Promise<AuthResult> {
  const email = normalizeEmail(emailInput);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    await verifyPassword(password, await getDummyHash());
    return { ok: false, reason: "invalid" };
  }
  if (user.lockedUntil && user.lockedUntil > now) return { ok: false, reason: "locked" };

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const count = user.failedLoginCount + 1;
    const lock = count >= MAX_FAILED_LOGINS;
    await db
      .update(users)
      .set({ failedLoginCount: lock ? 0 : count, lockedUntil: lock ? new Date(now.getTime() + LOCK_MS) : null })
      .where(eq(users.id, user.id));
    return { ok: false, reason: lock ? "locked" : "invalid" };
  }
  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await db.update(users).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, user.id));
  }
  return { ok: true, user: { id: user.id, email: user.email, displayName: user.displayName } };
}

/** セッションを作成し、クッキーに保存する生トークンを返す（DBにはハッシュのみ保存） */
export async function createSession(db: Db, userId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function validateSession(
  db: Db,
  token: string,
  now = new Date(),
): Promise<{ user: SessionUser; expiresAt: Date; renewed: boolean } | null> {
  if (!token || token.length > 128) return null;
  const id = hashToken(token);
  const [row] = await db
    .select({ user: { id: users.id, email: users.email, displayName: users.displayName }, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  if (row.expiresAt.getTime() - now.getTime() < SESSION_RENEW_MS) {
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    return { user: row.user, expiresAt, renewed: true };
  }
  return { user: row.user, expiresAt: row.expiresAt, renewed: false };
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function deleteExpiredSessions(db: Db, now = new Date()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}

export async function changePassword(db: Db, userId: string, current: string, next: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !(await verifyPassword(current, user.passwordHash))) return false;
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  return true;
}

/** アカウントと関連データをすべて削除する（外部キーの ON DELETE CASCADE による。共通食品・共通種目は残る） */
export async function deleteAccount(db: Db, userId: string, password: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) return false;
  await db.delete(users).where(eq(users.id, userId));
  return true;
}
