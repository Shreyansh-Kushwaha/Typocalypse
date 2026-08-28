import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import Ghost from './models/Ghost.js';
import User from './models/User.js';
import StatsSession from './models/StatsSession.js';
import { dailyPassage } from './routes/daily.js';

// Per-route social meta + dynamic OG card images.
// Meta injection works when this server serves the built client (client/dist).
// The /og/*.png images work regardless of where the client is hosted.

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

async function metaFor(req) {
  const base = `${req.protocol}://${req.get('host')}`;
  try {
    if (req.path.startsWith('/ghost/')) {
      const ghost = await Ghost.findById(req.path.split('/')[2]).select('username wpm accuracy genre');
      if (ghost) {
        return {
          title: `Race ${ghost.username}'s ghost — Typocalypse`,
          description: `${ghost.username} typed a ${ghost.genre} passage at ${ghost.wpm} WPM (${ghost.accuracy}%). Think you're faster? Click and type - no account needed.`,
          image: `${base}/og/ghost/${req.path.split('/')[2]}.png`,
        };
      }
    } else if (req.path.startsWith('/u/')) {
      const username = decodeURIComponent(req.path.split('/')[2] || '');
      const user = await User.findOne({ username }).select('_id username');
      if (user) {
        const best = await StatsSession.find({ userId: String(user._id), accuracy: { $gte: 80 } }).sort({ wpm: -1 }).limit(1);
        const wpm = best[0]?.wpm || 0;
        return {
          title: `${user.username} — Typocalypse`,
          description: wpm
            ? `${user.username} types ${wpm} WPM. See their keyboard heatmap and race their ghosts.`
            : `${user.username}'s typist profile on Typocalypse.`,
          image: `${base}/og/u/${encodeURIComponent(username)}.png`,
        };
      }
    } else if (req.path === '/daily') {
      const day = Math.floor(Date.now() / DAY_MS);
      return {
        title: `Daily Apocalypse #${day - 20690} — Typocalypse`,
        description: 'One passage. One attempt. The whole world types it. Today\'s daily typing challenge - free, no account needed.',
        image: `${base}/og/daily/${day}.png`,
      };
    } else if (req.path.startsWith('/room/')) {
      const code = req.path.split('/')[2]?.toUpperCase()?.slice(0, 5) || '';
      return {
        title: `Join room ${code} — Typocalypse`,
        description: 'You have been summoned to a multiplayer typing battle. Enter the code and fight.',
        image: null,
      };
    }
  } catch { /* fall through to defaults */ }
  return null;
}

function injectMeta(html, meta) {
  // strip static og/twitter/description tags so scrapers see exactly one set
  html = html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<meta (?:name="(?:description|twitter:[^"]*)"|property="og:[^"]*")[^>]*\/?>/g, '');
  const tags = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Typocalypse" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    meta.image ? `<meta property="og:image" content="${esc(meta.image)}" />` : '',
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
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

export function initOg(app) {
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
      const buf = await renderCard(`${kind}:${id}`, data);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=600');
      res.end(buf);
    } catch (err) {
      console.error('OG image error:', err.message);
      res.status(500).end();
    }
  });

  // ---- serve the built client with per-route meta injection ----
  if (!fs.existsSync(INDEX)) {
    console.warn('⚠ client/dist not found - social meta injection off (build the client and serve it from here for OG cards)');
    return;
  }
  const baseHtml = fs.readFileSync(INDEX, 'utf8');

  app.get(['/ghost/:id', '/u/:username', '/daily', '/room/:code'], async (req, res) => {
    const meta = await metaFor(req);
    res.setHeader('Content-Type', 'text/html');
    res.send(meta ? injectMeta(baseHtml, meta) : baseHtml);
  });

  app.use(express.static(DIST));

  // SPA fallback for every other client route
  app.use((req, res, next) => {
    if (req.method !== 'GET' || !req.accepts('html')) return next();
    res.setHeader('Content-Type', 'text/html');
    res.send(baseHtml);
  });
}
