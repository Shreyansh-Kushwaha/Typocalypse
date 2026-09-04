import express from 'express';
import { authenticateToken, optionalAuth } from '../auth.js';
import ArcadeScore from '../models/ArcadeScore.js';
import { grant } from '../progression.js';
import { logActivity } from '../activity.js';
import { pickRadioSession } from '../content/radio.js';

const router = express.Router();

const GAMES = ['meteor'];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));

// Personal-best-only ladder. Meteor: a kill is worth len * 10 * combo (max x5)
// so even a flawless run cannot sustain 400 points per second.
const MAX_POINTS_PER_SECOND = 400;

async function rankOf(game, score) {
  return 1 + await ArcadeScore.countDocuments({ game, score: { $gt: score } });
}

// Submit an arcade run. Keeps only the best score per user per game.
router.post('/arcade/score', authenticateToken, async (req, res) => {
  try {
    const game = String(req.body.game || '');
    if (!GAMES.includes(game)) return res.status(400).json({ error: 'Unknown arcade game' });
    const score = Math.round(clamp(req.body.score, 0, 10_000_000));
    const wave = Math.round(clamp(req.body.wave, 1, 999));
    const kills = Math.round(clamp(req.body.kills, 0, 100_000));
    const durationMs = Math.round(clamp(req.body.durationMs, 0, 3_600_000));
    if (score > Math.max(MAX_POINTS_PER_SECOND, (durationMs / 1000) * MAX_POINTS_PER_SECOND)) {
      return res.status(400).json({ error: 'Implausible score' });
    }

    const existing = await ArcadeScore.findOne({ userId: req.user.userId, game });
    const isNewBest = !existing || score > existing.score;
    let best = existing;
    if (!existing) {
      best = await ArcadeScore.create({
        userId: req.user.userId,
        username: req.user.username,
        game, score,
        meta: { wave, kills, durationMs },
      });
    } else if (isNewBest) {
      existing.score = score;
      existing.username = req.user.username;
      existing.meta = { wave, kills, durationMs };
      best = await existing.save();
    }

    const [rank, players] = await Promise.all([rankOf(game, best.score), ArcadeScore.countDocuments({ game })]);
    const progression = await grant(req.user.userId, {
      xp: Math.min(60, Math.floor(score / 100)),
      event: { type: game, score },
    }).catch(() => null);
    if (isNewBest && score > 1000) {
      void logActivity(req.user.userId, req.user.username, game, { score, wave });
    }
    res.status(201).json({
      best: { score: best.score, wave: best.meta?.wave, kills: best.meta?.kills, durationMs: best.meta?.durationMs },
      isNewBest,
      rank,
      players,
      progression,
    });
  } catch (error) {
    console.error('Arcade score error:', error);
    res.status(500).json({ error: 'Failed to save your run' });
  }
});

// Public ladder - top 20 personal bests for a game
router.get('/arcade/leaderboard', optionalAuth, async (req, res) => {
  try {
    const game = GAMES.includes(req.query.game) ? req.query.game : 'meteor';
    const rows = await ArcadeScore.find({ game })
      .sort({ score: -1, updatedAt: 1 })
      .limit(20)
      .select('userId username score meta');
    res.json({
      game,
      rows: rows.map((r, i) => ({
        rank: i + 1,
        username: r.username,
        score: r.score,
        wave: r.meta?.wave || 1,
        kills: r.meta?.kills || 0,
        me: !!req.user && r.userId === req.user.userId,
      })),
    });
  } catch (error) {
    console.error('Arcade leaderboard error:', error);
    res.status(500).json({ error: 'Failed to load the arcade ladder' });
  }
});

// My personal bests across arcade games (with current rank)
router.get('/arcade/me', authenticateToken, async (req, res) => {
  try {
    const rows = await ArcadeScore.find({ userId: req.user.userId });
    const bests = {};
    for (const r of rows) {
      bests[r.game] = {
        score: r.score,
        wave: r.meta?.wave || 1,
        kills: r.meta?.kills || 0,
        durationMs: r.meta?.durationMs || 0,
        rank: await rankOf(r.game, r.score),
      };
    }
    res.json({ bests });
  } catch (error) {
    console.error('Arcade me error:', error);
    res.status(500).json({ error: 'Failed to load your arcade bests' });
  }
});

// A fresh Radio Transmissions session: 10 lines ramping in difficulty.
// (The page lives at the same path, so browser navigations fall through to the SPA.)
router.get('/arcade/radio', (req, res, next) => {
  if (req.accepts(['html', 'json']) === 'html') return next();
  res.json({ lines: pickRadioSession() });
});

export default router;
