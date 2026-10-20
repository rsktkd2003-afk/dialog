"use client";

import { useActionState } from "react";
import { Field, FormMessage, ScalePicker, SubmitButton, type ActionState } from "@/components/form";
import { saveConditionAction } from "./actions";

const SITES = [
  ["shoulder", "肩"],
  ["elbow", "肘"],
  ["lower_back", "腰"],
  ["knee", "膝"],
  ["ankle", "足首"],
  ["other", "その他"],
] as const;

type Initial = {
  sleepHours: number | null;
  sleepQuality: number | null;
  fatigue: number | null;
  soreness: number | null;
  feeling: number | null;
  isRestDay: boolean;
  discomforts: { site: string; level: number; side: string | null }[];
  note: string | null;
} | null;

export function ConditionForm({ date, initial, usualSleep }: { date: string; initial: Initial; usualSleep: number | null }) {
  const [state, action] = useActionState<ActionState, FormData>(saveConditionAction, {});
  const e = state.errors ?? {};
  const dmap = new Map((initial?.discomforts ?? []).map((d) => [d.site, d]));
  return (
    <form action={action} className="space-y-5" noValidate key={date}>
      <input type="hidden" name="date" value={date} />
      <Field label="睡眠時間" name="sleepHours" type="number" inputMode="decimal" step="0.5" unit="時間" defaultValue={initial?.sleepHours ?? usualSleep ?? undefined} error={e.sleepHours} />
      <ScalePicker label="睡眠の質" name="sleepQuality" defaultValue={initial?.sleepQuality} lowLabel="悪い" highLabel="良い" error={e.sleepQuality} />
      <ScalePicker label="全身の疲労" name="fatigue" defaultValue={initial?.fatigue} lowLabel="なし" highLabel="強い" error={e.fatigue} />
      <ScalePicker label="筋肉痛" name="soreness" defaultValue={initial?.soreness} lowLabel="なし" highLabel="強い" error={e.soreness} />
      <ScalePicker label="調子" name="feeling" defaultValue={initial?.feeling} lowLabel="悪い" highLabel="良い" error={e.feeling} />
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="isRestDay" defaultChecked={initial?.isRestDay} className="size-5" />
        今日は休養日
      </label>
      <fieldset className="rounded-xl border border-line bg-surface p-3">
        <legend className="px-1 text-sm font-medium">違和感・痛みのある部位</legend>
        <div className="space-y-2">
          {SITES.map(([site, label]) => (
            <div key={site} className="grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-2">
              <span className="text-sm">{label}</span>
              <select name={`level_${site}`} aria-label={`${label}の状態`} defaultValue={dmap.get(site)?.level ?? ""} className="min-h-11 rounded-lg border border-line bg-surface px-2 text-sm">
                <option value="">なし</option>
                <option value="1">違和感</option>
                <option value="2">痛み</option>
                <option value="3">強い痛み</option>
              </select>
              <select name={`side_${site}`} aria-label={`${label}の左右`} defaultValue={dmap.get(site)?.side ?? ""} className="min-h-11 rounded-lg border border-line bg-surface px-2 text-sm">
                <option value="">左右</option>
                <option value="left">左</option>
                <option value="right">右</option>
                <option value="both">両方</option>
              </select>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">このアプリは痛みの原因を判断しません。痛みが続く・繰り返す・強くなる場合は医療専門職に相談してください。</p>
      </fieldset>
      <Field label="メモ" name="note" defaultValue={initial?.note ?? undefined} error={e.note} optional />
      <FormMessage state={state} />
      <SubmitButton className="w-full">保存する</SubmitButton>
    </form>
  );
}
