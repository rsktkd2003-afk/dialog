import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { todayString } from "@/lib/date";
import { JumpForm } from "../../Forms";

export const metadata: Metadata = { title: "到達点・ジャンプを記録" };

export default async function NewJumpPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requireUser();
  const { kind } = await searchParams;
  return (
    <>
      <PageHeader title="到達点・ジャンプ測定" back="/body" />
      <JumpForm date={todayString()} kind={kind} />
    </>
  );
}
