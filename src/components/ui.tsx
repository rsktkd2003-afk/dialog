import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-2 border-b border-line bg-plane/95 px-4 py-3 backdrop-blur">
      {back && (
        <Link href={back} className="-ml-2 rounded-lg p-2 text-ink-2" aria-label="戻る">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M12.5 4 6.5 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
      <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
      {action}
    </header>
  );
}

export function Card({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-ink-2">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, sub }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted">{label}</div>
      <div className="num mt-0.5 text-xl font-semibold">
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-ink-2">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

type Tone = "care" | "caution" | "info" | "positive";

const TONE: Record<Tone, { label: string; bar: string; icon: ReactNode }> = {
  care: {
    label: "要注意",
    bar: "bg-critical",
    icon: <path d="M10 6v5m0 3h.01M10 2 1.5 17h17L10 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  },
  caution: {
    label: "確認",
    bar: "bg-serious",
    icon: <path d="M10 6v5m0 3h.01M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  },
  info: {
    label: "参考",
    bar: "bg-series-1",
    icon: <path d="M10 9v5m0-8h.01M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  },
  positive: {
    label: "良好",
    bar: "bg-good",
    icon: <path d="m6 10.5 2.5 2.5L14 7.5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  },
};

/** 状態はアイコン＋ラベル＋色で示し、色だけに頼らない */
export function Notice({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  const t = TONE[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-3 pl-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${t.bar}`} aria-hidden="true" />
      <div className="flex items-start gap-2">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="mt-0.5 shrink-0 text-ink-2" aria-hidden="true">
          {t.icon}
        </svg>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">
            <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">{t.label}</span>
            {title}
          </div>
          {children && <div className="mt-1 text-sm text-ink-2">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export function Badge({ children, kind = "neutral" }: { children: ReactNode; kind?: "neutral" | "measured" | "estimate" }) {
  const cls =
    kind === "measured"
      ? "border-good-ink/40 text-good-ink"
      : kind === "estimate"
        ? "border-line text-muted border-dashed"
        : "border-line text-ink-2";
  return <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[11px] leading-none ${cls}`}>{children}</span>;
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">
      <div>{children}</div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function LinkButton({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: "primary" | "secondary"; className?: string }) {
  const cls =
    variant === "primary"
      ? "bg-accent text-accent-ink"
      : "border border-line bg-surface text-ink";
  return (
    <Link href={href} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold ${cls} ${className}`}>
      {children}
    </Link>
  );
}

export function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function fmtRange(r: { min: number; max: number }, digits = 0): string {
  return r.min === r.max ? fmt(r.min, digits) : `${fmt(r.min, digits)}〜${fmt(r.max, digits)}`;
}
