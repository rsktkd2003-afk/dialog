import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/form";
import { Badge, Card, EmptyState, PageHeader, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { addDays, isValidDateString, todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import {
  FOOD_CATEGORY_LABELS,
  FOOD_SOURCE_LABELS,
  MEAL_LABELS,
  MEAL_TYPES,
  listFavoriteFoods,
  listFrequentFoods,
  listMealSets,
  searchFoods,
  type Food,
  type MealType,
} from "@/lib/repo/meals";
import { addEntryAction, addQuickEntryAction, applyMealSetAction, toggleFavoriteAction } from "../actions";

export const metadata: Metadata = { title: "食事を追加" };
export const dynamic = "force-dynamic";

function defaultAmount(f: Food): { amount: number; unit: "g" | "serving" } {
  if (f.basis === "perServing" || f.servingG != null) return { amount: 1, unit: "serving" };
  return { amount: 100, unit: "g" };
}

function FoodRow({ food, date, meal, favorite }: { food: Food; date: string; meal: MealType; favorite: boolean }) {
  const d = defaultAmount(food);
  const canServing = food.basis === "perServing" || food.servingG != null;
  const canGram = food.basis === "per100g" || food.servingG != null;
  return (
    <li className="py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            {food.name}
            {food.brand && <span className="ml-1 text-xs text-muted">{food.brand}</span>}
          </div>
          <div className="num text-xs text-muted">
            {food.basis === "per100g" ? "100gあたり" : `1食${food.servingLabel ? `（${food.servingLabel}）` : ""}あたり`}{" "}
            {food.energyKcal == null ? "kcal不明" : `${fmt(food.energyKcal)} kcal`}・P {fmt(food.proteinG, 1)} / F {fmt(food.fatG, 1)} / C {fmt(food.carbsG, 1)}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge>{FOOD_CATEGORY_LABELS[food.category]}</Badge>
            <Badge kind={food.source === "user_estimate" ? "estimate" : "neutral"}>{FOOD_SOURCE_LABELS[food.source]}</Badge>
          </div>
        </div>
        <form action={toggleFavoriteAction}>
          <input type="hidden" name="foodId" value={food.id} />
          <input type="hidden" name="favorite" value={favorite ? "0" : "1"} />
          <button type="submit" className="min-h-11 min-w-11 rounded-lg text-lg text-ink-2" aria-label={favorite ? "お気に入りから外す" : "お気に入りに追加"} aria-pressed={favorite}>
            {favorite ? "★" : "☆"}
          </button>
        </form>
      </div>
      <ActionForm action={addEntryAction} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="foodId" value={food.id} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="meal" value={meal} />
        <label className="sr-only" htmlFor={`amt-${food.id}`}>分量</label>
        <input id={`amt-${food.id}`} name="amount" type="number" inputMode="decimal" step="any" min="0" defaultValue={d.amount} className="num min-h-11 w-24 rounded-xl border border-line bg-surface px-3" />
        <label className="sr-only" htmlFor={`unit-${food.id}`}>単位</label>
        <select id={`unit-${food.id}`} name="unit" defaultValue={d.unit} className="min-h-11 rounded-xl border border-line bg-surface px-2">
          {canServing && <option value="serving">食</option>}
          {canGram && <option value="g">g</option>}
        </select>
        <SubmitButton className="ml-auto">追加</SubmitButton>
      </ActionForm>
    </li>
  );
}

export default async function AddMealPage({ searchParams }: { searchParams: Promise<{ date?: string; meal?: string; q?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const date = sp.date && isValidDateString(sp.date) ? sp.date : todayString();
  if (sp.meal && !(MEAL_TYPES as readonly string[]).includes(sp.meal)) notFound();
  const meal = (sp.meal as MealType | undefined) ?? "snack";
  const q = (sp.q ?? "").slice(0, 50);
  const db = getDb();
  const [favorites, frequent, sets, results] = await Promise.all([
    listFavoriteFoods(db, user.id),
    listFrequentFoods(db, user.id, addDays(date, -60)),
    listMealSets(db, user.id),
    q ? searchFoods(db, user.id, q) : Promise.resolve([]),
  ]);
  const favIds = new Set(favorites.map((f) => f.id));
  const returnTo = `/meals/add?date=${date}&meal=${meal}`;

  return (
    <>
      <PageHeader title={`${MEAL_LABELS[meal]}を追加`} back={`/meals?date=${date}`} />
      <form role="search" className="mb-4 flex gap-2">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="meal" value={meal} />
        <label htmlFor="q" className="sr-only">食品を検索</label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="食品名で検索" className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-3" />
        <button type="submit" className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">検索</button>
      </form>

      <div className="space-y-4">
        {q && (
          <Card title={`「${q}」の検索結果`}>
            {results.length === 0 ? (
              <EmptyState
                action={
                  <Link href={`/foods/new?returnTo=${encodeURIComponent(returnTo)}&name=${encodeURIComponent(q)}`} className="font-semibold text-accent underline">
                    「{q}」を食品として登録する
                  </Link>
                }
              >
                該当する食品がありません
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {results.map((f) => (
                  <FoodRow key={f.id} food={f} date={date} meal={meal} favorite={f.isFavorite} />
                ))}
              </ul>
            )}
          </Card>
        )}

        {sets.length > 0 && (
          <Card title="お気に入りメニュー">
            <ul className="divide-y divide-line">
              {sets.map((s) => (
                <li key={s.id} className="py-2">
                  <ActionForm action={applyMealSetAction} className="flex items-center gap-2">
                    <input type="hidden" name="setId" value={s.id} />
                    <input type="hidden" name="date" value={date} />
                    <input type="hidden" name="meal" value={meal} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="truncate text-xs text-muted">{s.items.map((i) => i.name).join("・")}</div>
                    </div>
                    <SubmitButton variant="secondary">まとめて追加</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="お気に入り">
          {favorites.length === 0 ? (
            <p className="text-sm text-muted">食品の☆をタップするとここに表示されます。</p>
          ) : (
            <ul className="divide-y divide-line">
              {favorites.map((f) => (
                <FoodRow key={f.id} food={f} date={date} meal={meal} favorite />
              ))}
            </ul>
          )}
        </Card>

        {frequent.filter((f) => !favIds.has(f.id)).length > 0 && (
          <Card title="よく食べる食品（直近60日）">
            <ul className="divide-y divide-line">
              {frequent
                .filter((f) => !favIds.has(f.id))
                .map((f) => (
                  <FoodRow key={f.id} food={f} date={date} meal={meal} favorite={false} />
                ))}
            </ul>
          </Card>
        )}

        <Card title="食品を登録せずに記録（外食・内容が不明なとき）">
          <ActionForm action={addQuickEntryAction} className="space-y-3">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="meal" value={meal} />
            <div>
              <label htmlFor="qe-name" className="mb-1 block text-sm font-medium">名前</label>
              <input id="qe-name" name="name" required placeholder="例：学食の定食" className="min-h-11 w-full rounded-xl border border-line bg-surface px-3" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["energyKcal", "エネルギー", "kcal"],
                ["proteinG", "たんぱく質", "g"],
                ["fatG", "脂質", "g"],
                ["carbsG", "炭水化物", "g"],
              ].map(([n, l, u]) => (
                <div key={n}>
                  <label htmlFor={`qe-${n}`} className="mb-1 block text-xs text-ink-2">{l}（{u}）</label>
                  <input id={`qe-${n}`} name={n} type="number" inputMode="decimal" step="any" min="0" className="num min-h-11 w-full rounded-xl border border-line bg-surface px-3" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted">分からない項目は空欄にしてください。空欄は「不明」として扱い、0として計算しません。入力した値は「本人による推定値」として記録されます。</p>
            <SubmitButton variant="secondary" className="w-full">記録する</SubmitButton>
          </ActionForm>
        </Card>

        <div className="flex gap-2">
          <Link href={`/foods/new?returnTo=${encodeURIComponent(returnTo)}`} className="flex-1 rounded-xl border border-line bg-surface py-3 text-center text-sm font-semibold">食品を登録</Link>
          <Link href="/foods/recipe" className="flex-1 rounded-xl border border-line bg-surface py-3 text-center text-sm font-semibold">レシピを登録</Link>
        </div>
      </div>
    </>
  );
}
