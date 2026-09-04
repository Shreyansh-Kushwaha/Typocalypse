// Monthly seasons. The ladder resets every month; the top typists of a
// finished season get a permanent title on their profile.
import StatsSession from './models/StatsSession.js';
import SeasonAward from './models/SeasonAward.js';
import User from './models/User.js';
import { logActivity } from './activity.js';

// Season 1 = September 2026 (launch month)
const EPOCH_YEAR = 2026;
const EPOCH_MONTH = 8; // 0-based -> September

export function seasonIdFor(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
export function seasonNumberFor(id) {
  const [y, m] = id.split('-').map(Number);
  return (y - EPOCH_YEAR) * 12 + (m - 1 - EPOCH_MONTH) + 1;
}
export function seasonRange(id) {
  const [y, m] = id.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}
export function currentSeason() {
  const id = seasonIdFor();
  const { start, end } = seasonRange(id);
  return { id, number: seasonNumberFor(id), startsAt: start.getTime(), endsAt: end.getTime() };
}
export function previousSeasonId(id = seasonIdFor()) {
  const [y, m] = id.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return seasonIdFor(d);
}

const TITLES = (n) => ({
  1: `Season ${n} Champion`,
  2: `Season ${n} Runner-up`,
  3: `Season ${n} Bronze`,
});

export async function seasonStandings(id, limit = 10) {
  const { start, end } = seasonRange(id);
  return StatsSession.aggregate([
    { $match: { accuracy: { $gte: 80 }, createdAt: { $gte: start, $lt: end } } },
    { $group: { _id: '$userId', username: { $last: '$username' }, bestWpm: { $max: '$wpm' }, avgAccuracy: { $avg: '$accuracy' }, games: { $sum: 1 } } },
    { $sort: { bestWpm: -1, avgAccuracy: -1 } },
    { $limit: limit },
  ]);
}

// Award titles for every finished season that has none yet. Idempotent.
export async function awardFinishedSeasons() {
  const current = seasonIdFor();
  let id = previousSeasonId(current);
  // Walk back at most 12 months looking for unawarded seasons
  for (let i = 0; i < 12; i++) {
    const number = seasonNumberFor(id);
    if (number < 1) break;
    const already = await SeasonAward.exists({ season: id });
    if (!already) {
      const rows = await seasonStandings(id, 10);
      if (rows.length) {
        const titles = TITLES(number);
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          const rank = r + 1;
          const title = titles[rank] || `Season ${number} Top 10`;
          try {
            await SeasonAward.create({ season: id, number, userId: row._id, username: row.username, rank, bestWpm: row.bestWpm, title });
            await User.updateOne({ _id: row._id }, { $push: { seasonTitles: { season: id, number, rank, title } } });
            void logActivity(row._id, row.username, 'season', { season: id, number, rank, title });
          } catch (err) {
            if (err.code !== 11000) console.error('Season award error:', err.message);
          }
        }
        console.log(`🏁 Season ${number} (${id}) awarded to ${rows.length} typists`);
      } else {
        // Nothing happened that month - write a sentinel so we stop rechecking
        await SeasonAward.create({ season: id, number, userId: 'nobody', username: 'nobody', rank: 0, bestWpm: 0, title: 'empty' }).catch(() => {});
      }
    }
    id = previousSeasonId(id);
  }
}

export function startSeasonJob() {
  const run = () => awardFinishedSeasons().catch(err => console.error('Season job error:', err.message));
  setTimeout(run, 5000);
  setInterval(run, 60 * 60 * 1000).unref();
}
