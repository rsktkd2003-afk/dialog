import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { getProfile } from "@/lib/repo/profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getProfile(getDb(), user.id);
  if (!profile?.onboardingCompletedAt) redirect("/onboarding");
  return (
    <>
      <main className="mx-auto max-w-lg px-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <BottomNav />
    </>
  );
}
