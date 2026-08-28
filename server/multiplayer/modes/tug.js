import { BaseMode } from './base.js';
import { randomWords, POWER_WORDS, pick } from '../content.js';

const GOAL = 100;
const PULL_MS = 180000;
const PULL_SCALE = 0.18;
const TYPO_MUTE_MS = 2000;
const POWER_EVERY = 20000;
const POWER_BURST = 8;
const BEST_OF = 3;

// Tug of Words - combined live WPM pulls the knot, first team to their goal.
export class TugMode extends BaseMode {
  start() {
    this.teams = { teal: [], crimson: [] };
    const ps = this.players();
    ps.forEach((p, i) => this.teams[i % 2 === 0 ? 'teal' : 'crimson'].push(p.userId));
    this.wins = { teal: 0, crimson: 0 };
    this.pullNumber = 0;
    this.contrib = new Map(); // userId -> {events: [{at, chars}], mutedUntil}
    for (const p of ps) this.contrib.set(p.userId, { events: [], mutedUntil: 0 });
    this.emit('tug:teams', {
      teal: this.teams.teal.map(id => this.nameOf(id)),
      crimson: this.teams.crimson.map(id => this.nameOf(id)),
      bestOf: BEST_OF,
    });
    for (const p of ps) this.sendWords(p);
    this.after(3000, () => this.startPull());
  }

  nameOf(id) {
    return { userId: id, name: this.room.players.get(id)?.name || '?' };
  }

  teamOf(userId) {
    return this.teams.teal.includes(userId) ? 'teal' : 'crimson';
  }

  sendWords(player) {
    this.emitTo(player, 'tug:words', { words: randomWords(30) });
  }

  startPull() {
    this.pullNumber += 1;
    this.knot = 0;
    this.pullEndsAt = Date.now() + PULL_MS;
    this.pullActive = true;
    this.powerWord = null;
    for (const c of this.contrib.values()) c.events = [];
    this.emit('tug:pull', { pull: this.pullNumber, endsAt: this.pullEndsAt, wins: this.wins });
    this.tick = this.every(1000, () => this.step());
    this.powerTimer = this.every(POWER_EVERY, () => this.spawnPower());
    this.pullTimer = this.after(PULL_MS, () => this.timeUp());
  }

  spawnPower() {
    if (!this.pullActive) return;
    this.powerWord = { id: Date.now(), word: pick(POWER_WORDS) };
    this.emit('tug:power', this.powerWord);
  }

  teamPull(team) {
    const now = Date.now();
    let chars = 0;
    for (const id of this.teams[team]) {
      const c = this.contrib.get(id);
      if (!c || now < c.mutedUntil) continue;
      c.events = c.events.filter(e => now - e.at < 5000);
      chars += c.events.reduce((a, e) => a + e.chars, 0);
    }
    // rolling 5s window of chars -> wpm
    return Math.round((chars / 5) * 12);
  }

  step() {
    if (!this.pullActive) return;
    const teal = this.teamPull('teal');
    const crimson = this.teamPull('crimson');
    // teal pulls toward -100, crimson toward +100
    this.knot = Math.max(-GOAL, Math.min(GOAL, this.knot + (crimson - teal) * PULL_SCALE));
    this.emit('tug:state', {
      knot: Math.round(this.knot * 10) / 10,
      teal,
      crimson,
      endsAt: this.pullEndsAt,
      wins: this.wins,
      pull: this.pullNumber,
    });
    if (this.knot <= -GOAL) this.endPull('teal');
    else if (this.knot >= GOAL) this.endPull('crimson');
  }

  timeUp() {
    if (!this.pullActive) return;
    if (this.knot < 0) this.endPull('teal');
    else if (this.knot > 0) this.endPull('crimson');
    else this.pullEndsAt = Date.now() + 30000; // dead center - sudden death overtime
  }

  endPull(team) {
    this.pullActive = false;
    this.clearTimer(this.tick);
    this.clearTimer(this.powerTimer);
    this.clearTimer(this.pullTimer);
    this.wins[team] += 1;
    this.emit('tug:pullwon', { team, wins: this.wins });
    const needed = Math.ceil(BEST_OF / 2);
    if (this.wins[team] >= needed) return this.after(2500, () => this.finishTug(team));
    this.after(5000, () => this.startPull());
  }

  onEvent(player, type, data) {
    const c = this.contrib.get(player.userId);
    if (!c || !this.pullActive) return;
    if (type === 'word') {
      const len = Math.max(1, Math.min(20, Number(data.len) || 0));
      c.events.push({ at: Date.now(), chars: len + 1 });
    } else if (type === 'typo') {
      c.mutedUntil = Date.now() + TYPO_MUTE_MS;
      this.emit('tug:slip', { name: player.name, team: this.teamOf(player.userId) });
    } else if (type === 'power') {
      if (this.powerWord && data.id === this.powerWord.id && data.word === this.powerWord.word) {
        const team = this.teamOf(player.userId);
        this.powerWord = null;
        this.knot += team === 'teal' ? -POWER_BURST : POWER_BURST;
        this.emit('tug:yank', { by: player.name, team });
      }
    } else if (type === 'need-words') {
      this.sendWords(player);
    }
  }

  finishTug(team) {
    this.finish({
      winner: team,
      wins: this.wins,
      teams: {
        teal: this.teams.teal.map(id => this.nameOf(id)),
        crimson: this.teams.crimson.map(id => this.nameOf(id)),
      },
    });
  }

  onReconnect(player) {
    this.emitTo(player, 'tug:teams', {
      teal: this.teams.teal.map(id => this.nameOf(id)),
      crimson: this.teams.crimson.map(id => this.nameOf(id)),
      bestOf: BEST_OF,
    });
    this.sendWords(player);
  }
}
