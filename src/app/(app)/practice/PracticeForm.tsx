"use client";

import { useActionState } from "react";
import { Field, FormMessage, ScalePicker, SubmitButton, type ActionState } from "@/components/form";
import { addPracticeAction } from "./actions";

export function PracticeForm({ date, minutes, intensity }: { date: string; minutes: number | null; intensity: string | null }) {
  const [state, action] = useActionState<ActionState, FormData>(addPracticeAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="日付" name="date" type="date" defaultValue={date} error={e.date} />
        <Field label="開始時刻" name="startTime" type="time" error={e.startTime} optional />
      </div>
      <Field label="練習時間" name="durationMin" type="number" inputMode="numeric" unit="分" defaultValue={minutes ?? undefined} error={e.durationMin} />
      <fieldset>
        <legend className="mb-1 text-sm font-medium">練習強度</legend>
        <div className="flex gap-2">
          {[
            ["low", "低"],
            ["moderate", "中"],
            ["high", "高"],
          ].map(([v, l]) => (
            <label key={v} className="flex-1">
              <input type="radio" name="intensity" value={v} defaultChecked={(intensity ?? "moderate") === v} className="peer sr-only" />
              <span className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink">{l}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <details className="rounded-xl border border-line bg-surface p-3">
        <summary className="cursor-pointer text-sm font-medium">詳しく記録（任意）</summary>
        <div className="mt-3 space-y-4">
          <Field label="きつさ RPE（0〜10）" name="rpe" type="number" inputMode="numeric" min={0} max={10} error={e.rpe} optional hint="0＝安静、10＝最大限。練習全体の主観的なきつさ" />
          <div className="grid grid-cols-2 gap-2">
            <Field label="ジャンプ回数" name="jumpCount" type="number" inputMode="numeric" unit="回" error={e.jumpCount} optional />
            <Field label="スパイク本数" name="spikeCount" type="number" inputMode="numeric" unit="本" error={e.spikeCount} optional />
          </div>
          <ScalePicker label="パフォーマンス（主観）" name="performance" lowLabel="悪い" highLabel="良い" error={e.performance} />
          <ScalePicker label="練習後の疲労感" name="fatigue" lowLabel="軽い" highLabel="強い" error={e.fatigue} />
          <Field label="メモ" name="note" error={e.note} optional />
        </div>
      </details>
      <SubmitButton className="w-full">練習を記録</SubmitButton>
    </form>
  );
}
