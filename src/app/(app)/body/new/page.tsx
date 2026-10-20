import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/server";
import { todayString } from "@/lib/date";
import { BodyForm } from "../Forms";

export const metadata: Metadata = { title: "体重・身体測定を記録" };

export default async function NewBodyPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="体重・身体測定" back="/body" />
      <BodyForm date={todayString()} />
    </>
  );
}
