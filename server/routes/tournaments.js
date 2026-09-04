import express from 'express';
import { authenticateToken, optionalAuth } from '../auth.js';
import Tournament from '../models/Tournament.js';
import User from '../models/User.js';
import MatchResult from '../models/MatchResult.js';
import { grant } from '../progression.js';
import { logActivity } from '../activity.js';
import { ensureUpcoming } from '../multiplayer/tournaments.js';
import { tierOf } from '../elo.js';

const router = express.Router();
const LIVE = ['open', 'starting', 'running'];
const slugOf = (s) => String(s || '').slice(0, 40);

// Shape the Dashboard banner and the tournaments page share
function summary(t, userId) {
  const me = userId ? String(userId) : null;
  const registered = !!me && t.entrants.some(e => String(e.userId) === me);
  let roomCode = null;
  if (registered && ['starting', 'running'].includes(t.state)) {
    if (t.final?.players?.some(id => String(id) === me)) roomCode = t.final.roomCode;
    else {
      const h = t.heats.find(x => x.players.some(id => String(id) === me));
      if (h) roomCode = h.roomCode;
    }
  }
  return {
    slug: t.slug,
    name: t.name,
    mode: t.mode,
    genre: t.genre,
    startsAt: t.startsAt,
    state: t.state,
    entrants: t.entrants.length,
    registered,
    roomCode,
    heats: t.heats.length,
    winner: t.winner || null,
  };
}

async function nextTournament() {
  const t = await Tournament.findOne({ state: { $in: LIVE } }).sort({ startsAt: 1 });
  return t || ensureUpcoming();
}

// ---------------------------------------------------------------- tournaments
router.get('/tournaments/next', optionalAuth, async (req, res) => {
  try {
    const t = await nextTournament();
    res.json({ tournament: t ? summary(t, req.user?.userId) : null });
  } catch (error) {
    console.error('Tournament next error:', error);
    res.status(500).json({ error: 'Failed to load the tournament' });
  }
});

router.get('/tournaments', optionalAuth, async (req, res, next) => {
  // Browser navigations want the app page
  if (req.accepts(['html', 'json']) === 'html') return next();
  try {
    const [t, past] = await Promise.all([
      nextTournament(),
      Tournament.find({ state: { $in: ['finished', 'cancelled'] } }).sort({ startsAt: -1 }).limit(8).select('slug name startsAt state winner entrants'),
    ]);
    res.json({
      next: t ? summary(t, req.user?.userId) : null,
      past: past.map(p => ({ slug: p.slug, name: p.name, startsAt: p.startsAt, state: p.state, winner: p.winner || null, entrants: p.entrants.length })),
    });
  } catch (error) {
    console.error('Tournaments error:', error);
    res.status(500).json({ error: 'Failed to load tournaments' });
  }
});

router.get('/tournaments/:slug', optionalAuth, async (req, res) => {
  try {
    const t = await Tournament.findOne({ slug: slugOf(req.params.slug) });
    if (!t) return res.status(404).json({ error: 'Tournament not found' });
    const names = new Map(t.entrants.map(e => [String(e.userId), e.username]));
    const named = (ids) => (ids || []).map(id => ({ userId: String(id), username: names.get(String(id)) || '?' }));
    res.json({
      ...summary(t, req.user?.userId),
      entrantList: t.entrants.map(e => ({ userId: String(e.userId), username: e.username, registeredAt: e.registeredAt })),
      heatList: t.heats.map(h => ({
        roomCode: h.roomCode,
        state: h.state,
        players: named(h.players),
        winner: h.winner ? { userId: h.winner, username: names.get(String(h.winner)) || '?' } : null,
        placements: h.placements || [],
      })),
      final: t.final ? { roomCode: t.final.roomCode, players: named(t.final.players), placements: t.final.placements || [] } : null,
      finishedAt: t.finishedAt || null,
      cancelReason: t.cancelReason || null,
    });
  } catch (error) {
    console.error('Tournament error:', error);
    res.status(500).json({ error: 'Failed to load the tournament' });
  }
});

router.post('/tournaments/:slug/register', authenticateToken, async (req, res) => {
  try {
    const slug = slugOf(req.params.slug);
    const userId = String(req.user.userId);
    const existing = await Tournament.findOne({ slug });
    if (!existing) return res.status(404).json({ error: 'Tournament not found' });
    if (existing.state !== 'open') return res.status(400).json({ error: 'Registration is closed' });
    if (existing.entrants.some(e => String(e.userId) === userId)) {
      return res.json({ registered: true, entrants: existing.entrants.length, progression: null });
    }
    const t = await Tournament.findOneAndUpdate(
      { slug, state: 'open', 'entrants.userId': { $ne: userId } },
      { $push: { entrants: { userId, username: req.user.username, registeredAt: new Date() } } },
      { new: true },
    );
    if (!t) return res.status(400).json({ error: 'Registration is closed' });
    const progression = await grant(userId, { xp: 30, event: { type: 'tournament', entered: true } }).catch(() => null);
    void logActivity(userId, req.user.username, 'tournament', { slug: t.slug, name: t.name, action: 'registered' });
    res.status(201).json({ registered: true, entrants: t.entrants.length, progression });
  } catch (error) {
    console.error('Tournament register error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

router.delete('/tournaments/:slug/register', authenticateToken, async (req, res) => {
  try {
    const slug = slugOf(req.params.slug);
    const userId = String(req.user.userId);
    const t = await Tournament.findOneAndUpdate(
      { slug, state: 'open' },
      { $pull: { entrants: { userId } } },
      { new: true },
    );
    if (!t) return res.status(400).json({ error: 'Registration is closed' });
    res.json({ registered: false, entrants: t.entrants.length });
  } catch (error) {
    console.error('Tournament withdraw error:', error);
    res.status(500).json({ error: 'Failed to withdraw' });
  }
});

// ---------------------------------------------------------------- ratings
router.get('/ratings/top', optionalAuth, async (req, res) => {
  try {
    const me = req.user ? String(req.user.userId) : null;
    const users = await User.find({ ratingGames: { $gte: 1 } })
      .sort({ rating: -1, ratingGames: -1, username: 1 })
      .limit(50)
      .select('username rating ratingGames duelWins duelLosses');
    res.json({
      rows: users.map((u, i) => ({
        rank: i + 1,
        username: u.username,
        rating: u.rating,
        tier: tierOf(u.rating),
        games: u.ratingGames || 0,
        wins: u.duelWins || 0,
        losses: u.duelLosses || 0,
        me: !!me && String(u._id) === me,
      })),
    });
  } catch (error) {
    console.error('Ratings top error:', error);
    res.status(500).json({ error: 'Failed to load the ladder' });
  }
});

router.get('/ratings/me', authenticateToken, async (req, res) => {
  try {
    const me = String(req.user.userId);
    const user = await User.findById(me).select('username rating ratingGames duelWins duelLosses');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const games = user.ratingGames || 0;
    const rank = games >= 1
      ? 1 + await User.countDocuments({ ratingGames: { $gte: 1 }, rating: { $gt: user.rating } })
      : null;
    const matches = await MatchResult.find({ mode: 'duel', 'players.userId': me }).sort({ createdAt: -1 }).limit(10);
    const recent = matches.map(m => {
      const opp = (m.players || []).find(p => String(p.userId) !== me);
      const r = m.results || {};
      return {
        opponent: opp?.name || '?',
        won: String(r.winner?.userId || '') === me,
        delta: Number(r.ratingDelta?.[me]) || 0,
        rated: !!r.rated,
        score: r.score || {},
        at: m.createdAt,
      };
    });
    res.json({
      rating: user.rating,
      tier: tierOf(user.rating),
      games,
      wins: user.duelWins || 0,
      losses: user.duelLosses || 0,
      rank,
      recent,
    });
  } catch (error) {
    console.error('Ratings me error:', error);
    res.status(500).json({ error: 'Failed to load your rating' });
  }
});

export default router;
