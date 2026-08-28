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
};

export class Room {
  constructor(code, hostUserId, mode, settings = {}) {
    this.code = code;
    this.hostUserId = hostUserId;
    this.mode = MODES[mode] ? mode : 'sprint';
    this.settings = { genre: settings.genre || 'fantasy' };
    this.state = 'lobby'; // lobby | playing | ended
    this.players = new Map(); // userId -> player
    this.engine = null;
    this.createdAt = Date.now();
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
      isHost: userId === this.hostUserId,
    };
    this.players.set(userId, player);
    return player;
  }

  removePlayer(userId) {
    this.players.delete(userId);
    if (userId === this.hostUserId && this.players.size > 0) {
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

  join(user, code) {
    const room = this.rooms.get(String(code || '').toUpperCase());
    if (!room) return { error: 'Room not found' };
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
      if (room.engine) room.engine.stop();
      this.rooms.delete(room.code);
      for (const p of room.players.values()) this.byUser.delete(p.userId);
      return null;
    }
    return room;
  }
}
