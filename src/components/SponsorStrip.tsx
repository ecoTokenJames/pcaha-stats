import { LevelUpMini } from "./LevelUpAd";
import { FalconsMini, FALCONS_DIVISIONS } from "./FalconsAd";

type Page = "home" | "standings" | "leaders" | "team";

/**
 * Slim sponsor strip at the top of a page: a one-line Level Up ad, plus a
 * one-line Falcons ad where it's relevant (home page and the U9–U15 age
 * groups their spring teams cover).
 */
export function SponsorStrip({
  page,
  division,
  levelUpLead,
}: {
  page: Page;
  /** e.g. "U11"; omit on the home page */
  division?: string;
  levelUpLead?: string;
}) {
  const showFalcons = !division || FALCONS_DIVISIONS.includes(division);
  return (
    <div className="mb-4 space-y-2">
      <LevelUpMini placement={`top-${page}`} lead={levelUpLead} />
      {showFalcons && <FalconsMini placement={`top-${page}`} />}
    </div>
  );
}
