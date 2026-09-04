import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken, optionalAuth } from '../auth.js';
import Story, { STORY_GENRES } from '../models/Story.js';
import Game from '../models/Game.js';
import { grant } from '../progression.js';
import { logActivity } from '../activity.js';

// The story library. Mounted at the app root - every path is absolute.
//
// Publish contract (POST /stories, auth):
//   { source: 'solo',  gameId, title }                                   -> from a solo game's history
//   { source: 'relay', title, genre, passages: [{ text, by, choice? }] } -> from a Relay Chronicles room
// Response: 201 { id, progression }
const router = express.Router();

const PAGE = 20;
const MAX_PER_DAY = 20;
const RELAY_MIN = 2, RELAY_MAX = 12;
const PASSAGE_MIN = 20, PASSAGE_MAX = 1200;
const SOLO_MAX_PASSAGES = 30;
const SOLO_PASSAGE_MAX = 2000;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));
// plain text only: drop control characters, fold every whitespace run to one space
const cleanText = (s, max) => String(s ?? '')
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);
const words = (s) => s.split(' ').filter(Boolean).length;
const isId = (id) => mongoose.isValidObjectId(id);

const summary = (s, me) => ({
  id: String(s._id),
  title: s.title,
  authorName: s.authorName,
  genre: s.genre,
  source: s.source,
  likes: s.likes || 0,
  plays: s.plays || 0,
  wordCount: s.wordCount || 0,
  passages: Array.isArray(s.passages) ? s.passages.length : (s.passages || 0),
  preview: s.preview ?? (s.passages?.[0]?.text || '').slice(0, 120),
  createdAt: s.createdAt,
  liked: typeof s.liked === 'boolean' ? s.liked : (!!me && (s.likedBy || []).includes(me)),
  isMine: !!me && s.authorId === me,
});

// ---- publish ----
router.post('/stories', authenticateToken, async (req, res) => {
  try {
    const me = req.user.userId;
    const body = req.body || {};
    const source = body.source === 'relay' ? 'relay' : 'solo';
    const title = cleanText(body.title, 80);
    if (title.length < 3) return res.status(400).json({ error: 'Title must be 3-80 characters' });

    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const today = await Story.countDocuments({ authorId: me, createdAt: { $gte: since } });
    if (today >= MAX_PER_DAY) return res.status(429).json({ error: `You can publish ${MAX_PER_DAY} stories a day. Come back tomorrow.` });

    let passages, genre, game = null;
    if (source === 'solo') {
      if (!isId(body.gameId)) return res.status(400).json({ error: 'gameId required' });
      game = await Game.findOne({ _id: body.gameId, userId: me });
      if (!game) return res.status(404).json({ error: 'Game not found' });
      if (game.publishedStoryId) return res.status(409).json({ error: 'This run is already in the library', id: game.publishedStoryId });
      const history = (game.history || [])
        .map(h => ({ text: cleanText(h?.text, SOLO_PASSAGE_MAX), by: req.user.username, choice: cleanText(h?.choice, 120) }))
        .filter(h => h.text.length > 0);
      if (history.length < 2) return res.status(400).json({ error: 'Play at least two passages before publishing' });
      passages = history.slice(0, SOLO_MAX_PASSAGES);
      passages[passages.length - 1].choice = '';
      genre = STORY_GENRES.includes(game.genre) ? game.genre : 'custom';
    } else {
      genre = STORY_GENRES.includes(body.genre) ? body.genre : 'custom';
      const raw = Array.isArray(body.passages) ? body.passages : [];
      if (raw.length < RELAY_MIN || raw.length > RELAY_MAX) {
        return res.status(400).json({ error: `A chronicle needs ${RELAY_MIN}-${RELAY_MAX} passages` });
      }
      passages = [];
      for (const p of raw) {
        const text = cleanText(p?.text, PASSAGE_MAX + 1);
        if (text.length < PASSAGE_MIN || text.length > PASSAGE_MAX) {
          return res.status(400).json({ error: `Each passage must be ${PASSAGE_MIN}-${PASSAGE_MAX} characters` });
        }
        passages.push({ text, by: cleanText(p?.by, 50), choice: cleanText(p?.choice, 120) });
      }
    }

    const wordCount = passages.reduce((a, p) => a + words(p.text), 0);
    const story = await Story.create({ authorId: me, authorName: req.user.username, title, genre, source, passages, wordCount });
    if (game) {
      game.publishedStoryId = String(story._id);
      await game.save();
    }
    const progression = await grant(me, { xp: 40, event: { type: 'story', published: true } }).catch(() => null);
    void logActivity(me, req.user.username, 'story_published', { storyId: String(story._id), title, genre });
    res.status(201).json({ id: String(story._id), progression });
  } catch (error) {
    console.error('Publish story error:', error);
    res.status(500).json({ error: 'Failed to publish story' });
  }
});

// ---- my shelf: published stories + solo runs that could be published ----
router.get('/stories/mine', authenticateToken, async (req, res) => {
  try {
    const me = req.user.userId;
    const [stories, games] = await Promise.all([
      Story.find({ authorId: me }).sort({ createdAt: -1 }).limit(100),
      Game.find({ userId: me, publishedStoryId: { $in: [null, ''] }, 'history.1': { $exists: true } })
        .sort({ updatedAt: -1 }).limit(50).select('genre history updatedAt'),
    ]);
    res.json({
      stories: stories.map(s => summary(s, me)),
      publishable: games.map(g => ({
        gameId: String(g._id),
        genre: g.genre,
        passages: g.history.length,
        preview: (g.history[0]?.text || '').slice(0, 120),
        updatedAt: g.updatedAt,
      })),
    });
  } catch (error) {
    console.error('My stories error:', error);
    res.status(500).json({ error: 'Failed to load your stories' });
  }
});

// ---- browse ----
router.get('/stories', optionalAuth, async (req, res) => {
  try {
    const me = req.user?.userId || null;
    const sortKey = ['new', 'top', 'played'].includes(req.query.sort) ? req.query.sort : 'new';
    const sort = { new: { createdAt: -1, _id: -1 }, top: { likes: -1, createdAt: -1, _id: -1 }, played: { plays: -1, createdAt: -1, _id: -1 } }[sortKey];
    const page = clamp(req.query.page, 0, 10000);
    const match = {};
    if (typeof req.query.genre === 'string' && STORY_GENRES.includes(req.query.genre)) match.genre = req.query.genre;
    const docs = await Story.aggregate([
      { $match: match },
      { $sort: sort },
      { $skip: page * PAGE },
      { $limit: PAGE + 1 },
      { $project: {
        title: 1, authorName: 1, authorId: 1, genre: 1, source: 1, likes: 1, plays: 1, wordCount: 1, createdAt: 1,
        passages: { $size: { $ifNull: ['$passages', []] } },
        preview: { $substrCP: [{ $ifNull: [{ $arrayElemAt: ['$passages.text', 0] }, ''] }, 0, 120] },
        liked: me ? { $in: [me, { $ifNull: ['$likedBy', []] }] } : { $literal: false },
      } },
    ]);
    const hasMore = docs.length > PAGE;
    res.json({ sort: sortKey, genre: match.genre || '', page, rows: docs.slice(0, PAGE).map(s => summary(s, me)), hasMore });
  } catch (error) {
    console.error('List stories error:', error);
    res.status(500).json({ error: 'Failed to load the library' });
  }
});

// ---- read ----
router.get('/stories/:id', optionalAuth, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ error: 'Story not found' });
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    const me = req.user?.userId || null;
    res.json({
      ...summary(story, me),
      passages: story.passages.map(p => ({ text: p.text, by: p.by || '', choice: p.choice || '' })),
    });
  } catch (error) {
    console.error('Read story error:', error);
    res.status(500).json({ error: 'Failed to load story' });
  }
});

// ---- like toggle ----
router.post('/stories/:id/like', authenticateToken, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ error: 'Story not found' });
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    const me = req.user.userId;
    const had = story.likedBy.includes(me);
    if (had) story.likedBy = story.likedBy.filter(id => id !== me);
    else story.likedBy.push(me);
    story.likes = story.likedBy.length;
    // author XP once per distinct liker, never for self-likes - toggling cannot farm it
    const rewardAuthor = !had && me !== story.authorId && !story.likedEver.includes(me);
    if (rewardAuthor) story.likedEver.push(me);
    await story.save();
    if (rewardAuthor) {
      await grant(story.authorId, { xp: 5, event: { type: 'story', likes: story.likes } }).catch(() => null);
    }
    res.json({ liked: !had, likes: story.likes });
  } catch (error) {
    console.error('Like story error:', error);
    res.status(500).json({ error: 'Failed to like story' });
  }
});

// ---- play counter (once per read-through, when the reader starts typing) ----
router.post('/stories/:id/play', optionalAuth, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ error: 'Story not found' });
    const story = await Story.findByIdAndUpdate(req.params.id, { $inc: { plays: 1 } }, { new: true }).select('plays');
    if (!story) return res.status(404).json({ error: 'Story not found' });
    res.json({ plays: story.plays });
  } catch (error) {
    console.error('Play story error:', error);
    res.status(500).json({ error: 'Failed to count play' });
  }
});

// ---- delete (author only) ----
router.delete('/stories/:id', authenticateToken, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ error: 'Story not found' });
    const story = await Story.findById(req.params.id).select('authorId');
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (story.authorId !== req.user.userId) return res.status(403).json({ error: 'Only the author can delete this story' });
    await Story.deleteOne({ _id: story._id });
    // the solo run becomes publishable again
    await Game.updateMany({ publishedStoryId: String(story._id) }, { $unset: { publishedStoryId: 1 } }).catch(() => {});
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

export default router;
