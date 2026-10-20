import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/form";
import { Card, LinkButton, PageHeader, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { estimateOneRepMax, volumeLoad } from "@/lib/calc/strength";
import { formatDateJp } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { SIDE_LABELS, SPLIT_LABELS, getWorkout } from "@/lib/repo/training";
import { deleteWorkoutAction, saveTemplateAction } from "../actions";

export const metadata: Metadata = { title: "筋トレの記録" };
export const dynamic = "force-dynamic";

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const w = await getWorkout(getDb(), user.id, id);
  if (!w) notFound();

  const groups: { name: string; sets: typeof w.sets }[] = [];
  for (const s of w.sets) {
    const last = groups[groups.length - 1];
    if (last && last.name === s.exerciseName) last.sets.push(s);
    else groups.push({ name: s.exerciseName, sets: [s] });
  }

  return (
    <>
      <PageHeader title={formatDateJp(w.date)} back="/training" />
      <div className="space-y-4">
        <Card>
          <div className="text-sm">{w.title ?? "筋トレ"}・{SPLIT_LABELS[w.split]}</div>
          <div className="num mt-1 text-xs text-muted">
            {w.sets.length}セット・総負荷量 {fmt(volumeLoad(w.sets))} kg
            {w.durationMin != null && `・${w.durationMin}分`}
            {w.sessionRpe != null && `・セッションRPE ${w.sessionRpe}`}
          </div>
          {w.note && <p className="mt-2 text-sm text-ink-2">{w.note}</p>}
        </Card>
        {groups.map((g, i) => (
          <Card key={i} title={g.name}>
            <table className="num w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="py-1 text-left font-normal">#</th>
                  <th className="py-1 text-right font-normal">重量</th>
                  <th className="py-1 text-right font-normal">回数</th>
                  <th className="py-1 text-right font-normal">RPE/RIR</th>
                  <th className="py-1 text-right font-normal">推定1RM</th>
                </tr>
              </thead>
              <tbody>
                {g.sets.map((s, j) => {
                  const est = estimateOneRepMax(s.weightKg, s.reps);
                  return (
                    <tr key={s.id} className="border-t border-line">
                      <td className="py-1.5">{j + 1}{s.side !== "both" && <span className="ml-1 text-xs text-muted">{SIDE_LABELS[s.side]}</span>}</td>
                      <td className="py-1.5 text-right">{fmt(s.weightKg, 1)} kg</td>
                      <td className="py-1.5 text-right">{s.reps}</td>
                      <td className="py-1.5 text-right">{s.rpe ?? "-"} / {s.rir ?? "-"}</td>
                      <td className="py-1.5 text-right text-ink-2">{est ? `${est.average.toFixed(1)}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        ))}
        <p className="text-xs text-muted">推定1RMは Epley式と Brzycki式の平均で、1〜10回のセットのみ算出する参考値です。フォームや疲労の影響は含みません。</p>
        <LinkButton href={`/training/new?from=${w.id}`} className="w-full">このメニューで記録する</LinkButton>
        <Card title="テンプレートとして保存">
          <ActionForm action={saveTemplateAction} className="flex gap-2">
            <input type="hidden" name="workoutId" value={w.id} />
            <label htmlFor="tpl-name" className="sr-only">テンプレート名</label>
            <input id="tpl-name" name="name" defaultValue={w.title ?? ""} placeholder="テンプレート名" className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-3" />
            <SubmitButton variant="secondary">保存</SubmitButton>
          </ActionForm>
        </Card>
        <ActionForm action={deleteWorkoutAction} confirmMessage="この記録を削除しますか？" className="text-center">
          <input type="hidden" name="id" value={w.id} />
          <SubmitButton variant="danger" className="w-full">この記録を削除</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
