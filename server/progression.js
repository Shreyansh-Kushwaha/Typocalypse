// XP, levels, achievements, and the cosmetics locker.
//
// Every route that records something a player did calls grant():
//   const progression = await grant(userId, { xp: 25, event: { type: 'session', wpm, accuracy, ... } })
// and includes `progression` in its JSON response. The client watches every
// response for that key and toasts level-ups, new achievements, and unlocks.

import User from './models/User.js';
import { logActivity } from './activity.js';

// ---------------------------------------------------------------- levels
// Level L starts at 100 * (L-1)^2 XP: L2 at 100, L3 at 400, L5 at 1600, L10 at 8100, L20 at 36100.
export function levelFromXp(xp) {
  return 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 100));
}
export function xpForLevel(level) {
  return 100 * Math.pow(Math.max(1, level) - 1, 2);
}
export function levelProgress(xp) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, xp, floor, next, pct: Math.round(((xp - floor) / (next - floor)) * 100) };
}

// XP for a finished passage. Speed pays, accuracy pays more, capped so grinding is sane.
export function sessionXp({ wpm = 0, accuracy = 0, totalTyped = 0 } = {}) {
  if (totalTyped < 20) return 5;
  let xp = 10 + Math.round(wpm / 4);
  if (accuracy >= 95) xp += 10;
  if (accuracy >= 99) xp += 10;
  return Math.min(60, xp);
}

// ---------------------------------------------------------------- achievements
// c = user.counters (lifetime numbers), e = the event that just happened, u = user doc
const A = (key, name, icon, description, xp, check, opts = {}) => ({ key, name, icon, description, xp, check, ...opts });

export const ACHIEVEMENTS = [
  // volume
  A('first_blood', 'First Blood', '🩸', 'Finish your first passage', 25, (c) => c.sessions >= 1),
  A('ten_passages', 'Warming Up', '🔥', 'Finish 10 passages', 50, (c) => c.sessions >= 10),
  A('fifty_passages', 'Regular', '📚', 'Finish 50 passages', 100, (c) => c.sessions >= 50),
  A('marathon', 'Marathon', '🏃', 'Finish 200 passages', 250, (c) => c.sessions >= 200),
  A('million_keys', 'Keysmith', '⌨️', 'Type 100,000 characters', 300, (c) => c.chars >= 100000),
  // speed - clean runs only
  A('speed_40', 'Getting Somewhere', '🚶', '40+ WPM on a clean run', 50, (c) => c.bestWpm >= 40),
  A('speed_60', 'Speed Demon', '⚡', '60+ WPM on a clean run', 100, (c) => c.bestWpm >= 60),
  A('speed_80', 'Velocity', '🚀', '80+ WPM on a clean run', 150, (c) => c.bestWpm >= 80),
  A('speed_100', 'Century', '💯', '100+ WPM on a clean run', 250, (c) => c.bestWpm >= 100),
  A('speed_120', 'Untouchable', '👑', '120+ WPM on a clean run', 400, (c) => c.bestWpm >= 120),
  // accuracy
  A('sniper', 'Sniper', '🎯', '100% accuracy on a passage of 100+ characters', 75, (c, e) => e.type === 'session' && e.accuracy >= 100 && e.totalTyped >= 100),
  A('perfectionist', 'Perfectionist', '💎', '10 passages at 98%+ accuracy', 150, (c) => c.cleanRuns >= 10),
  // daily
  A('daily_first', 'Survivor', '🧟', 'Complete a Daily Apocalypse', 40, (c) => c.dailies >= 1),
  A('daily_10', 'Ten Days Standing', '🗓️', 'Complete 10 dailies', 120, (c) => c.dailies >= 10),
  A('daily_top3', 'Podium', '🥉', 'Place top 3 in a daily', 200, (c, e) => e.type === 'daily' && e.rank <= 3),
  // streaks
  A('streak_3', 'Habit', '🕯️', '3 day streak', 50, (c, e, u) => (u.currentStreak || 0) >= 3),
  A('streak_7', 'Week of Fire', '🔥', '7 day streak', 150, (c, e, u) => (u.currentStreak || 0) >= 7),
  A('streak_30', 'Unbroken', '🌋', '30 day streak', 500, (c, e, u) => (u.currentStreak || 0) >= 30),
  // ghosts
  A('ghost_hunter', 'Ghost Hunter', '👻', 'Beat a ghost', 50, (c) => c.ghostWins >= 1),
  A('ghost_10', 'Exorcist', '🕯️', 'Beat 10 ghosts', 150, (c) => c.ghostWins >= 10),
  // multiplayer
  A('team_player', 'Team Player', '🤝', 'Play 10 multiplayer matches', 100, (c) => c.matches >= 10),
  A('horde_10', 'Wall Builder', '🧱', 'Survive 10 waves of Horde Night', 120, (c) => c.hordeBestWave >= 10),
  A('boss_slayer', 'Boss Slayer', '☠️', 'Win a Boss Raid', 100, (c) => c.bossWins >= 1),
  A('royale_king', 'Last One Typing', '👑', 'Win a Typo Royale', 100, (c) => c.royaleWins >= 1),
  A('corruptor_win', 'Saboteur', '🎭', 'Win as the Corruptor', 120, (c) => c.corruptorWins >= 1),
  // duels
  A('duel_first', 'First Duel', '⚔️', 'Win a rated quick match', 60, (c) => c.duelWins >= 1),
  A('duel_1200', 'Contender', '🥊', 'Reach 1200 rating', 200, (c, e, u) => (u.rating || 0) >= 1200),
  A('duel_1500', 'Champion Material', '🏅', 'Reach 1500 rating', 400, (c, e, u) => (u.rating || 0) >= 1500),
  // arcade
  A('meteor_1000', 'Sky Watcher', '☄️', 'Score 1,000 in Meteor Shower', 60, (c) => c.meteorBest >= 1000),
  A('meteor_5000', 'Bunker Legend', '🌠', 'Score 5,000 in Meteor Shower', 200, (c) => c.meteorBest >= 5000),
  A('radio_operator', 'Radio Operator', '📻', 'Finish a Radio Transmissions session at 90%+', 80, (c, e) => e.type === 'session' && e.context === 'radio' && e.accuracy >= 90),
  A('memory_master', 'Photographic', '🧠', 'Last Words: 95%+ on a 30+ word passage', 120, (c, e) => e.type === 'session' && e.context === 'memory' && e.accuracy >= 95 && e.totalTyped >= 150),
  // practice
  A('test_100', 'Triple Digits', '⏱️', '100+ WPM in a 60 second test', 200, (c, e) => e.type === 'session' && e.mode === 'test60' && e.wpm >= 100 && e.accuracy >= 90),
  A('consistent', 'Metronome', '🎵', '90+ consistency in a timed test', 100, (c, e) => e.type === 'session' && e.context === 'test' && (e.consistency || 0) >= 90),
  A('code_monkey', 'Code Monkey', '🐒', 'Type 10 code snippets', 100, (c) => c.codeSnippets >= 10),
  // campaign
  A('campaign_zone1', 'Out of the Outskirts', '🏚️', 'Clear campaign zone 1', 100, (c) => c.campaignZones >= 1),
  A('campaign_zone2', 'City Crawler', '🏙️', 'Clear campaign zone 2', 150, (c) => c.campaignZones >= 2),
  A('campaign_zone3', 'Into the Deadwood', '🌲', 'Clear campaign zone 3', 200, (c) => c.campaignZones >= 3),
  A('campaign_zone4', 'Vault Breaker', '🔐', 'Clear the final zone', 300, (c) => c.campaignZones >= 4),
  A('campaign_all_stars', 'Constellation', '🌟', 'Three stars on every campaign node', 500, (c) => c.campaignAllStars >= 1),
  // social
  A('author', 'Author', '✍️', 'Publish a story to the library', 60, (c) => c.storiesPublished >= 1),
  A('bestseller', 'Bestseller', '📖', 'A story of yours reaches 10 likes', 200, (c) => c.storyLikesMax >= 10),
  A('socialite', 'Socialite', '🫂', 'Follow 5 typists', 40, (c) => c.following >= 5),
  A('popular', 'Popular', '🌟', '10 typists follow you', 120, (c) => c.followers >= 10),
  // tournaments
  A('tournament_entrant', 'Contender', '🎟️', 'Enter a weekend tournament', 50, (c) => c.tournaments >= 1),
  A('tournament_champion', 'Weekend Champion', '🏆', 'Win a weekend tournament', 500, (c) => c.tournamentWins >= 1),
  // flavour
  A('night_owl', 'Night Owl', '🦉', 'Finish a passage between midnight and 4am', 40, (c, e) => e.type === 'session' && e.localHour != null && e.localHour >= 0 && e.localHour < 4),
  A('polyglot', 'Polyglot', '🗺️', 'Finish a story passage in all six genres', 100, (c) => (c.genres || []).length >= 6),
];
const BY_KEY = Object.fromEntries(ACHIEVEMENTS.map(a => [a.key, a]));

// ---------------------------------------------------------------- cosmetics
// unlock: { level: n } or { achievement: key } or {} (always available)
export const THEMES = [
  { key: 'brutal', name: 'Brutal', blurb: 'Paper, ink, and a pink shadow. The original.', unlock: {}, dark: false, preview: ['#f4f4f0', '#000000', '#ff007f'] },
  { key: 'midnight', name: 'Midnight', blurb: 'Black on black with a yellow warning stripe.', unlock: { level: 2 }, dark: true, preview: ['#000000', '#facc15', '#ffffff'] },
  { key: 'paper', name: 'Old Paper', blurb: 'Sepia and soot, like a survivor journal.', unlock: { level: 3 }, dark: false, preview: ['#efe6cf', '#2b1d0e', '#b45309'] },
  { key: 'ember', name: 'Ember', blurb: 'The city is still burning.', unlock: { level: 5 }, dark: true, preview: ['#140800', '#ff6a00', '#ffd166'] },
  { key: 'toxic', name: 'Toxic', blurb: 'Radioactive green on bunker black.', unlock: { level: 7 }, dark: true, preview: ['#03110a', '#39ff14', '#c6ff00'] },
  { key: 'bubblegum', name: 'Bubblegum', blurb: 'Apocalypse, but make it cute.', unlock: { level: 9 }, dark: false, preview: ['#ffe4f1', '#3a0020', '#ff2d95'] },
  { key: 'terminal', name: 'Terminal', blurb: 'Green phosphor. Cursor blink. No mercy.', unlock: { level: 12 }, dark: true, preview: ['#000000', '#00ff88', '#00ff88'] },
  { key: 'arctic', name: 'Arctic', blurb: 'Ice blue, hard edges, quiet.', unlock: { level: 15 }, dark: false, preview: ['#e8f4ff', '#0b2545', '#1e90ff'] },
  { key: 'blood', name: 'Blood', blurb: 'Earned at 100 WPM. Red on black.', unlock: { achievement: 'speed_100' }, dark: true, preview: ['#0a0000', '#ff1a1a', '#ffffff'] },
  { key: 'royal', name: 'Royal', blurb: 'For weekend champions only.', unlock: { achievement: 'tournament_champion' }, dark: true, preview: ['#0f0020', '#ffd700', '#c084fc'] },
];
export const CARETS = [
  { key: 'block', name: 'Block', blurb: 'Solid block on the next character.', unlock: {} },
  { key: 'line', name: 'Line', blurb: 'A thin vertical bar.', unlock: { level: 2 } },
  { key: 'underline', name: 'Underline', blurb: 'Underscore the target.', unlock: { level: 4 } },
  { key: 'box', name: 'Box', blurb: 'Outlined, no fill.', unlock: { level: 6 } },
  { key: 'ghost', name: 'Ghost', blurb: 'Soft, no blink. For the calm.', unlock: { level: 8 } },
  { key: 'rainbow', name: 'Rainbow', blurb: 'Cycles hue as you type.', unlock: { level: 15 } },
];
export const SOUND_PACKS = [
  { key: 'synth', name: 'Synth', blurb: 'Clean square-wave clicks.', unlock: {} },
  { key: 'mech', name: 'Mechanical', blurb: 'Thocky switches.', unlock: { level: 3 } },
  { key: 'typewriter', name: 'Typewriter', blurb: 'Clack, with a ding at the end.', unlock: { level: 5 } },
  { key: 'bubble', name: 'Bubble', blurb: 'Soft pops.', unlock: { level: 8 } },
  { key: 'laser', name: 'Laser', blurb: 'Pew.', unlock: { level: 11 } },
];

export function isUnlocked(item, user) {
  const lvl = levelFromXp(user.xp || 0);
  if (item.unlock.level && lvl < item.unlock.level) return false;
  if (item.unlock.achievement && !(user.achievements || []).some(a => a.key === item.unlock.achievement)) return false;
  return true;
}

export function lockerFor(user) {
  const mark = (list) => list.map(i => ({ ...i, unlocked: isUnlocked(i, user) }));
  return {
    themes: mark(THEMES),
    carets: mark(CARETS),
    sounds: mark(SOUND_PACKS),
    equipped: {
      theme: user.cosmetics?.theme || 'brutal',
      caret: user.cosmetics?.caret || 'block',
      sound: user.cosmetics?.sound || 'synth',
      title: user.cosmetics?.title || '',
    },
  };
}

// ---------------------------------------------------------------- counters
// Update lifetime counters from an event. Events (all fields optional):
//   session:  { context, mode, wpm, accuracy, totalTyped, consistency, localHour, won }
//   daily:    { rank }
//   match:    { mode, won, wave, role }
//   duel:     { won }
//   meteor:   { score }
//   campaign: { zonesCleared, allStars }
//   story:    { published, likes }
//   follow:   { following, followers }
//   tournament: { entered, won }
function bump(c, key, n = 1) { c[key] = (c[key] || 0) + n; }
function maxOf(c, key, v) { c[key] = Math.max(c[key] || 0, v || 0); }

function applyEvent(c, e) {
  switch (e.type) {
    case 'session': {
      bump(c, 'sessions');
      bump(c, 'chars', e.totalTyped || 0);
      if (e.accuracy >= 90) maxOf(c, 'bestWpm', e.wpm);
      if (e.accuracy >= 98 && (e.totalTyped || 0) >= 50) bump(c, 'cleanRuns');
      if (e.context === 'ghost' && e.won) bump(c, 'ghostWins');
      if (e.context === 'code') bump(c, 'codeSnippets');
      if (e.context === 'solo' && e.mode && e.mode !== 'daily') {
        const g = new Set(c.genres || []);
        g.add(e.mode);
        c.genres = [...g];
      }
      break;
    }
    case 'daily': bump(c, 'dailies'); break;
    case 'match': {
      bump(c, 'matches');
      if (e.mode === 'horde') maxOf(c, 'hordeBestWave', e.wave);
      if (e.won && e.mode === 'bossraid') bump(c, 'bossWins');
      if (e.won && e.mode === 'royale') bump(c, 'royaleWins');
      if (e.won && e.mode === 'corruptor' && e.role === 'corruptor') bump(c, 'corruptorWins');
      if (e.won) bump(c, 'matchWins');
      break;
    }
    case 'duel': if (e.won) bump(c, 'duelWins'); break;
    case 'meteor': maxOf(c, 'meteorBest', e.score); break;
    case 'campaign': maxOf(c, 'campaignZones', e.zonesCleared); if (e.allStars) c.campaignAllStars = 1; break;
    case 'story': if (e.published) bump(c, 'storiesPublished'); if (e.likes != null) maxOf(c, 'storyLikesMax', e.likes); break;
    case 'follow': if (e.following != null) c.following = e.following; if (e.followers != null) c.followers = e.followers; break;
    case 'tournament': if (e.entered) bump(c, 'tournaments'); if (e.won) bump(c, 'tournamentWins'); break;
    default: break;
  }
}

// ---------------------------------------------------------------- grant
export async function grant(userId, { xp = 0, event = { type: 'none' } } = {}) {
  const user = await User.findById(userId);
  if (!user) return null;
  const before = levelFromXp(user.xp || 0);
  const unlockedBefore = { themes: THEMES.filter(t => isUnlocked(t, user)), carets: CARETS.filter(t => isUnlocked(t, user)), sounds: SOUND_PACKS.filter(t => isUnlocked(t, user)) };

  const counters = { ...(user.counters || {}) };
  applyEvent(counters, event);
  user.counters = counters;
  user.markModified('counters');

  const have = new Set((user.achievements || []).map(a => a.key));
  const newAchievements = [];
  for (const a of ACHIEVEMENTS) {
    if (have.has(a.key)) continue;
    let ok = false;
    try { ok = !!a.check(counters, event, user); } catch { ok = false; }
    if (ok) {
      user.achievements.push({ key: a.key, at: new Date() });
      have.add(a.key);
      newAchievements.push({ key: a.key, name: a.name, icon: a.icon, description: a.description, xp: a.xp });
      xp += a.xp;
    }
  }

  user.xp = (user.xp || 0) + Math.max(0, Math.round(xp));
  const after = levelFromXp(user.xp);
  await user.save();

  const newUnlocks = [];
  const diff = (kind, list, prev) => {
    for (const item of list) {
      if (isUnlocked(item, user) && !prev.some(p => p.key === item.key)) newUnlocks.push({ kind, key: item.key, name: item.name });
    }
  };
  diff('theme', THEMES, unlockedBefore.themes);
  diff('caret', CARETS, unlockedBefore.carets);
  diff('sound', SOUND_PACKS, unlockedBefore.sounds);

  // feed lines for the loud moments
  for (const a of newAchievements) void logActivity(user._id, user.username, 'achievement', { key: a.key, name: a.name, icon: a.icon });
  if (after > before) void logActivity(user._id, user.username, 'level', { level: after });

  return {
    xp: user.xp,
    gained: Math.max(0, Math.round(xp)),
    level: after,
    leveledUp: after > before,
    ...levelProgress(user.xp),
    newAchievements,
    newUnlocks,
  };
}

// Full picture for the progression page
export function progressionView(user) {
  const have = new Map((user.achievements || []).map(a => [a.key, a.at]));
  return {
    ...levelProgress(user.xp || 0),
    achievements: ACHIEVEMENTS.map(a => ({
      key: a.key, name: a.name, icon: a.icon, description: a.description, xp: a.xp,
      unlocked: have.has(a.key), at: have.get(a.key) || null,
    })),
    unlockedCount: have.size,
    total: ACHIEVEMENTS.length,
    locker: lockerFor(user),
    counters: user.counters || {},
    seasonTitles: user.seasonTitles || [],
  };
}

export function achievementByKey(key) {
  return BY_KEY[key] || null;
}
