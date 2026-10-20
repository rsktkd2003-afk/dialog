"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { DomainError } from "@/lib/repo/meals";
import {
  createExercise,
  createTemplateFromWorkout,
  createWorkout,
  deleteTemplate,
  deleteWorkout,
  exerciseInput,
  workoutInput,
} from "@/lib/repo/training";
import { toFieldErrors } from "@/lib/validation";

export async function saveWorkoutAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  let sets: unknown;
  try {
    sets = JSON.parse(String(form.get("sets") ?? "[]"));
  } catch {
    return { ok: false, message: "セットの内容を読み取れませんでした" };
  }
  const parsed = workoutInput.safeParse({ ...Object.fromEntries(form), sets });
  if (!parsed.success) {
    const errors = toFieldErrors(parsed.error);
    const setErr = Object.entries(errors).find(([k]) => k.startsWith("sets."));
    if (setErr) {
      const idx = Number(setErr[0].split(".")[1]);
      return { ok: false, message: `${idx + 1}行目のセット：${setErr[1]}`, errors };
    }
    return { errors, message: Object.values(errors)[0] };
  }
  let id: string;
  try {
    id = await createWorkout(getDb(), user.id, parsed.data);
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    throw e;
  }
  revalidatePath("/training");
  revalidatePath("/");
  redirect(`/training/${id}`);
}

export async function deleteWorkoutAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(form.get("id"));
  if (id.success) await deleteWorkout(getDb(), user.id, id.data);
  revalidatePath("/training");
  redirect("/training");
}

export async function saveTemplateAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z
    .object({ workoutId: z.string().uuid(), name: z.string().trim().min(1, "テンプレート名を入力してください").max(60) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const id = await createTemplateFromWorkout(getDb(), user.id, parsed.data.workoutId, parsed.data.name);
  if (!id) return { ok: false, message: "ワークアウトが見つかりません" };
  revalidatePath("/training");
  return { ok: true, message: "テンプレートに保存しました" };
}

export async function deleteTemplateAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(form.get("id"));
  if (id.success) await deleteTemplate(getDb(), user.id, id.data);
  revalidatePath("/training");
}

export async function createExerciseAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = exerciseInput.safeParse({ ...Object.fromEntries(form), unilateral: form.get("unilateral") === "on" });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  await createExercise(getDb(), user.id, parsed.data);
  revalidatePath("/training");
  return { ok: true, message: `種目「${parsed.data.name}」を追加しました` };
}
