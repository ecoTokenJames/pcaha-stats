# PCAHA Stats

Standings, player stats and league leaders for PCAHA minor hockey — live at
[www.pcahastats.com](https://www.pcahastats.com).

## How it works

1. `scraper/scrape.js` pulls standings, games, boxscores and rosters from the
   Spordle Play API and writes JSON into `data/`.
2. The Next.js site in `src/` reads `data/` at build time and renders static pages.
3. `.github/workflows/daily-scrape.yml` runs the scraper every day at 11:00 UTC,
   commits the new `data/` to `main`, and Vercel redeploys on that push.

The season is picked automatically (rolls over on Aug 1). To force one, set
`PCAHA_SEASON=2026-27`, or run the workflow manually from the Actions tab with
the season input.

## Local development

```bash
npm install
npm run dev
```

Refresh data locally:

```bash
node scraper/scrape.js              # full scrape (~10–25 min)
node scraper/scrape.js --standings  # standings only (~30s)
node scraper/scrape.js --division U15
```
