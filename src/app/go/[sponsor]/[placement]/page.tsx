import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SPONSORS, type Sponsor } from "@/lib/sponsor-links";
import { ForwardTo } from "@/components/ForwardTo";

// Only the sponsor/placement pairs we actually use; anything else 404s
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.entries(SPONSORS).flatMap(([sponsor, s]) =>
    s.placements.map((placement) => ({ sponsor, placement }))
  );
}

export const metadata: Metadata = {
  title: "Opening sponsor",
  robots: { index: false, follow: false },
};

export default async function GoPage({
  params,
}: {
  params: Promise<{ sponsor: string; placement: string }>;
}) {
  const { sponsor, placement } = await params;
  const s = SPONSORS[sponsor as Sponsor];
  if (!s || !(s.placements as readonly string[]).includes(placement)) notFound();
  const url = s.url(placement);

  return (
    <div className="py-16 text-center text-gray-600">
      <p>Taking you to {s.label}…</p>
      <p className="mt-2 text-sm">
        <a href={url} rel="sponsored noopener" className="text-blue-700 underline">
          Continue
        </a>
      </p>
      {/* No-JS fallback */}
      <noscript>
        <meta httpEquiv="refresh" content={`0;url=${url}`} />
      </noscript>
      <ForwardTo url={url} />
    </div>
  );
}
