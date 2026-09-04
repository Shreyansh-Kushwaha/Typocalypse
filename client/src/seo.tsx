import React, { useEffect } from 'react';

// Per-page metadata. Every page mounts <Seo …/> which rewrites the title,
// description, canonical link, and the Open Graph / Twitter tags.
//
// The server mirrors this copy in server/seo.js so crawlers that do not run
// JavaScript get the same text injected into the HTML. Keep the two in sync.

export const SITE_NAME = 'Typocalypse';
export const SITE_TAGLINE = 'survive the typing apocalypse';
export const DEFAULT_DESCRIPTION =
  'A typing game with AI-written stories, a campaign, arcade modes, rated duels, and a coach that learns your weakest keys. Play free, no account needed.';

export interface PageSeo {
  /** page title, without the site suffix */
  title: string;
  description: string;
  /** private or thin pages stay out of the index */
  noIndex?: boolean;
}

/** Static route copy, keyed by path. Dynamic routes are built by the pages. */
export const PAGE_SEO: Record<string, PageSeo> = {
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

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface SeoProps extends PageSeo {
  /** absolute URL or site-relative path to the social card */
  image?: string;
  /** overrides the canonical URL, which defaults to the current path */
  canonicalPath?: string;
}

/** Applies page metadata. Safe to call on every render of a page. */
export function useSeo({ title, description, noIndex, image, canonicalPath }: SeoProps) {
  useEffect(() => {
    const full = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    const path = canonicalPath ?? window.location.pathname;
    const url = ORIGIN + path;
    const card = image ? (image.startsWith('http') ? image : ORIGIN + image) : `${ORIGIN}/og/page/default.png`;

    document.title = full;
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, follow' : 'index, follow');
    upsertLink('canonical', url);

    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', full);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', card);

    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', full);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', card);
  }, [title, description, noIndex, image, canonicalPath]);
}

/** Drop-in for pages: <Seo title="…" description="…" /> */
export const Seo: React.FC<SeoProps> = (props) => {
  useSeo(props);
  return null;
};

/** Convenience for pages on a static route: <SeoFor path="/campaign" /> */
export const SeoFor: React.FC<{ path: string; image?: string }> = ({ path, image }) => {
  const entry = PAGE_SEO[path] || { title: SITE_NAME, description: DEFAULT_DESCRIPTION };
  useSeo({ ...entry, image, canonicalPath: path });
  return null;
};

export default Seo;
