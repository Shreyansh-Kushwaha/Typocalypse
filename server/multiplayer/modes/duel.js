import { BaseMode, wpmOf, accOf } from './base.js';
import { getPassage } from '../content.js';
import User from '../../models/User.js';
import { elo } from '../../elo.js';
import { grant } from '../../progression.js';
import { logActivity } from '../../activity.js';

const LEGS_TO_WIN = 2;          // best of three
const MAX_LEGS = 3;
const LEG_COUNTDOWN = 3000;
const QUEUE_FIRST_LEG_EXTRA = 3000; // queue-made rooms: give both clients time to land on the room page
const LEG_TIMEOUT = 90000;
const FORFEIT_MS = 20000;       // a player gone this long forfeits the duel

// Duel - two players, best of three passages, head to head. Rated when the
// quick-match queue built the room (room.settings.rated).
export class DuelMode extends BaseMode {
  start() {
    this.leg = 0;
    this.legs = [];                       // [{ leg, winner, wpmA, wpmB, wpm: {userId: n} }]
    this.score = new Map();               // userId -> legs won
    this.used = new Set();                // passages already raced
    this.finished = false;
    this.disconnectedSince = new Map();   // userId -> ms
    for (const p of this.players()) this.score.set(p.userId, 0);
    this.every(500, () => {
      this.broadcastProgress();
      this.checkForfeit();
    });
    this.nextLeg();
  }

  rated() {
    return !!this.room.settings?.rated;
  }

  scoreObj() {
    const out = {};
    for (const [id, n] of this.score) out[id] = n;
    return out;
  }

  playerList() {
    return this.players().map(p => ({ userId: p.userId, name: p.name, rating: this.room.ratings?.[p.userId] ?? null }));
  }

  legPayload() {
    return {
      leg: this.leg,
      bestOf: MAX_LEGS,
      legsToWin: LEGS_TO_WIN,
      text: this.legText,
      startAt: this.legStart,
      timeoutAt: this.legStart + LEG_TIMEOUT,
      score: this.scoreObj(),
      players: this.playerList(),
      rated: this.rated(),
    };
  }

  pickPassage() {
    const genre = this.room.settings.genre;
    let text = getPassage(genre);
    for (let i = 0; i < 12 && this.used.has(text); i++) text = getPassage(genre);
    this.used.add(text);
    return text;
  }

  nextLeg() {
    if (this.finished) return;
    this.leg += 1;
    this.legText = this.pickPassage();
    const extra = this.leg === 1 && this.rated() ? QUEUE_FIRST_LEG_EXTRA : 0;
    this.legStart = Date.now() + LEG_COUNTDOWN + extra;
    this.legDone = false;
    this.progress = new Map();
    for (const p of this.players()) {
      this.progress.set(p.userId, { chars: 0, errors: 0, done: false, finishedAt: null });
    }
    this.emit('duel:leg', this.legPayload());
    this.legTimer = this.after(LEG_TIMEOUT + LEG_COUNTDOWN + extra, () => this.endLeg(null, 'timeout'));
  }

  onEvent(player, type, data) {
    if (type !== 'progress') return;
    const prog = this.progress?.get(player.userId);
    if (!prog || prog.done || this.legDone || this.finished) return;
    if (Date.now() < this.legStart) return; // nothing counts before the gun
    prog.chars = Math.min(Math.max(0, Number(data.chars) || 0), this.legText.length);
    prog.errors = Math.max(prog.errors, Math.min(100000, Number(data.errors) || 0));
    // plausibility: faster than any human means a lying client - ignore the report
    const elapsed = Date.now() - this.legStart;
    if (elapsed > 0 && (prog.chars / 5) / (elapsed / 60000) > 320) prog.chars = Math.min(prog.chars, Math.floor((320 * elapsed / 60000) * 5));
    if (data.done && prog.chars >= this.legText.length) {
      prog.done = true;
      prog.finishedAt = Date.now();
      this.endLeg(player, 'finish');
    }
  }

  legScore(userId) {
    const prog = this.progress.get(userId) || { chars: 0, errors: 0, finishedAt: null };
    const elapsed = Math.max(1, (prog.finishedAt || Date.now()) - this.legStart);
    const wpm = wpmOf(prog.chars, elapsed);
    const acc = accOf(prog.chars, prog.errors);
    return { wpm, acc, chars: prog.chars, done: !!prog.done };
  }

  endLeg(winner, reason = 'finish') {
    if (this.legDone || this.finished) return;
    this.legDone = true;
    this.clearTimer(this.legTimer);

    const players = this.players();
    // Timeout with no finisher: most correct chars, then fewest errors
    if (!winner) {
      let best = null;
      for (const p of players) {
        const prog = this.progress.get(p.userId) || { chars: 0, errors: 0 };
        const bp = best ? this.progress.get(best.userId) : null;
        if (!best || prog.chars > bp.chars || (prog.chars === bp.chars && prog.errors < bp.errors)) best = p;
      }
      winner = best;
    }
    if (!winner) return this.finishDuel();

    const scores = {};
    const wpm = {};
    for (const p of players) {
      const s = this.legScore(p.userId);
      scores[p.userId] = { name: p.name, ...s };
      wpm[p.userId] = s.wpm;
    }
    this.score.set(winner.userId, (this.score.get(winner.userId) || 0) + 1);
    const [a, b] = players;
    this.legs.push({
      leg: this.leg,
      winner: { userId: winner.userId, name: winner.name },
      wpmA: wpm[a?.userId] ?? 0,
      wpmB: wpm[b?.userId] ?? 0,
      wpm,
      reason,
    });
    this.emit('duel:legend', {
      leg: this.leg,
      winner: { userId: winner.userId, name: winner.name },
      scores,
      score: this.scoreObj(),
      reason,
    });

    const decided = this.score.get(winner.userId) >= LEGS_TO_WIN || this.leg >= MAX_LEGS;
    if (decided) return this.after(2500, () => this.finishDuel());
    this.after(3000, () => this.nextLeg());
  }

  // A player who vanished for FORFEIT_MS hands the remaining legs to the other
  checkForfeit() {
    if (this.finished || this.legDone) return;
    const now = Date.now();
    for (const p of this.players()) {
      if (p.connected) { this.disconnectedSince.delete(p.userId); continue; }
      if (!this.disconnectedSince.has(p.userId)) this.disconnectedSince.set(p.userId, now);
      if (now - this.disconnectedSince.get(p.userId) >= FORFEIT_MS) {
        const other = this.players().find(o => o.userId !== p.userId && o.connected);
        if (!other) return;
        this.legDone = true;
        this.clearTimer(this.legTimer);
        this.score.set(other.userId, LEGS_TO_WIN);
        this.legs.push({ leg: this.leg, winner: { userId: other.userId, name: other.name }, wpmA: 0, wpmB: 0, wpm: {}, reason: 'forfeit' });
        this.emit('duel:legend', {
          leg: this.leg,
          winner: { userId: other.userId, name: other.name },
          scores: {},
          score: this.scoreObj(),
          reason: 'forfeit',
        });
        return this.after(1500, () => this.finishDuel());
      }
    }
  }

  broadcastProgress() {
    if (!this.progress || this.legDone || this.finished) return;
    const now = Date.now();
    const players = this.players().map(p => {
      const prog = this.progress.get(p.userId) || { chars: 0, errors: 0, done: false };
      const elapsed = Math.max(1, now - this.legStart);
      return {
        userId: p.userId,
        name: p.name,
        pct: Math.round((prog.chars / this.legText.length) * 100),
        wpm: this.legStart < now ? wpmOf(prog.chars, elapsed) : 0,
        acc: accOf(prog.chars, prog.errors),
        done: prog.done,
        connected: p.connected,
      };
    });
    this.emit('duel:progress', { players, score: this.scoreObj() });
  }

  finishDuel() {
    if (this.finished || this.stopped) return;
    this.finished = true;
    const players = this.players();
    const ranked = [...players].sort((x, y) => (this.score.get(y.userId) || 0) - (this.score.get(x.userId) || 0));
    const winner = ranked[0];
    const loser = ranked[1] || null;
    const base = {
      winner: winner ? { userId: winner.userId, name: winner.name } : null,
      loser: loser ? { userId: loser.userId, name: loser.name } : null,
      legs: this.legs.map(l => ({ leg: l.leg, winner: l.winner, wpmA: l.wpmA, wpmB: l.wpmB, wpm: l.wpm, reason: l.reason })),
      score: this.scoreObj(),
      rated: false,
      ratingDelta: {},
      ratings: {},
    };
    if (!winner || !loser) return this.finish(base);

    this.applyRewards(winner, loser)
      .then(extra => this.finish({ ...base, ...extra }))
      .catch(err => {
        console.error('Duel reward error:', err.message);
        this.finish(base);
      });
  }

  // Rated: Elo + counters + duel XP. Unrated: plain match XP, no rating change.
  async applyRewards(winner, loser) {
    const opponentOf = (p) => (p.userId === winner.userId ? loser : winner);
    if (!this.rated()) {
      for (const p of [winner, loser]) {
        const won = p.userId === winner.userId;
        grant(p.userId, { xp: won ? 30 : 10, event: { type: 'match', mode: 'duel', won } }).catch(() => {});
      }
      return { rated: false, ratingDelta: {}, ratings: {} };
    }
    const [uw, ul] = await Promise.all([User.findById(winner.userId), User.findById(loser.userId)]);
    if (!uw || !ul) return { rated: false, ratingDelta: {}, ratings: {} };
    const r = elo(uw.rating ?? 1000, ul.rating ?? 1000, 1);
    uw.rating = r.a; uw.ratingGames = (uw.ratingGames || 0) + 1; uw.duelWins = (uw.duelWins || 0) + 1;
    ul.rating = r.b; ul.ratingGames = (ul.ratingGames || 0) + 1; ul.duelLosses = (ul.duelLosses || 0) + 1;
    await uw.save();
    await ul.save();
    const ratingDelta = { [winner.userId]: r.deltaA, [loser.userId]: r.deltaB };
    const ratings = { [winner.userId]: r.a, [loser.userId]: r.b };
    // grant after the rating saves so the achievement checks see the new rating
    await grant(winner.userId, { xp: 30, event: { type: 'duel', won: true } }).catch(() => {});
    await grant(loser.userId, { xp: 10, event: { type: 'duel', won: false } }).catch(() => {});
    void logActivity(winner.userId, winner.name, 'duel', { opponent: opponentOf(winner).name, won: true, delta: r.deltaA, rating: r.a });
    void logActivity(loser.userId, loser.name, 'duel', { opponent: opponentOf(loser).name, won: false, delta: r.deltaB, rating: r.b });
    return { rated: true, ratingDelta, ratings };
  }

  onReconnect(player) {
    if (this.finished || !this.legText) return;
    this.emitTo(player, 'duel:leg', this.legPayload());
  }
}
