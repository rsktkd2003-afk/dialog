import Link from "next/link";
import { BASE_PAL, METS } from "@/lib/calc/energy";
import { SOURCES } from "@/lib/calc/sources";
import type { TargetsResult } from "@/lib/services/targets";
import { Badge, Card, Notice, fmt, fmtRange } from "./ui";

const BASIS_LABEL = { logged: "記録された運動", planned: "予定（曜日設定）の運動", rest: "運動の予定なし（休養日）" } as const;

export function TargetsDetail({ result }: { result: TargetsResult }) {
  if (!result.ok) {
    return (
      <Notice tone="info" title="栄養目標を計算するには情報が足りません">
        {result.message}（不足：{result.missing.join("、")}）
        <div className="mt-2">
          <Link href="/body/new" className="font-semibold text-accent underline">体重を記録する</Link>
          {" ／ "}
          <Link href="/settings/profile" className="font-semibold text-accent underline">プロフィールを編集</Link>
        </div>
      </Notice>
    );
  }
  const { targets: t, bmr, plan } = result;
  const warnings = [...result.warnings, ...bmr.warnings, ...t.warnings];
  return (
    <div className="space-y-4">
      <Card title="1日の摂取目標" action={<Badge kind="estimate">推定値</Badge>}>
        <div className="num text-3xl font-semibold">
          {fmtRange(t.energyKcal)}
          <span className="ml-1 text-base font-normal text-ink-2">kcal</span>
        </div>
        <dl className="num mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted">たんぱく質</dt>
            <dd className="font-semibold">{fmtRange(t.proteinG)} g</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">脂質</dt>
            <dd className="font-semibold">{fmtRange(t.fatG)} g</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">炭水化物</dt>
            <dd className="font-semibold">{fmtRange(t.carbsG)} g</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">対象日の運動：{BASIS_LABEL[plan.basis]}{plan.labels.length > 0 ? `（${plan.labels.join("、")}）` : ""}</p>
      </Card>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <Notice key={w.code} tone="info" title={w.message} />
          ))}
          {plan.notes.map((n) => (
            <Notice key={n} tone="info" title={n} />
          ))}
        </div>
      )}

      <Card title="計算の内訳">
        <ol className="space-y-3 text-sm">
          <li>
            <div className="font-medium">1. 基礎代謝量（参考値）：{fmtRange(bmr.kcal)} kcal</div>
            <div className="text-xs text-ink-2">
              式：{bmr.formula}
              {bmr.fatFreeMassKg != null && `（除脂肪量 ${fmt(bmr.fatFreeMassKg, 1)} kg）`}／体重 {fmt(result.weight.weightKg, 1)} kg（{result.weight.date}の記録）
            </div>
          </li>
          <li>
            <div className="font-medium">2. 1日の消費エネルギー：{fmtRange(t.expenditure)} kcal</div>
            <div className="text-xs text-ink-2">
              日常生活分＝基礎代謝量×活動レベル（{Object.entries(BASE_PAL).map(([k, v]) => `${k === "low" ? "低い" : k === "normal" ? "ふつう" : "高い"} ${v}`).join("・")}）を、運動時間を除いた時間に対して計上し、
              運動分＝METs×体重×時間（バレー 低{METS.volleyball.low}/中{METS.volleyball.moderate}/高{METS.volleyball.high}、筋トレ 中{METS.strength.moderate}/高{METS.strength.high}）を加算。
              運動時間の分を二重に数えないようにしています。運動分：{fmtRange(t.exerciseKcal)} kcal
            </div>
          </li>
          <li>
            <div className="font-medium">3. 目標による調整：{t.goalAdjustment.kind === "none" ? "なし" : `${fmtRange(t.goalAdjustment.kcal)} kcal`}</div>
            <div className="text-xs text-ink-2">{t.goalAdjustment.note}。設定画面の手動調整も反映されます。目標は基礎代謝量の推定値を下回らないようにしています。</div>
          </li>
          <li>
            <div className="font-medium">4. 栄養素の配分</div>
            <div className="text-xs text-ink-2">
              たんぱく質 {t.proteinGPerKg} g/kg（推奨範囲 1.2〜2.0 g/kg）、脂質はエネルギーの25%（目標量 20〜30%）、残りを炭水化物に配分。
              炭水化物は {fmtRange(t.carbsGPerKg, 1)} g/kg で、この日の運動量の目安は {t.carbRecommendation.min}〜{t.carbRecommendation.max} g/kg（{t.carbRecommendation.label}）です。
            </div>
          </li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          これらは集団データから作られた式による推定値で、実際の必要量には個人差があります。体重の推移を見ながら、設定画面で調整してください。
        </p>
      </Card>

      <Card title="出典">
        <ul className="space-y-2 text-xs text-ink-2">
          {t.sources.map((id) => (
            <li key={id}>
              <div>{SOURCES[id].label}</div>
              <div className="text-muted">{SOURCES[id].note}</div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
