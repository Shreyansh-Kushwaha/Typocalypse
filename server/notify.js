// Streak reminders over Web Push and email.
//
//   sendPushToUser(userId, { title, body, url, tag })  -> { sent, pruned }
//   sendEmail(to, subject, text)                        -> boolean
//   startReminderJob()                                  -> every 15 min, see below
//   remindNow(userId)                                   -> force one reminder (testing)
//
// VAPID keys come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT.
// Without them a keypair is generated per boot (dev only): browsers subscribed
// against the old key stop receiving pushes after a restart.
//
// Email needs SMTP_URL (a nodemailer connection URL) and MAIL_FROM; otherwise
// sendEmail is a no-op that logs what it would have sent.

import webpush from 'web-push';
import nodemailer from 'nodemailer';
import User from './models/User.js';
import PushSubscription from './models/PushSubscription.js';

// ---------------------------------------------------------------- VAPID
let publicKey = process.env.VAPID_PUBLIC_KEY || '';
let privateKey = process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@typocalypse.app';

if (!publicKey || !privateKey) {
  const pair = webpush.generateVAPIDKeys();
  publicKey = pair.publicKey;
  privateKey = pair.privateKey;
  console.warn('⚠ VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set - generated a per-boot keypair (dev only). Push subscriptions will NOT survive a restart. Generate keys with: npx web-push generate-vapid-keys');
}
webpush.setVapidDetails(subject, publicKey, privateKey);

export function getVapidPublicKey() {
  return publicKey;
}

// ---------------------------------------------------------------- email
let transport = null;
const mailFrom = process.env.MAIL_FROM || '';
if (process.env.SMTP_URL && mailFrom) {
  try {
    transport = nodemailer.createTransport(process.env.SMTP_URL);
    console.log('📧 Email reminders enabled via SMTP_URL');
  } catch (err) {
    console.error('Email transport setup failed:', err.message);
    transport = null;
  }
} else {
  console.log('📧 SMTP_URL/MAIL_FROM not set - email reminders are logged, not sent');
}

export async function sendEmail(to, subject, text) {
  if (!to) return false;
  if (!transport) {
    console.log(`[email noop] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    await transport.sendMail({ from: mailFrom, to, subject, text });
    return true;
  } catch (err) {
    console.error('sendEmail failed:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------- push
// A subscription is dead when the push service says it is gone (404/410),
// its host does not resolve, or web-push refuses the stored keys/endpoint
// outright (malformed - it can never be delivered to).
function isDeadSubscription(err) {
  const status = err?.statusCode;
  if (status === 404 || status === 410) return true;
  if (err?.code === 'ENOTFOUND' || err?.code === 'EAI_AGAIN') return true;
  if (status == null && /should be \d+ bytes long|must be a string|is not a valid URL|Unsupported|not a valid|invalid/i.test(String(err?.message || ''))) return true;
  return false;
}
export async function sendPushToUser(userId, { title, body, url = '/dashboard', tag = 'typocalypse' } = {}) {
  const subs = await PushSubscription.find({ userId: String(userId) }).lean();
  let sent = 0;
  let pruned = 0;
  const payload = JSON.stringify({ title: String(title || 'Typocalypse'), body: String(body || ''), url: String(url), tag: String(tag) });
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 60 * 60 * 12 });
      sent += 1;
    } catch (err) {
      if (isDeadSubscription(err)) {
        await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        pruned += 1;
      } else {
        // 5xx / rate limits from the push service are transient - keep the row.
        console.warn('push failed:', err?.statusCode || err?.code || err?.message);
      }
    }
  }));
  return { sent, pruned };
}

// ---------------------------------------------------------------- reminders
const DAY_MS = 24 * 60 * 60 * 1000;
const utcDay = (offset = 0) => new Date(Date.now() - offset * DAY_MS).toISOString().slice(0, 10);

// Reminders go out once the UTC clock passes 16:00. Streaks reset at midnight
// UTC, so that leaves an 8 hour window; 16:00 UTC is 9am on the US west
// coast, noon on the east coast, 5pm in London and 9:30pm in India - daytime
// or evening for most of the player base rather than a 3am buzz.
const REMIND_AFTER_UTC_HOUR = 16;

async function remindUser(u, today) {
  const n = u.currentStreak || 0;
  const title = '🔥 Streak at risk';
  const body = `Your ${n} day streak dies at midnight UTC — one passage keeps it alive.`;
  let push = 0;
  let email = false;
  if (u.notify?.push !== false) {
    const r = await sendPushToUser(u._id, { title, body, url: '/daily', tag: 'streak' }).catch(() => ({ sent: 0 }));
    push = r.sent;
  }
  if (u.notify?.email && u.email) {
    email = await sendEmail(u.email, `${title} — ${n} days`, `${body}\n\nType today's passage: /daily`);
  }
  await User.updateOne({ _id: u._id }, { $set: { 'notify.lastReminderDay': today } });
  return { push, email };
}

export async function runReminders() {
  if (new Date().getUTCHours() < REMIND_AFTER_UTC_HOUR) return { checked: 0, reminded: 0 };
  const today = utcDay(0);
  const yesterday = utcDay(1);
  const users = await User.find({
    lastPlayedDay: yesterday,
    currentStreak: { $gte: 2 },
    'notify.lastReminderDay': { $ne: today },
  }).select('username email notify currentStreak').limit(500).lean();
  let reminded = 0;
  for (const u of users) {
    try {
      const r = await remindUser(u, today);
      if (r.push || r.email) reminded += 1;
    } catch (err) {
      console.error('Reminder failed for', u.username, err.message);
    }
  }
  if (users.length) console.log(`🔔 Streak reminders: ${reminded}/${users.length} reached`);
  return { checked: users.length, reminded };
}

export function startReminderJob() {
  const run = () => runReminders().catch(err => console.error('Reminder job error:', err.message));
  setTimeout(run, 10000);
  setInterval(run, 15 * 60 * 1000).unref();
}

// Force a reminder for one user regardless of the time-of-day gate (testing).
export async function remindNow(userId) {
  const u = await User.findById(userId).select('username email notify currentStreak').lean();
  if (!u) return null;
  return remindUser(u, utcDay(0));
}
