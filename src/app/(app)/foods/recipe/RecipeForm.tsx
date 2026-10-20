"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton, type ActionState } from "@/components/form";
import { createRecipeAction } from "../../meals/actions";

type Option = { id: string; name: string; basis: "per100g" | "perServing"; servingG: number | null };

export function RecipeForm({ foods }: { foods: Option[] }) {
  const [state, action] = useActionState<ActionState, FormData>(createRecipeAction, {});
  const [rows, setRows] = useState<number[]>([0]);
  const [nextKey, setNextKey] = useState(1);
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="レシピ名" name="name" required error={e.name} />
      <Field label="何人前" name="servings" type="number" inputMode="decimal" step="0.5" defaultValue="1" unit="人前" error={e.servings} />
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">材料</legend>
        {rows.map((key, idx) => (
          <div key={key} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2">
            <label className="sr-only" htmlFor={`food-${key}`}>材料{idx + 1}</label>
            <select id={`food-${key}`} name="itemFoodId" className="min-h-11 w-full rounded-lg border border-line bg-surface px-2">
              {foods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}（{f.basis === "per100g" ? "100g基準" : "1食基準"}）
                </option>
              ))}
            </select>
            <input name="itemAmount" type="number" inputMode="decimal" step="any" min="0" placeholder="分量" aria-label={`材料${idx + 1}の分量`} className="num min-h-11 w-24 rounded-lg border border-line bg-surface px-2" />
            <select name="itemUnit" aria-label={`材料${idx + 1}の単位`} className="min-h-11 rounded-lg border border-line bg-surface px-2">
              <option value="g">g</option>
              <option value="serving">食</option>
            </select>
            {rows.length > 1 && (
              <button type="button" onClick={() => setRows(rows.filter((r) => r !== key))} className="ml-auto min-h-11 px-2 text-xs text-muted underline">
                削除
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setRows([...rows, nextKey]);
            setNextKey(nextKey + 1);
          }}
          className="min-h-11 w-full rounded-xl border border-dashed border-line text-sm text-ink-2"
        >
          ＋ 材料を追加
        </button>
        {e.items && <p className="text-xs text-critical-ink">{e.items}</p>}
      </fieldset>
      <p className="text-xs text-muted">材料に栄養値が不明な項目があると、レシピのその項目も「不明」になります。</p>
      <SubmitButton className="w-full">レシピを登録</SubmitButton>
    </form>
  );
}
