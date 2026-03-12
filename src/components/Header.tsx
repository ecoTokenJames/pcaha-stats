"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/standings", label: "Standings" },
  { href: "/leaders", label: "Leaders" },
  { href: "/tournaments", label: "Tournaments" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">PC</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold leading-tight text-gray-900">PCAHA Stats</h1>
              <p className="text-[10px] text-gray-500 leading-tight -mt-0.5">2025-26 Season</p>
            </div>
            <span className="sm:hidden text-sm font-bold text-gray-900">PCAHA</span>
          </Link>

          <nav className="flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-900"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
