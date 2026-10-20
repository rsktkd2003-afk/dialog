"use client";

import { useId, useState } from "react";
import { formatShortDate } from "@/lib/date";
import { dayNumber, niceTicks } from "./scale";

export type LinePoint = { date: string; value: number; note?: string };

const W = 340;
const H = 160;
const PAD = { top: 12, right: 14, bottom: 22, left: 40 };

/** 単一系列の時系列折れ線。タップ／ホバーで値を表示し、表形式でも確認できる。 */
export function LineChart({ points, unit, label, digits = 1 }: { points: LinePoint[]; unit: string; label: string; digits?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (sorted.length === 0) return null;

  const xs = sorted.map((p) => dayNumber(p.date));
  const ys = sorted.map((p) => p.value);
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const yMin = ticks[0]!;
  const yMax = ticks[ticks.length - 1]!;
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + (xMax === xMin ? iw / 2 : ((x - xMin) / (xMax - xMin)) * iw);
  const sy = (y: number) => PAD.top + ih - ((y - yMin) / (yMax - yMin)) * ih;
  const path = sorted.map((p, i) => `${i === 0 ? "M" : "L"}${sx(xs[i]!).toFixed(1)},${sy(p.value).toFixed(1)}`).join(" ");
  const shown = active ?? sorted.length - 1;
  const ap = sorted[shown]!;
  const f = (v: number) => v.toLocaleString("ja-JP", { maximumFractionDigits: digits });

  function nearest(clientX: number, rect: DOMRect) {
    const x = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bd = Infinity;
    sorted.forEach((_, i) => {
      const d = Math.abs(sx(xs[i]!) - x);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setActive(best);
  }

  return (
    <figure className="m-0">
      <div className="mb-1 flex items-baseline justify-between text-sm" aria-live="polite">
        <span className="text-muted">{formatShortDate(ap.date)}{ap.note ? `・${ap.note}` : ""}</span>
        <span className="num font-semibold">
          {f(ap.value)}
          <span className="ml-0.5 text-xs font-normal text-ink-2">{unit}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full touch-pan-y select-none"
        role="img"
        aria-labelledby={titleId}
        onPointerMove={(e) => nearest(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => nearest(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActive(null)}
      >
        <title id={titleId}>{`${label}の推移（${sorted.length}件）`}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.left - 6} y={sy(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted)" className="num">
              {f(t)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} fontSize="10" fill="var(--muted)">
          {formatShortDate(sorted[0]!.date)}
        </text>
        {sorted.length > 1 && (
          <text x={W - PAD.right} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor="end">
            {formatShortDate(sorted[sorted.length - 1]!.date)}
          </text>
        )}
        {active != null && (
          <line x1={sx(xs[shown]!)} x2={sx(xs[shown]!)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--muted)" strokeWidth="1" />
        )}
        {sorted.length > 1 && <path d={path} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {sorted.map((p, i) =>
          i === shown || sorted.length <= 12 ? (
            <circle
              key={p.date + i}
              cx={sx(xs[i]!)}
              cy={sy(p.value)}
              r={i === shown ? 5 : 3.5}
              fill="var(--series-1)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          ) : null,
        )}
      </svg>
      <details className="mt-1 text-xs text-ink-2">
        <summary className="cursor-pointer py-1 text-muted">表で見る</summary>
        <table className="num mt-1 w-full">
          <tbody>
            {[...sorted].reverse().map((p, i) => (
              <tr key={p.date + i} className="border-t border-line">
                <td className="py-1">{p.date}</td>
                <td className="py-1 text-right">
                  {f(p.value)} {unit}
                </td>
                {p.note !== undefined && <td className="py-1 pl-2 text-muted">{p.note}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
