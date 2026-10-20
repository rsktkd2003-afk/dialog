import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { getTemplate, getWorkout, listExercises, previousSets } from "@/lib/repo/training";
import { WorkoutBuilder, type PrevRecord, type Row } from "./WorkoutBuilder";

export const metadata: Metadata = { title: "筋トレを記録" };
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f-]{36}$/i;

export default async function NewWorkoutPage({ searchParams }: { searchParams: Promise<{ template?: string; from?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const db = getDb();
  const today = todayString();
  const exercises = await listExercises(db, user.id);
  const prevMap = await previousSets(db, user.id, exercises.map((e) => e.id), today);
  const previous: Record<string, PrevRecord> = Object.fromEntries(prevMap);

  let rows: Omit<Row, "key">[] = [];
  let title: string | undefined;
  let split: string | undefined;
  if (sp.template && uuid.test(sp.template)) {
    const t = await getTemplate(db, user.id, sp.template);
    if (t) {
      title = t.name;
      split = t.split;
      rows = t.items.flatMap((it) =>
        Array.from({ length: it.sets }, () => ({
          exerciseId: it.exerciseId,
          side: it.side,
          weightKg: it.weightKg != null ? String(it.weightKg) : "",
          reps: String(it.reps),
          rpe: "",
          rir: "",
          restSec: "",
        })),
      );
    }
  } else if (sp.from && uuid.test(sp.from)) {
    const w = await getWorkout(db, user.id, sp.from);
    if (w) {
      title = w.title ?? undefined;
      split = w.split;
      rows = w.sets.map((s) => ({
        exerciseId: s.exerciseId,
        side: s.side,
        weightKg: String(s.weightKg),
        reps: String(s.reps),
        rpe: "",
        rir: "",
        restSec: s.restSec != null ? String(s.restSec) : "",
      }));
    }
  }
  const accessible = new Set(exercises.map((e) => e.id));
  rows = rows.filter((r) => accessible.has(r.exerciseId));

  return (
    <>
      <PageHeader title="筋トレを記録" back="/training" />
      <WorkoutBuilder
        date={today}
        exercises={exercises.map((e) => ({ id: e.id, name: e.name, bodyPart: e.bodyPart, unilateral: e.unilateral }))}
        previous={previous}
        initialRows={rows}
        initialTitle={title}
        initialSplit={split}
      />
    </>
  );
}
