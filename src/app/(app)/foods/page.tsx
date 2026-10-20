import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { Badge, Card, EmptyState, LinkButton, PageHeader, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { foods } from "@/lib/db/schema";
import { FOOD_CATEGORY_LABELS, FOOD_SOURCE_LABELS } from "@/lib/repo/meals";
import { archiveFoodAction } from "../meals/actions";

export const metadata: Metadata = { title: "自分の食品" };
export const dynamic = "force-dynamic";

export default async function FoodsPage() {
  const user = await requireUser();
  const rows = await getDb()
    .select()
    .from(foods)
    .where(and(eq(foods.ownerUserId, user.id), eq(foods.archived, false)))
    .orderBy(asc(foods.category), asc(foods.name));
  return (
    <>
      <PageHeader title="自分の食品・レシピ" back="/meals" />
      <div className="mb-4 flex gap-2">
        <LinkButton href="/foods/new" className="flex-1">食品を登録</LinkButton>
        <LinkButton href="/foods/recipe" variant="secondary" className="flex-1">レシピを登録</LinkButton>
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState>まだ登録した食品はありません。パッケージの栄養成分表示を見ながら登録すると、次回から検索で選べます。</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{f.name}{f.brand && <span className="ml-1 text-xs text-muted">{f.brand}</span>}</div>
                  <div className="num text-xs text-muted">
                    {f.basis === "per100g" ? "100gあたり" : "1食あたり"} {f.energyKcal == null ? "kcal不明" : `${fmt(f.energyKcal)} kcal`}・P {fmt(f.proteinG, 1)} / F {fmt(f.fatG, 1)} / C {fmt(f.carbsG, 1)}
                  </div>
                  <div className="mt-1 flex gap-1">
                    <Badge>{FOOD_CATEGORY_LABELS[f.category]}</Badge>
                    <Badge kind={f.source === "user_estimate" ? "estimate" : "neutral"}>{FOOD_SOURCE_LABELS[f.source]}</Badge>
                  </div>
                </div>
                <form action={archiveFoodAction}>
                  <input type="hidden" name="foodId" value={f.id} />
                  <button type="submit" className="min-h-11 px-2 text-xs text-muted underline">非表示</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">非表示にしても、過去の食事記録の栄養値は変わりません。</p>
      </Card>
    </>
  );
}
