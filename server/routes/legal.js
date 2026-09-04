// robots.txt and sitemap.xml, generated per request host so the same build
// works on localhost, a preview URL, and the production domain.
//
// Registered by initOg() BEFORE express.static(client/dist), so these win over
// any file of the same name in the build, and so they still exist when there
// is no build at all (API-only deploy with the client on Vercel/Netlify —
// see client/public/robots.txt for the static fallback used in that case).

import mongoose from 'mongoose';
import Story from '../models/Story.js';
import User from '../models/User.js';
import StatsSession from '../models/StatsSession.js';
import { PUBLIC_PATHS, SITEMAP_HINTS, SITE_NAME, SITE_TAGLINE, PAGE_SEO } from '../seo.js';

const CACHE_MS = 10 * 60 * 1000;
const MAX_STORIES = 200;
const MAX_PROFILES = 200;
const QUERY_TIMEOUT_MS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Signed-in surfaces. Nothing here is useful in a search result and most of it
// 401s a crawler anyway.
const PRIVATE_PATHS = [
  '/dashboard',
  '/genre-selection',
  '/game',          // also covers /game/start, /game/continue, /games
  '/multiplayer',
  '/room/',
  '/claim',
  '/stats',         // the page and the /stats/* API
  '/progress',      // the page and /progression/*
  '/friends',
  '/quickmatch',
  '/login',
  '/signup',
];

// API paths. Prefixes are chosen so no public page starts with one:
// '/campaign/' leaves '/campaign' crawlable, '/daily/' leaves '/daily',
// and '/arcade/me' is NOT listed because it is a prefix of '/arcade/memory'.
const API_PATHS = [
  '/auth/',
  '/api/',
  '/health',
  '/ghosts/',
  '/push/',
  '/notify/',
  '/progression/',
  '/social/',
  '/feed/',
  '/users/',
  '/stories',
  '/ratings/',
  '/seasons/',
  '/arcade/score',
  '/arcade/leaderboard',
  '/campaign/',     // node passages and clears; /campaign itself stays open
  '/daily/',        // /daily/result, /daily/leaderboard; /daily stays open
  '/tournaments/',  // bracket JSON; /tournaments stays open
];

const originOf = (req) => `${req.protocol}://${req.get('host')}`;

// ------------------------------------------------------------------ robots
export function robotsBody(origin) {
  const lines = [
    `# ${SITE_NAME} — ${SITE_TAGLINE}`,
    '# Generated per host by server/routes/legal.js',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# public pages',
    ...PUBLIC_PATHS.filter(p => p !== '/').map(p => `Allow: ${p}`),
    '',
    '# signed-in surfaces',
    ...PRIVATE_PATHS.map(p => `Disallow: ${p}`),
    '',
    '# API endpoints',
    ...API_PATHS.map(p => `Disallow: ${p}`),
    '',
    'Crawl-delay: 1',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ];
  return lines.join('\n');
}

// ----------------------------------------------------------------- sitemap
const xmlEsc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

function urlNode({ loc, lastmod, changefreq, priority }) {
  const parts = [`    <loc>${xmlEsc(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${xmlEsc(lastmod)}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

const iso = (d) => (d instanceof Date && !isNaN(d) ? d.toISOString() : null);

/** Newest published stories -> /library/:id */
async function storyUrls(origin) {
  const stories = await Story.find({})
    .sort({ createdAt: -1 })
    .limit(MAX_STORIES)
    .select('_id updatedAt createdAt')
    .maxTimeMS(QUERY_TIMEOUT_MS)
    .lean();
  return stories.map(s => urlNode({
    loc: `${origin}/library/${s._id}`,
    lastmod: iso(s.updatedAt) || iso(s.createdAt),
    changefreq: 'monthly',
    priority: '0.6',
  }));
}

/** Fastest public profiles -> /u/:username, ranked by best clean run. */
async function profileUrls(origin) {
  const rows = await StatsSession.aggregate([
    { $match: { accuracy: { $gte: 80 } } },
    { $group: { _id: '$userId', wpm: { $max: '$wpm' }, at: { $max: '$createdAt' } } },
    { $sort: { wpm: -1 } },
    { $limit: MAX_PROFILES },
  ]).option({ maxTimeMS: QUERY_TIMEOUT_MS });
  if (!rows.length) return [];

  const ids = rows.map(r => r._id).filter(id => mongoose.isValidObjectId(id));
  const users = await User.find({ _id: { $in: ids } })
    .select('username')
    .maxTimeMS(QUERY_TIMEOUT_MS)
    .lean();
  const nameById = new Map(users.map(u => [String(u._id), u.username]));

  return rows
    .map(r => ({ name: nameById.get(String(r._id)), at: r.at }))
    .filter(r => r.name)
    .map(r => urlNode({
      loc: `${origin}/u/${encodeURIComponent(r.name)}`,
      lastmod: iso(r.at),
      changefreq: 'weekly',
      priority: '0.5',
    }));
}

export async function sitemapBody(origin) {
  const todayUTC = new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS);

  const statics = PUBLIC_PATHS
    .filter(p => !PAGE_SEO[p]?.noIndex) // belt and braces: never list a noIndex path
    .map(p => {
      const hint = SITEMAP_HINTS[p] || { changefreq: 'monthly', priority: '0.5' };
      return urlNode({
        loc: `${origin}${p === '/' ? '/' : p}`,
        // the daily passage turns over at midnight UTC; the rest we cannot date
        lastmod: p === '/daily' ? todayUTC.toISOString() : null,
        changefreq: hint.changefreq,
        priority: hint.priority,
      });
    });

  let dynamic = [];
  if (mongoose.connection.readyState === 1) {
    const [stories, profiles] = await Promise.all([
      storyUrls(origin).catch(err => { console.error('sitemap stories:', err.message); return []; }),
      profileUrls(origin).catch(err => { console.error('sitemap profiles:', err.message); return []; }),
    ]);
    dynamic = [...stories, ...profiles];
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...statics, ...dynamic].join('\n')}
</urlset>
`;
}

// ------------------------------------------------------------------ routes
const sitemapCache = new Map(); // origin -> { at, body }

export function registerLegalRoutes(app) {
  app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(robotsBody(originOf(req)));
  });

  app.get('/sitemap.xml', async (req, res) => {
    const origin = originOf(req);
    try {
      const hit = sitemapCache.get(origin);
      if (hit && Date.now() - hit.at < CACHE_MS) {
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=600');
        return res.send(hit.body);
      }
      const body = await sitemapBody(origin);
      if (sitemapCache.size > 20) sitemapCache.clear();
      sitemapCache.set(origin, { at: Date.now(), body });
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=600');
      res.send(body);
    } catch (err) {
      console.error('sitemap error:', err.message);
      res.status(500).type('text/plain').send('sitemap unavailable');
    }
  });
}

export default registerLegalRoutes;
