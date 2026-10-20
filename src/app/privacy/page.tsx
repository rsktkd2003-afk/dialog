import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "プライバシーポリシー" };

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 text-base font-semibold">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-lg px-4 pb-16 pt-6 text-sm leading-relaxed text-ink-2">
      <p className="text-xs text-muted">
        <Link href="/" className="underline">← 戻る</Link>
      </p>
      <h1 className="mt-2 text-xl font-bold text-ink">プライバシーポリシー</h1>
      <p className="mt-2 rounded-lg border border-line bg-surface p-3 text-xs">
        【草案】この文書は開発段階の草案です。運営者名・連絡先・保存場所などは公開前に確定し、必要に応じて専門家の確認を受けてください。
      </p>

      <H>1. 取得する情報</H>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>アカウント情報：メールアドレス、表示名、パスワード（ハッシュ化して保存し、運営者も元のパスワードを知ることはできません）</li>
        <li>利用者が入力した情報：生年月日または年齢、性別（任意）、身長、体重、体脂肪率、周囲径、競技情報、練習・筋力トレーニングの記録、食事の記録、睡眠・疲労・痛みなどのコンディション記録</li>
        <li>ログイン状態を維持するためのクッキー（セッション識別子）</li>
      </ul>
      <p className="mt-2">体重・体調・痛みなどの記録は、健康に関わる情報を含みます。入力は任意で、入力しない項目があっても利用できます。</p>

      <H>2. 利用目的</H>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>記録の保存と表示、推移グラフの作成</li>
        <li>栄養目標などの推定値の計算と、記録にもとづく提案の表示</li>
        <li>不正アクセスの防止など、サービスの安全な運営</li>
      </ul>
      <p className="mt-2">広告配信や、記録内容の第三者への販売には利用しません。外部のAIサービスに記録を送信することもありません。</p>

      <H>3. 第三者への提供・共有</H>
      <p className="mt-2">法令に基づく場合を除き、本人の同意なく第三者に提供しません。現在のバージョンにはチームメンバーや指導者と記録を共有する機能はなく、記録は本人のアカウントでのみ表示されます。将来チーム機能を追加する場合も、本人が明示的に許可した項目のみを共有する設計とします。</p>

      <H>4. 管理者による閲覧</H>
      <p className="mt-2">アプリには、管理者が利用者の記録を閲覧する画面はありません。データベースの保守など運営上やむを得ない場合を除き、運営者が個別の記録を閲覧することはありません。</p>

      <H>5. 保存と安全管理</H>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>通信は暗号化（HTTPS）して行います。</li>
        <li>データへのアクセスはサーバー側で利用者ごとに制御しています。</li>
        <li>保存先・バックアップの方法と保持期間は、公開時にここへ記載します。</li>
      </ul>

      <H>6. 開示・エクスポート・削除</H>
      <p className="mt-2">設定画面から、記録したすべてのデータをダウンロードできます。また、アカウントを削除すると、記録したデータはデータベースから削除されます（バックアップからの消去には一定期間を要する場合があります）。</p>

      <H>7. 未成年の利用者</H>
      <p className="mt-2">18歳未満の方は、保護者の方と内容を確認したうえで利用してください。</p>

      <H>8. 医療行為ではないこと</H>
      <p className="mt-2">本サービスが表示する数値は推定値・参考値であり、診断や治療を目的としたものではありません。痛みや体調不良がある場合は、医師などの専門職に相談してください。</p>

      <H>9. お問い合わせ</H>
      <p className="mt-2">（公開前に運営者の連絡先を記載）</p>
    </main>
  );
}
