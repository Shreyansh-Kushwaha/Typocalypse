import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken, optionalAuth } from '../auth.js';
import Follow from '../models/Follow.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import StatsSession from '../models/StatsSession.js';
import { grant, levelProgress } from '../progression.js';
import { logActivity } from '../activity.js';

// Follow graph + activity feed. Mounted at the app root, so every path here
// is absolute (/social/..., /feed).
const router = express.Router();

const LIST_CAP = 100;
const FEED_SIZE = 60;
const GLOBAL_FEED_SIZE = 30;
const SUGGESTED = 8;

const cleanName = (s) => String(s || '').trim().slice(0, 50);
const validIds = (ids) => ids.filter(id => mongoose.isValidObjectId(id));

async function counts(userId) {
  const [followers, following] = await Promise.all([
    Follow.countDocuments({ followingId: userId }),
    Follow.countDocuments({ followerId: userId }),
  ]);
  return { followers, following };
}

// ids -> [{ username, level, title }] preserving the input order
async function userRows(ids) {
  if (!ids.length) return [];
  const users = await User.find({ _id: { $in: validIds(ids) } }).select('username xp cosmetics');
  const byId = new Map(users.map(u => [String(u._id), u]));
  return ids.map(id => byId.get(id)).filter(Boolean).map(u => ({
    username: u.username,
    level: levelProgress(u.xp || 0).level,
    title: u.cosmetics?.title || '',
  }));
}

const shapeActivity = (me) => (a) => ({
  id: String(a._id),
  username: a.username,
  type: a.type,
  data: a.data || {},
  at: a.createdAt,
  me: !!me && a.userId === me,
});

// ---- follow / unfollow ----
router.post('/social/follow/:username', authenticateToken, async (req, res) => {
  try {
    const me = req.user.userId;
    const them = await User.findOne({ username: cleanName(req.params.username) }).select('_id username');
    if (!them) return res.status(404).json({ error: 'Typist not found' });
    const themId = String(them._id);
    if (themId === me) return res.status(400).json({ error: 'You cannot follow yourself' });

    let created = false;
    try {
      await Follow.create({ followerId: me, followingId: themId });
      created = true;
    } catch (err) {
      if (err.code !== 11000) throw err; // duplicate edge = already following, idempotent
    }

    const [mine, theirs] = await Promise.all([counts(me), counts(themId)]);
    let progression = null;
    if (created) {
      // socialite (follow 5) for me, popular (10 followers) for them
      progression = await grant(me, { xp: 0, event: { type: 'follow', following: mine.following } }).catch(() => null);
      await grant(themId, { xp: 0, event: { type: 'follow', followers: theirs.followers } }).catch(() => null);
      void logActivity(me, req.user.username, 'follow', { username: them.username });
    }
    res.json({ following: true, counts: theirs, mine, progression });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to follow' });
  }
});

router.delete('/social/follow/:username', authenticateToken, async (req, res) => {
  try {
    const me = req.user.userId;
    const them = await User.findOne({ username: cleanName(req.params.username) }).select('_id');
    if (!them) return res.status(404).json({ error: 'Typist not found' });
    const themId = String(them._id);
    const removed = await Follow.deleteOne({ followerId: me, followingId: themId });
    const [mine, theirs] = await Promise.all([counts(me), counts(themId)]);
    if (removed.deletedCount) {
      await Promise.all([
        grant(me, { xp: 0, event: { type: 'follow', following: mine.following } }).catch(() => null),
        grant(themId, { xp: 0, event: { type: 'follow', followers: theirs.followers } }).catch(() => null),
      ]);
    }
    res.json({ following: false, counts: theirs, mine });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Failed to unfollow' });
  }
});

// ---- quick self check ----
router.get('/social/me', authenticateToken, async (req, res) => {
  try {
    const me = req.user.userId;
    const [edges, followers] = await Promise.all([
      Follow.find({ followerId: me }).select('followingId'),
      Follow.countDocuments({ followingId: me }),
    ]);
    const users = await User.find({ _id: { $in: validIds(edges.map(e => e.followingId)) } }).select('username');
    res.json({ following: users.map(u => u.username), followers });
  } catch (error) {
    console.error('Social me error:', error);
    res.status(500).json({ error: 'Failed to load social state' });
  }
});

// ---- who to follow: best clean WPM this week among people I do not follow ----
router.get('/social/suggested', authenticateToken, async (req, res) => {
  try {
    const me = req.user.userId;
    const edges = await Follow.find({ followerId: me }).select('followingId');
    const exclude = [me, ...edges.map(e => e.followingId)];
    const top = async (extraMatch) => StatsSession.aggregate([
      { $match: { accuracy: { $gte: 80 }, userId: { $nin: exclude }, ...extraMatch } },
      { $group: { _id: '$userId', bestWpm: { $max: '$wpm' } } },
      { $sort: { bestWpm: -1, _id: 1 } },
      { $limit: SUGGESTED },
    ]);
    let rows = await top({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } });
    if (rows.length < SUGGESTED) {
      // quiet week: pad with all-time bests so the panel is never empty
      const seen = new Set(rows.map(r => r._id));
      const more = await top({});
      for (const r of more) if (!seen.has(r._id) && rows.length < SUGGESTED) rows.push(r);
    }
    const users = await User.find({ _id: { $in: validIds(rows.map(r => r._id)) } }).select('username xp cosmetics');
    const byId = new Map(users.map(u => [String(u._id), u]));
    res.json({
      rows: rows.map(r => {
        const u = byId.get(r._id);
        return u ? { username: u.username, bestWpm: r.bestWpm, level: levelProgress(u.xp || 0).level, title: u.cosmetics?.title || '' } : null;
      }).filter(Boolean),
    });
  } catch (error) {
    console.error('Suggested error:', error);
    res.status(500).json({ error: 'Failed to load suggestions' });
  }
});

// ---- public follower / following lists ----
async function listFor(req, res, direction) {
  try {
    const user = await User.findOne({ username: cleanName(req.params.username) }).select('_id');
    if (!user) return res.status(404).json({ error: 'Typist not found' });
    const userId = String(user._id);
    const edges = direction === 'followers'
      ? await Follow.find({ followingId: userId }).sort({ createdAt: -1 }).limit(LIST_CAP).select('followerId')
      : await Follow.find({ followerId: userId }).sort({ createdAt: -1 }).limit(LIST_CAP).select('followingId');
    const ids = edges.map(e => direction === 'followers' ? e.followerId : e.followingId);
    res.json({ rows: await userRows(ids) });
  } catch (error) {
    console.error('Follow list error:', error);
    res.status(500).json({ error: 'Failed to load list' });
  }
}
router.get('/social/:username/followers', (req, res) => listFor(req, res, 'followers'));
router.get('/social/:username/following', (req, res) => listFor(req, res, 'following'));

// ---- feeds ----
// Everyone: the empty-state feed ("nobody followed yet - here is the world")
router.get('/feed/global', optionalAuth, async (req, res) => {
  try {
    const rows = await Activity.find({}).sort({ createdAt: -1 }).limit(GLOBAL_FEED_SIZE);
    res.json({ rows: rows.map(shapeActivity(req.user?.userId)) });
  } catch (error) {
    console.error('Global feed error:', error);
    res.status(500).json({ error: 'Failed to load feed' });
  }
});

// Me + everyone I follow, newest first
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const me = req.user.userId;
    const edges = await Follow.find({ followerId: me }).select('followingId');
    const ids = [me, ...edges.map(e => e.followingId)];
    const rows = await Activity.find({ userId: { $in: ids } }).sort({ createdAt: -1 }).limit(FEED_SIZE);
    res.json({ rows: rows.map(shapeActivity(me)), following: edges.length });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to load feed' });
  }
});

export default router;
