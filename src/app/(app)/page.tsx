import Link from "next/link";
import { LineChart } from "@/components/charts/LineChart";
import { Meter } from "@/components/charts/Meter";
import { Badge, Card, EmptyState, LinkButton, Notice, PageHeader, Stat, fmt, fmtRange } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { GOAL_LABELS, type Goal } from "@/lib/calc/types";
import { formatDateJp, todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { loadDashboard, type DashboardCard } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

const MEASUREMENT_LABEL = { measured: "実測", self_reported: "自己申告", estimated: "推定" } as const;

export default async function HomePage() {
  const user = await requireUser();
  const today = todayString();
  const d = await loadDashboard(getDb(), user.id, today);
  const n = d.todayNutrition;
  const t = d.targets.ok ? d.targets.targets : null;

  const cards: Record<DashboardCard, React.ReactNode> = {
    nutrition: (
      <Card key="nutrition" title="今日の食事" action={<Link href="/meals" className="text-sm font-semibold text-accent">記録する</Link>}>
        <div className="space-y-3">
          <Meter label="エネルギー" value={n?.energyKcal ?? 0} target={t?.energyKcal ?? null} unit="kcal" />
          <Meter label="たんぱく質" value={n?.proteinG ?? 0} target={t?.proteinG ?? null} unit="g" />
          <Meter label="脂質" value={n?.fatG ?? 0} target={t?.fatG ?? null} unit="g" />
          <Meter label="炭水化物" value={n?.carbsG ?? 0} target={t?.carbsG ?? null} unit="g" />
        </div>
        {n && n.unknownCount > 0 && <p className="mt-2 text-xs text-muted">栄養値が不明な記録が{n.unknownCount}件あり、合計には含まれていません。</p>}
        {!d.targets.ok && (
          <p className="mt-2 text-xs text-muted">
            目標を計算するには{d.targets.missing.join("・")}が必要です。<Link href="/body/new" className="text-accent underline">体重を記録</Link>
          </p>
        )}
        {t && (
          <p className="mt-2 text-xs text-muted">
            目標は推定値です。<Link href="/settings/targets" className="text-accent underline">計算根拠を見る</Link>
          </p>
        )}
      </Card>
    ),
    plan: (
      <Card key="plan" title="今日の運動">
        {d.targets.plan.labels.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {d.targets.plan.labels.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">予定・記録はありません（休養日として計算）</p>
        )}
        <div className="mt-3 flex gap-2">
          <LinkButton href="/practice" variant="secondary" className="flex-1">練習を記録</LinkButton>
          <LinkButton href="/training/new" variant="secondary" className="flex-1">筋トレを記録</LinkButton>
        </div>
      </Card>
    ),
    condition: (
      <Card key="condition" title="今日のコンディション" action={<Link href="/condition" className="text-sm font-semibold text-accent">{d.todayCondition ? "編集" : "記録する"}</Link>}>
        {d.todayCondition ? (
          <div className="grid grid-cols-4 gap-2">
            <Stat label="睡眠" value={fmt(d.todayCondition.sleepHours, 1)} unit="h" />
            <Stat label="疲労" value={fmt(d.todayCondition.fatigue)} unit="/5" />
            <Stat label="筋肉痛" value={fmt(d.todayCondition.soreness)} unit="/5" />
            <Stat label="調子" value={fmt(d.todayCondition.feeling)} unit="/5" />
          </div>
        ) : (
          <EmptyState>睡眠・疲労・筋肉痛を10秒で記録できます</EmptyState>
        )}
      </Card>
    ),
    weight: (
      <Card key="weight" title="体重の推移（90日）" action={<Link href="/body/new" className="text-sm font-semibold text-accent">記録する</Link>}>
        {d.weights.length > 0 ? (
          <LineChart points={d.weights.map((w) => ({ date: w.date, value: w.weightKg }))} unit="kg" label="体重" />
        ) : (
          <EmptyState>体重の記録がありません</EmptyState>
        )}
      </Card>
    ),
    jump: (
      <Card key="jump" title="ジャンプ" action={<Link href="/body/jump/new" className="text-sm font-semibold text-accent">記録する</Link>}>
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="最高到達点"
            value={fmt(d.latestSpike?.valueCm, 1)}
            unit="cm"
            sub={d.latestSpike ? <Badge kind={d.latestSpike.measurementType === "measured" ? "measured" : "estimate"}>{MEASUREMENT_LABEL[d.latestSpike.measurementType]}</Badge> : undefined}
          />
          <Stat
            label="ブロック到達点"
            value={fmt(d.latestBlock?.valueCm, 1)}
            unit="cm"
            sub={d.latestBlock ? <Badge kind={d.latestBlock.measurementType === "measured" ? "measured" : "estimate"}>{MEASUREMENT_LABEL[d.latestBlock.measurementType]}</Badge> : undefined}
          />
          <Stat
            label="ジャンプ高"
            value={d.latestJumpHeight?.ok ? fmt(d.latestJumpHeight.heightCm, 1) : "—"}
            unit="cm"
            sub={d.latestJumpHeight?.ok ? <Badge kind="estimate">算出値</Badge> : undefined}
          />
        </div>
        {d.latestJumpHeight && !d.latestJumpHeight.ok && <p className="mt-2 text-xs text-muted">{d.latestJumpHeight.reason}</p>}
        {d.spikeSeries.length >= 2 && (
          <div className="mt-3">
            <LineChart points={d.spikeSeries} unit="cm" label="最高到達点（実測）" />
          </div>
        )}
      </Card>
    ),
    strength: (
      <Card key="strength" title="筋力（推定1RM・直近4週間）" action={<Link href="/training" className="text-sm font-semibold text-accent">一覧</Link>}>
        {d.strength.lowerBody.length + d.strength.other.length === 0 ? (
          <EmptyState>直近4週間の筋トレ記録がありません</EmptyState>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {[...d.strength.lowerBody, ...d.strength.other].slice(0, 6).map((s) => (
              <li key={s.exerciseId} className="flex items-center justify-between py-2">
                <Link href={`/training/exercise/${s.exerciseId}`} className="underline-offset-2 hover:underline">
                  {s.exerciseName}
                  {s.bodyPart === "lower" && <span className="ml-1 text-xs text-muted">下半身</span>}
                </Link>
                <span className="num">
                  {fmt(s.recentBest, 1)} kg
                  {s.previousBest != null && s.recentBest != null && (
                    <span className="ml-1.5 text-xs text-muted">
                      前4週 {fmt(s.previousBest, 1)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">推定1RMは1〜10回のセットから計算した参考値です。</p>
      </Card>
    ),
  };

  return (
    <>
      <PageHeader
        title={formatDateJp(today)}
        action={
          <Link href="/settings" className="rounded-lg p-2 text-ink-2" aria-label="設定">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16.2 12.3 17.5 13l-1.6 2.8-1.4-.6a6 6 0 0 1-1.6.9L12.7 17.6H9.5l-.3-1.5a6 6 0 0 1-1.6-.9l-1.4.6-1.6-2.8 1.3-.7a6 6 0 0 1 0-1.9L4.6 9.6l1.6-2.8 1.4.6a6 6 0 0 1 1.6-.9l.3-1.5h3.2l.3 1.5a6 6 0 0 1 1.6.9l1.4-.6 1.6 2.8-1.3.7a6 6 0 0 1 0 1.9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </Link>
        }
      />
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-ink-2">{user.displayName}さん</p>
          {d.primaryGoal && <p className="text-xs text-muted">最優先目標：{GOAL_LABELS[d.primaryGoal as Goal]}</p>}
        </div>
        {t && (
          <div className="rounded-2xl bg-accent px-4 py-3 text-accent-ink">
            <div className="text-xs opacity-90">今日の摂取目標（推定）</div>
            <div className="num text-3xl font-semibold">
              {fmtRange(t.energyKcal)}
              <span className="ml-1 text-sm font-normal">kcal</span>
            </div>
            <div className="num mt-0.5 text-xs opacity-90">
              摂取済み {fmt(n?.energyKcal ?? 0)} kcal・P {fmtRange(t.proteinG)} / F {fmtRange(t.fatG)} / C {fmtRange(t.carbsG)} g
            </div>
          </div>
        )}

        <section aria-labelledby="advice-h" className="space-y-2">
          <h2 id="advice-h" className="text-sm font-semibold text-ink-2">今日のアドバイス</h2>
          {d.suggestions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-3 text-sm text-muted">
              記録が増えると、記録にもとづく提案を表示します。現在、表示できる提案はありません。
            </p>
          ) : (
            d.suggestions.map((s) => (
              <Notice key={s.id} tone={s.level} title={s.title}>
                <p>{s.detail}</p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-muted">根拠となった記録</summary>
                  <ul className="num mt-1 list-disc space-y-0.5 pl-4 text-xs">
                    {s.evidence.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </details>
              </Notice>
            ))
          )}
        </section>

        {d.order.map((c) => cards[c])}
      </div>
    </>
  );
}
