/**
 * Level Up Hockey sponsor placements. Plain links (no tracking scripts or cookies);
 * each placement tags the link so Level Up can see which spot brings installs.
 * levelup.hockey/mobile sends phones to the right app store.
 */

type Placement =
  | "team-page"
  | "team-page-coach"
  | "home"
  | "leaders"
  | "footer"
  | "top-home"
  | "top-standings"
  | "top-leaders"
  | "top-team";

const UTM = "utm_source=pcahastats&utm_medium=sponsor&utm_campaign=pcaha-stats";

export function levelUpLink(placement: Placement): string {
  return `https://levelup.hockey/mobile?${UTM}&utm_content=${placement}`;
}

/** Coach sign-up: creates the coach account and the team in one step. */
function levelUpCoachLink(): string {
  return `https://levelup.hockey/coach/signup?${UTM}&utm_content=team-page-coach`;
}

const BRAND = "#FF3D00";

export function SponsorTag() {
  return (
    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
      Sponsor
    </span>
  );
}

/** Main ad card: on team pages (under the player stats) and the home page. */
export function LevelUpCard({
  placement = "team-page",
}: {
  placement?: "team-page" | "home";
}) {
  return (
    <aside
      aria-label="Sponsor: Level Up Hockey"
      className="overflow-hidden rounded-lg border border-gray-200 bg-white"
    >
      <div className="h-1" style={{ backgroundColor: BRAND }} />
      <div className="flex gap-4 p-5">
        <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static logo */}
          <img src="/levelup-logo.png" alt="Level Up Hockey" width={180} height={46} className="h-8 w-auto" />
          <SponsorTag />
        </div>
        {placement === "home" && (
          // eslint-disable-next-line @next/next/no-img-element -- small static screenshot
          <img
            src="/levelup-app-training.jpg"
            alt=""
            aria-hidden="true"
            width={360}
            height={721}
            loading="lazy"
            className="float-right mb-2 ml-3 w-20 rounded-xl border border-gray-200 shadow-sm sm:hidden"
          />
        )}
        <h3 className="text-lg font-bold text-gray-900">
          Elite hockey training. Right at home.
        </h3>
        <p className="mt-1.5 text-sm text-gray-700">
          Level Up takes your player through 150+ drills that build step by
          step, from fundamentals to elite skills, across stickhandling,
          shooting and dryland. Every rep gets scored, so they see themselves
          improve.
        </p>
        <p className="mt-2 text-sm font-medium text-gray-900">
          🏆 Compete with friends. Climb from Novice to G.O.A.T and dominate
          the leaderboard.
        </p>
        <div className="clear-both mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
          <a
            href={levelUpLink(placement)}
            target="_blank"
            rel="sponsored noopener"
            className="inline-block rounded-md px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            Start your 7-day free trial →
          </a>
          <span className="text-xs font-medium text-gray-500">
            Available on iOS &amp; Android
          </span>
        </div>
        </div>
        {/* Home page: show the app in action next to the pitch */}
        {placement === "home" && (
          // eslint-disable-next-line @next/next/no-img-element -- small static screenshot
          <img
            src="/levelup-app-training.jpg"
            alt="The Level Up app timing a player's stickhandling drill at home"
            width={360}
            height={721}
            loading="lazy"
            className="hidden w-36 shrink-0 self-center rounded-2xl border border-gray-200 shadow-sm sm:block"
          />
        )}
      </div>

      {/* On team pages, pitch the whole team too (coaches and managers read these) */}
      {placement === "team-page" && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <h4 className="font-bold text-gray-900">Get your whole team on Level Up.</h4>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            <li>✅ Coaches set up the team in minutes</li>
            <li>📋 Assign homework that shows up right in each player&apos;s app</li>
            <li>📈 Track every player&apos;s progress</li>
            <li>🏒 Players compete with teammates all season on the team leaderboards</li>
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <a
              href={levelUpCoachLink()}
              target="_blank"
              rel="sponsored noopener"
              className="inline-block rounded-md border px-4 py-2 text-sm font-semibold hover:bg-white"
              style={{ borderColor: BRAND, color: BRAND }}
            >
              Set up your team →
            </a>
            <span className="text-xs font-medium text-gray-500">
              Group pricing for teams of 15+
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

/** Short line above the Leaders table. */
/**
 * Mini one-line ad, for the sponsor strip at the top of pages.
 * `lead` is the bold opener (e.g. "Want to top this list?" on Leaders).
 */
export function LevelUpMini({
  lead = "Elite hockey training. Right at home.",
  placement,
}: {
  lead?: string;
  placement: Placement;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700">
      <SponsorTag />
      <span>
        <span className="font-semibold text-gray-900">{lead}</span>{" "}
        <span className="font-semibold">Level Up Hockey</span>: step-by-step
        drills, every rep scored, and leaderboards to dominate with your
        friends.{" "}
        <a
          href={levelUpLink(placement)}
          target="_blank"
          rel="sponsored noopener"
          className="font-semibold underline"
          style={{ color: BRAND }}
        >
          Try it free for 7 days on iOS &amp; Android →
        </a>
      </span>
    </p>
  );
}

/** One line in the site footer. */
export function LevelUpFooter() {
  return (
    <p className="mt-3">
      PCAHA Stats is brought to you by{" "}
      <a
        href={levelUpLink("footer")}
        target="_blank"
        rel="sponsored noopener"
        className="font-semibold hover:underline"
        style={{ color: BRAND }}
      >
        Level Up Hockey
      </a>
      : elite training at home.{" "}
      <a
        href={levelUpLink("footer")}
        target="_blank"
        rel="sponsored noopener"
        className="underline hover:text-gray-700"
      >
        Become unstoppable →
      </a>
    </p>
  );
}
