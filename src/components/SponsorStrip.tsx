import { FalconsMini, FALCONS_DIVISIONS, falconsAdActive } from "./FalconsAd";

type Page = "home" | "standings" | "leaders" | "team";

/**
 * Slim sponsor strip at the top of a page: a one-line Falcons ad where it's
 * relevant (home page and the U9–U15 age groups their spring teams cover).
 * Nothing at all when no sponsor is running.
 */
export function SponsorStrip({
  page,
  division,
}: {
  page: Page;
  /** e.g. "U11"; omit on the home page */
  division?: string;
}) {
  const showFalcons = falconsAdActive() && (!division || FALCONS_DIVISIONS.includes(division));
  if (!showFalcons) return null;
  return (
    <div className="mb-4">
      <FalconsMini placement={`top-${page}`} />
    </div>
  );
}
