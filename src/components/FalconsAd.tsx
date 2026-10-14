/**
 * BC Falcons spring hockey sponsor card. Plain link, no scripts or cookies;
 * the link is tagged with where it was clicked. Copy comes from bcfalcons.com.
 */

type Placement = "home" | "standings";

const UTM = "utm_source=pcahastats&utm_medium=sponsor&utm_campaign=pcaha-stats";

function falconsLink(placement: Placement): string {
  return `https://www.bcfalcons.com/register?${UTM}&utm_content=${placement}`;
}

/** Falcons spring teams are for 2013–2018 birth years: U9 through U15 this season. */
export const FALCONS_DIVISIONS = ["U9", "U10", "U11", "U12", "U13", "U14", "U15"];

const GOLD = "#F5B83D";

export function FalconsCard({ placement }: { placement: Placement }) {
  return (
    <aside
      aria-label="Sponsor: BC Falcons Hockey"
      className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950 text-white"
    >
      <div className="h-1" style={{ backgroundColor: GOLD }} />
      <div className="flex gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
              BC Falcons Spring Hockey
            </span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-300">
              Sponsor
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- small static crest */}
          <img
            src="/falcons-crest.png"
            alt=""
            aria-hidden="true"
            width={160}
            height={154}
            loading="lazy"
            className="float-right mb-1 ml-3 h-16 w-auto sm:hidden"
          />
          <h3 className="text-lg font-bold">
            Looking to take the next step this spring?
          </h3>
          <p className="mt-1.5 text-sm text-gray-300">
            Top-end AAA competition, built around development. Two practices
            every week, one skills and one team, with forwards and defence
            trained separately on the skills their position demands. Then three
            AAA tournaments to put it all to the test, with a paid professional
            coaching staff.
          </p>
          <p className="mt-2 text-sm font-semibold">
            More than just tournaments: real improvement.
          </p>
          <div className="clear-both mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
            <a
              href={falconsLink(placement)}
              target="_blank"
              rel="sponsored noopener"
              className="inline-block rounded-md px-4 py-2 text-sm font-bold text-gray-950 hover:opacity-90"
              style={{ backgroundColor: GOLD }}
            >
              Apply for spring →
            </a>
            <span className="text-xs text-gray-400">
              2013–2018 birth years · Langley, BC · Spots are limited
            </span>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- small static crest */}
        <img
          src="/falcons-crest.png"
          alt="BC Falcons crest"
          width={160}
          height={154}
          loading="lazy"
          className="hidden h-24 w-auto shrink-0 self-center sm:block"
        />
      </div>
    </aside>
  );
}
