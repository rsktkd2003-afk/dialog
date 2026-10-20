import type { Metadata } from "next";
import { TargetsDetail } from "@/components/TargetsDetail";
import { LinkButton } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { getTargetsForDate } from "@/lib/services/targets";

export const metadata: Metadata = { title: "登録完了" };

export default async function OnboardingDonePage() {
  const user = await requireUser();
  const result = await getTargetsForDate(getDb(), user.id, todayString());
  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 pb-16 pt-6">
      <h1 className="text-xl font-bold">登録が完了しました</h1>
      <p className="text-sm text-ink-2">
        {result.ok ? "入力内容から、今日の栄養目標の参考値を計算しました。" : "記録は今すぐ始められます。栄養目標は必要な情報がそろうと表示されます。"}
        入力した項目はあとから設定画面で変更できます。
      </p>
      <TargetsDetail result={result} />
      <LinkButton href="/" className="w-full">ホームへ</LinkButton>
    </main>
  );
}
