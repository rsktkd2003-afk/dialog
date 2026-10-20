"use client";

import { useActionState } from "react";
import { Field, FormMessage, SelectField, SubmitButton, type ActionState } from "@/components/form";
import { createFoodAction } from "../../meals/actions";

const CATEGORY = [
  ["ingredient", "食材"],
  ["prepared", "お惣菜・市販品"],
  ["eating_out", "外食"],
  ["supplement", "プロテイン・補助食品"],
  ["other", "その他"],
] as const;

export function FoodForm({ returnTo, name }: { returnTo?: string; name?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createFoodAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <Field label="食品名" name="name" defaultValue={name} required error={e.name} />
      <Field label="メーカー・店名" name="brand" error={e.brand} optional />
      <SelectField label="種類" name="category" options={CATEGORY} defaultValue="prepared" placeholder={null} />
      <fieldset>
        <legend className="mb-1 text-sm font-medium">栄養値の基準</legend>
        <div className="flex gap-2">
          {[
            ["perServing", "1食（1個・1袋）あたり"],
            ["per100g", "100gあたり"],
          ].map(([v, l]) => (
            <label key={v} className="flex-1">
              <input type="radio" name="basis" value={v} defaultChecked={v === "perServing"} className="peer sr-only" />
              <span className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface px-2 text-center text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink">{l}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label="1食の重さ" name="servingG" type="number" inputMode="decimal" step="any" unit="g" error={e.servingG} optional />
        <Field label="1食の呼び方" name="servingLabel" placeholder="例：1個" error={e.servingLabel} optional />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="エネルギー" name="energyKcal" type="number" inputMode="decimal" step="any" unit="kcal" error={e.energyKcal} />
        <Field label="たんぱく質" name="proteinG" type="number" inputMode="decimal" step="any" unit="g" error={e.proteinG} />
        <Field label="脂質" name="fatG" type="number" inputMode="decimal" step="any" unit="g" error={e.fatG} />
        <Field label="炭水化物" name="carbsG" type="number" inputMode="decimal" step="any" unit="g" error={e.carbsG} hint="糖質＋食物繊維の合計" />
      </div>
      <SelectField
        label="栄養値の出所"
        name="source"
        options={[
          ["user_label", "パッケージ・店舗の栄養成分表示"],
          ["user_estimate", "自分で推定した値"],
        ]}
        defaultValue="user_label"
        placeholder={null}
      />
      <p className="text-xs text-muted">分からない栄養素は空欄のままにしてください（不明として扱い、0として計算しません）。</p>
      <SubmitButton className="w-full">登録する</SubmitButton>
    </form>
  );
}
