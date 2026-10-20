import type { Metadata } from "next";
import { TargetsDetail } from "@/components/TargetsDetail";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { getTargetsForDate } from "@/lib/services/targets";

export const metadata: Metadata = { title: "栄養目標と計算根拠" };
export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const user = await requireUser();
  const result = await getTargetsForDate(getDb(), user.id, todayString());
  return (
    <>
      <PageHeader title="栄養目標と計算根拠" back="/settings" />
      <TargetsDetail result={result} />
    </>
  );
}
