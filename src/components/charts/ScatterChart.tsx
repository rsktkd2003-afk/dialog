"use client";

import { useId, useState } from "react";
import { niceTicks } from "./scale";

export type ScatterPoint = { x: number; y: number; label: string };

const W = 340;
const H = 200;
const PAD = { top: 12, right: 14, bottom: 34, left: 44 };

export function ScatterChart({ points, xLabel, yLabel }: { points: ScatterPoint[]; xLabel: string; yLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  if (points.length === 0) return null;
  const xt = niceTicks(Math.min(...points.map((p) => p.x)), Math.max(...points.map((p) => p.x)));
  const yt = niceTicks(Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.y)));
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + ((x - xt[0]!) / (xt[xt.length - 1]! - xt[0]!)) * iw;
  const sy = (y: number) => PAD.top + ih - ((y - yt[0]!) / (yt[yt.length - 1]! - yt[0]!)) * ih;
  const f = (v: number) => v.toLocaleString("ja-JP", { maximumFractionDigits: 1 });
  const ap = active != null ? points[active] : null;

  return (
    <figure className="m-0">
      <div className="mb-1 min-h-5 text-sm text-ink-2" aria-live="polite">
        {ap ? `${ap.label}：${xLabel} ${f(ap.x)} ／ ${yLabel} ${f(ap.y)}` : <span className="text-muted">点をタップすると値を表示します</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{`${xLabel}と${yLabel}の散布図（${points.length}件）`}</title>
        {yt.map((t) => (
          <g key={"y" + t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.left - 6} y={sy(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--muted)">
              {f(t)}
            </text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={"x" + t} x={sx(t)} y={PAD.top + ih + 14} textAnchor="middle" fontSize="10" fill="var(--muted)">
            {f(t)}
          </text>
        ))}
        <text x={PAD.left + iw / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--ink-2)">
          {xLabel}
        </text>
        {points.map((p, i) => (
          <g key={i} onPointerDown={() => setActive(i)} onPointerEnter={() => setActive(i)} className="cursor-pointer">
            <circle cx={sx(p.x)} cy={sy(p.y)} r="12" fill="transparent" />
            <circle cx={sx(p.x)} cy={sy(p.y)} r={active === i ? 6 : 4.5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <p className="mt-0.5 text-[11px] text-muted">縦軸：{yLabel}</p>
    </figure>
  );
}
