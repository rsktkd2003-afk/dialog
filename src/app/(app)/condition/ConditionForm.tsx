"use client";

import { useActionState } from "react";
import { Field, FormMessage, ScalePicker, SubmitButton, type ActionState } from "@/components/form";
import { saveConditionAction } from "./actions";

type Initial = {
  sleepHours: number | null;
  sleepQuality: number | null;
  fatigue: number | null;
  soreness: number | null;
  feeling: number | null;
  isRestDay: boolean;
  note: string | null;
} | null;

/** 睡眠・疲労などの日常的な体調（1日1件） */
export function ConditionForm({ date, initial, usualSleep }: { date: string; initial: Initial; usualSleep: number | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveConditionAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate key={date}>
      <input type="hidden" name="date" value={date} />
      <Field label="睡眠時間" name="sleepHours" type="number" inputMode="decimal" step="0.5" unit="時間" defaultValue={initial?.sleepHours ?? usualSleep ?? undefined} error={e.sleepHours} />
      <ScalePicker label="睡眠の質" name="sleepQuality" defaultValue={initial?.sleepQuality} lowLabel="悪い" highLabel="良い" error={e.sleepQuality} />
      <ScalePicker label="全身の疲労" name="fatigue" defaultValue={initial?.fatigue} lowLabel="なし" highLabel="強い" error={e.fatigue} />
      <ScalePicker label="筋肉痛" name="soreness" defaultValue={initial?.soreness} lowLabel="なし" highLabel="強い" error={e.soreness} />
      <ScalePicker label="今日の調子" name="feeling" defaultValue={initial?.feeling} lowLabel="悪い" highLabel="良い" error={e.feeling} />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="isRestDay" defaultChecked={initial?.isRestDay} className="size-5" />
        今日は休養日
      </label>
      <Field label="メモ" name="note" defaultValue={initial?.note ?? undefined} error={e.note} optional maxLength={500} />
      <FormMessage state={state} />
      <SubmitButton className="w-full">体調を保存</SubmitButton>
    </form>
  );
}
