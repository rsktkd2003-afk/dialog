import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/form";
import { Card, EmptyState, Notice, PageHeader, Stat, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { PAIN_CONSULT_MESSAGE, SITE_LABELS, buildSuggestions } from "@/lib/calc/suggestions";
import { addDays, formatDateJp, formatShortDate, isValidDateString, todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { DISCOMFORT_LEVEL_LABELS, listConditions } from "@/lib/repo/condition";
import { getProfile } from "@/lib/repo/profile";
import {
  SYMPTOM_IMPACT_LABELS,
  SYMPTOM_KIND_LABELS,
  SYMPTOM_SIDE_LABELS,
  SYMPTOM_SITE_LABELS,
  SYMPTOM_SITUATION_LABELS,
  listSymptoms,
} from "@/lib/repo/symptoms";
import { deleteSymptomAction } from "./actions";
import { ConditionForm } from "./ConditionForm";
import { SymptomForm } from "./SymptomForm";

export const metadata: Metadata = { title: "体調・不調" };
export const dynamic = "force-dynamic";

const SIDE_JP = { left: "左", right: "右", both: "両方" } as const;

export default async function ConditionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayString();
  const date = sp.date && isValidDateString(sp.date) && sp.date <= today ? sp.date : today;
  const db = getDb();
  const [profile, logs, symptoms] = await Promise.all([
    getProfile(db, user.id),
    listConditions(db, user.id, { from: addDays(today, -27), to: today }),
    listSymptoms(db, user.id, { limit: 100 }),
  ]);
  const current = logs.find((l) => l.date === date) ?? null;
  const legacy = logs.filter((l) => l.discomforts.length > 0);
  const pain = buildSuggestions({
    today,
    age: null,
    primaryGoal: null,
    latestWeightKg: null,
    proteinTargetG: null,
    nutritionDays: [],
    practiceDays: [],
    weights: [],
    conditions: logs.map((c) => ({ date: c.date, sleepHours: c.sleepHours, discomforts: c.discomforts.map((d) => ({ site: d.site, level: d.level })) })),
    strengthTrends: [],
    measuredSpikeReaches: [],
    symptoms: symptoms.map((x) => ({
      date: x.date,
      siteLabel: SYMPTOM_SITE_LABELS[x.site],
      kind: x.kind,
      kindLabel: SYMPTOM_KIND_LABELS[x.kind],
      level: x.level,
      impact: x.impact,
    })),
  }).find((s) => s.id === "pain");
  const hasRecentSymptoms = symptoms.some((x) => x.date > addDays(today, -14) && x.level >= 1);

  return (
    <>
      <PageHeader title="体調・不調" />
      <div className="space-y-4">
        {(pain || hasRecentSymptoms) && (
          <Notice tone="care" title={pain?.title ?? "痛み・違和感などが記録されています"}>
            <p>{PAIN_CONSULT_MESSAGE}</p>
            <p className="mt-1">急に悪化した場合や症状が強い場合は、早めに医療機関に相談してください。</p>
            {pain && (
              <ul className="num mt-1 list-disc pl-4 text-xs">
                {pain.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </Notice>
        )}

        <Card title="体の不調・違和感を記録">
          <p className="mb-3 text-xs text-muted">どこが、どんなときに、どの程度気になるかを記録できます。同じ日に複数の部位を記録できます。</p>
          <SymptomForm today={today} />
        </Card>

        <Card title={`不調の記録履歴（${symptoms.length}件）`}>
          {symptoms.length === 0 ? (
            <EmptyState>まだ不調の記録はありません</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {symptoms.map((x) => (
                <li key={x.id} className="flex items-start gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {SYMPTOM_SITE_LABELS[x.site]}（{SYMPTOM_SIDE_LABELS[x.side]}）・{SYMPTOM_KIND_LABELS[x.kind]}
                    </div>
                    <div className="num text-xs text-muted">
                      {formatDateJp(x.date)}・程度 {x.level}/10・{SYMPTOM_SITUATION_LABELS[x.situation]}
                    </div>
                    <div className="text-xs text-muted">運動への影響：{SYMPTOM_IMPACT_LABELS[x.impact]}</div>
                    {x.note && <p className="mt-1 text-xs break-words whitespace-pre-wrap text-ink-2">{x.note}</p>}
                  </div>
                  <ActionForm action={deleteSymptomAction} confirmMessage="この不調の記録を削除しますか？" className="shrink-0">
                    <input type="hidden" name="id" value={x.id} />
                    <SubmitButton variant="danger" className="min-h-9! px-3! text-xs">削除</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
          {legacy.length > 0 && (
            <details className="mt-3 rounded-xl bg-surface-2 p-3">
              <summary className="cursor-pointer text-xs text-ink-2">以前の形式の記録（直近4週間・参照のみ）</summary>
              <ul className="mt-2 space-y-1 text-xs text-ink-2">
                {legacy.map((l) => (
                  <li key={l.id}>
                    {formatDateJp(l.date)}：
                    {l.discomforts
                      .map((d) => `${SITE_LABELS[d.site]}${d.side ? `（${SIDE_JP[d.side]}）` : ""} ${DISCOMFORT_LEVEL_LABELS[d.level]}`)
                      .join("、")}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        <Card title="睡眠・疲労などの体調">
          <div className="mb-3 flex items-center justify-between">
            <Link href={`/condition?date=${addDays(date, -1)}`} className="min-h-11 py-2 pr-2 text-sm text-ink-2">← 前日</Link>
            <span className="text-sm font-semibold">{formatDateJp(date)}</span>
            {date < today ? (
              <Link href={`/condition?date=${addDays(date, 1)}`} className="min-h-11 py-2 pl-2 text-sm text-ink-2">翌日 →</Link>
            ) : (
              <span className="w-14" />
            )}
          </div>
          <ConditionForm date={date} initial={current} usualSleep={profile?.usualSleepHours ?? null} />
        </Card>

        <Card title={date === today ? "今日の体調" : `${formatDateJp(date)}の体調`}>
          {current ? (
            <div className="grid grid-cols-4 gap-2">
              <Stat label="睡眠" value={fmt(current.sleepHours, 1)} unit="h" />
              <Stat label="疲労" value={fmt(current.fatigue)} unit="/5" />
              <Stat label="筋肉痛" value={fmt(current.soreness)} unit="/5" />
              <Stat label="調子" value={fmt(current.feeling)} unit="/5" />
            </div>
          ) : (
            <p className="text-sm text-muted">まだ記録がありません</p>
          )}
        </Card>

        <Card title="直近4週間">
          {logs.length === 0 ? (
            <p className="text-sm text-muted">記録がありません</p>
          ) : (
            <table className="num w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="py-1 text-left font-normal">日付</th>
                  <th className="py-1 text-right font-normal">睡眠</th>
                  <th className="py-1 text-right font-normal">疲労</th>
                  <th className="py-1 text-right font-normal">筋肉痛</th>
                  <th className="py-1 text-right font-normal">調子</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-line align-top">
                    <td className="py-1.5">
                      <Link href={`/condition?date=${l.date}`} className="underline-offset-2 hover:underline">{formatShortDate(l.date)}</Link>
                      {l.isRestDay && <span className="ml-1 text-[10px] text-muted">休養</span>}
                    </td>
                    <td className="py-1.5 text-right">{fmt(l.sleepHours, 1)}</td>
                    <td className="py-1.5 text-right">{fmt(l.fatigue)}</td>
                    <td className="py-1.5 text-right">{fmt(l.soreness)}</td>
                    <td className="py-1.5 text-right">{fmt(l.feeling)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-muted">各項目は主観的な5段階の記録です。医学的に検証された指標ではありません。</p>
        </Card>

        <Notice tone="info" title="安全上のご案内">
          ここで記録した内容から、病名やけがの程度、競技に復帰できるかどうかを判断することはできません。症状が続く・悪化する場合は、医師や理学療法士などの医療専門職に相談してください。
        </Notice>
      </div>
    </>
  );
}
