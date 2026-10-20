"use client";

import { useActionState } from "react";
import { ChoiceChips, Field, FormMessage, SelectField, SubmitButton, type ActionState } from "@/components/form";
import { saveBasicInfo, saveGoals, saveHabits, saveMeasurements } from "./actions";
import {
  ACTIVITY_OPTIONS,
  BODY_FAT_METHOD_OPTIONS,
  FOOTWEAR_OPTIONS,
  GOAL_OPTIONS,
  HAND_OPTIONS,
  INTENSITY_OPTIONS,
  MEASUREMENT_TYPE_OPTIONS,
  POSITION_OPTIONS,
  SEX_OPTIONS,
  STRENGTH_EXP_OPTIONS,
  WEEKDAY_OPTIONS,
} from "@/lib/options";

type Defaults = Record<string, string | number | null | undefined | readonly string[]>;
const s = (v: Defaults[string]) => (v == null ? undefined : String(v));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <legend className="px-1 text-sm font-semibold text-ink-2">{title}</legend>
      {children}
    </fieldset>
  );
}

export function BasicInfoForm({ d, returnTo }: { d: Defaults; returnTo?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveBasicInfo, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <Section title="年齢">
        <Field label="生年月日" name="birthDate" type="date" defaultValue={s(d.birthDate)} error={e.birthDate} optional />
        <Field label="生年月日の代わりに年齢" name="ageYears" type="number" inputMode="numeric" unit="歳" defaultValue={s(d.ageYears)} error={e.ageYears} optional hint="生年月日を入力した場合は不要です" />
      </Section>
      <Section title="体格・競技">
        <Field label="身長" name="heightCm" type="number" inputMode="decimal" step="0.1" unit="cm" defaultValue={s(d.heightCm)} error={e.heightCm} optional />
        <SelectField label="性別" name="sex" options={SEX_OPTIONS} defaultValue={s(d.sex) ?? ""} error={e.sex} optional />
        <p className="-mt-2 text-xs text-muted">基礎代謝量の推定式の選択にのみ使います。「回答しない」の場合は幅をもった推定値で表示します。</p>
        <Field label="競技歴" name="experienceYears" type="number" inputMode="decimal" step="0.5" unit="年" defaultValue={s(d.experienceYears)} error={e.experienceYears} optional />
        <SelectField label="ポジション" name="position" options={POSITION_OPTIONS} defaultValue={s(d.position) ?? ""} optional />
        <SelectField label="利き腕" name="dominantHand" options={HAND_OPTIONS} defaultValue={s(d.dominantHand) ?? ""} optional />
      </Section>
      <SubmitButton className="w-full">{returnTo ? "保存" : "次へ"}</SubmitButton>
    </form>
  );
}

export function MeasurementsForm({ returnTo }: { returnTo?: string } = {}) {
  const [state, action] = useActionState<ActionState, FormData>(saveMeasurements, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      {e._form && <p className="text-sm text-critical-ink">{e._form}</p>}
      <Section title="体重・体脂肪率">
        <Field label="体重" name="weightKg" type="number" inputMode="decimal" step="0.1" unit="kg" error={e.weightKg} optional hint="栄養目標の計算に必要です" />
        <Field label="体脂肪率" name="bodyFatPct" type="number" inputMode="decimal" step="0.1" unit="%" error={e.bodyFatPct} optional hint="計測した値のみ入力してください（見た目からの推定は入力しないでください）" />
        <SelectField label="体脂肪率の計測方法" name="bodyFatMethod" options={BODY_FAT_METHOD_OPTIONS} error={e.bodyFatMethod} optional />
      </Section>
      <Section title="周囲径">
        <div className="grid grid-cols-2 gap-3">
          <Field label="ウエスト" name="waistCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.waistCm} optional />
          <Field label="首周り" name="neckCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.neckCm} optional />
          <Field label="胸囲" name="chestCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.chestCm} optional />
          <Field label="ヒップ" name="hipCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.hipCm} optional />
          <Field label="太もも" name="thighCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.thighCm} optional />
          <Field label="ふくらはぎ" name="calfCm" type="number" inputMode="decimal" step="0.1" unit="cm" error={e.calfCm} optional />
        </div>
      </Section>
      <Section title="到達点">
        <Field label="立位指高" name="standingReach" type="number" inputMode="decimal" step="0.5" unit="cm" error={e.standingReach} optional />
        <Field label="最高到達点（スパイク）" name="spikeReach" type="number" inputMode="decimal" step="0.5" unit="cm" error={e.spikeReach} optional />
        <Field label="ブロック最高到達点" name="blockReach" type="number" inputMode="decimal" step="0.5" unit="cm" error={e.blockReach} optional />
        <SelectField label="到達点の値の種類" name="reachMeasurementType" options={MEASUREMENT_TYPE_OPTIONS} defaultValue="self_reported" placeholder={null} />
        <SelectField label="靴の着用" name="reachFootwear" options={FOOTWEAR_OPTIONS} defaultValue="unknown" placeholder={null} />
        <p className="text-xs text-muted">ジャンプ高は、実測の最高到達点と実測の立位指高がそろった場合のみ算出します。</p>
      </Section>
      <SubmitButton className="w-full">{returnTo ? "保存" : "次へ"}</SubmitButton>
    </form>
  );
}

export function HabitsForm({ d, returnTo }: { d: Defaults; returnTo?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveHabits, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <Section title="バレーボールの練習">
        <div>
          <p className="mb-1 text-sm font-medium">練習する曜日 <span className="text-xs font-normal text-muted">任意</span></p>
          <ChoiceChips name="practiceDays" options={WEEKDAY_OPTIONS} defaultValues={(d.practiceDays as string[] | undefined) ?? []} />
        </div>
        <Field label="週の練習回数" name="practicePerWeek" type="number" inputMode="numeric" unit="回" defaultValue={s(d.practicePerWeek)} error={e.practicePerWeek} optional hint="曜日を選んだ場合は空欄で構いません" />
        <Field label="1回の練習時間" name="practiceMinutes" type="number" inputMode="numeric" unit="分" defaultValue={s(d.practiceMinutes)} error={e.practiceMinutes} optional />
        <SelectField label="練習強度" name="practiceIntensity" options={INTENSITY_OPTIONS} defaultValue={s(d.practiceIntensity) ?? ""} optional />
        <Field label="1回の練習での全力ジャンプのおおよその回数" name="maxJumpsPerSession" type="number" inputMode="numeric" unit="回" defaultValue={s(d.maxJumpsPerSession)} error={e.maxJumpsPerSession} optional />
      </Section>
      <Section title="筋力トレーニング">
        <div>
          <p className="mb-1 text-sm font-medium">筋トレする曜日 <span className="text-xs font-normal text-muted">任意</span></p>
          <ChoiceChips name="strengthDays" options={WEEKDAY_OPTIONS} defaultValues={(d.strengthDays as string[] | undefined) ?? []} />
        </div>
        <Field label="週の筋トレ回数" name="strengthPerWeek" type="number" inputMode="numeric" unit="回" defaultValue={s(d.strengthPerWeek)} error={e.strengthPerWeek} optional />
        <Field label="1回の筋トレ時間" name="strengthMinutes" type="number" inputMode="numeric" unit="分" defaultValue={s(d.strengthMinutes)} error={e.strengthMinutes} optional />
        <SelectField label="筋トレ経験" name="strengthExperience" options={STRENGTH_EXP_OPTIONS} defaultValue={s(d.strengthExperience) ?? ""} optional />
      </Section>
      <Section title="生活">
        <SelectField label="練習以外の普段の活動量" name="dailyActivity" options={ACTIVITY_OPTIONS} defaultValue={s(d.dailyActivity) ?? ""} optional />
        <Field label="普段の睡眠時間" name="usualSleepHours" type="number" inputMode="decimal" step="0.5" unit="時間" defaultValue={s(d.usualSleepHours)} error={e.usualSleepHours} optional />
      </Section>
      <SubmitButton className="w-full">{returnTo ? "保存" : "次へ"}</SubmitButton>
    </form>
  );
}

export function GoalsForm({ d, returnTo }: { d: Defaults; returnTo?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveGoals, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <Section title="目標（複数選択可）">
        <ChoiceChips name="goals" options={GOAL_OPTIONS} defaultValues={(d.goals as string[] | undefined) ?? []} />
        <Field label="その他の目標（自由記述）" name="otherGoal" defaultValue={s(d.otherGoal)} error={e.otherGoal} optional />
      </Section>
      <Section title="最優先の目標">
        <SelectField label="いちばん優先したい目標" name="primaryGoal" options={GOAL_OPTIONS} defaultValue={s(d.primaryGoal) ?? ""} error={e.primaryGoal} optional />
        <p className="text-xs text-muted">ホーム画面の表示順や、栄養目標の調整（体脂肪減少・筋肥大）に使います。</p>
      </Section>
      <SubmitButton className="w-full">{returnTo ? "保存" : "登録を完了する"}</SubmitButton>
    </form>
  );
}
