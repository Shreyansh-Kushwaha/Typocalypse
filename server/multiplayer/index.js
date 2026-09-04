import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, corsOrigin } from '../config.js';
import { RoomManager, MODES } from './rooms.js';
import { createEngine } from './modes/index.js';
import MatchResult from '../models/MatchResult.js';
import { grant } from '../progression.js';
import { logActivity } from '../activity.js';
import { createQuickMatch } from './quickmatch.js';
import { createTournamentOrchestrator } from './tournaments.js';

const GENRES = new Set(['fantasy', 'horror', 'sci-fi', 'mystery', 'adventure', 'romance']);

// Who won, per mode, from the results object each engine emits
export function winnersOf(mode, results, players) {
  const ids = new Set();
  if (!results) return ids;
  if (results.winner?.userId) ids.add(results.winner.userId);
  if (mode === 'tug' && typeof results.winner === 'string' && results.teams) {
    const names = new Set(results.teams[results.winner] || []);
    for (const p of players) if (names.has(p.name)) ids.add(p.userId);
  }
  if (mode === 'sprint' && results.placements?.[0]?.userId) ids.add(results.placements[0].userId);
  if (mode === 'bossraid' && results.victory) for (const p of players) ids.add(p.userId);
  if (mode === 'corruptor') {
    if (results.crewWins) for (const p of players) { if (p.userId !== results.corruptor?.userId) ids.add(p.userId); }
    else if (results.corruptor?.userId) ids.add(results.corruptor.userId);
  }
  if (mode === 'relay') for (const p of players) ids.add(p.userId); // co-op story: everyone "wins"
  return ids;
}

// XP + achievements for everyone who played. Fire and forget.
export function rewardMatch(room, results) {
  if (room.mode === 'duel') return; // duel.js grants its own XP (and the rating) in its finish path
  const players = [...room.players.values()];
  const winners = winnersOf(room.mode, results, players);
  for (const p of players) {
    const won = winners.has(p.userId);
    const event = {
      type: 'match', mode: room.mode, won,
      wave: room.mode === 'horde' ? (results?.wavesCleared || 0) : undefined,
      role: room.mode === 'corruptor' && results?.corruptor?.userId === p.userId ? 'corruptor' : 'crew',
    };
    grant(p.userId, { xp: won ? 40 : 20, event }).catch(() => {});
    if (won && ['sprint', 'royale', 'wordwar', 'bossraid', 'tug', 'corruptor'].includes(room.mode)) {
      void logActivity(p.userId, p.name, 'match_win', { mode: room.mode, players: players.length });
    }
  }
}

export function initMultiplayer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  const manager = new RoomManager();
  const userSockets = new Map(); // userId -> Set<socketId> (a user may have several tabs)

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return next(new Error('Invalid token'));
      socket.data.user = { userId: String(user.userId), username: user.username };
      next();
    });
  });

  const broadcastRoom = (room) => {
    if (room) io.to(room.code).emit('room:update', room.snapshot());
  };

  const emitToUser = (userId, event, data) => {
    const set = userSockets.get(String(userId));
    if (!set) return 0;
    for (const sid of set) io.to(sid).emit(event, data);
    return set.size;
  };

  const saveResult = (room, results) => {
    MatchResult.create({
      roomCode: room.code,
      mode: room.mode,
      genre: room.settings.genre,
      players: [...room.players.values()].map(p => ({ userId: p.userId, name: p.name })),
      results,
    }).catch(err => console.error('Failed to save match result:', err.message));
    rewardMatch(room, results);
  };

  // Flip a lobby into a running game. Shared by the host's room:start, the
  // quick-match queue and the tournament orchestrator. `afterFinish` runs after
  // the result is saved and the room is back in the lobby.
  const startRoom = (room, afterFinish) => {
    room.state = 'playing';
    room.engine = createEngine(room, io);
    room.engine.onFinished = (results) => {
      saveResult(room, results);
      room.state = 'lobby';
      room.engine = null;
      for (const p of room.players.values()) p.ready = false;
      for (const p of [...room.players.values()]) {
        if (!p.connected) room.removePlayer(p.userId);
      }
      broadcastRoom(room);
      afterFinish?.(results);
    };
    io.to(room.code).emit('room:started', { mode: room.mode });
    broadcastRoom(room);
    room.engine.start();
  };

  const quickmatch = createQuickMatch({ manager, startRoom });
  const tournaments = createTournamentOrchestrator({ io, manager, startRoom, emitToUser, broadcastRoom });

  io.on('connection', (socket) => {
    const user = () => ({ ...socket.data.user, socketId: socket.id });
    const uid = socket.data.user.userId;
    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);

    socket.on('room:create', ({ mode, settings } = {}, cb) => {
      // only the genre is client-controlled; `rated` is reserved for the queue
      const clean = { genre: GENRES.has(settings?.genre) ? settings.genre : 'fantasy' };
      quickmatch.remove(socket.id);
      const room = manager.create(user(), mode, clean);
      socket.join(room.code);
      cb?.({ ok: true, room: room.snapshot() });
    });

    socket.on('room:join', ({ code } = {}, cb) => {
      const { room, error } = manager.join(user(), code);
      if (error) return cb?.({ ok: false, error });
      socket.join(room.code);
      cb?.({ ok: true, room: room.snapshot() });
      broadcastRoom(room);
      if (room.state === 'playing' && room.engine) {
        room.engine.onReconnect(room.players.get(socket.data.user.userId));
      } else if (room.system) {
        tournaments.onJoin(room);
      }
    });

    socket.on('room:leave', (...args) => {
      const cb = args.find(a => typeof a === 'function');
      const room = manager.roomOf(socket.data.user.userId);
      if (room) socket.leave(room.code);
      const remaining = manager.leaveCurrent(socket.data.user.userId);
      broadcastRoom(remaining);
      cb?.({ ok: true });
    });

    socket.on('room:ready', ({ ready } = {}) => {
      const room = manager.roomOf(socket.data.user.userId);
      if (!room || room.state !== 'lobby') return;
      const player = room.players.get(socket.data.user.userId);
      if (player) player.ready = !!ready;
      broadcastRoom(room);
    });

    socket.on('room:mode', ({ mode, settings } = {}) => {
      const room = manager.roomOf(socket.data.user.userId);
      if (!room || room.state !== 'lobby' || room.system) return;
      if (room.hostUserId !== socket.data.user.userId) return;
      if (MODES[mode]) room.mode = mode;
      if (settings?.genre && GENRES.has(settings.genre)) room.settings.genre = settings.genre;
      room.settings.rated = false; // a re-configured room is never rated
      for (const p of room.players.values()) p.ready = false;
      broadcastRoom(room);
    });

    socket.on('room:start', (...args) => {
      const cb = args.find(a => typeof a === 'function');
      const room = manager.roomOf(socket.data.user.userId);
      if (!room || room.state !== 'lobby') return cb?.({ ok: false, error: 'No room' });
      if (room.system) return cb?.({ ok: false, error: 'Tournament rooms start automatically' });
      if (room.hostUserId !== socket.data.user.userId) {
        return cb?.({ ok: false, error: 'Only the host can start' });
      }
      const limits = MODES[room.mode];
      const count = room.connectedPlayers().length;
      if (count < limits.min) {
        return cb?.({ ok: false, error: `${limits.name} needs at least ${limits.min} players` });
      }
      const notReady = room.connectedPlayers().filter(p => !p.ready && !p.isHost);
      if (notReady.length > 0) {
        return cb?.({ ok: false, error: 'Everyone must be ready' });
      }
      room.settings.rated = false; // host-started duels are friendlies
      startRoom(room);
      cb?.({ ok: true });
    });

    socket.on('chat:send', ({ text } = {}) => {
      const room = manager.roomOf(socket.data.user.userId);
      if (!room || typeof text !== 'string') return;
      const clean = text.slice(0, 200).trim();
      if (!clean) return;
      io.to(room.code).emit('chat:msg', {
        from: socket.data.user.username,
        userId: socket.data.user.userId,
        text: clean,
        at: Date.now(),
      });
    });

    socket.on('game:event', ({ type, data } = {}) => {
      const room = manager.roomOf(socket.data.user.userId);
      if (!room || !room.engine || room.state !== 'playing') return;
      const player = room.players.get(socket.data.user.userId);
      if (!player) return;
      try {
        room.engine.onEvent(player, type, data || {});
      } catch (err) {
        console.error(`Engine error in ${room.mode}/${type}:`, err.message);
      }
    });

    quickmatch.attach(socket);

    socket.on('disconnect', () => {
      quickmatch.remove(socket.id);
      const set = userSockets.get(uid);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(uid);
      }
      // another tab of the same user still holds the seat
      const room = manager.roomOf(uid);
      if (room && room.players.get(uid)?.socketId !== socket.id) return;
      broadcastRoom(manager.disconnect(uid));
    });
  });

  tournaments.start();

  return io;
}
