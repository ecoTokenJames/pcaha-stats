"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { switchSeasonHref } from "@/lib/season-path";

/** Shown on every past-season page, with a way back to this season. */
export function PastSeasonBanner({ season, current }: { season: string; current: string }) {
  const pathname = usePathname();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      <span>
        You&apos;re looking at the <span className="font-semibold">{season}</span> season. These
        stats are final.
      </span>
      <Link
        href={switchSeasonHref(pathname, current, current)}
        className="font-semibold underline hover:text-amber-700"
      >
        Go to {current} →
      </Link>
    </div>
  );
}
