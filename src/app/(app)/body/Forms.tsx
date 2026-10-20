"use client";

import { useActionState } from "react";
import { Field, FormMessage, SelectField, SubmitButton, type ActionState } from "@/components/form";
import { BODY_FAT_METHOD_OPTIONS, FOOTWEAR_OPTIONS, MEASUREMENT_TYPE_OPTIONS } from "@/lib/options";
import { addBodyAction, addJumpAction } from "./actions";

export function BodyForm({ date }: { date: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addBodyAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {e._form && <p className="text-sm text-critical-ink">{e._form}</p>}
      <Field label="日付" name="date" type="date" defaultValue={date} error={e.date} />
      <Field label="体重" name="weightKg" type="number" inputMode="decimal" step="0.1" unit="kg" error={e.weightKg} autoFocus />
      <details className="rounded-xl border border-line bg-surface p-3">
        <summary className="cursor-pointer text-sm font-medium">体脂肪率・周囲径も記録（任意）</summary>
        <div className="mt-3 space-y-3">
          <Field label="体脂肪率（計測値）" name="bodyFatPct" type="number" inputMode="decimal" step="0.1" unit="%" error={e.bodyFatPct} optional />
          <SelectField label="計測方法" name="bodyFatMethod" options={BODY_FAT_METHOD_OPTIONS} error={e.bodyFatMethod} optional />
          <div className="grid grid-cols-2 gap-3">
            <Field label="ウエスト" name="waistCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.waistCm} optional />
            <Field label="首周り" name="neckCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.neckCm} optional />
            <Field label="胸囲" name="chestCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.chestCm} optional />
            <Field label="ヒップ" name="hipCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.hipCm} optional />
            <Field label="太もも" name="thighCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.thighCm} optional />
            <Field label="ふくらはぎ" name="calfCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.calfCm} optional />
          </div>
          <Field label="メモ" name="note" error={e.note} optional />
        </div>
      </details>
      <p className="text-xs text-muted">体重は毎回同じ条件（例：起床・排尿後）で測ると推移が比べやすくなります。</p>
      <SubmitButton className="w-full">記録する</SubmitButton>
    </form>
  );
}

const KIND_OPTIONS = [
  ["spike_reach", "最高到達点（スパイク・助走あり）"],
  ["block_reach", "ブロック最高到達点"],
  ["standing_reach", "立位指高"],
  ["approach_jump", "助走ジャンプ高（直接計測）"],
  ["vertical_jump", "その場垂直跳び"],
  ["standing_broad_jump", "立ち幅跳び"],
] as const;

export function JumpForm({ date, kind }: { date: string; kind?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addJumpAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="日付" name="date" type="date" defaultValue={date} error={e.date} />
      <SelectField label="種目" name="kind" options={KIND_OPTIONS} defaultValue={kind ?? "spike_reach"} placeholder={null} error={e.kind} />
      <Field label="記録" name="valueCm" type="number" inputMode="decimal" step="0.5" unit="cm" error={e.valueCm} />
      <SelectField label="値の種類" name="measurementType" options={MEASUREMENT_TYPE_OPTIONS} defaultValue="measured" placeholder={null} />
      <SelectField label="靴の着用" name="footwear" options={FOOTWEAR_OPTIONS} defaultValue="shoes" placeholder={null} />
      <Field label="測定方法" name="method" placeholder="例：ヤードスティック、壁にタッチ、ジャンプマット" error={e.method} optional />
      <Field label="メモ" name="note" error={e.note} optional />
      <p className="text-xs text-muted">実測・自己申告・推定は別々に管理します。ジャンプ高（最高到達点−立位指高）は、両方が実測の場合のみ算出します。</p>
      <SubmitButton className="w-full">記録する</SubmitButton>
    </form>
  );
}
