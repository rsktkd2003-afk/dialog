import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { sessionLoad } from "@/lib/calc/load";
import { addDays, formatDateJp, formatShortDate, todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { INTENSITY_LABELS, listPractices } from "@/lib/repo/practice";
import { getProfile } from "@/lib/repo/profile";
import { deletePracticeAction } from "./actions";
import { PracticeForm } from "./PracticeForm";

export const metadata: Metadata = { title: "練習" };
export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const user = await requireUser();
  const db = getDb();
  const today = todayString();
  const [profile, sessions] = await Promise.all([getProfile(db, user.id), listPractices(db, user.id, { from: addDays(today, -55), limit: 200 })]);

  const weeks = Array.from({ length: 4 }, (_, i) => {
    const end = addDays(today, -7 * i);
    const start = addDays(end, -6);
    const ss = sessions.filter((s) => s.date >= start && s.date <= end);
    const withRpe = ss.filter((s) => s.rpe != null);
    return {
      start,
      end,
      count: ss.length,
      minutes: ss.reduce((a, s) => a + s.durationMin, 0),
      load: withRpe.reduce((a, s) => a + sessionLoad(s.rpe!, s.durationMin), 0),
      rpeMissing: ss.length - withRpe.length,
      jumps: ss.reduce((a, s) => a + (s.jumpCount ?? 0), 0),
    };
  });

  return (
    <>
      <PageHeader title="バレー練習" back="/" action={<Link href="/body/jump/new" className="text-sm font-semibold text-accent">到達点を記録</Link>} />
      <div className="space-y-4">
        <Card>
          <PracticeForm date={today} minutes={profile?.practiceMinutes ?? null} intensity={profile?.practiceIntensity ?? null} />
        </Card>

        <Card title="週ごとの練習量">
          <table className="num w-full text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="py-1 text-left font-normal">期間</th>
                <th className="py-1 text-right font-normal">回数</th>
                <th className="py-1 text-right font-normal">時間</th>
                <th className="py-1 text-right font-normal">負荷(AU)</th>
                <th className="py-1 text-right font-normal">ジャンプ</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.start} className="border-t border-line">
                  <td className="py-1.5">{formatShortDate(w.start)}〜{formatShortDate(w.end)}</td>
                  <td className="py-1.5 text-right">{w.count}</td>
                  <td className="py-1.5 text-right">{fmt(w.minutes / 60, 1)}h</td>
                  <td className="py-1.5 text-right">
                    {w.count === 0 ? "—" : fmt(w.load)}
                    {w.rpeMissing > 0 && <span className="text-[10px] text-muted">*</span>}
                  </td>
                  <td className="py-1.5 text-right">{w.jumps || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">負荷はセッションRPE法（RPE×時間）による目安です。* はRPE未入力の練習を含み、その分は負荷に含まれていません。</p>
        </Card>

        <Card title="最近の練習">
          {sessions.length === 0 ? (
            <EmptyState>まだ記録がありません</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {sessions.slice(0, 30).map((s) => (
                <li key={s.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{formatDateJp(s.date)}{s.startTime && <span className="ml-1 text-xs text-muted">{s.startTime}〜</span>}</div>
                    <div className="num text-xs text-ink-2">
                      {s.durationMin}分・強度{INTENSITY_LABELS[s.intensity]}
                      {s.rpe != null && `・RPE ${s.rpe}（負荷 ${sessionLoad(s.rpe, s.durationMin)}）`}
                      {s.jumpCount != null && `・ジャンプ${s.jumpCount}回`}
                      {s.spikeCount != null && `・スパイク${s.spikeCount}本`}
                    </div>
                    {(s.performance != null || s.fatigue != null) && (
                      <div className="text-xs text-muted">
                        {s.performance != null && `調子 ${s.performance}/5 `}
                        {s.fatigue != null && `疲労 ${s.fatigue}/5`}
                      </div>
                    )}
                    {s.note && <div className="truncate text-xs text-muted">{s.note}</div>}
                  </div>
                  <form action={deletePracticeAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="min-h-11 px-2 text-xs text-muted underline">削除</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
