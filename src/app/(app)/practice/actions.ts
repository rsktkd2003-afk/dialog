"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { addPractice, deletePractice, practiceInput } from "@/lib/repo/practice";
import { toFieldErrors } from "@/lib/validation";

export async function addPracticeAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = practiceInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), message: "入力内容を確認してください" };
  await addPractice(getDb(), user.id, parsed.data);
  revalidatePath("/practice");
  revalidatePath("/");
  return { ok: true, message: "練習を記録しました" };
}

export async function deletePracticeAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(form.get("id"));
  if (id.success) await deletePractice(getDb(), user.id, id.data);
  revalidatePath("/practice");
}
