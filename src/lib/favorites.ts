"use client";

const STORAGE_KEY = "pcaha-favorites";

export interface Favorites {
  teams: number[]; // teamIds
  divisions: string[]; // division names like "U15"
}

function getDefaults(): Favorites {
  return { teams: [], divisions: [] };
}

export function getFavorites(): Favorites {
  if (typeof window === "undefined") return getDefaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaults();
    return JSON.parse(raw);
  } catch {
    return getDefaults();
  }
}

function saveFavorites(favs: Favorites) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function toggleFavoriteTeam(teamId: number): Favorites {
  const favs = getFavorites();
  const idx = favs.teams.indexOf(teamId);
  if (idx === -1) {
    favs.teams.push(teamId);
  } else {
    favs.teams.splice(idx, 1);
  }
  saveFavorites(favs);
  return favs;
}

export function toggleFavoriteDivision(divName: string): Favorites {
  const favs = getFavorites();
  const idx = favs.divisions.indexOf(divName);
  if (idx === -1) {
    favs.divisions.push(divName);
  } else {
    favs.divisions.splice(idx, 1);
  }
  saveFavorites(favs);
  return favs;
}

export function isTeamFavorite(teamId: number): boolean {
  return getFavorites().teams.includes(teamId);
}

export function isDivisionFavorite(divName: string): boolean {
  return getFavorites().divisions.includes(divName);
}
