import type { Metadata } from "next";
import { LineChart } from "@/components/charts/LineChart";
import { Card, EmptyState, PageHeader, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { addDays, formatShortDate, todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { dailyNutrition } from "@/lib/repo/meals";

export const metadata: Metadata = { title: "栄養の推移" };
export const dynamic = "force-dynamic";

export default async function NutritionTrendsPage() {
  const user = await requireUser();
  const today = todayString();
  const from = addDays(today, -55);
  const days = await dailyNutrition(getDb(), user.id, from, today);

  const weeks: { start: string; end: string; days: typeof days }[] = [];
  for (let i = 0; i < 8; i++) {
    const end = addDays(today, -7 * i);
    const start = addDays(end, -6);
    weeks.push({ start, end, days: days.filter((d) => d.date >= start && d.date <= end) });
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  return (
    <>
      <PageHeader title="栄養の推移" back="/meals" />
      {days.length === 0 ? (
        <EmptyState>食事の記録がまだありません。</EmptyState>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted">記録のない日はグラフに含めていません。記録漏れのある日は実際より少なく表示されます。</p>
          <Card title="エネルギー（日別）">
            <LineChart points={days.map((d) => ({ date: d.date, value: d.energyKcal, note: d.unknownCount ? `不明${d.unknownCount}件` : "" }))} unit="kcal" label="エネルギー摂取量" digits={0} />
          </Card>
          <Card title="たんぱく質（日別）">
            <LineChart points={days.map((d) => ({ date: d.date, value: d.proteinG }))} unit="g" label="たんぱく質摂取量" digits={0} />
          </Card>
          <Card title="炭水化物（日別）">
            <LineChart points={days.map((d) => ({ date: d.date, value: d.carbsG }))} unit="g" label="炭水化物摂取量" digits={0} />
          </Card>
          <Card title="週ごとの平均（記録した日のみ）">
            <table className="num w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-1 font-normal">期間</th>
                  <th className="py-1 text-right font-normal">日数</th>
                  <th className="py-1 text-right font-normal">kcal</th>
                  <th className="py-1 text-right font-normal">P</th>
                  <th className="py-1 text-right font-normal">F</th>
                  <th className="py-1 text-right font-normal">C</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.start} className="border-t border-line">
                    <td className="py-1.5">{formatShortDate(w.start)}〜{formatShortDate(w.end)}</td>
                    <td className="py-1.5 text-right">{w.days.length}</td>
                    <td className="py-1.5 text-right">{fmt(avg(w.days.map((d) => d.energyKcal)))}</td>
                    <td className="py-1.5 text-right">{fmt(avg(w.days.map((d) => d.proteinG)))}</td>
                    <td className="py-1.5 text-right">{fmt(avg(w.days.map((d) => d.fatG)))}</td>
                    <td className="py-1.5 text-right">{fmt(avg(w.days.map((d) => d.carbsG)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </>
  );
}
