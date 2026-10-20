import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "../db/client";
import { createSession, deleteSession, validateSession, type SessionUser } from "./service";

export const SESSION_COOKIE = "vc_session";

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSession(getDb(), userId);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

/** リクエスト内で1回だけセッションを検証する */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await validateSession(getDb(), token);
  if (!result) return null;
  if (result.renewed) {
    try {
      store.set(SESSION_COOKIE, token, cookieOptions(result.expiresAt));
    } catch {
      // Server Component から呼ばれた場合はクッキーを更新できない。次回のServer Action等で更新される。
    }
  }
  return result.user;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(getDb(), token);
  store.delete(SESSION_COOKIE);
}
