"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// On phones the logo is the way home and Search is an icon, so everything fits
const NAV_ITEMS = [
  { href: "/", label: "Home", mobileLabel: null },
  { href: "/standings", label: "Standings", mobileLabel: "Standings" },
  { href: "/leaders", label: "Leaders", mobileLabel: "Leaders" },
  { href: "/tournaments", label: "Tournaments", mobileLabel: "Tourneys" },
  { href: "/search", label: "Search", mobileLabel: "icon" },
];

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" strokeWidth={2} />
      <path d="M20 20l-3.5-3.5" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function Header({ season }: { season: string }) {
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
              <p className="text-[10px] text-gray-500 leading-tight -mt-0.5">{season} Season</p>
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
                  aria-label={item.label}
                  className={`${item.mobileLabel === null ? "hidden sm:inline-flex" : "inline-flex"} items-center px-2 sm:px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-900"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span className="sm:hidden">
                    {item.mobileLabel === "icon" ? <SearchIcon /> : item.mobileLabel}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
