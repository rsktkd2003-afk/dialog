export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold tracking-widest text-accent">VOLLEYBALL CONDITIONING</p>
        <p className="mt-1 text-xl font-bold">バレーコンディション</p>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-5">{children}</div>
    </main>
  );
}
