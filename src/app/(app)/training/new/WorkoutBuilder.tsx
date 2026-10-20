"use client";

import { useActionState, useMemo, useState } from "react";
import { FormMessage, SubmitButton, type ActionState } from "@/components/form";
import { estimateOneRepMax } from "@/lib/calc/strength";
import { saveWorkoutAction } from "../actions";

export type ExerciseOption = { id: string; name: string; bodyPart: string; unilateral: boolean };
export type PrevRecord = { date: string; sets: { weightKg: number; reps: number; side: string; rpe: number | null; rir: number | null }[] };
export type Row = { key: number; exerciseId: string; side: "both" | "left" | "right"; weightKg: string; reps: string; rpe: string; rir: string; restSec: string };

const SIDE = { both: "両側", left: "左", right: "右" } as const;
const PART = { lower: "下半身", upper: "上半身", core: "体幹", full: "全身" } as Record<string, string>;
const cell = "num min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-center";

export function WorkoutBuilder({
  date,
  exercises,
  previous,
  initialRows,
  initialTitle,
  initialSplit,
}: {
  date: string;
  exercises: ExerciseOption[];
  previous: Record<string, PrevRecord>;
  initialRows: Omit<Row, "key">[];
  initialTitle?: string;
  initialSplit?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveWorkoutAction, {});
  const [rows, setRows] = useState<Row[]>(initialRows.map((r, i) => ({ ...r, key: i })));
  const [nextKey, setNextKey] = useState(initialRows.length);
  const [picker, setPicker] = useState(exercises[0]?.id ?? "");
  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const groups: { exerciseId: string; rows: Row[] }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.exerciseId === r.exerciseId) last.rows.push(r);
    else groups.push({ exerciseId: r.exerciseId, rows: [r] });
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addSet(after: Row) {
    const idx = rows.findIndex((r) => r.key === after.key);
    const copy: Row = { ...after, key: nextKey };
    setNextKey(nextKey + 1);
    setRows([...rows.slice(0, idx + 1), copy, ...rows.slice(idx + 1)]);
  }
  function addExercise() {
    if (!picker) return;
    const ex = exMap.get(picker);
    const prev = previous[picker]?.sets[0];
    const base = { exerciseId: picker, weightKg: prev ? String(prev.weightKg) : "", reps: prev ? String(prev.reps) : "", rpe: "", rir: "", restSec: "" };
    if (ex?.unilateral) {
      setRows([...rows, { ...base, side: "left", key: nextKey }, { ...base, side: "right", key: nextKey + 1 }]);
      setNextKey(nextKey + 2);
    } else {
      setRows([...rows, { ...base, side: "both", key: nextKey }]);
      setNextKey(nextKey + 1);
    }
  }

  const payload = JSON.stringify(
    rows.map((r) => ({ exerciseId: r.exerciseId, side: r.side, weightKg: r.weightKg, reps: r.reps, rpe: r.rpe, rir: r.rir, restSec: r.restSec })),
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="sets" value={payload} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="w-date" className="mb-1 block text-sm font-medium">日付</label>
          <input id="w-date" name="date" type="date" defaultValue={date} className="min-h-11 w-full rounded-xl border border-line bg-surface px-2" />
        </div>
        <div>
          <label htmlFor="w-split" className="mb-1 block text-sm font-medium">区分</label>
          <select id="w-split" name="split" defaultValue={initialSplit ?? "other"} className="min-h-11 w-full rounded-xl border border-line bg-surface px-2">
            <option value="lower">下半身</option>
            <option value="upper">上半身</option>
            <option value="full">全身</option>
            <option value="other">その他</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="w-title" className="mb-1 block text-sm font-medium">メモ名 <span className="text-xs font-normal text-muted">任意</span></label>
        <input id="w-title" name="title" defaultValue={initialTitle} placeholder="例：下半身A" className="min-h-11 w-full rounded-xl border border-line bg-surface px-3" />
      </div>

      {groups.map((g, gi) => {
        const ex = exMap.get(g.exerciseId);
        const prev = previous[g.exerciseId];
        return (
          <section key={gi} className="rounded-2xl border border-line bg-surface p-3">
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="font-semibold">{ex?.name ?? "不明な種目"}</h3>
              <span className="text-xs text-muted">{ex ? PART[ex.bodyPart] : ""}</span>
            </div>
            <p className="mb-2 text-xs text-muted">
              {prev
                ? `前回 ${prev.date}：${prev.sets.map((s) => `${s.side !== "both" ? SIDE[s.side as keyof typeof SIDE] : ""}${s.weightKg}kg×${s.reps}`).join("、")}`
                : "前回の記録はありません"}
            </p>
            <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr] gap-1.5 text-[11px] text-muted">
              <span />
              <span className="text-center">重量kg</span>
              <span className="text-center">回数</span>
              <span className="text-center">RPE</span>
              <span className="text-center">RIR</span>
            </div>
            {g.rows.map((r, i) => {
              const est = estimateOneRepMax(Number(r.weightKg), Number(r.reps));
              return (
                <div key={r.key} className="mt-1.5">
                  <div className="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr] items-center gap-1.5">
                    <select
                      aria-label={`${i + 1}セット目の左右`}
                      value={r.side}
                      onChange={(e) => update(r.key, { side: e.target.value as Row["side"] })}
                      className="min-h-11 w-full appearance-none rounded-lg border border-line bg-surface text-center text-xs"
                    >
                      <option value="both">{i + 1}</option>
                      <option value="left">左</option>
                      <option value="right">右</option>
                    </select>
                    <input aria-label={`${i + 1}セット目の重量`} inputMode="decimal" value={r.weightKg} onChange={(e) => update(r.key, { weightKg: e.target.value })} className={cell} />
                    <input aria-label={`${i + 1}セット目の回数`} inputMode="numeric" value={r.reps} onChange={(e) => update(r.key, { reps: e.target.value })} className={cell} />
                    <input aria-label={`${i + 1}セット目のRPE`} inputMode="decimal" value={r.rpe} onChange={(e) => update(r.key, { rpe: e.target.value })} className={cell} placeholder="-" />
                    <input aria-label={`${i + 1}セット目のRIR`} inputMode="numeric" value={r.rir} onChange={(e) => update(r.key, { rir: e.target.value })} className={cell} placeholder="-" />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 whitespace-nowrap pl-1 text-[11px] text-muted">
                    <label className="flex shrink-0 items-center gap-1">
                      休憩
                      <input aria-label={`${i + 1}セット目の休憩秒`} inputMode="numeric" value={r.restSec} onChange={(e) => update(r.key, { restSec: e.target.value })} className="num h-7 w-14 rounded border border-line bg-surface px-1 text-center" placeholder="秒" />
                    </label>
                    {est && <span className="num">推定1RM {est.average.toFixed(1)}kg</span>}
                    <button type="button" onClick={() => addSet(r)} className="ml-auto min-h-8 px-1 text-accent">＋同じセット</button>
                    <button type="button" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="min-h-8 px-1 underline">削除</button>
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      <div className="flex gap-2">
        <label htmlFor="ex-pick" className="sr-only">追加する種目</label>
        <select id="ex-pick" value={picker} onChange={(e) => setPicker(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-2">
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}（{PART[e.bodyPart]}）
            </option>
          ))}
        </select>
        <button type="button" onClick={addExercise} className="min-h-11 shrink-0 whitespace-nowrap rounded-xl border border-line bg-surface px-3 text-sm font-semibold">種目を追加</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="w-dur" className="mb-1 block text-sm font-medium">時間（分）<span className="ml-1 text-xs font-normal text-muted">任意</span></label>
          <input id="w-dur" name="durationMin" inputMode="numeric" className="num min-h-11 w-full rounded-xl border border-line bg-surface px-3" />
        </div>
        <div>
          <label htmlFor="w-rpe" className="mb-1 block text-sm font-medium">全体のきつさ（0〜10）<span className="ml-1 text-xs font-normal text-muted">任意</span></label>
          <input id="w-rpe" name="sessionRpe" inputMode="numeric" className="num min-h-11 w-full rounded-xl border border-line bg-surface px-3" />
        </div>
      </div>
      <div>
        <label htmlFor="w-note" className="mb-1 block text-sm font-medium">メモ <span className="text-xs font-normal text-muted">任意</span></label>
        <textarea id="w-note" name="note" rows={2} className="w-full rounded-xl border border-line bg-surface px-3 py-2" />
      </div>
      <p className="text-xs text-muted">RPE：主観的なきつさ（10＝限界）。RIR：あと何回できたか。推定1RMは1〜10回のセットのみ表示する参考値です。</p>
      <SubmitButton className="w-full">保存する</SubmitButton>
    </form>
  );
}
