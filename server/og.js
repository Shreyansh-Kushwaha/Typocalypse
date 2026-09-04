import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import Ghost from './models/Ghost.js';
import User from './models/User.js';
import Story from './models/Story.js';
import StatsSession from './models/StatsSession.js';
import { dailyPassage } from './routes/daily.js';
import { nodeById, ZONES } from './campaign.js';
import { registerLegalRoutes } from './routes/legal.js';
import { metaForPath, normalizePath, fullTitle, NOT_FOUND_SEO, SITE_NAME } from './seo.js';

// Per-route social meta + dynamic OG card images + robots/sitemap.
//
// Every HTML response this server sends gets its own <title>, description,
// canonical link, robots directive and Open Graph card injected, so a crawler
// that never runs JavaScript sees the same copy the app renders. The static
// copy comes from ./seo.js, which mirrors client/src/seo.tsx — keep them in sync.
//
// Meta injection needs the built client (client/dist). The /og/*.png images and
// /robots.txt + /sitemap.xml work regardless of where the client is hosted.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'client', 'dist');
const INDEX = path.join(DIST, 'index.html');
const DAY_MS = 24 * 60 * 60 * 1000;

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('⚠ sharp unavailable - OG card images disabled, meta text still works');
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// which generic card a static page gets
const PAGE_CARD_KEY = {
  '/': 'default',
  '/daily': 'daily',
  '/campaign': 'campaign',
  '/library': 'library',
  '/practice': 'practice',
  '/practice/code': 'practice',
  '/arcade/meteor': 'meteor',
  '/arcade/memory': 'memory',
  '/arcade/radio': 'radio',
  '/tournaments': 'tournaments',
  '/leaderboard': 'leaderboard',
  '/privacy': 'privacy',
};

// Copy for the generic brutalist cards behind /og/page/:key.png
const PAGE_CARDS = {
  default: {
    headline: 'survive the typing apocalypse',
    big: 'TYPE OR DIE',
    sub: 'stories, campaign, arcade, rated duels',
    footer: 'Play free in the browser. No account needed.',
  },
  daily: {
    headline: 'Daily Apocalypse',
    big: 'ONE SHOT',
    sub: 'one passage, one attempt, everybody',
    footer: 'A new passage every midnight UTC.',
  },
  campaign: {
    headline: 'Campaign',
    big: '24 NODES',
    sub: 'four zones, eight mutators, three stars',
    footer: 'Fog, storm, night and mirrored text.',
  },
  library: {
    headline: 'Story library',
    big: 'READ + TYPE',
    sub: 'stories written by other survivors',
    footer: 'Publish your own run to the library.',
  },
  practice: {
    headline: 'Timed typing test',
    big: '15/30/60',
    sub: 'per-second chart and a consistency score',
    footer: 'Works offline. No account needed.',
  },
  meteor: {
    headline: 'Meteor Shower',
    big: 'INCOMING',
    sub: 'type the falling words before they land',
    footer: 'Endless arcade typing with combos.',
  },
  memory: {
    headline: 'Last Words',
    big: 'RECALL',
    sub: 'the passage vanishes, type it back',
    footer: 'Five rounds, each one longer.',
  },
  radio: {
    headline: 'Radio Transmissions',
    big: 'LISTEN',
    sub: 'type what you hear through the static',
    footer: 'Ten transmissions. Operator ranks.',
  },
  tournaments: {
    headline: 'Weekend tournament',
    big: 'TYPO ROYALE',
    sub: 'heats of twenty, a final, a permanent title',
    footer: 'Register before the bracket locks.',
  },
  leaderboard: {
    headline: 'Global ladder',
    big: 'FASTEST',
    sub: 'this week, this season, all time',
    footer: 'Clean runs only. 80% accuracy or better.',
  },
  privacy: {
    headline: 'Privacy policy',
    big: 'PLAIN TALK',
    sub: 'what is stored, why, and how to delete it',
    footer: 'No ads, no analytics, no third-party trackers.',
  },
};

// ---------------------------------------------------------------------------
// The path a request should be treated as. /index.html is the same page as /
// (the service worker precaches it by name, so it cannot just be redirected).
const routePath = (req) => {
  const p = normalizePath(req.path);
  return p === '/index.html' ? '/' : p;
};

/**
 * Metadata for any route the client can render.
 * Always resolves: unknown paths get the 404 copy with noIndex.
 */
async function metaFor(req) {
  const base = `${req.protocol}://${req.get('host')}`;
  const p = routePath(req);
  const seg = p.split('/');

  try {
    if (p.startsWith('/ghost/')) {
      const ghost = await Ghost.findById(seg[2]).select('username wpm accuracy genre');
      if (ghost) {
        return {
          title: `Race ${ghost.username}'s ghost — ${SITE_NAME}`,
          description: `${ghost.username} typed a ${ghost.genre} passage at ${ghost.wpm} WPM (${ghost.accuracy}%). Think you're faster? Click and type - no account needed.`,
          image: `${base}/og/ghost/${seg[2]}.png`,
        };
      }
    } else if (p.startsWith('/u/')) {
      const username = decodeURIComponent(seg[2] || '');
      const user = await User.findOne({ username }).select('_id username');
      if (user) {
        const best = await StatsSession.find({ userId: String(user._id), accuracy: { $gte: 80 } }).sort({ wpm: -1 }).limit(1);
        const wpm = best[0]?.wpm || 0;
        return {
          title: `${user.username} — ${SITE_NAME}`,
          description: wpm
            ? `${user.username} types ${wpm} WPM. See their keyboard heatmap and race their ghosts.`
            : `${user.username}'s typist profile on Typocalypse.`,
          image: `${base}/og/u/${encodeURIComponent(username)}.png`,
        };
      }
    } else if (p === '/daily') {
      const day = Math.floor(Date.now() / DAY_MS);
      return {
        title: `Daily Apocalypse #${day - 20690} — ${SITE_NAME}`,
        description: 'One passage. One attempt. The whole world types it. Today\'s daily typing challenge - free, no account needed.',
        image: `${base}/og/daily/${day}.png`,
      };
    } else if (p.startsWith('/room/')) {
      const code = seg[2]?.toUpperCase()?.slice(0, 5) || '';
      return {
        title: `Join room ${code} — ${SITE_NAME}`,
        description: 'You have been summoned to a multiplayer typing battle. Enter the code and fight.',
        image: `${base}/og/page/default.png`,
        noIndex: true, // a room code is ephemeral, never index one
      };
    } else if (p.startsWith('/library/')) {
      const story = await Story.findById(seg[2]).select('title authorName genre wordCount');
      if (story) {
        const words = story.wordCount || 0;
        return {
          title: `${story.title} — ${SITE_NAME}`,
          description: `Type “${story.title}” by ${story.authorName}, a ${story.genre} story in ${words} words on Typocalypse.`,
          image: `${base}/og/page/library.png`,
        };
      }
    } else if (p.startsWith('/campaign/')) {
      const node = nodeById(seg[2]);
      if (node) {
        const zone = ZONES.find(z => z.id === node.zone);
        return {
          title: `${node.name} — ${zone ? zone.name : 'Campaign'} — ${SITE_NAME}`,
          description: `${node.name}, a campaign node in ${zone ? zone.name : 'the campaign'}. ${node.blurb}`,
          image: `${base}/og/page/campaign.png`,
          // node passages only make sense inside a player's progression
          noIndex: true,
        };
      }
    }
  } catch { /* bad id, dead connection - fall through to the static/404 copy */ }

  const stat = metaForPath(p);
  if (stat) {
    return { ...stat, image: `${base}/og/page/${PAGE_CARD_KEY[p] || 'default'}.png` };
  }
  return { ...NOT_FOUND_SEO, image: `${base}/og/page/default.png`, notFound: true };
}

/**
 * Replaces the build's static head tags with this route's. The strip step
 * matters: leaving both means a scraper sees two titles and picks the wrong one.
 */
function injectMeta(html, meta, canonical) {
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta (?:name="(?:description|robots|twitter:[^"]*)"|property="og:[^"]*")[^>]*\/?>/g, '')
    .replace(/\s*<link rel="canonical"[^>]*\/?>/g, '');

  const title = fullTitle(meta.title);
  const robots = meta.noIndex ? 'noindex, follow' : 'index, follow';
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    meta.image ? `<meta property="og:image" content="${esc(meta.image)}" />` : '',
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    meta.image ? `<meta name="twitter:image" content="${esc(meta.image)}" />` : '',
  ].filter(Boolean).join('\n    ');
  return html.replace('</head>', `    ${tags}\n  </head>`);
}

// Brutalist SVG card rendered to PNG
function cardSVG({ headline, big, sub, footer }) {
  const wrap = (s, n) => esc(String(s).length > n ? String(s).slice(0, n - 1) + '…' : s);
  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#f4f4f0"/>
  <rect x="24" y="24" width="1152" height="582" fill="none" stroke="#000" stroke-width="10"/>
  <rect x="48" y="48" width="1104" height="534" fill="#000"/>
  <text x="90" y="150" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="52" fill="#facc15">TYPOCALYPSE</text>
  <text x="90" y="240" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="44" fill="#ffffff">${wrap(headline, 42)}</text>
  <text x="90" y="400" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="130" fill="#facc15">${wrap(big, 16)}</text>
  <text x="90" y="470" font-family="Courier New, monospace" font-weight="bold" font-size="36" fill="#ffffff">${wrap(sub, 52)}</text>
  <rect x="90" y="500" width="1020" height="4" fill="#facc15"/>
  <text x="90" y="552" font-family="Courier New, monospace" font-weight="bold" font-size="28" fill="#facc15">${wrap(footer, 60)}</text>
</svg>`;
}

const imageCache = new Map(); // key -> {at, buf}
const CACHE_MS = 10 * 60 * 1000;

async function renderCard(key, data) {
  const hit = imageCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.buf;
  const buf = await sharp(Buffer.from(cardSVG(data))).png().toBuffer();
  if (imageCache.size > 200) imageCache.clear();
  imageCache.set(key, { at: Date.now(), buf });
  return buf;
}

const sendCard = (res, buf) => {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=600');
  res.end(buf);
};

export function initOg(app) {
  // ---- robots.txt + sitemap.xml (must beat express.static below) ----
  registerLegalRoutes(app);

  // ---- generic page cards; registered before /og/:kind/:id.png so 'page' wins ----
  app.get('/og/page/:key.png', async (req, res) => {
    if (!sharp) return res.status(404).end();
    try {
      const key = PAGE_CARDS[req.params.key] ? req.params.key : 'default';
      sendCard(res, await renderCard(`page:${key}`, PAGE_CARDS[key]));
    } catch (err) {
      console.error('OG page image error:', err.message);
      res.status(500).end();
    }
  });

  // ---- dynamic OG card images ----
  app.get('/og/:kind/:id.png', async (req, res) => {
    if (!sharp) return res.status(404).end();
    try {
      const { kind, id } = req.params;
      let data = null;
      if (kind === 'ghost') {
        const g = await Ghost.findById(id).select('username wpm accuracy genre');
        if (g) data = {
          headline: `${g.username}'s ghost awaits`,
          big: `${g.wpm} WPM`,
          sub: `${g.accuracy}% accuracy · ${g.genre}`,
          footer: 'Think you are faster? Click and type.',
        };
      } else if (kind === 'u') {
        const user = await User.findOne({ username: decodeURIComponent(id) }).select('_id username currentStreak');
        if (user) {
          const best = await StatsSession.find({ userId: String(user._id), accuracy: { $gte: 80 } }).sort({ wpm: -1 }).limit(1);
          data = {
            headline: user.username,
            big: `${best[0]?.wpm || 0} WPM`,
            sub: user.currentStreak > 1 ? `on a ${user.currentStreak} day streak` : 'typist profile',
            footer: 'Race their ghosts on Typocalypse.',
          };
        }
      } else if (kind === 'daily') {
        const day = parseInt(id, 10) || Math.floor(Date.now() / DAY_MS);
        const { genre } = dailyPassage(day);
        data = {
          headline: 'Daily Apocalypse',
          big: `#${day - 20690}`,
          sub: `today's genre: ${genre}`,
          footer: 'One passage. One attempt. The whole world.',
        };
      }
      if (!data) return res.status(404).end();
      sendCard(res, await renderCard(`${kind}:${id}`, data));
    } catch (err) {
      console.error('OG image error:', err.message);
      res.status(500).end();
    }
  });

  // ---- serve the built client with per-route meta injection ----
  if (!fs.existsSync(INDEX)) {
    console.warn('⚠ client/dist not found - social meta injection off (robots.txt, sitemap.xml and OG cards still served)');
    return;
  }
  const baseHtml = fs.readFileSync(INDEX, 'utf8');

  // One handler for every HTML response, so static pages, dynamic pages and the
  // 404 all get their tags. Used both for the explicit dynamic routes (which
  // must be declared before express.static) and for the SPA fallback.
  const serveApp = async (req, res) => {
    const meta = await metaFor(req);
    const canonical = `${req.protocol}://${req.get('host')}${routePath(req)}`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // A path nothing answers on is a real 404, not a soft one. The body is
    // still the app, so React Router renders the 404 page as usual.
    if (meta.notFound) res.status(404);
    res.send(injectMeta(baseHtml, meta, canonical));
  };

  app.get([
    '/index.html',
    '/ghost/:id',
    '/u/:username',
    '/daily',
    '/room/:code',
    '/library/:id',
    '/campaign/:nodeId',
  ], serveApp);

  // index:false so '/' falls through to serveApp below and gets its meta too,
  // instead of being answered with the raw build index.html.
  app.use(express.static(DIST, { index: false }));

  // SPA fallback for every other client route (and for the 404)
  app.use((req, res, next) => {
    if (req.method !== 'GET' || !req.accepts('html')) return next();
    return serveApp(req, res);
  });
}
