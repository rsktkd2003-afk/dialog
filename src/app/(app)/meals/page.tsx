import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { Meter } from "@/components/charts/Meter";
import { SubmitButton } from "@/components/form";
import { Card, PageHeader, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { sumNutrients } from "@/lib/calc/nutrition";
import { addDays, formatDateJp, isValidDateString, todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { MEAL_LABELS, MEAL_TYPES, listMealEntries } from "@/lib/repo/meals";
import { getTargetsForDate } from "@/lib/services/targets";
import { copyMealAction, deleteEntryAction, saveMealSetAction } from "./actions";

export const metadata: Metadata = { title: "食事" };
export const dynamic = "force-dynamic";

export default async function MealsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayString();
  const date = sp.date && isValidDateString(sp.date) ? sp.date : today;
  const db = getDb();
  const [entries, targets] = await Promise.all([listMealEntries(db, user.id, date), getTargetsForDate(db, user.id, date)]);
  const totals = sumNutrients(entries);
  const t = targets.ok ? targets.targets : null;
  const prev = addDays(date, -1);

  return (
    <>
      <PageHeader title="食事" action={<Link href="/meals/trends" className="text-sm font-semibold text-accent">推移</Link>} />
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/meals?date=${prev}`} className="min-h-11 rounded-lg px-3 py-2 text-sm text-ink-2" aria-label="前の日">← 前日</Link>
        <div className="text-center">
          <div className="font-semibold">{formatDateJp(date)}</div>
          {date !== today && <Link href="/meals" className="text-xs text-accent underline">今日に戻る</Link>}
        </div>
        {date < today ? (
          <Link href={`/meals?date=${addDays(date, 1)}`} className="min-h-11 rounded-lg px-3 py-2 text-sm text-ink-2" aria-label="次の日">翌日 →</Link>
        ) : (
          <span className="w-16" />
        )}
      </div>

      <Card title="合計と目標" className="mb-4">
        <div className="space-y-3">
          <Meter label="エネルギー" value={totals.energyKcal} target={t?.energyKcal ?? null} unit="kcal" />
          <Meter label="たんぱく質" value={totals.proteinG} target={t?.proteinG ?? null} unit="g" />
          <Meter label="脂質" value={totals.fatG} target={t?.fatG ?? null} unit="g" />
          <Meter label="炭水化物" value={totals.carbsG} target={t?.carbsG ?? null} unit="g" />
        </div>
        {totals.unknownCount > 0 && <p className="mt-2 text-xs text-muted">栄養値が不明な記録が{totals.unknownCount}件あり、その分は合計に含まれていません。</p>}
        {!targets.ok && <p className="mt-2 text-xs text-muted">目標の計算には{targets.missing.join("・")}が必要です。</p>}
      </Card>

      <div className="space-y-4">
        {MEAL_TYPES.map((meal) => {
          const items = entries.filter((e) => e.meal === meal);
          const sub = sumNutrients(items);
          return (
            <Card
              key={meal}
              title={`${MEAL_LABELS[meal]}${items.length ? `　${fmt(sub.energyKcal)} kcal` : ""}`}
              action={
                <Link href={`/meals/add?date=${date}&meal=${meal}`} className="inline-flex min-h-9 items-center rounded-lg bg-accent px-3 text-sm font-semibold text-accent-ink">
                  ＋ 追加
                </Link>
              }
            >
              {items.length === 0 ? (
                <ActionForm action={copyMealAction} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-muted">記録なし</span>
                  <input type="hidden" name="fromDate" value={prev} />
                  <input type="hidden" name="toDate" value={date} />
                  <input type="hidden" name="meal" value={meal} />
                  <SubmitButton variant="secondary" className="min-h-9! text-xs">前日の{MEAL_LABELS[meal]}をコピー</SubmitButton>
                </ActionForm>
              ) : (
                <>
                  <ul className="divide-y divide-line">
                    {items.map((e) => (
                      <li key={e.id} className="flex items-center gap-2 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">{e.name}</div>
                          <div className="num text-xs text-muted">
                            {fmt(e.amount, 1)}
                            {e.unit === "g" ? "g" : "食"}・{e.energyKcal == null ? "kcal不明" : `${fmt(e.energyKcal)} kcal`}・P {fmt(e.proteinG, 1)} / F {fmt(e.fatG, 1)} / C {fmt(e.carbsG, 1)}
                          </div>
                        </div>
                        <form action={deleteEntryAction}>
                          <input type="hidden" name="id" value={e.id} />
                          <button type="submit" className="min-h-11 rounded-lg px-2 text-xs text-muted underline" aria-label={`${e.name}を削除`}>削除</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted">この食事をお気に入りメニューに保存</summary>
                    <ActionForm action={saveMealSetAction} className="mt-2 flex gap-2">
                      <input type="hidden" name="date" value={date} />
                      <input type="hidden" name="meal" value={meal} />
                      <label className="sr-only" htmlFor={`set-${meal}`}>メニュー名</label>
                      <input id={`set-${meal}`} name="name" placeholder="メニュー名（例：いつもの朝食）" className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-3" />
                      <SubmitButton variant="secondary">保存</SubmitButton>
                    </ActionForm>
                  </details>
                </>
              )}
            </Card>
          );
        })}
        {entries.length === 0 && (
          <ActionForm action={copyMealAction} className="text-center">
            <input type="hidden" name="fromDate" value={prev} />
            <input type="hidden" name="toDate" value={date} />
            <SubmitButton variant="secondary" className="w-full">前日の食事を1日分コピー</SubmitButton>
          </ActionForm>
        )}
        <Link href="/foods" className="block text-center text-sm text-accent underline">自分の食品・レシピを管理</Link>
      </div>
    </>
  );
}
