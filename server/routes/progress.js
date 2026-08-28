import express from 'express';
import fetch from 'node-fetch';
import { authenticateToken } from '../auth.js';
import StatsSession from '../models/StatsSession.js';
import Ghost from '../models/Ghost.js';
import { COMMON_WORDS, JUNK_WORDS, shuffle } from '../multiplayer/content.js';
import { bumpStreak, getStreak } from '../streaks.js';

const router = express.Router();
const MAX_GHOSTS_PER_USER = 10;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));

// ---- record one finished passage ----
router.post('/stats/session', authenticateToken, async (req, res) => {
  try {
    const { context, mode, wpm, accuracy, errors, totalTyped, durationMs, keyStats } = req.body;
    const cleanKeyStats = {};
    if (keyStats && typeof keyStats === 'object') {
      for (const [ch, v] of Object.entries(keyStats)) {
        if (typeof ch === 'string' && ch.length === 1 && v && typeof v === 'object') {
          cleanKeyStats[ch] = { h: clamp(v.h, 0, 100000), m: clamp(v.m, 0, 100000) };
        }
      }
    }
    const session = await StatsSession.create({
      userId: req.user.userId,
      username: req.user.username,
      context: ['solo', 'drill', 'multiplayer', 'ghost'].includes(context) ? context : 'solo',
      mode: typeof mode === 'string' ? mode.slice(0, 30) : undefined,
      wpm: clamp(wpm, 0, 300),
      accuracy: clamp(accuracy, 0, 100),
      errors: clamp(errors, 0, 100000),
      totalTyped: clamp(totalTyped, 0, 1000000),
      durationMs: clamp(durationMs, 0, 3600000),
      keyStats: cleanKeyStats,
    });
    const streak = await bumpStreak(req.user.userId, session.context).catch(() => null);
    res.status(201).json({ id: session._id, streak });
  } catch (error) {
    console.error('Save session error:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// ---- merged view of my stats ----
function mergeKeyStats(sessions) {
  const merged = {};
  for (const s of sessions) {
    for (const [ch, v] of Object.entries(s.keyStats || {})) {
      if (!merged[ch]) merged[ch] = { h: 0, m: 0 };
      merged[ch].h += v.h || 0;
      merged[ch].m += v.m || 0;
    }
  }
  return merged;
}

function weakKeys(merged, minAttempts = 8) {
  return Object.entries(merged)
    .map(([ch, v]) => ({ ch, attempts: v.h + v.m, missRate: (v.h + v.m) ? v.m / (v.h + v.m) : 0 }))
    .filter(k => k.attempts >= minAttempts && k.missRate > 0)
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, 6);
}

async function loadMyStats(userId) {
  const sessions = await StatsSession.find({ userId }).sort({ createdAt: -1 }).limit(200);
  const recent = sessions.slice(0, 20);
  const bestWpm = sessions.reduce((a, s) => Math.max(a, s.accuracy >= 80 ? s.wpm : 0), 0);
  const avg = (arr, f) => arr.length ? Math.round(arr.reduce((a, s) => a + f(s), 0) / arr.length) : 0;
  const merged = mergeKeyStats(sessions);
  return {
    sessions,
    summary: {
      games: sessions.length,
      bestWpm,
      avgWpm: avg(recent, s => s.wpm),
      avgAccuracy: avg(recent, s => s.accuracy),
      totalTyped: sessions.reduce((a, s) => a + s.totalTyped, 0),
    },
    keyStats: merged,
    weakKeys: weakKeys(merged),
    // oldest -> newest for charts
    history: sessions.slice(0, 30).reverse().map(s => ({
      wpm: s.wpm, accuracy: s.accuracy, context: s.context, mode: s.mode, at: s.createdAt,
    })),
  };
}

router.get('/stats/me', authenticateToken, async (req, res) => {
  try {
    const data = await loadMyStats(req.user.userId);
    const streak = await getStreak(req.user.userId);
    const { sessions, ...rest } = data;
    res.json({ ...rest, streak });
  } catch (error) {
    console.error('Load stats error:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ---- targeted drill built from weak keys ----
router.get('/stats/drill', authenticateToken, async (req, res) => {
  try {
    const { weakKeys: weak } = await loadMyStats(req.user.userId);
    const targets = weak.map(k => k.ch).filter(ch => /[a-z]/.test(ch));
    const bank = [...COMMON_WORDS, ...JUNK_WORDS];
    let pool;
    if (targets.length) {
      const scored = bank
        .map(w => ({ w, score: targets.reduce((a, ch) => a + (w.split(ch).length - 1), 0) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 60)
        .map(x => x.w);
      pool = scored.length >= 15 ? scored : bank;
    } else {
      pool = bank;
    }
    const words = shuffle(pool).slice(0, 25);
    res.json({ text: words.join(' '), targets });
  } catch (error) {
    console.error('Drill error:', error);
    res.status(500).json({ error: 'Failed to build drill' });
  }
});

// ---- AI coach with a rule-based fallback ----
function localCoach(stats) {
  const lines = [];
  const { summary, weakKeys: weak, history } = stats;
  if (summary.games === 0) return 'No data yet. Play a few rounds and come back for coaching.';
  lines.push(`Across your last ${Math.min(summary.games, 200)} passages you average ${summary.avgWpm} WPM at ${summary.avgAccuracy}% accuracy (best clean run ${summary.bestWpm} WPM).`);
  if (weak.length) {
    const worst = weak.slice(0, 3).map(k => `"${k.ch === ' ' ? 'space' : k.ch}" (${Math.round(k.missRate * 100)}% missed)`).join(', ');
    lines.push(`Your weakest keys are ${worst}. Run the targeted drill until those drop under 10%.`);
  }
  if (history.length >= 6) {
    const half = Math.floor(history.length / 2);
    const early = history.slice(0, half).reduce((a, h) => a + h.wpm, 0) / half;
    const late = history.slice(half).reduce((a, h) => a + h.wpm, 0) / (history.length - half);
    const delta = Math.round(late - early);
    if (delta > 2) lines.push(`Trend: up ${delta} WPM over your recent sessions. Keep the streak.`);
    else if (delta < -2) lines.push(`Trend: down ${Math.abs(delta)} WPM recently. Slow down and rebuild accuracy first - speed follows.`);
    else lines.push('Trend: flat. Push slightly past comfort on drills to break the plateau.');
  }
  if (summary.avgAccuracy < 92) {
    lines.push('Accuracy under 92% costs more than speed gains. Type 10% slower until errors nearly vanish.');
  }
  return lines.join(' ');
}

router.post('/stats/coach', authenticateToken, async (req, res) => {
  try {
    const stats = await loadMyStats(req.user.userId);
    const fallback = localCoach(stats);
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return res.json({ coach: fallback, source: 'local' });

    try {
      const summary = {
        ...stats.summary,
        weakKeys: stats.weakKeys.map(k => ({ key: k.ch, missRate: Math.round(k.missRate * 100) })),
        recentWpm: stats.history.map(h => h.wpm),
      };
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: [{
            role: 'user',
            content: `You are a typing coach for a typing game. Given this player data as JSON, write 3-4 sentences of sharp, specific, encouraging coaching. Mention their weakest keys by name and one concrete exercise. No markdown, no lists.\n${JSON.stringify(summary)}`,
          }],
          temperature: 0.6,
          max_tokens: 220,
        }),
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      res.json({ coach: text || fallback, source: text ? 'ai' : 'local' });
    } catch (err) {
      console.error('Coach AI error:', err.message);
      res.json({ coach: fallback, source: 'local' });
    }
  } catch (error) {
    console.error('Coach error:', error);
    res.status(500).json({ error: 'Coach unavailable' });
  }
});

// ---- leaderboard ----
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const period = req.query.period === 'weekly' ? 'weekly' : 'all';
    const match = { accuracy: { $gte: 80 } };
    if (period === 'weekly') {
      match.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) };
    }
    const rows = await StatsSession.aggregate([
      { $match: match },
      { $group: {
        _id: '$userId',
        username: { $last: '$username' },
        bestWpm: { $max: '$wpm' },
        avgAccuracy: { $avg: '$accuracy' },
        games: { $sum: 1 },
      } },
      { $sort: { bestWpm: -1, avgAccuracy: -1 } },
      { $limit: 20 },
    ]);
    res.json({
      period,
      rows: rows.map((r, i) => ({
        rank: i + 1,
        userId: r._id,
        username: r.username,
        bestWpm: r.bestWpm,
        avgAccuracy: Math.round(r.avgAccuracy),
        games: r.games,
        me: r._id === req.user.userId,
      })),
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

// ---- ghosts ----
router.post('/ghosts', authenticateToken, async (req, res) => {
  try {
    const { text, times, wpm, accuracy, genre } = req.body;
    if (typeof text !== 'string' || text.length < 10 || text.length > 2000) {
      return res.status(400).json({ error: 'Invalid ghost text' });
    }
    if (!Array.isArray(times) || times.length !== text.length || times.length > 2000) {
      return res.status(400).json({ error: 'Ghost timeline must cover the whole text' });
    }
    const cleanTimes = times.map(t => clamp(t, 0, 3600000));
    for (let i = 1; i < cleanTimes.length; i++) {
      if (cleanTimes[i] < cleanTimes[i - 1]) return res.status(400).json({ error: 'Ghost timeline must be increasing' });
    }
    const ghost = await Ghost.create({
      userId: req.user.userId,
      username: req.user.username,
      text,
      times: cleanTimes,
      wpm: clamp(wpm, 0, 300),
      accuracy: clamp(accuracy, 0, 100),
      genre: typeof genre === 'string' ? genre.slice(0, 20) : 'fantasy',
    });
    // keep only the newest N ghosts per user
    const extras = await Ghost.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(MAX_GHOSTS_PER_USER)
      .select('_id');
    if (extras.length) await Ghost.deleteMany({ _id: { $in: extras.map(g => g._id) } });
    res.status(201).json({ id: ghost._id });
  } catch (error) {
    console.error('Save ghost error:', error);
    res.status(500).json({ error: 'Failed to save ghost' });
  }
});

router.get('/ghosts/mine', authenticateToken, async (req, res) => {
  try {
    const ghosts = await Ghost.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(MAX_GHOSTS_PER_USER)
      .select('username wpm accuracy genre createdAt text');
    res.json(ghosts.map(g => ({
      id: g._id,
      username: g.username,
      wpm: g.wpm,
      accuracy: g.accuracy,
      genre: g.genre,
      preview: g.text.slice(0, 60),
      at: g.createdAt,
    })));
  } catch (error) {
    console.error('List ghosts error:', error);
    res.status(500).json({ error: 'Failed to list ghosts' });
  }
});

router.get('/ghosts/:id', authenticateToken, async (req, res) => {
  try {
    const ghost = await Ghost.findById(req.params.id);
    if (!ghost) return res.status(404).json({ error: 'Ghost not found' });
    res.json({
      id: ghost._id,
      username: ghost.username,
      text: ghost.text,
      times: ghost.times,
      wpm: ghost.wpm,
      accuracy: ghost.accuracy,
      genre: ghost.genre,
      mine: ghost.userId === req.user.userId,
    });
  } catch (error) {
    res.status(404).json({ error: 'Ghost not found' });
  }
});

export default router;
