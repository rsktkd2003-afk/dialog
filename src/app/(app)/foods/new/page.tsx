import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { FoodForm } from "./FoodForm";

export const metadata: Metadata = { title: "食品を登録" };

export default async function NewFoodPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; name?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const returnTo = sp.returnTo && sp.returnTo.startsWith("/meals/add?") ? sp.returnTo : undefined;
  return (
    <>
      <PageHeader title="食品を登録" back={returnTo ?? "/foods"} />
      <FoodForm returnTo={returnTo} name={sp.name?.slice(0, 100)} />
    </>
  );
}
