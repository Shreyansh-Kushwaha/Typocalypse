import { BaseMode, wpmOf, accOf } from './base.js';
import { getPassage, CHOICE_PAIRS, pick, shuffle } from '../content.js';

const CHAPTERS = 5;
const OVERLAP_WORDS = 10;
const PARA_TIMEOUT = 120000;
const VOTE_MS = 10000;

// Relay Chronicles - one story typed in turns with baton pass overlaps and weighted votes.
export class RelayMode extends BaseMode {
  start() {
    this.order = shuffle(this.players().map(p => p.userId));
    this.chapter = 0;
    this.chronicle = [];
    this.lastAcc = new Map(); // userId -> accuracy weight for voting
    this.nextChapter();
  }

  typistId() {
    return this.order[(this.chapter - 1) % this.order.length];
  }

  nextTypistId() {
    return this.order[this.chapter % this.order.length];
  }

  nextChapter() {
    this.chapter += 1;
    this.text = getPassage(this.room.settings.genre);
    const words = this.text.split(' ');
    this.overlapText = words.slice(-OVERLAP_WORDS).join(' ');
    this.overlapAt = words.slice(0, -OVERLAP_WORDS).join(' ').length;
    this.overlapSent = false;
    this.overlapDoneBy = null;
    this.paraStart = Date.now() + 3000;
    this.paraDone = false;
    this.emit('relay:chapter', {
      chapter: this.chapter,
      totalChapters: CHAPTERS,
      typist: this.publicPlayer(this.typistId()),
      next: this.publicPlayer(this.nextTypistId()),
      text: this.text,
      startAt: this.paraStart,
    });
    this.paraTimer = this.after(PARA_TIMEOUT + 3000, () => this.completePara(0, 0, true));
  }

  publicPlayer(userId) {
    const p = this.room.players.get(userId);
    return p ? { userId: p.userId, name: p.name } : null;
  }

  onEvent(player, type, data) {
    if (type === 'progress' && player.userId === this.typistId() && !this.paraDone) {
      const chars = Math.min(Number(data.chars) || 0, this.text.length);
      const errors = Math.max(0, Number(data.errors) || 0);
      this.emit('relay:progress', { chars, pct: Math.round((chars / this.text.length) * 100) });
      // Baton window - hand the overlap to the next typist
      if (!this.overlapSent && chars >= this.overlapAt) {
        this.overlapSent = true;
        const next = this.room.players.get(this.nextTypistId());
        if (next) this.emitTo(next, 'relay:overlap', { text: this.overlapText });
        this.emit('relay:batonwindow', { next: this.publicPlayer(this.nextTypistId()) });
      }
      if (data.done && chars >= this.text.length) this.completePara(chars, errors, false);
    } else if (type === 'overlap-done' && player.userId === this.nextTypistId()) {
      if (!this.overlapDoneBy) {
        this.overlapDoneBy = player.userId;
        this.emit('relay:batoncaught', { by: player.name });
      }
    } else if (type === 'vote' && this.voting) {
      if (this.voteChoices.includes(data.choice)) this.votes.set(player.userId, data.choice);
    }
  }

  completePara(chars, errors, timedOut) {
    if (this.paraDone) return;
    this.paraDone = true;
    this.clearTimer(this.paraTimer);
    const typist = this.room.players.get(this.typistId());
    const elapsed = Date.now() - this.paraStart;
    const wpm = timedOut ? 0 : wpmOf(chars, elapsed);
    const acc = timedOut ? 50 : accOf(chars, errors);
    this.lastAcc.set(this.typistId(), acc);
    // A clean baton catch earns the next typist voting weight too
    if (this.overlapDoneBy) {
      this.lastAcc.set(this.overlapDoneBy, Math.max(this.lastAcc.get(this.overlapDoneBy) || 0, 90));
    }
    this.chronicle.push({
      chapter: this.chapter,
      text: this.text,
      by: typist?.name || '?',
      wpm,
      acc,
      batonCaught: !!this.overlapDoneBy,
      choice: null,
    });
    this.emit('relay:paradone', { by: typist?.name || '?', wpm, acc, timedOut });
    if (this.chapter >= CHAPTERS) return this.after(2500, () => this.bindChronicle());
    this.after(2000, () => this.startVote());
  }

  startVote() {
    this.voting = true;
    this.voteChoices = pick(CHOICE_PAIRS);
    this.votes = new Map();
    this.emit('relay:vote', { choices: this.voteChoices, endsAt: Date.now() + VOTE_MS });
    this.after(VOTE_MS, () => this.endVote());
  }

  endVote() {
    this.voting = false;
    const tally = new Map(this.voteChoices.map(c => [c, 0]));
    for (const [userId, choice] of this.votes) {
      const weight = (this.lastAcc.get(userId) ?? 100) / 100;
      tally.set(choice, (tally.get(choice) || 0) + weight);
    }
    let winner = this.voteChoices[0];
    if ((tally.get(this.voteChoices[1]) || 0) > (tally.get(this.voteChoices[0]) || 0)) {
      winner = this.voteChoices[1];
    }
    this.chronicle[this.chronicle.length - 1].choice = winner;
    this.emit('relay:voted', {
      choice: winner,
      tally: this.voteChoices.map(c => ({ choice: c, weight: Math.round((tally.get(c) || 0) * 100) / 100 })),
    });
    this.after(2500, () => this.nextChapter());
  }

  bindChronicle() {
    const stats = this.players().map(p => {
      const paras = this.chronicle.filter(c => c.by === p.name);
      return {
        userId: p.userId,
        name: p.name,
        paragraphs: paras.length,
        avgWpm: paras.length ? Math.round(paras.reduce((a, c) => a + c.wpm, 0) / paras.length) : 0,
        avgAcc: paras.length ? Math.round(paras.reduce((a, c) => a + c.acc, 0) / paras.length) : 0,
      };
    });
    this.finish({ chronicle: this.chronicle, stats });
  }

  onReconnect(player) {
    this.emitTo(player, 'relay:chapter', {
      chapter: this.chapter,
      totalChapters: CHAPTERS,
      typist: this.publicPlayer(this.typistId()),
      next: this.publicPlayer(this.nextTypistId()),
      text: this.text,
      startAt: this.paraStart,
    });
  }
}
