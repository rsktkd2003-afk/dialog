"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth/server";
import { todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import {
  addBodyMeasurement,
  addJumpMeasurement,
  bodyMeasurementInput,
  deleteBodyMeasurement,
  deleteJumpMeasurement,
  jumpMeasurementInput,
} from "@/lib/repo/body";
import { toFieldErrors } from "@/lib/validation";

export async function addBodyAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = bodyMeasurementInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  if (parsed.data.date > todayString()) return { errors: { date: "未来の日付は記録できません" } };
  await addBodyMeasurement(getDb(), user.id, parsed.data);
  revalidatePath("/body");
  revalidatePath("/");
  redirect("/body");
}

export async function addJumpAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = jumpMeasurementInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  if (parsed.data.date > todayString()) return { errors: { date: "未来の日付は記録できません" } };
  await addJumpMeasurement(getDb(), user.id, parsed.data);
  revalidatePath("/body");
  revalidatePath("/");
  redirect("/body#jump");
}

export async function deleteBodyAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(form.get("id"));
  if (id.success) await deleteBodyMeasurement(getDb(), user.id, id.data);
  revalidatePath("/body");
}

export async function deleteJumpAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(form.get("id"));
  if (id.success) await deleteJumpMeasurement(getDb(), user.id, id.data);
  revalidatePath("/body");
}
