import { BaseMode, wpmOf, accOf } from './base.js';
import { getBurst } from '../content.js';

const START_TIMER = 30000;
const TIMER_STEP = 2000;
const MIN_TIMER = 12000;
const BET_POINTS = 10;

// Typo Royale - the slowest survivor is eliminated every round.
export class RoyaleMode extends BaseMode {
  start() {
    this.round = 0;
    this.alive = new Set(this.players().map(p => p.userId));
    this.betPoints = new Map(); // userId -> spectator points
    this.placements = []; // filled from last place up
    this.every(1000, () => this.broadcastStandings());
    this.nextRound();
  }

  roundTimer() {
    return Math.max(MIN_TIMER, START_TIMER - (this.round - 1) * TIMER_STEP);
  }

  nextRound() {
    this.round += 1;
    this.text = getBurst(25);
    this.startAt = Date.now() + 3000;
    this.endsAt = this.startAt + this.roundTimer();
    this.progress = new Map();
    this.bets = new Map(); // spectator userId -> target userId
    for (const id of this.alive) this.progress.set(id, { chars: 0, errors: 0 });
    this.emit('royale:round', {
      round: this.round,
      text: this.text,
      startAt: this.startAt,
      endsAt: this.endsAt,
      alive: [...this.alive],
      nextTimerMs: Math.max(MIN_TIMER, this.roundTimer() - TIMER_STEP),
    });
    this.after(this.endsAt - Date.now(), () => this.endRound());
  }

  onEvent(player, type, data) {
    if (type === 'progress' && this.alive.has(player.userId)) {
      const prog = this.progress.get(player.userId);
      if (!prog) return;
      prog.chars = Math.min(Number(data.chars) || 0, this.text.length);
      prog.errors = Math.max(prog.errors, Number(data.errors) || 0);
    } else if (type === 'bet' && !this.alive.has(player.userId)) {
      if (this.alive.has(data.targetId)) this.bets.set(player.userId, data.targetId);
    }
  }

  scoreOf(userId) {
    const prog = this.progress.get(userId) || { chars: 0, errors: 0 };
    const elapsed = Math.min(Date.now(), this.endsAt) - this.startAt;
    const wpm = wpmOf(prog.chars, Math.max(1, elapsed));
    const acc = accOf(prog.chars, prog.errors);
    return { wpm, acc, score: wpm * acc / 100, chars: prog.chars };
  }

  endRound() {
    // Lowest score among the living is knocked out
    let loser = null;
    let loserScore = Infinity;
    const scores = {};
    for (const id of this.alive) {
      const s = this.scoreOf(id);
      scores[id] = s;
      if (s.score < loserScore || (s.score === loserScore && s.chars < (scores[loser]?.chars ?? 0))) {
        loser = id;
        loserScore = s.score;
      }
    }

    if (this.alive.size > 1 && loser) {
      this.alive.delete(loser);
      const player = this.room.players.get(loser);
      this.placements.unshift({ userId: loser, name: player?.name || '?', round: this.round });
      this.emit('royale:eliminated', {
        round: this.round,
        userId: loser,
        name: player?.name || '?',
        scores: this.publicScores(scores),
      });
    }

    // Settle spectator bets - a bet pays if the target survived the cut
    for (const [bettor, target] of this.bets) {
      if (this.alive.has(target)) {
        this.betPoints.set(bettor, (this.betPoints.get(bettor) || 0) + BET_POINTS);
      }
    }

    if (this.alive.size <= 1) return this.after(2500, () => this.finishRoyale());
    this.after(4000, () => this.nextRound());
  }

  publicScores(scores) {
    const out = {};
    for (const [id, s] of Object.entries(scores)) {
      out[id] = { wpm: s.wpm, acc: s.acc, name: this.room.players.get(id)?.name || '?' };
    }
    return out;
  }

  broadcastStandings() {
    if (!this.progress) return;
    const standings = [...this.alive].map(id => {
      const s = this.scoreOf(id);
      return { userId: id, name: this.room.players.get(id)?.name || '?', wpm: s.wpm, acc: s.acc };
    }).sort((a, b) => (b.wpm * b.acc) - (a.wpm * a.acc));
    this.emit('royale:standings', { standings, remaining: this.alive.size });
  }

  finishRoyale() {
    const winnerId = [...this.alive][0];
    const winner = this.room.players.get(winnerId);
    if (winner) this.placements.unshift({ userId: winnerId, name: winner.name, round: this.round });
    this.finish({
      winner: winner ? { userId: winnerId, name: winner.name } : null,
      placements: this.placements,
      betPoints: [...this.betPoints.entries()].map(([id, pts]) => ({
        userId: id,
        name: this.room.players.get(id)?.name || '?',
        points: pts,
      })).sort((a, b) => b.points - a.points),
    });
  }

  onReconnect(player) {
    this.emitTo(player, 'royale:round', {
      round: this.round,
      text: this.text,
      startAt: this.startAt,
      endsAt: this.endsAt,
      alive: [...this.alive],
      nextTimerMs: Math.max(MIN_TIMER, this.roundTimer() - TIMER_STEP),
    });
  }
}
