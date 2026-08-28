import { BaseMode } from './base.js';
import { COMMON_WORDS, JUNK_WORDS, pick } from '../content.js';

const QUEUE_CAP = 10;
const STREAK_FOR_ATTACK = 5;
const JUNK_PER_ATTACK = 2;
const MATCH_MS = 4 * 60 * 1000;
const START_DRIP = 3000;
const MIN_DRIP = 1400;

// Word War - clear your queue, streaks dump junk words on opponents.
export class WordWarMode extends BaseMode {
  start() {
    this.state = new Map(); // userId -> {queue, streak, points, alive}
    for (const p of this.players()) {
      this.state.set(p.userId, { queue: [], streak: 0, points: 0, alive: true, cleared: 0 });
    }
    this.drip = START_DRIP;
    this.endsAt = Date.now() + MATCH_MS;
    this.emit('wordwar:start', { endsAt: this.endsAt, cap: QUEUE_CAP });
    for (let i = 0; i < 3; i++) this.dripAll(); // opening hand
    this.scheduleDrip();
    this.every(1000, () => this.broadcast());
    this.after(MATCH_MS, () => this.horn());
  }

  aliveIds() {
    return [...this.state.entries()].filter(([, s]) => s.alive).map(([id]) => id);
  }

  scheduleDrip() {
    this.after(this.drip, () => {
      this.dripAll();
      this.drip = Math.max(MIN_DRIP, this.drip * 0.97);
      if (this.aliveIds().length > 1) this.scheduleDrip();
    });
  }

  dripAll() {
    for (const id of this.aliveIds()) {
      this.pushWord(id, { word: pick(COMMON_WORDS), junk: false, from: null });
    }
  }

  pushWord(userId, entry) {
    const s = this.state.get(userId);
    if (!s || !s.alive) return;
    if (s.queue.length >= QUEUE_CAP) return this.eliminate(userId);
    s.queue.push(entry);
    if (s.queue.length >= QUEUE_CAP) this.eliminate(userId);
  }

  eliminate(userId) {
    const s = this.state.get(userId);
    if (!s || !s.alive) return;
    s.alive = false;
    this.emit('wordwar:eliminated', { userId, name: this.room.players.get(userId)?.name || '?' });
    const alive = this.aliveIds();
    if (alive.length <= 1) this.after(1500, () => this.finishWar(alive[0] || null));
  }

  onEvent(player, type, data) {
    const s = this.state.get(player.userId);
    if (!s || !s.alive) return;
    if (type === 'word') {
      const idx = s.queue.findIndex(e => e.word === data.word);
      if (idx === -1) return;
      const [entry] = s.queue.splice(idx, 1);
      s.points += entry.junk ? 2 : 1;
      s.cleared += 1;
      s.streak += 1;
      if (s.streak >= STREAK_FOR_ATTACK) {
        s.streak = 0;
        this.attackFrom(player);
      }
      this.broadcast();
    } else if (type === 'typo') {
      s.streak = 0;
    }
  }

  attackFrom(attacker) {
    const targets = this.aliveIds().filter(id => id !== attacker.userId);
    if (targets.length === 0) return;
    const targetId = pick(targets);
    for (let i = 0; i < JUNK_PER_ATTACK; i++) {
      this.pushWord(targetId, { word: pick(JUNK_WORDS), junk: true, from: attacker.name });
    }
    this.emit('wordwar:attack', {
      from: { userId: attacker.userId, name: attacker.name },
      to: { userId: targetId, name: this.room.players.get(targetId)?.name || '?' },
      count: JUNK_PER_ATTACK,
    });
  }

  horn() {
    const alive = this.aliveIds();
    if (alive.length <= 1) return;
    // Smallest queue wins at the horn, points break ties
    const winner = alive.sort((a, b) => {
      const sa = this.state.get(a);
      const sb = this.state.get(b);
      return sa.queue.length - sb.queue.length || sb.points - sa.points;
    })[0];
    this.finishWar(winner);
  }

  finishWar(winnerId) {
    if (this.stopped || this.room.state === 'ended') return;
    const results = [...this.state.entries()].map(([id, s]) => ({
      userId: id,
      name: this.room.players.get(id)?.name || '?',
      points: s.points,
      cleared: s.cleared,
      survived: s.alive,
    })).sort((a, b) => (b.userId === winnerId ? 1 : 0) - (a.userId === winnerId ? 1 : 0) || b.points - a.points);
    this.finish({
      winner: winnerId ? { userId: winnerId, name: this.room.players.get(winnerId)?.name || '?' } : null,
      placements: results,
    });
  }

  broadcast() {
    const players = [...this.state.entries()].map(([id, s]) => ({
      userId: id,
      name: this.room.players.get(id)?.name || '?',
      queue: s.queue,
      streak: s.streak,
      points: s.points,
      alive: s.alive,
    }));
    this.emit('wordwar:state', { players, endsAt: this.endsAt });
  }

  onReconnect(player) {
    this.emitTo(player, 'wordwar:start', { endsAt: this.endsAt, cap: QUEUE_CAP });
    this.broadcast();
  }
}
