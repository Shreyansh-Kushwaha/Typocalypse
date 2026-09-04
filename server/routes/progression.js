import express from 'express';
import { authenticateToken, optionalAuth } from '../auth.js';
import User from '../models/User.js';
import SeasonAward from '../models/SeasonAward.js';
import { progressionView, THEMES, CARETS, SOUND_PACKS, isUnlocked, ACHIEVEMENTS, levelProgress } from '../progression.js';
import { currentSeason, seasonStandings, previousSeasonId } from '../seasons.js';

const router = express.Router();

// Everything the progression page needs: level, xp bar, achievements, locker
router.get('/progression/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(progressionView(user));
  } catch (error) {
    console.error('Progression error:', error);
    res.status(500).json({ error: 'Failed to load progression' });
  }
});

// Equip a cosmetic (theme / caret / sound / title). Locked items are rejected.
router.post('/progression/equip', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { theme, caret, sound, title } = req.body || {};
    const pickFrom = (list, key, kind) => {
      if (key == null) return null;
      const item = list.find(i => i.key === key);
      if (!item) return { error: `Unknown ${kind}` };
      if (!isUnlocked(item, user)) return { error: `${item.name} is still locked` };
      return { key };
    };
    for (const [kind, list, key] of [['theme', THEMES, theme], ['caret', CARETS, caret], ['sound', SOUND_PACKS, sound]]) {
      const r = pickFrom(list, key, kind);
      if (r?.error) return res.status(400).json({ error: r.error });
      if (r) user.cosmetics[kind] = r.key;
    }
    if (title != null) {
      const allowed = title === '' || (user.seasonTitles || []).some(t => t.title === title)
        || ACHIEVEMENTS.some(a => a.name === title && (user.achievements || []).some(x => x.key === a.key));
      if (!allowed) return res.status(400).json({ error: 'That title is not yours' });
      user.cosmetics.title = String(title).slice(0, 40);
    }
    await user.save();
    res.json({ equipped: user.cosmetics });
  } catch (error) {
    console.error('Equip error:', error);
    res.status(500).json({ error: 'Failed to equip' });
  }
});

// Public catalog (for the settings panel before login and for previews)
router.get('/progression/catalog', (_req, res) => {
  const strip = (list) => list.map(({ check, ...rest }) => rest);
  res.json({ themes: THEMES, carets: CARETS, sounds: SOUND_PACKS, achievements: strip(ACHIEVEMENTS) });
});

// Current season + my rank + last season's podium
router.get('/seasons/current', optionalAuth, async (req, res) => {
  try {
    const season = currentSeason();
    const rows = await seasonStandings(season.id, 100);
    const me = req.user ? rows.findIndex(r => r._id === req.user.userId) : -1;
    const last = await SeasonAward.find({ season: previousSeasonId(season.id), rank: { $gte: 1, $lte: 3 } }).sort({ rank: 1 }).select('username rank title bestWpm');
    res.json({
      ...season,
      players: rows.length,
      myRank: me >= 0 ? me + 1 : null,
      lastSeason: last.map(a => ({ username: a.username, rank: a.rank, title: a.title, bestWpm: a.bestWpm })),
    });
  } catch (error) {
    console.error('Season error:', error);
    res.status(500).json({ error: 'Failed to load season' });
  }
});

// Someone's level for badges elsewhere
router.get('/users/:username/level', async (req, res) => {
  const user = await User.findOne({ username: String(req.params.username || '').slice(0, 50) }).select('xp cosmetics seasonTitles');
  if (!user) return res.status(404).json({ error: 'Typist not found' });
  res.json({ ...levelProgress(user.xp || 0), title: user.cosmetics?.title || '', seasonTitles: user.seasonTitles || [] });
});

export default router;
