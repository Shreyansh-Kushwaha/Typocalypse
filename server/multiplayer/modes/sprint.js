import { BaseMode, wpmOf, accOf } from './base.js';
import { getPassage, CHOICE_PAIRS, pick } from '../content.js';

const LEGS = 5;
const LEG_COUNTDOWN = 3000;
const LEG_TIMEOUT = 120000;
const CHOICE_TIMEOUT = 10000;

// Story Sprint - everyone races the same passage, leg winner picks the branch.
export class SprintMode extends BaseMode {
  start() {
    this.leg = 0;
    this.stats = new Map(); // userId -> {legWins, totalAcc, legs}
    for (const p of this.players()) {
      this.stats.set(p.userId, { legWins: 0, accSum: 0, wpmSum: 0, legs: 0 });
    }
    this.every(500, () => this.broadcastProgress());
    this.nextLeg();
  }

  nextLeg() {
    this.leg += 1;
    this.legText = getPassage(this.room.settings.genre);
    this.legStart = Date.now() + LEG_COUNTDOWN;
    this.legDone = false;
    this.progress = new Map(); // userId -> {chars, errors, done, finishedAt}
    for (const p of this.players()) {
      this.progress.set(p.userId, { chars: 0, errors: 0, done: false, finishedAt: null });
    }
    this.emit('sprint:leg', {
      leg: this.leg,
      totalLegs: LEGS,
      text: this.legText,
      startAt: this.legStart,
    });
    this.legTimer = this.after(LEG_TIMEOUT + LEG_COUNTDOWN, () => this.endLeg(null));
  }

  onEvent(player, type, data) {
    if (type === 'progress') {
      const prog = this.progress?.get(player.userId);
      if (!prog || prog.done || this.legDone === undefined) return;
      prog.chars = Math.min(Number(data.chars) || 0, this.legText.length);
      prog.errors = Math.max(prog.errors, Number(data.errors) || 0);
      if (data.done && prog.chars >= this.legText.length && !prog.done) {
        prog.done = true;
        prog.finishedAt = Date.now();
        if (!this.legDone) this.endLeg(player);
      }
    } else if (type === 'choice') {
      this.resolveChoice(player, data.choice);
    }
  }

  legScore(userId) {
    const prog = this.progress.get(userId);
    const elapsed = (prog.finishedAt || Date.now()) - this.legStart;
    const wpm = wpmOf(prog.chars, elapsed);
    const acc = accOf(prog.chars, prog.errors);
    return { wpm, acc, score: Math.round(wpm * acc / 100), chars: prog.chars };
  }

  endLeg(winner) {
    if (this.legDone) return;
    this.legDone = true;
    this.clearTimer(this.legTimer);

    // Timeout with no finisher - most correct chars wins the leg
    if (!winner) {
      let best = null;
      for (const p of this.players()) {
        const prog = this.progress.get(p.userId);
        if (!best || prog.chars > this.progress.get(best.userId).chars) best = p;
      }
      winner = best;
    }

    const scores = {};
    for (const p of this.players()) {
      const s = this.legScore(p.userId);
      scores[p.userId] = { name: p.name, ...s };
      const stat = this.stats.get(p.userId);
      if (stat) {
        stat.accSum += s.acc;
        stat.wpmSum += s.wpm;
        stat.legs += 1;
      }
    }
    const winStat = this.stats.get(winner.userId);
    if (winStat) winStat.legWins += 1;

    this.emit('sprint:legend', { leg: this.leg, winner: { userId: winner.userId, name: winner.name }, scores });

    if (this.leg >= LEGS) return this.after(3000, () => this.finishRace());

    this.choices = pick(CHOICE_PAIRS);
    this.chooser = winner;
    this.chosen = false;
    this.emit('sprint:choosing', { chooser: winner.name, choices: this.choices });
    this.choiceTimer = this.after(CHOICE_TIMEOUT, () => this.resolveChoice(winner, null));
  }

  resolveChoice(player, choice) {
    if (this.chosen || !this.chooser || player.userId !== this.chooser.userId) return;
    this.chosen = true;
    this.clearTimer(this.choiceTimer);
    const valid = this.choices.includes(choice) ? choice : pick(this.choices);
    this.emit('sprint:chosen', { chooser: this.chooser.name, choice: valid });
    this.after(2500, () => this.nextLeg());
  }

  broadcastProgress() {
    if (!this.progress || this.legDone) return;
    const now = Date.now();
    const players = this.players().map(p => {
      const prog = this.progress.get(p.userId) || { chars: 0, errors: 0, done: false };
      const elapsed = Math.max(1, now - this.legStart);
      return {
        userId: p.userId,
        name: p.name,
        pct: Math.round((prog.chars / this.legText.length) * 100),
        wpm: this.legStart < now ? wpmOf(prog.chars, elapsed) : 0,
        done: prog.done,
      };
    });
    this.emit('sprint:progress', { players });
  }

  finishRace() {
    const results = this.players().map(p => {
      const s = this.stats.get(p.userId);
      return {
        userId: p.userId,
        name: p.name,
        legWins: s.legWins,
        avgWpm: s.legs ? Math.round(s.wpmSum / s.legs) : 0,
        avgAcc: s.legs ? Math.round(s.accSum / s.legs) : 100,
      };
    }).sort((a, b) => b.legWins - a.legWins || b.avgAcc - a.avgAcc);
    this.finish({ placements: results });
  }

  onReconnect(player) {
    this.emitTo(player, 'sprint:leg', {
      leg: this.leg,
      totalLegs: LEGS,
      text: this.legText,
      startAt: this.legStart,
    });
  }
}
