"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth/server";
import { todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { DISCOMFORT_SITES, conditionInput, upsertCondition } from "@/lib/repo/condition";
import { toFieldErrors } from "@/lib/validation";

export async function saveConditionAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const discomforts = DISCOMFORT_SITES.flatMap((site) => {
    const level = Number(form.get(`level_${site}`));
    if (![1, 2, 3].includes(level)) return [];
    const side = form.get(`side_${site}`);
    return [{ site, level, side: side === "left" || side === "right" || side === "both" ? side : null, note: null }];
  });
  const parsed = conditionInput.safeParse({ ...Object.fromEntries(form), isRestDay: form.get("isRestDay") === "on", discomforts });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), message: "入力内容を確認してください" };
  if (parsed.data.date > todayString()) return { ok: false, message: "未来の日付は記録できません" };
  await upsertCondition(getDb(), user.id, parsed.data);
  revalidatePath("/condition");
  revalidatePath("/");
  const pain = parsed.data.discomforts.some((d) => d.level >= 2);
  return {
    ok: true,
    message: pain
      ? "記録しました。痛みがある場合は無理をせず、続く・強くなる場合は医師や理学療法士などの専門職に相談してください。"
      : "記録しました",
  };
}
