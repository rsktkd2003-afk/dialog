import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { exportUserData } from "@/lib/repo/export";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const data = await exportUserData(getDb(), user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="volley-conditioning-${todayString()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
