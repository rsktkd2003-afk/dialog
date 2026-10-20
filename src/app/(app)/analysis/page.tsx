import type { Metadata } from "next";
import { ScatterChart } from "@/components/charts/ScatterChart";
import { Card, Notice, PageHeader, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { MIN_PAIRS_FOR_CORRELATION } from "@/lib/calc/stats";
import { todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { loadAnalyses } from "@/lib/services/analysis";

export const metadata: Metadata = { title: "記録の関連" };
export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  const user = await requireUser();
  const analyses = await loadAnalyses(getDb(), user.id, todayString());
  return (
    <>
      <PageHeader title="記録の関連" back="/body" />
      <div className="space-y-4">
        <Notice tone="info" title="関連があっても、原因と結果を示すものではありません">
          ここでは記録同士の相関（一緒に変化する傾向）を表示します。他の要因の影響や偶然の可能性があり、どちらがどちらの原因かは分かりません。対応する記録が{MIN_PAIRS_FOR_CORRELATION}組未満の場合は分析しません。
        </Notice>
        {analyses.map((a) => (
          <Card key={a.id} title={a.title}>
            {a.r == null && a.summary == null ? (
              <p className="text-sm text-muted">
                記録が不足しています（対応する記録 {a.points.length} / {MIN_PAIRS_FOR_CORRELATION} 組）。
              </p>
            ) : (
              <>
                <ScatterChart points={a.points.map((p) => ({ x: p.x, y: p.y, label: p.date }))} xLabel={a.xLabel} yLabel={a.yLabel} />
                <p className="mt-2 text-sm">
                  {a.summary}
                  {a.r != null && <span className="num ml-1 text-xs text-muted">（相関係数 r = {fmt(a.r, 2)}、{a.points.length}組）</span>}
                </p>
              </>
            )}
            <p className="mt-1 text-xs text-muted">対応付け：{a.pairing}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
