import type { Metadata } from "next";
import { and, eq, isNull, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LineChart } from "@/components/charts/LineChart";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { exercises } from "@/lib/db/schema";
import { exerciseHistory } from "@/lib/repo/training";

export const metadata: Metadata = { title: "種目の推移" };
export const dynamic = "force-dynamic";

export default async function ExerciseHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = getDb();
  const [ex] = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, id), or(eq(exercises.userId, user.id), isNull(exercises.userId))))
    .limit(1);
  if (!ex) notFound();
  const history = await exerciseHistory(db, user.id, id);
  const e1rm = history.filter((h) => h.bestE1rm != null).map((h) => ({ date: h.date, value: h.bestE1rm! }));

  return (
    <>
      <PageHeader title={ex.name} back="/training" />
      {history.length === 0 ? (
        <EmptyState>この種目の記録はまだありません。</EmptyState>
      ) : (
        <div className="space-y-4">
          <Card title="推定1RM（その日の最大値・参考値）">
            {e1rm.length > 0 ? <LineChart points={e1rm} unit="kg" label="推定1RM" /> : <p className="text-sm text-muted">1〜10回のセットがないため推定していません。</p>}
          </Card>
          <Card title="最大重量">
            <LineChart points={history.map((h) => ({ date: h.date, value: h.maxWeightKg }))} unit="kg" label="最大重量" />
          </Card>
          <Card title="総負荷量（重量×回数の合計）">
            <LineChart points={history.map((h) => ({ date: h.date, value: h.volumeKg }))} unit="kg" label="総負荷量" digits={0} />
          </Card>
          <p className="text-xs text-muted">推定1RMは Epley式・Brzycki式の平均です。回数が多いセットほど誤差が大きく、11回以上のセットは推定に使っていません。</p>
        </div>
      )}
    </>
  );
}
