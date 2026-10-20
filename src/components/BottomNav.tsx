"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "ホーム", d: "M3 10.5 10 4l7 6.5V17a1 1 0 0 1-1 1h-3.5v-4.5h-5V18H4a1 1 0 0 1-1-1v-6.5Z" },
  { href: "/meals", label: "食事", d: "M6 3v6a2 2 0 0 0 2 2v7M10 3v6a2 2 0 0 1-2 2M14 3c-1.5 1-2 3-2 5s1 3 2 3v7" },
  { href: "/training", label: "筋トレ", d: "M2 10h16M4.5 6.5v7M7 5v10M13 5v10M15.5 6.5v7" },
  { href: "/practice", label: "練習", d: "M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm0 0c-2.5 3-2.5 12 0 15M3.2 7.5c3.5.5 9 3 10.6 9M16.8 7.5c-3.5.5-9 3-10.6 9" },
  { href: "/body", label: "体・分析", d: "M3 17h14M5.5 14V9M10 14V5M14.5 14v-3" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="メインメニュー" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-semibold text-accent" : "text-muted"}`}
              >
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d={it.d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
