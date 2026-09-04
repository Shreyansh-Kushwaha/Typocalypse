import express from 'express';
import { authenticateToken, optionalAuth } from '../auth.js';
import User from '../models/User.js';
import { grant } from '../progression.js';
import { logActivity } from '../activity.js';
import {
  ZONES, NODES, MAX_STARS, TIMEBOMB_GRACE_MS,
  nodeById, nextNode, timeLimitMs, starsFor, normalizeProgress, isUnlocked,
  zonesCleared, zoneCleared, allThreeStars, totalStars, nodeSummary, starsOf,
} from '../campaign.js';

const router = express.Router();
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));

async function loadProgress(userId) {
  if (!userId) return normalizeProgress({});
  const user = await User.findById(userId).select('campaign');
  return normalizeProgress(user?.campaign);
}

// ---- the map (public; progress attached when logged in) ----
router.get('/campaign', optionalAuth, async (req, res, next) => {
  // Browser navigations want the app page, not JSON
  if (req.accepts(['html', 'json']) === 'html') return next();
  try {
    const progress = await loadProgress(req.user?.userId);
    res.json({
      zones: ZONES.map(z => ({
        id: z.id,
        name: z.name,
        blurb: z.blurb,
        cleared: zoneCleared(z.id, progress),
        nodes: NODES.filter(n => n.zone === z.id).map(n => nodeSummary(n, progress)),
      })),
      progress: {
        stars: progress.stars,
        cleared: progress.cleared,
        totalStars: totalStars(progress),
        maxStars: MAX_STARS,
      },
      zonesCleared: zonesCleared(progress),
      allStars: allThreeStars(progress),
    });
  } catch (error) {
    console.error('Campaign map error:', error);
    res.status(500).json({ error: 'Failed to load the campaign' });
  }
});

// A browser navigating to /campaign/:nodeId wants the app, not JSON. This has
// to run BEFORE authenticateToken, or a shared node link 401s for anyone who
// is not signed in instead of loading the page.
const htmlFallthrough = (req, res, next) => {
  if (req.accepts(['html', 'json']) === 'html') return next('route');
  next();
};

// ---- one node with its passage (locked -> 403) ----
router.get('/campaign/:nodeId', htmlFallthrough, authenticateToken, async (req, res, next) => {
  try {
    const node = nodeById(req.params.nodeId);
    if (!node) return res.status(404).json({ error: 'No such node' });
    const progress = await loadProgress(req.user.userId);
    if (!isUnlocked(node, progress)) return res.status(403).json({ error: 'This node is locked. Clear the previous one first.' });
    const nxt = nextNode(node);
    const zone = ZONES.find(z => z.id === node.zone);
    res.json({
      ...nodeSummary(node, progress),
      zoneName: zone.name,
      text: node.text,
      timeLimitMs: timeLimitMs(node),
      best: starsOf(progress, node.id),
      next: nxt ? { id: nxt.id, name: nxt.name, unlocked: isUnlocked(nxt, progress) } : null,
    });
  } catch (error) {
    console.error('Campaign node error:', error);
    res.status(500).json({ error: 'Failed to load the node' });
  }
});

// ---- record a finished run; stars are computed server-side ----
router.post('/campaign/:nodeId/clear', authenticateToken, async (req, res) => {
  try {
    const node = nodeById(req.params.nodeId);
    if (!node) return res.status(404).json({ error: 'No such node' });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const progress = normalizeProgress(user.campaign);
    if (!isUnlocked(node, progress)) return res.status(403).json({ error: 'This node is locked. Clear the previous one first.' });

    const errors = clamp(req.body.errors, 0, 100000);
    const durationMs = clamp(req.body.durationMs, 0, 3600000);
    const len = node.text.length;
    if (durationMs < len * 15) return res.status(400).json({ error: 'Implausible result' });
    if ((len / 5) / (durationMs / 60000) >= 320) return res.status(400).json({ error: 'Implausible result' });
    const limit = timeLimitMs(node);
    if (limit != null && durationMs > limit + TIMEBOMB_GRACE_MS) {
      return res.status(400).json({ error: 'Out of time. No stars this run - try again.' });
    }
    // Recompute from what we know rather than trusting the client's numbers
    const wpm = Math.min(300, Math.round((len / 5) / (durationMs / 60000)));
    const accuracy = Math.round((len / (len + errors)) * 100);

    const stars = starsFor(node, { wpm, accuracy, durationMs });
    const prevBest = starsOf(progress, node.id);
    const isFirstClear = prevBest === 0 && stars >= 1;
    const best = Math.max(prevBest, stars);
    const zonesBefore = zonesCleared(progress);

    progress.stars[node.id] = best;
    if (stars >= 1 && !progress.cleared.includes(node.id)) progress.cleared.push(node.id);
    user.campaign = progress;
    user.markModified('campaign');
    await user.save();

    const zonesNow = zonesCleared(progress);
    const allStars = allThreeStars(progress);
    const progression = await grant(req.user.userId, {
      xp: 30 * stars + (isFirstClear ? 20 : 0),
      event: { type: 'campaign', zonesCleared: zonesNow, allStars },
    }).catch(() => null);

    const nxt = nextNode(node);
    const unlockedNext = nxt && isUnlocked(nxt, progress) ? nxt.id : null;
    const zoneJustCleared = zonesNow > zonesBefore;
    if ((node.boss && isFirstClear) || (stars === 3 && prevBest < 3)) {
      void logActivity(req.user.userId, req.user.username, 'campaign', { nodeId: node.id, name: node.name, stars, zone: node.zone, boss: node.boss });
    }

    res.json({
      stars,
      best,
      newStars: stars > prevBest,
      unlockedNext,
      zoneCleared: zoneJustCleared,
      wpm,
      accuracy,
      progression,
    });
  } catch (error) {
    console.error('Campaign clear error:', error);
    res.status(500).json({ error: 'Failed to record your run' });
  }
});

export default router;
