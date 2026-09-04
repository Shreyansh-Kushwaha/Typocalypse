// Quick-match queue: rated 1v1 duels paired by Elo rating.
//
// Every 2s: pair anyone whose rating gap fits the wider of the two players'
// windows (100, +50 per 5s waited, cap 1000), closest ratings first. A matched
// pair gets a duel room built and started exactly like a host pressing Start.

import User from '../models/User.js';

const TICK_MS = 2000;
const BASE_WINDOW = 100;
const WINDOW_STEP = 50;
const WINDOW_STEP_MS = 5000;
const WINDOW_CAP = 1000;
const GENRES = new Set(['fantasy', 'horror', 'sci-fi', 'mystery', 'adventure', 'romance']);

export function windowFor(waitedMs) {
  return Math.min(WINDOW_CAP, BASE_WINDOW + WINDOW_STEP * Math.floor(Math.max(0, waitedMs) / WINDOW_STEP_MS));
}

// Pure pairing step so it can be reasoned about on its own.
// entries: [{ socketId, userId, rating, joinedAt }] -> [[a, b], ...]
export function pairEntries(entries, now = Date.now()) {
  const list = [...entries].sort((a, b) => a.joinedAt - b.joinedAt);
  const taken = new Set();
  const pairs = [];
  for (const a of list) {
    if (taken.has(a.socketId)) continue;
    let best = null;
    let bestDiff = Infinity;
    for (const b of list) {
      if (b === a || taken.has(b.socketId) || b.userId === a.userId) continue;
      const diff = Math.abs(a.rating - b.rating);
      const window = Math.max(windowFor(now - a.joinedAt), windowFor(now - b.joinedAt));
      if (diff <= window && diff < bestDiff) { best = b; bestDiff = diff; }
    }
    if (best) {
      taken.add(a.socketId);
      taken.add(best.socketId);
      pairs.push([a, best]);
    }
  }
  return pairs;
}

export function createQuickMatch({ manager, startRoom }) {
  const queue = new Map(); // socketId -> entry
  let timer = null;

  const entries = () => [...queue.values()].sort((a, b) => a.joinedAt - b.joinedAt);

  function statusFor(entry, now, inQueue) {
    const waited = now - entry.joinedAt;
    return { searching: true, waited, window: windowFor(waited), inQueue };
  }

  function tick() {
    const now = Date.now();
    for (const [a, b] of pairEntries(entries(), now)) {
      try { match(a, b); } catch (err) { console.error('Quick match error:', err.message); }
    }
    const rest = entries();
    for (const e of rest) e.socket.emit('queue:status', statusFor(e, now, rest.length));
    if (queue.size === 0 && timer) { clearInterval(timer); timer = null; }
  }

  function match(a, b) {
    // every tab of either user leaves the queue
    for (const [sid, e] of queue) if (e.userId === a.userId || e.userId === b.userId) queue.delete(sid);
    const genre = a.genre; // the longer waiter picks the genre
    const room = manager.create({ userId: a.userId, username: a.username, socketId: a.socket.id }, 'duel', { genre, rated: true });
    const { error } = manager.join({ userId: b.userId, username: b.username, socketId: b.socket.id }, room.code);
    if (error) {
      manager.leaveCurrent(a.userId);
      a.socket.emit('queue:error', { error });
      b.socket.emit('queue:error', { error });
      return;
    }
    room.ratings = { [a.userId]: a.rating, [b.userId]: b.rating };
    a.socket.join(room.code);
    b.socket.join(room.code);
    a.socket.emit('queue:matched', { code: room.code, opponent: { username: b.username, rating: b.rating } });
    b.socket.emit('queue:matched', { code: room.code, opponent: { username: a.username, rating: a.rating } });
    startRoom(room);
  }

  function attach(socket) {
    socket.on('queue:join', async (...args) => {
      const cb = args.find(x => typeof x === 'function');
      const opts = args.find(x => x && typeof x === 'object') || {};
      try {
        const u = socket.data.user;
        const user = await User.findById(u.userId).select('username rating');
        if (!user) return cb?.({ ok: false, error: 'User not found' });
        if (manager.roomOf(u.userId)?.state === 'playing') return cb?.({ ok: false, error: 'Finish your current game first' });
        const prev = queue.get(socket.id);
        const entry = {
          socketId: socket.id,
          socket,
          userId: String(u.userId),
          username: user.username || u.username,
          rating: Number.isFinite(user.rating) ? user.rating : 1000,
          genre: GENRES.has(opts.genre) ? opts.genre : 'fantasy',
          joinedAt: prev ? prev.joinedAt : Date.now(),
        };
        queue.set(socket.id, entry);
        if (!timer) timer = setInterval(tick, TICK_MS);
        const list = entries();
        const position = list.findIndex(e => e.socketId === socket.id) + 1;
        cb?.({ ok: true, rating: entry.rating, position });
        socket.emit('queue:status', statusFor(entry, Date.now(), list.length));
      } catch (err) {
        console.error('queue:join error:', err.message);
        cb?.({ ok: false, error: 'Queue unavailable' });
      }
    });

    socket.on('queue:leave', (...args) => {
      const cb = args.find(x => typeof x === 'function');
      queue.delete(socket.id);
      cb?.({ ok: true });
    });
  }

  function remove(socketId) {
    queue.delete(socketId);
  }

  return { attach, remove, size: () => queue.size };
}
