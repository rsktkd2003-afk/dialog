import type { Metadata } from "next";
import Link from "next/link";
import { Card, Notice, PageHeader, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { PAIN_CONSULT_MESSAGE, SITE_LABELS, buildSuggestions } from "@/lib/calc/suggestions";
import { addDays, formatDateJp, formatShortDate, isValidDateString, todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { DISCOMFORT_LEVEL_LABELS, listConditions } from "@/lib/repo/condition";
import { getProfile } from "@/lib/repo/profile";
import { ConditionForm } from "./ConditionForm";

export const metadata: Metadata = { title: "コンディション" };
export const dynamic = "force-dynamic";

export default async function ConditionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayString();
  const date = sp.date && isValidDateString(sp.date) && sp.date <= today ? sp.date : today;
  const db = getDb();
  const [profile, logs] = await Promise.all([getProfile(db, user.id), listConditions(db, user.id, { from: addDays(today, -27), to: today })]);
  const current = logs.find((l) => l.date === date) ?? null;
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
  }).find((s) => s.id === "pain");

  return (
    <>
      <PageHeader title="コンディション" back="/" />
      <div className="mb-3 flex items-center justify-between">
        <Link href={`/condition?date=${addDays(date, -1)}`} className="min-h-11 px-2 py-2 text-sm text-ink-2">← 前日</Link>
        <span className="font-semibold">{formatDateJp(date)}</span>
        {date < today ? <Link href={`/condition?date=${addDays(date, 1)}`} className="min-h-11 px-2 py-2 text-sm text-ink-2">翌日 →</Link> : <span className="w-14" />}
      </div>
      <div className="space-y-4">
        {pain && (
          <Notice tone="care" title={pain.title}>
            <p>{PAIN_CONSULT_MESSAGE}</p>
            <ul className="mt-1 list-disc pl-4 text-xs">
              {pain.evidence.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </Notice>
        )}
        <Card>
          <ConditionForm
            date={date}
            initial={current ? { ...current, discomforts: current.discomforts.map((d) => ({ site: d.site, level: d.level, side: d.side })) } : null}
            usualSleep={profile?.usualSleepHours ?? null}
          />
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
                      {l.discomforts.length > 0 && (
                        <div className="text-[11px] text-muted">
                          {l.discomforts.map((d) => `${SITE_LABELS[d.site]}:${DISCOMFORT_LEVEL_LABELS[d.level]}`).join(" ")}
                        </div>
                      )}
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
      </div>
    </>
  );
}
