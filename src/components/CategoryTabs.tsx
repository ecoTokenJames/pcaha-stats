"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CATEGORIES = [
  { slug: "rep", label: "Rep" },
  { slug: "house", label: "House" },
  { slug: "female", label: "Female" },
] as const;

export function CategoryTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1.5 mb-4">
      {CATEGORIES.map((cat) => {
        const href = `${basePath}/${cat.slug}`;
        const isActive = pathname.startsWith(href);

        return (
          <Link
            key={cat.slug}
            href={href}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isActive
                ? "bg-blue-900 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-900"
            }`}
          >
            {cat.label}
          </Link>
        );
      })}
    </div>
  );
}
