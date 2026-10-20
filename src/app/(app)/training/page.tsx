import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/form";
import { Card, EmptyState, LinkButton, PageHeader, fmt } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { formatDateJp } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { BODY_PART_LABELS, SPLIT_LABELS, listExercises, listTemplates, listWorkouts } from "@/lib/repo/training";
import { createExerciseAction, deleteTemplateAction } from "./actions";

export const metadata: Metadata = { title: "筋トレ" };
export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const user = await requireUser();
  const db = getDb();
  const [workouts, templates, exercises] = await Promise.all([
    listWorkouts(db, user.id, { limit: 30 }),
    listTemplates(db, user.id),
    listExercises(db, user.id),
  ]);
  const exName = new Map(exercises.map((e) => [e.id, e.name]));

  return (
    <>
      <PageHeader title="筋トレ" />
      <LinkButton href="/training/new" className="mb-4 w-full">＋ 今日の筋トレを記録</LinkButton>
      <div className="space-y-4">
        <Card title="テンプレート">
          {templates.length === 0 ? (
            <p className="text-sm text-muted">記録したワークアウトの詳細画面から、テンプレートとして保存できます。</p>
          ) : (
            <ul className="divide-y divide-line">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{t.name}<span className="ml-1 text-xs text-muted">{SPLIT_LABELS[t.split]}</span></div>
                    <div className="truncate text-xs text-muted">{t.items.map((i) => exName.get(i.exerciseId) ?? "削除済み種目").join("・")}</div>
                  </div>
                  <LinkButton href={`/training/new?template=${t.id}`} variant="secondary" className="min-h-9!">開始</LinkButton>
                  <form action={deleteTemplateAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="min-h-11 px-1 text-xs text-muted underline">削除</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="最近の記録">
          {workouts.length === 0 ? (
            <EmptyState>まだ記録がありません</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {workouts.map((w) => (
                <li key={w.id}>
                  <Link href={`/training/${w.id}`} className="block py-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium">{formatDateJp(w.date)}{w.title ? `・${w.title}` : ""}</span>
                      <span className="text-xs text-muted">{SPLIT_LABELS[w.split]}</span>
                    </div>
                    <div className="truncate text-xs text-ink-2">{w.exerciseNames.join("・")}</div>
                    <div className="num text-xs text-muted">{w.setCount}セット・総負荷量 {fmt(w.volumeKg)} kg</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="種目と推移">
          <ul className="grid grid-cols-2 gap-x-3 text-sm">
            {exercises.map((e) => (
              <li key={e.id}>
                <Link href={`/training/exercise/${e.id}`} className="block truncate py-1.5 text-ink underline-offset-2 hover:underline">
                  {e.name}
                  <span className="ml-1 text-[11px] text-muted">{BODY_PART_LABELS[e.bodyPart]}</span>
                </Link>
              </li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-accent">種目を追加</summary>
            <ActionForm action={createExerciseAction} className="mt-2 space-y-2">
              <label htmlFor="ex-name" className="sr-only">種目名</label>
              <input id="ex-name" name="name" placeholder="種目名" required className="min-h-11 w-full rounded-xl border border-line bg-surface px-3" />
              <div className="flex gap-2">
                <label htmlFor="ex-part" className="sr-only">部位</label>
                <select id="ex-part" name="bodyPart" className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-2">
                  {Object.entries(BODY_PART_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="unilateral" className="size-5" /> 片側種目
                </label>
              </div>
              <SubmitButton variant="secondary" className="w-full">追加</SubmitButton>
            </ActionForm>
          </details>
        </Card>
      </div>
    </>
  );
}
