import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../auth.js';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';
import { getVapidPublicKey, sendPushToUser } from '../notify.js';

const router = express.Router();

const testLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Test pushes are limited to 3 per 15 minutes.' },
});

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

async function prefsFor(userId) {
  const user = await User.findById(userId).select('email notify isGuest').lean();
  if (!user) return null;
  const subscriptions = await PushSubscription.countDocuments({ userId: String(userId) });
  return {
    email: !!user.notify?.email,
    push: user.notify?.push !== false,
    hasEmail: !!user.email,
    isGuest: !!user.isGuest,
    subscriptions,
    lastReminderDay: user.notify?.lastReminderDay || null,
  };
}

// Public VAPID key for pushManager.subscribe
router.get('/push/key', (_req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// Save (or refresh) this browser's push subscription
router.post('/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const sub = req.body?.subscription;
    const endpoint = str(sub?.endpoint, 2000);
    const p256dh = str(sub?.keys?.p256dh, 500);
    const auth = str(sub?.keys?.auth, 500);
    if (!/^https:\/\/.+/.test(endpoint) || !p256dh || !auth) {
      return res.status(400).json({ error: 'Invalid push subscription' });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { $set: { userId: String(req.user.userId), keys: { p256dh, auth }, userAgent: str(req.headers['user-agent'], 300) }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true },
    );
    await User.updateOne({ _id: req.user.userId }, { $set: { 'notify.push': true } });
    res.status(201).json({ ok: true, prefs: await prefsFor(req.user.userId) });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Drop this browser's subscription
router.delete('/push/subscribe', authenticateToken, async (req, res) => {
  try {
    const endpoint = str(req.body?.endpoint, 2000);
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    await PushSubscription.deleteOne({ endpoint, userId: String(req.user.userId) });
    res.json({ ok: true, prefs: await prefsFor(req.user.userId) });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

router.get('/notify/prefs', authenticateToken, async (req, res) => {
  try {
    const prefs = await prefsFor(req.user.userId);
    if (!prefs) return res.status(404).json({ error: 'User not found' });
    res.json(prefs);
  } catch (error) {
    console.error('Notify prefs error:', error);
    res.status(500).json({ error: 'Failed to load preferences' });
  }
});

// { email?: bool, push?: bool } - email reminders need an email on the account
router.post('/notify/prefs', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { email, push } = req.body || {};
    if (email != null) {
      if (email && !user.email) return res.status(400).json({ error: 'Add an email to your account to get email reminders' });
      user.notify.email = !!email;
    }
    if (push != null) user.notify.push = !!push;
    await user.save();
    res.json(await prefsFor(user._id));
  } catch (error) {
    console.error('Notify prefs update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Fire a test push at the caller's own subscriptions
router.post('/push/test', testLimiter, authenticateToken, async (req, res) => {
  try {
    const r = await sendPushToUser(req.user.userId, {
      title: '🧟 Typocalypse',
      body: 'Push notifications are working. Your streak reminders will land here.',
      url: '/dashboard',
      tag: 'test',
    });
    res.json({ sent: r.sent, pruned: r.pruned });
  } catch (error) {
    console.error('Push test error:', error);
    res.status(500).json({ error: 'Failed to send test push' });
  }
});

export default router;
