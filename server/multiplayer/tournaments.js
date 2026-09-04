// Weekend tournament orchestrator. One Typo Royale per ISO week, Saturday
// 18:00 UTC. Entrants are split into heats of <= 20, heat winners meet in a
// final. Runs in-process next to the socket server.
//
// Testing: TOURNAMENT_START_IN_MIN=N makes the current tournament start N
// minutes after boot and schedules a fresh one N minutes after each finish or
// cancel. TOURNAMENT_JOIN_WINDOW_SEC (default 75) shortens the join window.

import Tournament from '../models/Tournament.js';
import { grant } from '../progression.js';
import { logActivity } from '../activity.js';
import { sendPushToUser } from '../notify.js';
import { shuffle, pick } from './content.js';

export const HEAT_MAX = 20;
const TICK_MS = 2000;
const ENSURE_MS = 60000;
const GENRES = ['fantasy', 'horror', 'sci-fi', 'mystery', 'adventure', 'romance'];
const DAY = 86400000;

export function joinWindowMs() {
  const sec = Number(process.env.TOURNAMENT_JOIN_WINDOW_SEC);
  return (Number.isFinite(sec) && sec > 0 ? sec : 75) * 1000;
}

export function testStartInMin() {
  const n = Number(process.env.TOURNAMENT_START_IN_MIN);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ---------------------------------------------------------------- schedule
export function mondayOf(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7; // Mon=1 .. Sun=7
  date.setUTCDate(date.getUTCDate() - (dayNum - 1));
  return date;
}

export function isoWeekOf(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // the Thursday decides the year
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / DAY) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

export function weekSlug(d) {
  const { year, week } = isoWeekOf(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function saturday18(monday) {
  return new Date(monday.getTime() + 5 * DAY + 18 * 3600000);
}

const LIVE = ['open', 'starting', 'running'];

// The tournament people can register for (creates it if the week has none).
export async function ensureUpcoming() {
  const now = Date.now();
  const live = await Tournament.findOne({ state: { $in: LIVE } }).sort({ startsAt: 1 });
  if (live) return live;
  const number = (await Tournament.countDocuments()) + 1;
  const base = { name: `Weekend Royale #${number}`, number, mode: 'royale', genre: pick(GENRES), state: 'open' };
  const testMin = testStartInMin();
  if (testMin > 0) {
    return Tournament.create({ ...base, slug: `test-${now.toString(36)}`, startsAt: new Date(now + testMin * 60000) });
  }
  let monday = mondayOf(new Date(now));
  for (let i = 0; i < 4; i++) {
    const slug = weekSlug(monday);
    const startsAt = saturday18(monday);
    const existing = await Tournament.findOne({ slug });
    if (existing) {
      if (LIVE.includes(existing.state)) return existing;
    } else if (startsAt.getTime() > now) {
      try {
        return await Tournament.create({ ...base, slug, startsAt });
      } catch (err) {
        if (err.code === 11000) return Tournament.findOne({ slug });
        throw err;
      }
    }
    monday = new Date(monday.getTime() + 7 * DAY);
  }
  return null;
}

// ---------------------------------------------------------------- orchestrator
export function createTournamentOrchestrator({ io, manager, startRoom, emitToUser, broadcastRoom }) {
  let current = null;        // upcoming / live doc
  const live = new Map();    // slug -> run
  const timers = new Set();

  const after = (ms, fn) => {
    const t = setTimeout(() => { timers.delete(t); fn().catch?.(err => console.error('Tournament error:', err.message)); }, ms);
    timers.add(t);
    return t;
  };

  async function refresh() {
    try { current = await ensureUpcoming(); } catch (err) { console.error('Tournament schedule error:', err.message); }
    return current;
  }

  async function tick() {
    if (!current || current.state !== 'open') return;
    if (new Date(current.startsAt).getTime() > Date.now()) return;
    await begin(current);
  }

  function pushTo(userId, title, body, url) {
    try {
      Promise.resolve(sendPushToUser(userId, { title, body, url })).catch(() => {});
    } catch { /* stub or transport failure - never blocks a tournament */ }
  }

  function notify(run, players, roomCode, stage) {
    const payload = { slug: run.slug, name: run.name, roomCode, stage, joinBy: Date.now() + joinWindowMs() };
    for (const p of players) {
      emitToUser(p.userId, 'tournament:start', payload);
      pushTo(p.userId, `${run.name} is starting`, stage === 'final' ? 'You made the final. Join within 75 seconds.' : 'Your heat is open. Join within 75 seconds.', '/room/' + roomCode);
    }
  }

  function openRoom(run, players, deadline, stage) {
    const room = manager.createSystem('royale', { genre: run.genre }, {
      allowed: players.map(p => p.userId),
      startsAt: deadline,
      tournament: { slug: run.slug, name: run.name, stage },
    });
    room.onAbandoned = () => { heatFinished(run, room.code, null).catch(() => {}); };
    return room;
  }

  async function begin(doc) {
    const t = await Tournament.findById(doc._id);
    if (!t || t.state !== 'open') { current = t; return; }
    const entrants = shuffle(t.entrants.map(e => ({ userId: String(e.userId), username: e.username })));
    if (entrants.length < 2) return cancel(t, 'Not enough entrants (need 2)');
    t.state = 'starting';
    const heatCount = Math.ceil(entrants.length / HEAT_MAX);
    const buckets = Array.from({ length: heatCount }, () => []);
    entrants.forEach((e, i) => buckets[i % heatCount].push(e));
    const run = { id: t._id, slug: t.slug, name: t.name, genre: t.genre, stage: 'heats', heats: [], final: null, finalists: [], entrants };
    const deadline = Date.now() + joinWindowMs();
    for (const bucket of buckets) {
      const room = openRoom(run, bucket, deadline, heatCount === 1 ? 'final' : 'heat');
      run.heats.push({ roomCode: room.code, players: bucket, state: 'waiting', winner: null, placements: [] });
    }
    t.heats = run.heats.map(h => ({ roomCode: h.roomCode, players: h.players.map(p => p.userId), winner: null, placements: [], state: 'waiting' }));
    if (heatCount === 1) t.final = { roomCode: run.heats[0].roomCode, players: run.heats[0].players.map(p => p.userId), placements: [] };
    await t.save();
    current = t;
    live.set(t.slug, run);
    console.log(`🏆 ${t.name} (${t.slug}) starting: ${entrants.length} entrants in ${heatCount} heat(s)`);
    for (const h of run.heats) notify(run, h.players, h.roomCode, heatCount === 1 ? 'final' : 'heat');
    after(joinWindowMs(), () => onDeadline(run, 'heats'));
  }

  function startHeat(run, h) {
    const room = manager.rooms.get(h.roomCode);
    if (!room || room.state !== 'lobby') return false;
    h.state = 'running';
    room.startsAt = null;
    startRoom(room, (results) => { heatFinished(run, room.code, results).catch(err => console.error('Tournament error:', err.message)); });
    return true;
  }

  // Everyone on the list is here - no need to wait out the window
  function onJoin(room) {
    const run = room.tournament && live.get(room.tournament.slug);
    if (!run || room.state !== 'lobby') return;
    const h = run.stage === 'heats' ? run.heats.find(x => x.roomCode === room.code) : (run.final?.roomCode === room.code ? run.final : null);
    if (!h || h.state !== 'waiting') return;
    const connected = new Set(room.connectedPlayers().map(p => p.userId));
    if (h.players.length >= 2 && h.players.every(p => connected.has(p.userId))) startHeat(run, h);
  }

  async function onDeadline(run, stage) {
    if (!live.has(run.slug) || run.stage !== stage) return;
    const heats = stage === 'heats' ? run.heats : [run.final];
    for (const h of heats) {
      if (!h || h.state !== 'waiting') continue;
      const room = manager.rooms.get(h.roomCode);
      const connected = room ? room.connectedPlayers() : [];
      if (room && connected.length >= 2) { startHeat(run, h); continue; }
      h.state = 'cancelled';
      if (room) {
        if (connected.length === 1 && stage === 'heats') {
          const lone = { userId: connected[0].userId, username: connected[0].name };
          run.finalists.push(lone);
          emitToUser(lone.userId, 'tournament:advance', { slug: run.slug, name: run.name, message: 'Nobody else joined your heat - you advance straight to the final.' });
        } else {
          io.to(room.code).emit('tournament:cancelled', { slug: run.slug, name: run.name, roomCode: room.code, message: 'Not enough players joined in time.' });
        }
        manager.destroy(room, { silent: true });
      }
    }
    const t = await Tournament.findById(run.id);
    if (!t) return;
    if (stage === 'heats') {
      const playing = run.heats.some(h => h.state === 'running' || h.state === 'done');
      if (!playing && run.finalists.length < 2) return cancel(t, 'Not enough players showed up');
      if (t.state !== 'running') { t.state = 'running'; }
      syncHeats(t, run);
      await t.save();
      current = t;
      if (run.heats.every(h => h.state === 'done' || h.state === 'cancelled')) await afterHeats(run);
    } else if (run.final?.state === 'cancelled') {
      return cancel(t, 'Not enough finalists showed up');
    }
  }

  function syncHeats(t, run) {
    t.heats = run.heats.map(h => ({
      roomCode: h.roomCode,
      players: h.players.map(p => p.userId),
      winner: h.winner?.userId || null,
      placements: h.placements || [],
      state: h.state,
    }));
    t.markModified('heats');
  }

  async function heatFinished(run, roomCode, results) {
    if (!live.has(run.slug)) return;
    const h = run.stage === 'heats' ? run.heats.find(x => x.roomCode === roomCode) : (run.final?.roomCode === roomCode ? run.final : null);
    if (!h || h.state !== 'running') return;
    h.state = 'done';
    h.placements = results?.placements || [];
    h.winner = results?.winner ? { userId: String(results.winner.userId), username: results.winner.name } : null;
    const room = manager.rooms.get(roomCode);
    if (room) releaseRoom(room);
    if (run.stage === 'heats') {
      if (h.winner) run.finalists.push(h.winner);
      const t = await Tournament.findById(run.id);
      if (t) { syncHeats(t, run); await t.save(); current = t; }
      if (run.heats.every(x => x.state === 'done' || x.state === 'cancelled')) await afterHeats(run);
    } else {
      await finishTournament(run, h);
    }
  }

  // Tournament rooms have no host; once the heat is over hand it to whoever is still here
  function releaseRoom(room) {
    room.system = false;
    room.pinned = false;
    room.allowed = null;
    room.startsAt = null;
    if (room.tournament) room.tournament = { ...room.tournament, done: true };
    const first = room.connectedPlayers()[0];
    if (first) { room.hostUserId = first.userId; first.isHost = true; }
    manager.release(room);
    if (manager.rooms.has(room.code)) broadcastRoom(room);
  }

  async function afterHeats(run) {
    if (run.heats.length === 1) return finishTournament(run, run.heats[0]);
    const played = run.heats.filter(h => h.state === 'done' && h.winner);
    if (run.finalists.length >= 2) return startFinal(run);
    const t = await Tournament.findById(run.id);
    if (!t) return;
    // only one heat could actually be played - its winner takes the trophy
    if (run.finalists.length === 1 && played.length === 1 && played[0].winner.userId === run.finalists[0].userId) {
      return finishTournament(run, played[0]);
    }
    return cancel(t, 'Not enough players showed up for the final');
  }

  async function startFinal(run) {
    run.stage = 'final';
    const deadline = Date.now() + joinWindowMs();
    const room = openRoom(run, run.finalists, deadline, 'final');
    run.final = { roomCode: room.code, players: [...run.finalists], state: 'waiting', winner: null, placements: [] };
    const t = await Tournament.findById(run.id);
    if (!t) return;
    t.final = { roomCode: room.code, players: run.finalists.map(p => p.userId), placements: [] };
    t.state = 'running';
    await t.save();
    current = t;
    notify(run, run.finalists, room.code, 'final');
    after(joinWindowMs(), () => onDeadline(run, 'final'));
  }

  async function finishTournament(run, h) {
    const t = await Tournament.findById(run.id);
    if (!t || !LIVE.includes(t.state)) return;
    if (!h?.winner) return cancel(t, 'The final produced no winner');
    t.state = 'finished';
    t.finishedAt = new Date();
    t.winner = { userId: h.winner.userId, username: h.winner.username };
    t.final = { roomCode: h.roomCode, players: h.players.map(p => p.userId), placements: h.placements || [] };
    syncHeats(t, run);
    await t.save();
    live.delete(run.slug);
    console.log(`🏆 ${t.name} won by ${h.winner.username}`);
    grant(h.winner.userId, { xp: 300, event: { type: 'tournament', won: true } }).catch(() => {});
    void logActivity(h.winner.userId, h.winner.username, 'tournament', { slug: t.slug, name: t.name, action: 'won', entrants: t.entrants.length });
    const payload = { slug: t.slug, name: t.name, winner: t.winner };
    for (const e of run.entrants) emitToUser(e.userId, 'tournament:finished', payload);
    await refresh();
  }

  async function cancel(t, reason) {
    if (!t || ['finished', 'cancelled'].includes(t.state)) return;
    t.state = 'cancelled';
    t.finishedAt = new Date();
    t.cancelReason = reason;
    const run = live.get(t.slug);
    if (run) {
      syncHeats(t, run);
      for (const h of [...run.heats, run.final].filter(Boolean)) {
        const room = manager.rooms.get(h.roomCode);
        if (room) {
          io.to(room.code).emit('tournament:cancelled', { slug: t.slug, name: t.name, roomCode: room.code, message: reason });
          manager.destroy(room, { silent: true });
        }
      }
      live.delete(t.slug);
    }
    await t.save();
    console.log(`🏆 ${t.name} cancelled: ${reason}`);
    for (const e of t.entrants) emitToUser(String(e.userId), 'tournament:cancelled', { slug: t.slug, name: t.name, roomCode: null, message: reason });
    await refresh();
  }

  function start() {
    refresh().then(() => {
      if (current) console.log(`🏆 Next tournament: ${current.name} (${current.slug}) at ${new Date(current.startsAt).toISOString()}`);
    });
    const t1 = setInterval(() => { tick().catch(err => console.error('Tournament tick error:', err.message)); }, TICK_MS);
    const t2 = setInterval(() => { refresh(); }, ENSURE_MS);
    timers.add(t1);
    timers.add(t2);
  }

  function stop() {
    for (const t of timers) { clearTimeout(t); clearInterval(t); }
    timers.clear();
  }

  return { start, stop, onJoin, refresh, current: () => current, live };
}
