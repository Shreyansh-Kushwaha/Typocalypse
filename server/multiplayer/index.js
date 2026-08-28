import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { RoomManager, MODES } from './rooms.js';
import { createEngine } from './modes/index.js';
import MatchResult from '../models/MatchResult.js';

export function initMultiplayer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  const manager = new RoomManager();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) return next(new Error('Invalid token'));
      socket.data.user = { userId: user.userId, username: user.username };
      next();
    });
  });

  const broadcastRoom = (room) => {
    if (room) io.to(room.code).emit('room:update', room.snapshot());
  };

  const saveResult = (room, results) => {
    MatchResult.create({
      roomCode: room.code,
      mode: room.mode,
      genre: room.settings.genre,
      players: [...room.players.values()].map(p => ({ userId: p.userId, name: p.name })),
      results,
    }).catch(err => console.error('Failed to save match result:', err.message));
  };

  io.on('connection', (socket) => {
    const user = () => ({ ...socket.data.user, socketId: socket.id });

    socket.on('room:create', ({ mode, settings } = {}, cb) => {
      const room = manager.create(user(), mode, settings || {});
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
      if (!room || room.state !== 'lobby') return;
      if (room.hostUserId !== socket.data.user.userId) return;
      if (MODES[mode]) room.mode = mode;
      if (settings?.genre) room.settings.genre = settings.genre;
      for (const p of room.players.values()) p.ready = false;
      broadcastRoom(room);
    });

    socket.on('room:start', (...args) => {
      const cb = args.find(a => typeof a === 'function');
      const room = manager.roomOf(socket.data.user.userId);
      if (!room || room.state !== 'lobby') return cb?.({ ok: false, error: 'No room' });
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
      };
      io.to(room.code).emit('room:started', { mode: room.mode });
      broadcastRoom(room);
      room.engine.start();
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

    socket.on('disconnect', () => {
      const room = manager.disconnect(socket.data.user.userId);
      broadcastRoom(room);
    });
  });

  return io;
}
