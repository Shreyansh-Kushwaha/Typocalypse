// Server-side page copy: the text crawlers see before any JavaScript runs.
//
// ⚠ MIRROR OF client/src/seo.tsx — the PAGE_SEO map below must stay identical
// to the one there (same paths, same titles, same descriptions, same noIndex
// flags). Change one, change the other, or a scraper and a browser will
// disagree about what this page is.
//
// Consumed by server/og.js (per-route <title>/<meta> injection) and
// server/routes/legal.js (robots.txt + sitemap.xml).

export const SITE_NAME = 'Typocalypse';
export const SITE_TAGLINE = 'survive the typing apocalypse';
export const DEFAULT_DESCRIPTION =
  'A typing game with AI-written stories, a campaign, arcade modes, rated duels, and a coach that learns your weakest keys. Play free, no account needed.';

/** Static route copy, keyed by path. Dynamic routes are built in og.js. */
export const PAGE_SEO = {
  '/': {
    title: 'Typocalypse — survive the typing apocalypse',
    description: DEFAULT_DESCRIPTION,
  },
  '/login': {
    title: 'Log in',
    description: 'Log in to Typocalypse to keep your level, streak, ghosts, and unlocked themes.',
  },
  '/signup': {
    title: 'Create an account',
    description: 'Create a free Typocalypse account to save your typing stats, streaks, achievements, and story library.',
  },
  '/leaderboard': {
    title: 'Global ladder',
    description: 'The fastest clean runs on Typocalypse this week, this season, and all time. Filter by story, timed test, code, or campaign.',
  },
  '/daily': {
    title: 'Daily Apocalypse',
    description: 'One passage. One attempt. The whole world types it. Today\'s daily typing challenge, free and with no account needed.',
  },
  '/campaign': {
    title: 'Campaign',
    description: 'Four zones and 24 typing nodes with mutators like fog, storm, night, and mirrored text. Earn three stars on every node.',
  },
  '/library': {
    title: 'Story library',
    description: 'Read and type stories written by other players, from solo story runs to multiplayer relay chronicles. Like the best ones and publish your own.',
  },
  '/practice': {
    title: 'Timed typing test',
    description: 'A 15, 30, or 60 second typing test with punctuation, numbers, a per-second WPM chart, and a consistency score. Works offline.',
  },
  '/practice/code': {
    title: 'Code typing practice',
    description: 'Practise typing real code snippets in JavaScript, TypeScript, Python, SQL, Bash, and Rust, with auto-indent and exact symbols.',
  },
  '/arcade/meteor': {
    title: 'Meteor Shower',
    description: 'Words fall on your bunker and you type them dead before they land. An endless arcade typing game with combos and a global high score.',
  },
  '/arcade/memory': {
    title: 'Last Words',
    description: 'The passage appears, then vanishes. Type it back from memory across five escalating rounds.',
  },
  '/arcade/radio': {
    title: 'Radio Transmissions',
    description: 'Type what you hear through the static. A dictation typing mode with ten transmissions and operator ranks.',
  },
  '/tournaments': {
    title: 'Weekend tournament',
    description: 'Register for the weekly Typo Royale bracket. Heats of twenty, a final, and a permanent champion title.',
  },
  '/privacy': {
    title: 'Privacy policy',
    description: 'What Typocalypse stores, why it stores it, who it is shared with, and how to delete it.',
  },

  // signed-in surfaces: useful to people, useless to a search engine
  '/dashboard': { title: 'Dashboard', description: 'Your typing dashboard: level, streak, best speed, recent runs, ghost shelf, and every mode in the game in one place.', noIndex: true },
  '/genre-selection': { title: 'Choose a genre', description: 'Pick a genre and the story engine writes an apocalypse around it: fantasy, horror, science fiction, mystery, adventure, or romance.', noIndex: true },
  '/game': { title: 'Story mode', description: 'Type the story as it streams in, one passage at a time, then choose the branch that decides what happens next.', noIndex: true },
  '/multiplayer': { title: 'Multiplayer', description: 'Create or join a multiplayer typing room with a five letter code. Nine modes for two to twenty players, from co-op zombie defence to a hidden saboteur.', noIndex: true },
  '/quickmatch': { title: 'Quick match', description: 'Find a rated one on one typing duel against someone at your level. Best of three passages, an Elo rating, and tiers from Scrap to Apocalypse.', noIndex: true },
  '/friends': { title: 'Friends', description: 'Follow other typists, watch their personal bests and achievements land in your feed, and race them on a friends only ladder.', noIndex: true },
  '/stats': { title: 'Training lab', description: 'Your keyboard heatmap, a coach that reads your last 200 passages, and drills built from the exact keys you keep missing.', noIndex: true },
  '/progress': { title: 'Progression', description: 'Your level and experience bar, all 48 achievements, and the locker of themes, caret styles, and sound packs you have unlocked.', noIndex: true },
  '/claim': { title: 'Claim your account', description: 'Turn your guest session into a full account and keep your level, streak, achievements, ghosts, and unlocked cosmetics for good.', noIndex: true },
};

/** Copy for a path nothing answers on. Mirrors client/src/pages/NotFoundPage.tsx. */
export const NOT_FOUND_SEO = {
  title: 'Page not found',
  description: 'This Typocalypse page does not exist. Head back to the daily challenge, the campaign, or the arcade.',
  noIndex: true,
};

/**
 * Static paths that belong in the sitemap, in the order they are listed there.
 * Every one of these must be non-noIndex. /login and /signup are indexable but
 * deliberately absent: robots.txt disallows them (a sign-in form is not a
 * search result), so listing them here would contradict it.
 */
export const PUBLIC_PATHS = [
  '/',
  '/daily',
  '/campaign',
  '/library',
  '/practice',
  '/practice/code',
  '/arcade/meteor',
  '/arcade/memory',
  '/arcade/radio',
  '/tournaments',
  '/leaderboard',
  '/privacy',
];

/** Per-path sitemap hints. Anything missing falls back to monthly / 0.5. */
export const SITEMAP_HINTS = {
  '/': { changefreq: 'daily', priority: '1.0' },
  '/daily': { changefreq: 'daily', priority: '0.9' },
  '/campaign': { changefreq: 'monthly', priority: '0.8' },
  '/library': { changefreq: 'daily', priority: '0.8' },
  '/practice': { changefreq: 'monthly', priority: '0.8' },
  '/practice/code': { changefreq: 'monthly', priority: '0.7' },
  '/arcade/meteor': { changefreq: 'monthly', priority: '0.7' },
  '/arcade/memory': { changefreq: 'monthly', priority: '0.6' },
  '/arcade/radio': { changefreq: 'monthly', priority: '0.6' },
  '/tournaments': { changefreq: 'weekly', priority: '0.6' },
  '/leaderboard': { changefreq: 'hourly', priority: '0.7' },
  '/privacy': { changefreq: 'yearly', priority: '0.3' },
};

/** '/campaign/' and '/campaign' are the same page to us; '' is '/'. */
export function normalizePath(path) {
  const p = String(path || '/').split('?')[0].replace(/\/+$/, '');
  return p || '/';
}

/** `{ title, description, noIndex }` for a static route, or null. */
export function metaForPath(path) {
  const entry = PAGE_SEO[normalizePath(path)];
  if (!entry) return null;
  return { title: entry.title, description: entry.description, noIndex: !!entry.noIndex };
}

/** Titles get the site name appended unless they already carry it. */
export function fullTitle(title) {
  const t = String(title || SITE_NAME);
  return t.includes(SITE_NAME) ? t : `${t} — ${SITE_NAME}`;
}

// Cheap self-check: a noIndex path in the sitemap list is always a mistake.
for (const p of PUBLIC_PATHS) {
  if (PAGE_SEO[p]?.noIndex) console.warn(`⚠ seo.js: ${p} is in PUBLIC_PATHS but marked noIndex`);
}
