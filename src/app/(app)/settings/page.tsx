import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/form";
import { Card, Notice, PageHeader } from "@/components/ui";
import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { getProfile } from "@/lib/repo/profile";
import { changePasswordAction, deleteAccountAction, saveEnergyAdjustAction } from "./actions";

export const metadata: Metadata = { title: "設定" };
export const dynamic = "force-dynamic";

const input = "min-h-11 w-full rounded-xl border border-line bg-surface px-3";

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-12 items-center justify-between border-t border-line py-2 text-sm first:border-t-0">
      {children}
      <span aria-hidden="true" className="text-muted">›</span>
    </Link>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const profile = await getProfile(getDb(), user.id);
  return (
    <>
      <PageHeader title="設定" back="/" />
      <div className="space-y-4">
        {sp.saved && <Notice tone="positive" title="保存しました" />}
        <Card title="アカウント">
          <p className="text-sm">{user.displayName}</p>
          <p className="text-xs text-muted">{user.email}</p>
        </Card>
        <Card>
          <Row href="/settings/profile">プロフィール・運動習慣・目標を編集</Row>
          <Row href="/settings/targets">栄養目標と計算根拠</Row>
          <Row href="/foods">自分の食品・レシピ</Row>
          <Row href="/privacy">プライバシーポリシー</Row>
        </Card>

        <Card title="エネルギー目標の手動調整">
          <p className="mb-2 text-xs text-ink-2">体重の推移が目標と合わない場合に、推定値へ一定量を加減できます。急激な変更は避け、100〜200 kcal 程度ずつ調整してください。</p>
          <ActionForm action={saveEnergyAdjustAction} className="flex items-center gap-2">
            <label htmlFor="adj" className="sr-only">調整量</label>
            <input id="adj" name="energyAdjustKcal" type="number" inputMode="numeric" step="10" min="-1000" max="1000" defaultValue={profile?.energyAdjustKcal ?? 0} className={`num ${input} w-32`} />
            <span className="text-sm text-ink-2">kcal/日</span>
            <SubmitButton variant="secondary" className="ml-auto">保存</SubmitButton>
          </ActionForm>
        </Card>

        <Card title="データ">
          <p className="mb-2 text-xs text-ink-2">記録したすべてのデータを JSON 形式でダウンロードできます。</p>
          <a href="/api/export" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-line bg-surface text-sm font-semibold" download>
            データをエクスポート
          </a>
        </Card>

        <Card title="パスワード変更">
          <ActionForm action={changePasswordAction} className="space-y-2">
            <input name="current" type="password" autoComplete="current-password" placeholder="現在のパスワード" aria-label="現在のパスワード" className={input} />
            <input name="next" type="password" autoComplete="new-password" placeholder="新しいパスワード（10文字以上）" aria-label="新しいパスワード" className={input} />
            <input name="confirm" type="password" autoComplete="new-password" placeholder="新しいパスワード（確認）" aria-label="新しいパスワード（確認）" className={input} />
            <SubmitButton variant="secondary" className="w-full">変更する</SubmitButton>
          </ActionForm>
        </Card>

        <form action={logoutAction}>
          <SubmitButton variant="secondary" className="w-full">ログアウト</SubmitButton>
        </form>

        <Card title="アカウントの削除">
          <p className="mb-2 text-xs text-ink-2">アカウントと、記録したすべてのデータ（食事・身体測定・トレーニング・コンディション）を完全に削除します。元に戻せません。必要に応じて先にデータをエクスポートしてください。</p>
          <ActionForm action={deleteAccountAction} className="space-y-2" confirmMessage="本当にアカウントとすべてのデータを削除しますか？">
            <input name="password" type="password" autoComplete="current-password" placeholder="パスワード" aria-label="パスワード" className={input} />
            <input name="confirmText" placeholder="確認のため「削除」と入力" aria-label="確認の入力" className={input} />
            <SubmitButton variant="danger" className="w-full">アカウントを削除する</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
