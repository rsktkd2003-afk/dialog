"use client";

import { useFormStatus } from "react-dom";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string> };

export function SubmitButton({ children, className = "", variant = "primary", name, value }: { children: ReactNode; className?: string; variant?: "primary" | "secondary" | "danger"; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  const cls =
    variant === "primary"
      ? "bg-accent text-accent-ink"
      : variant === "danger"
        ? "border border-critical text-critical-ink bg-surface"
        : "border border-line bg-surface text-ink";
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold disabled:opacity-60 ${cls} ${className}`}
    >
      {pending ? "処理中…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-surface-2 text-good-ink" : "bg-surface-2 text-critical-ink"}`}>
      {state.message}
    </p>
  );
}

const inputCls =
  "w-full min-h-11 rounded-xl border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted aria-[invalid=true]:border-critical";

export function Field({
  label,
  name,
  error,
  hint,
  unit,
  optional,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string; hint?: string; unit?: string; optional?: boolean }) {
  const id = props.id ?? `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {optional && <span className="ml-1 text-xs font-normal text-muted">任意</span>}
      </label>
      <div className="flex items-center gap-2">
        <input id={id} name={name} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} className={inputCls} {...props} />
        {unit && <span className="shrink-0 text-sm text-ink-2">{unit}</span>}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-critical-ink">
          {error}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  name,
  error,
  options,
  optional,
  placeholder = "選択してください",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string; error?: string; options: readonly (readonly [string, string])[]; optional?: boolean; placeholder?: string | null }) {
  const id = props.id ?? `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {optional && <span className="ml-1 text-xs font-normal text-muted">任意</span>}
      </label>
      <select id={id} name={name} aria-invalid={error ? true : undefined} className={inputCls} {...props}>
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-critical-ink">{error}</p>}
    </div>
  );
}

/** 1〜5 などの段階選択。大きなタップ領域のラジオボタン */
export function ScalePicker({
  label,
  name,
  min = 1,
  max = 5,
  defaultValue,
  lowLabel,
  highLabel,
  error,
}: {
  label: string;
  name: string;
  min?: number;
  max?: number;
  defaultValue?: number | null;
  lowLabel?: string;
  highLabel?: string;
  error?: string;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="flex gap-1.5">
        {values.map((v) => (
          <label key={v} className="flex-1">
            <input type="radio" name={name} value={v} defaultChecked={defaultValue === v} className="peer sr-only" />
            <span className="num flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
              {v}
            </span>
          </label>
        ))}
      </div>
      {(lowLabel || highLabel) && (
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-critical-ink">{error}</p>}
    </fieldset>
  );
}

export function ChoiceChips({
  name,
  options,
  defaultValues = [],
  type = "checkbox",
}: {
  name: string;
  options: readonly (readonly [string, string])[];
  defaultValues?: readonly string[];
  type?: "checkbox" | "radio";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <label key={v}>
          <input type={type} name={name} value={v} defaultChecked={defaultValues.includes(v)} className="peer sr-only" />
          <span className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3.5 text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
            {l}
          </span>
        </label>
      ))}
    </div>
  );
}
