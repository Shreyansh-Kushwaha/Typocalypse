// Room manager - lobby lifecycle shared by every multiplayer mode.

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const MODES = {
  sprint:    { name: 'Story Sprint',     min: 2, max: 8 },
  royale:    { name: 'Typo Royale',      min: 2, max: 20 },
  wordwar:   { name: 'Word War',         min: 2, max: 4 },
  horde:     { name: 'Horde Night',      min: 1, max: 4 },
  bossraid:  { name: 'Boss Raid',        min: 1, max: 5 },
  relay:     { name: 'Relay Chronicles', min: 2, max: 6 },
  corruptor: { name: 'The Corruptor',    min: 3, max: 8 },
  tug:       { name: 'Tug of Words',     min: 2, max: 10 },
  duel:      { name: 'Duel',             min: 2, max: 2 },
};

export class Room {
  constructor(code, hostUserId, mode, settings = {}) {
    this.code = code;
    this.hostUserId = hostUserId; // null for system (tournament) rooms
    this.mode = MODES[mode] ? mode : 'sprint';
    this.settings = { genre: settings.genre || 'fantasy', rated: !!settings.rated };
    this.state = 'lobby'; // lobby | playing | ended
    this.players = new Map(); // userId -> player
    this.engine = null;
    this.createdAt = Date.now();
    // System rooms are created by the server (tournament heats): no host, started
    // by the orchestrator, invite-only, and pinned so they survive being empty.
    this.system = false;
    this.pinned = false;
    this.startsAt = null;     // auto-start deadline (ms) shown as a lobby countdown
    this.tournament = null;   // { slug, name, stage: 'heat' | 'final', done? }
    this.allowed = null;      // Set<userId> or null for anyone with the code
    this.onAbandoned = null;  // manager calls this when it destroys a room mid-game
    this.ratings = null;      // { userId: rating } for rated duels (display only)
  }

  addPlayer({ userId, username, socketId }) {
    const existing = this.players.get(userId);
    if (existing) {
      existing.socketId = socketId;
      existing.connected = true;
      return existing;
    }
    const player = {
      userId,
      name: username,
      socketId,
      ready: false,
      connected: true,
      isHost: !!this.hostUserId && userId === this.hostUserId,
    };
    this.players.set(userId, player);
    return player;
  }

  removePlayer(userId) {
    this.players.delete(userId);
    if (this.hostUserId && userId === this.hostUserId && this.players.size > 0) {
      const next = this.players.values().next().value;
      this.hostUserId = next.userId;
      next.isHost = true;
    }
  }

  connectedPlayers() {
    return [...this.players.values()].filter(p => p.connected);
  }

  snapshot() {
    return {
      code: this.code,
      mode: this.mode,
      modeName: MODES[this.mode].name,
      settings: this.settings,
      state: this.state,
      hostUserId: this.hostUserId,
      system: this.system,
      startsAt: this.startsAt,
      tournament: this.tournament,
      ratings: this.ratings,
      players: [...this.players.values()].map(p => ({
        userId: p.userId,
        name: p.name,
        ready: p.ready,
        connected: p.connected,
        isHost: p.isHost,
      })),
      limits: MODES[this.mode],
    };
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // code -> Room
    this.byUser = new Map(); // userId -> code
  }

  generateCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  create(user, mode, settings) {
    this.leaveCurrent(user.userId);
    const room = new Room(this.generateCode(), user.userId, mode, settings);
    room.addPlayer(user);
    this.rooms.set(room.code, room);
    this.byUser.set(user.userId, room.code);
    return room;
  }

  // Server-made room with no host. Pinned until released so it survives empty
  // during the join window; only `allowed` users may join.
  createSystem(mode, settings, { allowed = null, startsAt = null, tournament = null } = {}) {
    const room = new Room(this.generateCode(), null, mode, settings);
    room.system = true;
    room.pinned = true;
    room.allowed = allowed ? new Set(allowed.map(String)) : null;
    room.startsAt = startsAt;
    room.tournament = tournament;
    this.rooms.set(room.code, room);
    return room;
  }

  join(user, code) {
    const room = this.rooms.get(String(code || '').toUpperCase());
    if (!room) return { error: 'Room not found' };
    if (room.allowed && !room.allowed.has(String(user.userId))) return { error: 'This tournament room is invite-only' };
    const limits = MODES[room.mode];
    const rejoining = room.players.has(user.userId);
    if (!rejoining && room.state !== 'lobby') return { error: 'Game already in progress' };
    if (!rejoining && room.players.size >= limits.max) return { error: 'Room is full' };
    this.leaveCurrent(user.userId, room.code);
    room.addPlayer(user);
    this.byUser.set(user.userId, room.code);
    return { room };
  }

  leaveCurrent(userId, exceptCode = null) {
    const code = this.byUser.get(userId);
    if (!code || code === exceptCode) return null;
    const room = this.rooms.get(code);
    this.byUser.delete(userId);
    if (!room) return null;
    room.removePlayer(userId);
    if (room.players.size === 0) {
      if (room.pinned) return room; // tournament room waits for its deadline
      if (room.engine) room.engine.stop();
      this.rooms.delete(code);
      return null;
    }
    return room;
  }

  roomOf(userId) {
    const code = this.byUser.get(userId);
    return code ? this.rooms.get(code) : undefined;
  }

  disconnect(userId) {
    const room = this.roomOf(userId);
    if (!room) return null;
    const player = room.players.get(userId);
    if (player) player.connected = false;
    // In the lobby a disconnect is a leave; mid-game we keep the seat for reconnects
    if (room.state === 'lobby') return this.leaveCurrent(userId);
    if (room.connectedPlayers().length === 0) {
      this.destroy(room);
      return null;
    }
    return room;
  }

  // Tear a room down: stop its engine, forget every seat, tell whoever owns it.
  destroy(room, { silent = false } = {}) {
    if (!room || !this.rooms.has(room.code)) return;
    const engine = room.engine;
    room.engine = null;
    if (engine) engine.stop();
    this.rooms.delete(room.code);
    for (const p of room.players.values()) {
      if (this.byUser.get(p.userId) === room.code) this.byUser.delete(p.userId);
    }
    if (!silent && engine) room.onAbandoned?.();
  }

  // Unpin a system room; an empty one is dropped right away.
  release(room) {
    room.pinned = false;
    if (room.players.size === 0) this.rooms.delete(room.code);
  }
}
