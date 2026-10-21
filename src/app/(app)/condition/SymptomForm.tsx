"use client";

import { useActionState } from "react";
import { FormMessage, SelectField, SubmitButton, type ActionState } from "@/components/form";
import {
  SYMPTOM_IMPACTS,
  SYMPTOM_IMPACT_LABELS,
  SYMPTOM_KINDS,
  SYMPTOM_KIND_LABELS,
  SYMPTOM_NOTE_MAX,
  SYMPTOM_SIDES,
  SYMPTOM_SIDE_LABELS,
  SYMPTOM_SITES,
  SYMPTOM_SITE_LABELS,
  SYMPTOM_SITUATIONS,
  SYMPTOM_SITUATION_LABELS,
} from "@/lib/repo/symptoms";
import { addSymptomAction } from "./actions";

const opts = <K extends string>(keys: readonly K[], labels: Record<K, string>) => keys.map((k) => [k, labels[k]] as const);
const LEVELS = Array.from({ length: 11 }, (_, i) => [String(i), i === 0 ? "0（なし）" : i === 10 ? "10（非常に強い）" : String(i)] as const);

export function SymptomForm({ today }: { today: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addSymptomAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-3" noValidate id="symptom-form">
      <div>
        <label htmlFor="s-date" className="mb-1 block text-sm font-medium">日付</label>
        <input id="s-date" name="date" type="date" max={today} defaultValue={today} required aria-invalid={e.date ? true : undefined} className="min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3" />
        {e.date && <p className="mt-1 text-xs text-critical-ink">{e.date}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField label="部位" name="site" options={opts(SYMPTOM_SITES, SYMPTOM_SITE_LABELS)} placeholder={null} error={e.site} />
        <SelectField label="左右" name="side" options={opts(SYMPTOM_SIDES, SYMPTOM_SIDE_LABELS)} placeholder={null} error={e.side} />
        <SelectField label="症状の種類" name="kind" options={opts(SYMPTOM_KINDS, SYMPTOM_KIND_LABELS)} placeholder={null} error={e.kind} />
        <SelectField label="程度（0〜10）" name="level" options={LEVELS} defaultValue="3" placeholder={null} error={e.level} />
      </div>
      <SelectField label="症状が出る場面" name="situation" options={opts(SYMPTOM_SITUATIONS, SYMPTOM_SITUATION_LABELS)} placeholder={null} error={e.situation} />
      <SelectField label="運動への影響" name="impact" options={opts(SYMPTOM_IMPACTS, SYMPTOM_IMPACT_LABELS)} placeholder={null} error={e.impact} />
      <div>
        <label htmlFor="s-note" className="mb-1 block text-sm font-medium">
          補足メモ<span className="ml-1 text-xs font-normal text-muted">任意・{SYMPTOM_NOTE_MAX}文字まで</span>
        </label>
        <textarea id="s-note" name="note" rows={3} maxLength={SYMPTOM_NOTE_MAX} placeholder="例：着地後に引っかかる感覚がある" className="w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-2" />
        {e.note && <p className="mt-1 text-xs text-critical-ink">{e.note}</p>}
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full">＋ 不調を記録</SubmitButton>
    </form>
  );
}
