import express from 'express';
import { authenticateToken, optionalAuth } from '../auth.js';
import DailyResult from '../models/DailyResult.js';
import { PASSAGES } from '../multiplayer/content.js';
import { bumpStreak, getStreak } from '../streaks.js';
import { grant, sessionXp } from '../progression.js';
import { logActivity } from '../activity.js';

const router = express.Router();
const DAY_MS = 24 * 60 * 60 * 1000;

const todayIndex = () => Math.floor(Date.now() / DAY_MS);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));

// Deterministic PRNG so every player worldwide gets the same passage
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GENRES = Object.keys(PASSAGES).sort();
const ALL = GENRES.flatMap(g => PASSAGES[g].map(text => ({ genre: g, text })));

export function dailyPassage(day) {
  const rand = mulberry32(day * 2654435761);
  return ALL[Math.floor(rand() * ALL.length)];
}

// Public: today's challenge (result attached when logged in)
router.get('/daily', optionalAuth, async (req, res, next) => {
  // Browser navigations want the app page (served with OG meta downstream)
  if (req.accepts(['html', 'json']) === 'html') return next();
  try {
    const day = todayIndex();
    const { genre, text } = dailyPassage(day);
    const [players, myResult, streak] = await Promise.all([
      DailyResult.countDocuments({ day }),
      req.user ? DailyResult.findOne({ userId: req.user.userId, day }) : null,
      req.user ? getStreak(req.user.userId) : null,
    ]);
    res.json({
      day,
      number: day - 20690, // day 1 = launch epoch, purely cosmetic
      dateUTC: new Date(day * DAY_MS).toISOString().slice(0, 10),
      endsAt: (day + 1) * DAY_MS,
      genre,
      text,
      players,
      myResult: myResult ? { wpm: myResult.wpm, accuracy: myResult.accuracy, durationMs: myResult.durationMs } : null,
      streak,
    });
  } catch (error) {
    console.error('Daily error:', error);
    res.status(500).json({ error: 'Failed to load the daily' });
  }
});

// One attempt per day, enforced by the unique index
router.post('/daily/result', authenticateToken, async (req, res) => {
  try {
    const day = todayIndex();
    const { text } = dailyPassage(day);
    const wpm = clamp(req.body.wpm, 0, 300);
    const accuracy = clamp(req.body.accuracy, 0, 100);
    const errors = clamp(req.body.errors, 0, 100000);
    const durationMs = clamp(req.body.durationMs, 0, 3600000);
    // basic plausibility: the passage cannot be typed faster than the claimed duration allows
    if (durationMs > 0 && (text.length / 5) / (durationMs / 60000) > 320) {
      return res.status(400).json({ error: 'Implausible result' });
    }
    let result;
    try {
      result = await DailyResult.create({
        userId: req.user.userId,
        username: req.user.username,
        day, wpm, accuracy, errors, durationMs,
      });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'You already typed today. Come back after midnight UTC.' });
      throw err;
    }
    const streak = await bumpStreak(req.user.userId, 'solo').catch(() => null);
    const rank = 1 + await DailyResult.countDocuments({
      day,
      $or: [{ wpm: { $gt: wpm } }, { wpm, accuracy: { $gt: accuracy } }],
    });
    const players = await DailyResult.countDocuments({ day });
    const progression = await grant(req.user.userId, {
      xp: 50 + sessionXp({ wpm, accuracy, totalTyped: text.length }),
      event: { type: 'daily', rank, wpm, accuracy },
    }).catch(() => null);
    void logActivity(req.user.userId, req.user.username, 'daily', { number: day - 20690, wpm, accuracy, rank });
    res.status(201).json({ id: result._id, rank, players, streak, progression });
  } catch (error) {
    console.error('Daily result error:', error);
    res.status(500).json({ error: 'Failed to save your run' });
  }
});

// Public daily ladder
router.get('/daily/leaderboard', optionalAuth, async (req, res) => {
  try {
    const day = todayIndex();
    const rows = await DailyResult.find({ day })
      .sort({ wpm: -1, accuracy: -1 })
      .limit(50)
      .select('userId username wpm accuracy');
    res.json({
      day,
      rows: rows.map((r, i) => ({
        rank: i + 1,
        username: r.username,
        wpm: r.wpm,
        accuracy: r.accuracy,
        me: !!req.user && r.userId === req.user.userId,
      })),
    });
  } catch (error) {
    console.error('Daily leaderboard error:', error);
    res.status(500).json({ error: 'Failed to load the daily ladder' });
  }
});

export default router;
