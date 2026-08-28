// Shared base for all mode engines. Engines are server-authoritative:
// clients send game events, the engine owns state and broadcasts snapshots.

export class BaseMode {
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.timers = new Set();
    this.stopped = false;
    this.startedAt = Date.now();
  }

  players() {
    return [...this.room.players.values()];
  }

  emit(event, data) {
    this.io.to(this.room.code).emit(event, data);
  }

  emitTo(player, event, data) {
    if (player.connected) this.io.to(player.socketId).emit(event, data);
  }

  after(ms, fn) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.stopped) fn();
    }, ms);
    this.timers.add(t);
    return t;
  }

  every(ms, fn) {
    const t = setInterval(() => {
      if (!this.stopped) fn();
    }, ms);
    this.timers.add(t);
    return t;
  }

  clearTimer(t) {
    clearTimeout(t);
    clearInterval(t);
    this.timers.delete(t);
  }

  stop() {
    this.stopped = true;
    for (const t of this.timers) {
      clearTimeout(t);
      clearInterval(t);
    }
    this.timers.clear();
  }

  finish(results) {
    if (this.stopped) return;
    this.room.state = 'ended';
    this.emit('game:over', { mode: this.room.mode, results });
    this.stop();
    if (this.onFinished) this.onFinished(results);
  }

  // Subclasses override
  start() {}
  onEvent(_player, _type, _data) {}
  onReconnect(_player) {}
}

// wpm from a progress report: correct chars / 5 per minute.
// Capped - a client reporting faster than any human is lying.
const WPM_CAP = 300;
export function wpmOf(chars, ms) {
  if (!ms || ms <= 0) return 0;
  return Math.min(WPM_CAP, Math.round((chars / 5) / (ms / 60000)));
}

export function accOf(chars, errors) {
  const total = chars + errors;
  if (total <= 0) return 100;
  return Math.max(0, Math.round((chars / total) * 100));
}
