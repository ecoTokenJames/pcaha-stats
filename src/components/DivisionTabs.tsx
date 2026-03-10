"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DivisionMeta } from "@/lib/data";

export function DivisionTabs({
  divisions,
  basePath,
}: {
  divisions: DivisionMeta[];
  basePath: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1 mb-6">
      {divisions.map((div) => {
        const href = `${basePath}/${div.name.toLowerCase()}`;
        const isActive = pathname === href;

        return (
          <Link
            key={div.id}
            href={href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
            }`}
          >
            {div.name}
          </Link>
        );
      })}
    </div>
  );
}
