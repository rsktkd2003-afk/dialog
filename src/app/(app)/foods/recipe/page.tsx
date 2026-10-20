import type { Metadata } from "next";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { listFavoriteFoods, searchFoods } from "@/lib/repo/meals";
import { RecipeForm } from "./RecipeForm";

export const metadata: Metadata = { title: "レシピを登録" };
export const dynamic = "force-dynamic";

export default async function RecipePage() {
  const user = await requireUser();
  const db = getDb();
  const [own, favs] = await Promise.all([searchFoods(db, user.id, "", 300), listFavoriteFoods(db, user.id)]);
  const map = new Map([...favs, ...own.filter((f) => f.ownerUserId === user.id)].map((f) => [f.id, f]));
  const options = [...map.values()]
    .filter((f) => f.category !== "recipe")
    .map((f) => ({ id: f.id, name: f.name, basis: f.basis, servingG: f.servingG }));
  return (
    <>
      <PageHeader title="自炊レシピを登録" back="/foods" />
      {options.length === 0 ? (
        <EmptyState action={<LinkButton href="/foods/new">食品を登録</LinkButton>}>
          材料にする食品を先に登録してください（自分の食品とお気に入りから選べます）。
        </EmptyState>
      ) : (
        <RecipeForm foods={options} />
      )}
    </>
  );
}
