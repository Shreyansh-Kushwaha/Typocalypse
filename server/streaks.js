import User from './models/User.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const utcDay = (offset = 0) => new Date(Date.now() - offset * DAY_MS).toISOString().slice(0, 10);

// Bump the day streak on a completed passage. A single missed day is
// repairable only by completing a weak-key drill within the next day.
export async function bumpStreak(userId, context) {
  const user = await User.findById(userId);
  if (!user) return null;
  const today = utcDay(0);

  if (user.lastPlayedDay === today) {
    return { current: user.currentStreak, longest: user.longestStreak, repaired: false };
  }

  let repaired = false;
  if (user.lastPlayedDay === utcDay(1)) {
    user.currentStreak += 1;
  } else if (user.lastPlayedDay === utcDay(2) && context === 'drill') {
    user.currentStreak += 1; // the drill forgives the one missed day
    repaired = true;
  } else {
    user.currentStreak = 1;
  }
  user.lastPlayedDay = today;
  user.longestStreak = Math.max(user.longestStreak || 0, user.currentStreak);
  await user.save();
  return { current: user.currentStreak, longest: user.longestStreak, repaired };
}

export async function getStreak(userId) {
  const user = await User.findById(userId).select('currentStreak longestStreak lastPlayedDay');
  if (!user) return { current: 0, longest: 0, atRisk: false };
  // A streak is "at risk" if the last play was yesterday (today not yet played)
  const alive = user.lastPlayedDay === utcDay(0) || user.lastPlayedDay === utcDay(1);
  return {
    current: alive ? user.currentStreak : 0,
    longest: user.longestStreak || 0,
    atRisk: user.lastPlayedDay === utcDay(1),
  };
}
