import type { MetadataRoute } from "next";
import {
  getDivisionsForCategory,
  getFilteredStandings,
  getAllTournaments,
  PAST_SEASONS,
  type HockeyCategory,
} from "@/lib/data";

const SITE_URL = "https://www.pcahastats.com";
const CATEGORIES: HockeyCategory[] = ["rep", "house", "female"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // Home
  entries.push({
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  });

  // Standings and Leaders pages per category/division
  for (const category of CATEGORIES) {
    const divisions = getDivisionsForCategory(category);
    for (const div of divisions) {
      const divSlug = div.name.toLowerCase();

      // Standings page
      entries.push({
        url: `${SITE_URL}/standings/${category}/${divSlug}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      });

      // Leaders page
      entries.push({
        url: `${SITE_URL}/leaders/${category}/${divSlug}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      });

      // Team detail pages
      const standings = getFilteredStandings(div.name, category);
      const seenTeams = new Set<number>();
      for (const data of Object.values(standings)) {
        for (const team of data.teams) {
          if (!seenTeams.has(team.teamId)) {
            seenTeams.add(team.teamId);
            entries.push({
              url: `${SITE_URL}/standings/${category}/${divSlug}/team/${team.teamId}`,
              lastModified: new Date(),
              changeFrequency: "daily",
              priority: 0.6,
            });
          }
        }
      }
    }
  }

  // Tournaments page
  entries.push({
    url: `${SITE_URL}/tournaments`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  });
  entries.push({ url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.2 });
  entries.push({ url: `${SITE_URL}/search`, changeFrequency: "daily", priority: 0.5 });
  for (const t of getAllTournaments()) {
    entries.push({
      url: `${SITE_URL}/tournaments/${t.scheduleId}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    });
  }

  // Past seasons: final standings and leaders per division (team pages are linked from these)
  for (const season of PAST_SEASONS) {
    for (const category of CATEGORIES) {
      for (const div of getDivisionsForCategory(category, season)) {
        for (const section of ["standings", "leaders"]) {
          entries.push({
            url: `${SITE_URL}/seasons/${season}/${section}/${category}/${div.name.toLowerCase()}`,
            changeFrequency: "yearly",
            priority: 0.4,
          });
        }
      }
    }
  }

  return entries;
}
