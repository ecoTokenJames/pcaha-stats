/**
 * BC Falcons spring hockey sponsor card. Plain link, no scripts or cookies;
 * the link is tagged with where it was clicked. Copy comes from bcfalcons.com.
 */

type Placement = "home" | "standings" | "top-home" | "top-standings" | "top-leaders" | "top-team";

const UTM = "utm_source=pcahastats&utm_medium=sponsor&utm_campaign=pcaha-stats";

function falconsLink(placement: Placement): string {
  return `https://www.bcfalcons.com/register?${UTM}&utm_content=${placement}`;
}

/** Falcons spring teams are for 2013–2018 birth years: U9 through U15 this season. */
export const FALCONS_DIVISIONS = ["U9", "U10", "U11", "U12", "U13", "U14", "U15"];

const GOLD = "#F5B83D";

interface FalconsSession {
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24h
  location: string;
  price: number; // cents
  goaliePrice?: number; // cents
  birthYearMin?: number;
  birthYearMax?: number;
}

export interface IdSkate {
  /** e.g. "2017" or "2014/13" */
  birthYears: string;
  time: string; // "8:00 AM"
}

interface IdSkateDay {
  /** e.g. "Friday, Oct 23" */
  day: string;
  location: string;
  skaterPrice: string;
  goaliePrice: string | null;
  /** e.g. "2013–2019", across all of that day's skates */
  birthYearRange: string | null;
  skates: IdSkate[];
}

function todayPacific(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Vancouver" });
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

/**
 * The next day with Falcons ID skates, read from the Falcons site's public
 * session list when the page is built (nightly). Null if there are none coming
 * up or the Falcons site can't be reached, and the card falls back to the
 * general spring pitch.
 */
// One request per build worker: every page that shows the Falcons ad shares it
let idSkatesPromise: Promise<IdSkateDay | null> | null = null;

function getUpcomingIdSkates(): Promise<IdSkateDay | null> {
  idSkatesPromise ??= fetchUpcomingIdSkates();
  return idSkatesPromise;
}

async function fetchUpcomingIdSkates(): Promise<IdSkateDay | null> {
  try {
    const res = await fetch("https://www.bcfalcons.com/api/sessions");
    if (!res.ok) return null;
    const body = await res.json();
    const sessions: FalconsSession[] = Array.isArray(body) ? body : body.sessions ?? [];
    const today = todayPacific();
    const idSkates = sessions
      .filter((s) => /\bID Skate\b/i.test(s.name) && s.date >= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (idSkates.length === 0) return null;

    const date = idSkates[0].date;
    const day = idSkates.filter((s) => s.date === date);
    const mins = day.map((s) => s.birthYearMin).filter((y): y is number => !!y);
    const maxes = day.map((s) => s.birthYearMax).filter((y): y is number => !!y);
    return {
      birthYearRange:
        mins.length && maxes.length
          ? `${Math.min(...mins)}–${Math.max(...maxes)}`
          : null,
      day: new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      location: day[0].location,
      skaterPrice: dollars(day[0].price),
      goaliePrice: day[0].goaliePrice ? dollars(day[0].goaliePrice) : null,
      skates: day.map((s) => ({
        // "2017 Falcons ID Skate #2" -> "2017"
        birthYears: s.name.split(/\s+Falcons/i)[0].trim(),
        time: formatTime(s.time),
      })),
    };
  } catch {
    return null;
  }
}

export async function FalconsCard({ placement }: { placement: Placement }) {
  const idSkates = await getUpcomingIdSkates();
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
          {idSkates ? (
            <>
              <p className="mt-1.5 text-sm text-gray-300">
                Top-end AAA competition, built around development: two
                practices a week, forwards and defence trained separately, and
                three AAA tournaments with a paid professional coaching staff.
              </p>
              <div className="mt-3 rounded-md border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-bold" style={{ color: GOLD }}>
                  ID skates: {idSkates.day}
                </p>
                <p className="text-xs text-gray-400">{idSkates.location}</p>
                <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {idSkates.skates.map((s) => (
                    <li key={s.birthYears + s.time} className="flex justify-between gap-3">
                      <span className="font-medium">{s.birthYears}s</span>
                      <span className="tabular-nums text-gray-300">{s.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
          <div className="clear-both mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
            <a
              href={falconsLink(placement)}
              target="_blank"
              rel="sponsored noopener"
              className="inline-block rounded-md px-4 py-2 text-sm font-bold text-gray-950 hover:opacity-90"
              style={{ backgroundColor: GOLD }}
            >
              {idSkates ? "Register for an ID skate →" : "Apply for spring →"}
            </a>
            <span className="text-xs text-gray-400">
              {idSkates
                ? `Skaters ${idSkates.skaterPrice}${idSkates.goaliePrice ? ` · Goalies ${idSkates.goaliePrice}` : ""} · Spots are limited`
                : "2013–2018 birth years · Langley, BC · Spots are limited"}
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

/** Mini one-line ad for the sponsor strip at the top of pages. */
export async function FalconsMini({ placement }: { placement: Placement }) {
  const idSkates = await getUpcomingIdSkates();
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm text-gray-300">
      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-300">
        Sponsor
      </span>
      <span>
        {idSkates ? (
          <>
            <span className="font-semibold" style={{ color: GOLD }}>
              BC Falcons ID skates: {idSkates.day}
            </span>{" "}
            at {idSkates.location}
            {idSkates.birthYearRange ? ` for ${idSkates.birthYearRange} birth years` : ""}.
            Take the next step this spring.{" "}
          </>
        ) : (
          <>
            <span className="font-semibold" style={{ color: GOLD }}>
              Looking to take the next step this spring?
            </span>{" "}
            BC Falcons: top-end AAA competition, built around development.{" "}
          </>
        )}
        <a
          href={falconsLink(placement)}
          target="_blank"
          rel="sponsored noopener"
          className="font-semibold text-white underline"
        >
          {idSkates ? "Register here →" : "Apply for spring →"}
        </a>
      </span>
    </p>
  );
}
