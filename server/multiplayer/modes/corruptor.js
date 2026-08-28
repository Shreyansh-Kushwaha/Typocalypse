import { BaseMode, wpmOf, accOf } from './base.js';
import { getPassage, DOOM_CHOICE_PAIRS, POWER_WORDS, pick } from '../content.js';

const CHAPTERS = 5;
const CHAPTER_MS = 75000;
const DISCUSS_MS = 45000;
const VOTE_MS = 15000;
const DOOM_TO_WIN = 3;
const KEY_PAIRS = [['e', 'r'], ['a', 's'], ['o', 'i'], ['t', 'y'], ['n', 'm']];

// The Corruptor - hidden saboteur drags the team score down without getting caught.
export class CorruptorMode extends BaseMode {
  start() {
    const ids = this.players().map(p => p.userId);
    this.corruptorId = pick(ids);
    this.doom = 0;
    this.chapter = 0;
    this.sabotagedThisChapter = false;
    this.fakeAccBoost = 0;
    this.teamScores = [];
    for (const p of this.players()) {
      const isCorruptor = p.userId === this.corruptorId;
      this.emitTo(p, 'corruptor:role', {
        role: isCorruptor ? 'corruptor' : 'crew',
        tools: isCorruptor ? ['sticky', 'shrink', 'fake'] : [],
      });
    }
    this.after(4000, () => this.startChapter());
  }

  startChapter() {
    this.chapter += 1;
    this.phase = 'typing';
    this.sabotagedThisChapter = false;
    this.text = getPassage(this.room.settings.genre);
    this.chapterStart = Date.now() + 3000;
    this.deadlines = new Map();
    this.reports = new Map(); // userId -> {chars, errors, done}
    for (const p of this.players()) {
      this.deadlines.set(p.userId, this.chapterStart + CHAPTER_MS);
      this.reports.set(p.userId, { chars: 0, errors: 0, done: false });
    }
    this.emit('corruptor:chapter', {
      chapter: this.chapter,
      totalChapters: CHAPTERS,
      text: this.text,
      startAt: this.chapterStart,
      endsAt: this.chapterStart + CHAPTER_MS,
      doom: this.doom,
    });
    this.chapterTimer = this.after(CHAPTER_MS + 3000, () => this.endChapter());
  }

  onEvent(player, type, data) {
    if (type === 'progress' && this.phase === 'typing') {
      const r = this.reports.get(player.userId);
      if (!r || r.done) return;
      if (Date.now() > (this.deadlines.get(player.userId) || 0)) return;
      r.chars = Math.min(Number(data.chars) || 0, this.text.length);
      r.errors = Math.max(r.errors, Number(data.errors) || 0);
      if (data.done && r.chars >= this.text.length) {
        r.done = true;
        r.finishedAt = Date.now();
        if ([...this.reports.values()].every(x => x.done)) this.endChapter();
      }
    } else if (type === 'sabotage' && this.phase === 'typing') {
      this.sabotage(player, data);
    } else if (type === 'vote' && this.phase === 'vote') {
      this.votes.set(player.userId, data.targetId ?? null);
    } else if (type === 'storyvote' && this.phase === 'storyvote') {
      if (this.storyChoices.includes(data.choice)) this.storyVotes.set(player.userId, data.choice);
    }
  }

  sabotage(player, data) {
    if (player.userId !== this.corruptorId || this.sabotagedThisChapter) return;
    const target = this.room.players.get(data.targetId);
    if (data.tool === 'sticky' && target && target.userId !== this.corruptorId) {
      this.sabotagedThisChapter = true;
      this.emitTo(target, 'corruptor:sticky', { keys: pick(KEY_PAIRS), durationMs: 10000 });
    } else if (data.tool === 'shrink' && target && target.userId !== this.corruptorId) {
      this.sabotagedThisChapter = true;
      const newDeadline = (this.deadlines.get(target.userId) || Date.now()) - 15000;
      this.deadlines.set(target.userId, newDeadline);
      this.emitTo(target, 'corruptor:shrink', { endsAt: newDeadline });
    } else if (data.tool === 'fake') {
      this.sabotagedThisChapter = true;
      this.fakeAccBoost = 15;
      this.emitTo(player, 'corruptor:fake', { boost: this.fakeAccBoost });
    }
  }

  endChapter() {
    if (this.phase !== 'typing') return;
    this.clearTimer(this.chapterTimer);
    this.phase = 'discuss';
    const board = [];
    let scoreSum = 0;
    for (const p of this.players()) {
      const r = this.reports.get(p.userId) || { chars: 0, errors: 0 };
      const elapsed = (r.finishedAt || this.chapterStart + CHAPTER_MS) - this.chapterStart;
      const wpm = wpmOf(r.chars, Math.max(1, elapsed));
      let acc = accOf(r.chars, r.errors);
      const trueScore = Math.round(wpm * acc / 100);
      scoreSum += trueScore;
      // The fake tool inflates only what everyone SEES
      if (p.userId === this.corruptorId && this.fakeAccBoost) {
        acc = Math.min(100, acc + this.fakeAccBoost);
      }
      board.push({ userId: p.userId, name: p.name, wpm, acc, done: !!r.done });
    }
    this.fakeAccBoost = 0;
    const teamScore = Math.round(scoreSum / Math.max(1, this.players().length));
    this.teamScores.push(teamScore);
    const prev = this.teamScores[this.teamScores.length - 2];
    this.emit('corruptor:board', {
      chapter: this.chapter,
      board,
      teamScore,
      slipped: prev != null && teamScore < prev,
      discussEndsAt: Date.now() + DISCUSS_MS,
    });
    this.after(DISCUSS_MS, () => this.startVote());
  }

  startVote() {
    this.phase = 'vote';
    this.votes = new Map();
    this.emit('corruptor:votestart', { endsAt: Date.now() + VOTE_MS });
    this.after(VOTE_MS, () => this.endVote());
  }

  endVote() {
    this.phase = 'idle';
    const tally = new Map();
    for (const target of this.votes.values()) {
      if (target) tally.set(target, (tally.get(target) || 0) + 1);
    }
    let accused = null;
    let top = 0;
    for (const [id, n] of tally) {
      if (n > top) { accused = id; top = n; }
      else if (n === top) accused = null; // ties acquit
    }
    const majority = top > this.players().length / 2 ? accused : null;

    if (majority === this.corruptorId) return this.reveal(true, 'unmasked');
    if (majority) {
      this.doom += 1;
      this.emit('corruptor:wrongaccusation', {
        accused: this.room.players.get(majority)?.name || '?',
        doom: this.doom,
      });
      if (this.doom >= DOOM_TO_WIN) return this.reveal(false, 'doom');
    } else {
      this.emit('corruptor:novote', { doom: this.doom });
    }
    this.startStoryVote();
  }

  startStoryVote() {
    this.phase = 'storyvote';
    const pair = DOOM_CHOICE_PAIRS[(this.chapter - 1) % DOOM_CHOICE_PAIRS.length];
    this.storyChoices = pair;
    this.doomChoice = pair[1];
    this.storyVotes = new Map();
    this.emit('corruptor:storyvote', { choices: pair, endsAt: Date.now() + VOTE_MS });
    this.after(VOTE_MS, () => this.endStoryVote());
  }

  endStoryVote() {
    this.phase = 'idle';
    const tally = new Map(this.storyChoices.map(c => [c, 0]));
    for (const [userId, choice] of this.storyVotes) {
      const weight = userId === this.corruptorId ? 2 : 1; // the corruptor's hidden thumb on the scale
      tally.set(choice, (tally.get(choice) || 0) + weight);
    }
    const doomWins = (tally.get(this.doomChoice) || 0) > (tally.get(this.storyChoices[0]) || 0);
    if (doomWins) this.doom += 1;
    this.emit('corruptor:storychosen', {
      choice: doomWins ? this.doomChoice : this.storyChoices[0],
      doomed: doomWins,
      doom: this.doom,
    });
    if (this.doom >= DOOM_TO_WIN) return this.reveal(false, 'doom');
    if (this.chapter >= CHAPTERS) return this.reveal(false, 'survived');
    this.after(3000, () => this.startChapter());
  }

  reveal(crewWins, reason) {
    const corruptor = this.room.players.get(this.corruptorId);
    this.finish({
      crewWins,
      reason,
      corruptor: { userId: this.corruptorId, name: corruptor?.name || '?' },
      doom: this.doom,
      chapters: this.chapter,
      teamScores: this.teamScores,
    });
  }

  onReconnect(player) {
    this.emitTo(player, 'corruptor:role', {
      role: player.userId === this.corruptorId ? 'corruptor' : 'crew',
      tools: player.userId === this.corruptorId ? ['sticky', 'shrink', 'fake'] : [],
    });
  }
}
