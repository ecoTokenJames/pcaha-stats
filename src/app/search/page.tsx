import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";

export const metadata: Metadata = {
  title: "Search",
  description: "Find any PCAHA team or player.",
  alternates: { canonical: "/search" },
};

export default function SearchPage() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Search</h2>
      {/* useSearchParams needs a Suspense boundary on a static page */}
      <Suspense>
        <SearchBox />
      </Suspense>
    </div>
  );
}
