// Season-aware URLs, safe to use in client components (no file access).
// The current season lives at /standings, /leaders, /tournaments (rewritten to
// /seasons/<current>/... in next.config.ts); past seasons at /seasons/<season>/...

/** Browser path for any page, with the current season's internal /seasons/<current> prefix removed. */
export function stripCurrentSeason(pathname: string, current: string): string {
  const prefix = `/seasons/${current}`;
  if (pathname === prefix) return "/";
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
}

/** The season a page belongs to: the one in /seasons/<season>/..., else the current season. */
export function seasonFromPath(pathname: string, current: string): string {
  return pathname.match(/^\/seasons\/(\d{4}-\d{2})(\/|$)/)?.[1] ?? current;
}

/** A section path ("/standings/rep") in a given season. */
export function seasonHref(season: string, current: string, path: string): string {
  return season === current ? path : `/seasons/${season}${path}`;
}

/**
 * The same section in another season. Keeps Standings/Leaders and Rep/House/Female,
 * but not the age group or team: those don't carry over between seasons.
 */
export function switchSeasonHref(pathname: string, target: string, current: string): string {
  const path = stripCurrentSeason(pathname, current).replace(/^\/seasons\/\d{4}-\d{2}/, "") || "/";
  const section = path.match(/^\/(standings|leaders)\/(rep|house|female)/)?.[0] ??
    path.match(/^\/(standings|leaders|tournaments)/)?.[0] ??
    "/standings";
  return seasonHref(target, current, section);
}
