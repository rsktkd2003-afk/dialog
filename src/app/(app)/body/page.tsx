import type { Metadata } from "next";
import Link from "next/link";
import { LineChart } from "@/components/charts/LineChart";
import { Badge, Card, EmptyState, LinkButton, PageHeader, Stat, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { assessBmi, resolveAge, waistToHeightRatio } from "@/lib/calc/body";
import { jumpHeightFromReach } from "@/lib/calc/jump";
import { maxByDate } from "@/lib/calc/pairing";
import { formatDateJp, todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { JUMP_KIND_LABELS, latestWaist, latestWeight, listBodyMeasurements, listJumpMeasurements } from "@/lib/repo/body";
import { getProfile } from "@/lib/repo/profile";
import { deleteBodyAction, deleteJumpAction } from "./actions";

export const metadata: Metadata = { title: "体・分析" };
export const dynamic = "force-dynamic";

const TYPE_LABEL = { measured: "実測", self_reported: "自己申告", estimated: "推定" } as const;
const FOOT_LABEL = { shoes: "シューズ", barefoot: "裸足", unknown: "靴不明" } as const;
const METHOD_LABEL = { bia_scale: "体組成計", caliper: "キャリパー", dxa: "DXA", other: "その他" } as const;
const BMI_LABEL = { underweight: "低体重", normal: "普通体重", obese: "肥満" } as const;

export default async function BodyPage() {
  const user = await requireUser();
  const db = getDb();
  const today = todayString();
  const [profile, bodies, jumps, weight, waist] = await Promise.all([
    getProfile(db, user.id),
    listBodyMeasurements(db, user.id, { limit: 200 }),
    listJumpMeasurements(db, user.id, { limit: 200 }),
    latestWeight(db, user.id),
    latestWaist(db, user.id),
  ]);
  const age = profile ? resolveAge(profile, today) : null;
  const height = profile?.heightCm ?? null;
  const bmi = weight && height ? assessBmi(weight.weightKg, height, age?.age ?? null) : null;
  const whtr = waist && height ? waistToHeightRatio(waist.waistCm, height) : null;
  const weightSeries = bodies.filter((b) => b.weightKg != null).map((b) => ({ date: b.date, value: b.weightKg! }));
  const fatSeries = bodies.filter((b) => b.bodyFatPct != null).map((b) => ({ date: b.date, value: b.bodyFatPct!, note: b.bodyFatMethod ? METHOD_LABEL[b.bodyFatMethod] : "" }));
  const standing = jumps.filter((j) => j.kind === "standing_reach");
  const spikeMeasured = jumps.filter((j) => j.kind === "spike_reach" && j.measurementType === "measured");
  const derived = spikeMeasured
    .map((j) => ({ j, r: jumpHeightFromReach(j, standing) }))
    .filter((x) => x.r.ok)
    .map((x) => ({ date: x.j.date, value: (x.r as { heightCm: number }).heightCm }));
  const derivedDaily = maxByDate(derived);
  const spikeDaily = maxByDate(spikeMeasured.map((j) => ({ date: j.date, value: j.valueCm })));

  return (
    <>
      <PageHeader title="体・分析" />
      <div className="mb-4 grid grid-cols-2 gap-2">
        <LinkButton href="/body/new">体重・測定を記録</LinkButton>
        <LinkButton href="/body/jump/new" variant="secondary">到達点を記録</LinkButton>
        <LinkButton href="/condition" variant="secondary">体調・不調</LinkButton>
        <LinkButton href="/analysis" variant="secondary">記録の関連を見る</LinkButton>
      </div>

      <div className="space-y-4">
        <Card title="身体指標（参考）">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="体重" value={fmt(weight?.weightKg, 1)} unit="kg" sub={weight ? weight.date : "未記録"} />
            <Stat label="BMI" value={fmt(bmi?.value, 1)} sub={bmi?.category ? BMI_LABEL[bmi.category] : bmi ? "区分なし" : "体重・身長が必要"} />
            <Stat label="ウエスト身長比" value={fmt(whtr, 2)} sub={whtr == null ? "ウエスト・身長が必要" : whtr >= 0.5 ? "0.5以上" : "0.5未満"} />
          </div>
          <ul className="mt-3 space-y-1 text-xs text-muted">
            {bmi?.warnings.map((w) => <li key={w.code}>・{w.message}</li>)}
            {whtr != null && <li>・ウエスト身長比は0.5を健康リスクの目安とする研究がありますが、診断基準ではありません。</li>}
          </ul>
        </Card>

        <Card title="体重の推移">
          {weightSeries.length > 0 ? <LineChart points={weightSeries} unit="kg" label="体重" /> : <EmptyState>体重の記録がありません</EmptyState>}
        </Card>

        {fatSeries.length > 0 && (
          <Card title="体脂肪率の推移（計測値）">
            <LineChart points={fatSeries} unit="%" label="体脂肪率" />
            <p className="mt-1 text-xs text-muted">計測方法が異なる値は単純に比較できません。</p>
          </Card>
        )}

        <Card title="ジャンプ" className="scroll-mt-20" >
          <div id="jump" />
          {spikeMeasured.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-xs font-semibold text-ink-2">最高到達点（実測のみ）</h3>
                <LineChart points={spikeDaily} unit="cm" label="最高到達点（日ごとの最高値）" />
              </div>
              {derivedDaily.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-ink-2">ジャンプ高（算出値＝最高到達点−立位指高）</h3>
                  <LineChart points={derivedDaily} unit="cm" label="ジャンプ高（算出値）" />
                </div>
              )}
            </div>
          ) : (
            <EmptyState>実測した最高到達点の記録がありません</EmptyState>
          )}
          <ul className="mt-3 divide-y divide-line">
            {jumps.slice(0, 40).map((j) => {
              const r = j.kind === "spike_reach" ? jumpHeightFromReach(j, standing) : null;
              return (
                <li key={j.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      {JUMP_KIND_LABELS[j.kind]} <span className="num font-semibold">{fmt(j.valueCm, 1)} cm</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted">
                      <span>{j.date}</span>
                      <Badge kind={j.measurementType === "measured" ? "measured" : "estimate"}>{TYPE_LABEL[j.measurementType]}</Badge>
                      <Badge>{FOOT_LABEL[j.footwear]}</Badge>
                      {j.method && <span>{j.method}</span>}
                    </div>
                    {r && (r.ok ? (
                      <div className="num mt-0.5 text-xs text-ink-2">
                        ジャンプ高（算出値）{fmt(r.heightCm, 1)} cm・立位指高 {r.standingReachDate} の値を使用
                        {r.warnings.map((w) => <div key={w.code} className="text-muted">{w.message}</div>)}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-xs text-muted">{r.reason}</div>
                    ))}
                  </div>
                  <form action={deleteJumpAction}>
                    <input type="hidden" name="id" value={j.id} />
                    <button type="submit" className="min-h-11 px-2 text-xs text-muted underline">削除</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="身体測定の履歴">
          {bodies.length === 0 ? (
            <EmptyState>記録がありません</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {bodies.slice(0, 60).map((b) => {
                const parts = [
                  b.weightKg != null && `体重 ${fmt(b.weightKg, 1)}kg`,
                  b.bodyFatPct != null && `体脂肪率 ${fmt(b.bodyFatPct, 1)}%（${b.bodyFatMethod ? METHOD_LABEL[b.bodyFatMethod] : "方法不明"}）`,
                  b.waistCm != null && `ウエスト ${fmt(b.waistCm, 1)}cm`,
                  b.neckCm != null && `首 ${fmt(b.neckCm, 1)}cm`,
                  b.chestCm != null && `胸囲 ${fmt(b.chestCm, 1)}cm`,
                  b.hipCm != null && `ヒップ ${fmt(b.hipCm, 1)}cm`,
                  b.thighCm != null && `太もも ${fmt(b.thighCm, 1)}cm`,
                  b.calfCm != null && `ふくらはぎ ${fmt(b.calfCm, 1)}cm`,
                ].filter(Boolean);
                return (
                  <li key={b.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">{formatDateJp(b.date)}</div>
                      <div className="num text-xs text-ink-2">{parts.join("・")}</div>
                      {b.note && <div className="text-xs text-muted">{b.note}</div>}
                    </div>
                    <form action={deleteBodyAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <button type="submit" className="min-h-11 px-2 text-xs text-muted underline">削除</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <p className="text-center text-xs text-muted">
          <Link href="/settings" className="underline">設定</Link>から身長などのプロフィールを変更できます。
        </p>
      </div>
    </>
  );
}
