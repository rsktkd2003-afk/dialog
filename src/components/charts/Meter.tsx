/** 摂取量と目標の比較バー。目標に幅がある場合は幅を薄く示す。 */
export function Meter({ label, value, target, unit, note }: { label: string; value: number; target: { min: number; max: number } | null; unit: string; note?: string }) {
  const maxScale = target ? Math.max(target.max * 1.25, value) : Math.max(value, 1);
  const pct = (v: number) => `${Math.min(100, (v / maxScale) * 100)}%`;
  const f = (v: number) => Math.round(v).toLocaleString("ja-JP");
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="num text-ink-2">
          <span className="font-semibold text-ink">{f(value)}</span>
          {target ? ` / ${target.min === target.max ? f(target.min) : `${f(target.min)}〜${f(target.max)}`}` : ""} {unit}
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${label} ${f(value)}${unit}${target ? `、目標 ${f(target.min)}${unit}` : ""}`}>
        {target && target.max > target.min && (
          <span className="absolute inset-y-0 bg-accent-soft" style={{ left: pct(target.min), width: `calc(${pct(target.max)} - ${pct(target.min)})` }} />
        )}
        <span className="absolute inset-y-0 left-0 rounded-full bg-series-1" style={{ width: pct(value) }} />
        {target && <span className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: pct(target.min) }} />}
      </div>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}
