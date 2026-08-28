import { BaseMode, accOf } from './base.js';
import { POWER_WORDS, BOSS_NAMES, pick, getSentences, getPassage } from '../content.js';

const HP_PER_PLAYER = 2000;
const TEAM_HP = 100;
const CAST_INTERVAL = 20000;
const ENRAGED_CAST_INTERVAL = 12000;
const CAST_BAR_MS = 8000;
const CAST_FAIL_DAMAGE = 20;
const CURSES = ['blur', 'mirror', 'vanish'];
const CURSE_MS = 15000;
const INTERRUPT_BONUS = 150;

// Boss Raid - sentences deal damage, interrupt the casts or eat the curses.
export class BossRaidMode extends BaseMode {
  start() {
    const count = Math.max(1, this.players().length);
    this.bossName = pick(BOSS_NAMES);
    this.bossMax = HP_PER_PLAYER * count;
    this.bossHP = this.bossMax;
    this.teamHP = TEAM_HP;
    this.enraged = false;
    this.casting = null;
    this.sentences = getSentences(this.room.settings.genre);
    this.stats = new Map(); // userId -> {damage, combo, interrupts}
    for (const p of this.players()) {
      this.stats.set(p.userId, { damage: 0, combo: 0, interrupts: 0 });
    }
    this.emit('raid:start', {
      boss: this.bossName,
      bossMax: this.bossMax,
      teamHP: this.teamHP,
      startAt: Date.now() + 3000,
    });
    for (const p of this.players()) this.dealSentence(p);
    this.scheduleCast();
    this.every(1000, () => this.broadcast());
  }

  dealSentence(player) {
    this.emitTo(player, 'raid:sentence', { text: pick(this.sentences) });
  }

  scheduleCast() {
    this.castTimer = this.after(this.enraged ? ENRAGED_CAST_INTERVAL : CAST_INTERVAL, () => this.beginCast());
  }

  beginCast() {
    if (this.casting) return;
    this.casting = { word: pick(POWER_WORDS), endsAt: Date.now() + CAST_BAR_MS };
    this.emit('raid:cast', { word: this.casting.word, endsAt: this.casting.endsAt });
    this.castResolve = this.after(CAST_BAR_MS, () => this.castLands());
  }

  castLands() {
    if (!this.casting) return;
    this.casting = null;
    this.teamHP -= CAST_FAIL_DAMAGE;
    const curse = pick(CURSES);
    this.emit('raid:curse', { curse, until: Date.now() + CURSE_MS, teamHP: Math.max(0, this.teamHP) });
    if (this.teamHP <= 0) return this.wipe();
    this.scheduleCast();
  }

  onEvent(player, type, data) {
    const s = this.stats.get(player.userId);
    if (!s) return;
    if (type === 'sentence') {
      const chars = Math.max(0, Number(data.chars) || 0);
      const errors = Math.max(0, Number(data.errors) || 0);
      const acc = accOf(chars, errors);
      const perfect = errors === 0 && chars > 0;
      s.combo = perfect ? Math.min(s.combo + 1, 8) : 0;
      const dmg = Math.round(chars * (acc / 100) * (1 + s.combo * 0.25) * (this.enraged ? 2 : 1));
      s.damage += dmg;
      this.dealDamage(dmg, player);
      this.dealSentence(player);
    } else if (type === 'interrupt') {
      if (this.casting && data.word === this.casting.word) {
        this.clearTimer(this.castResolve);
        this.casting = null;
        s.interrupts += 1;
        s.damage += INTERRUPT_BONUS;
        this.emit('raid:interrupted', { by: player.name, bonus: INTERRUPT_BONUS });
        this.dealDamage(INTERRUPT_BONUS, player);
        if (!this.stopped && this.bossHP > 0) this.scheduleCast();
      }
    }
  }

  dealDamage(dmg, player) {
    if (this.bossHP <= 0) return;
    this.bossHP -= dmg;
    this.emit('raid:hit', { by: player.name, dmg, bossHP: Math.max(0, this.bossHP) });
    if (!this.enraged && this.bossHP <= this.bossMax * 0.3 && this.bossHP > 0) {
      this.enraged = true;
      this.finale = getPassage(this.room.settings.genre);
      this.emit('raid:enrage', { finale: this.finale });
    }
    if (this.bossHP <= 0) this.victory();
  }

  broadcast() {
    this.emit('raid:state', {
      bossHP: Math.max(0, this.bossHP),
      bossMax: this.bossMax,
      teamHP: Math.max(0, this.teamHP),
      enraged: this.enraged,
      casting: this.casting,
      players: [...this.stats.entries()].map(([id, s]) => ({
        userId: id,
        name: this.room.players.get(id)?.name || '?',
        damage: s.damage,
        combo: s.combo,
      })),
    });
  }

  board() {
    return [...this.stats.entries()].map(([id, s]) => ({
      userId: id,
      name: this.room.players.get(id)?.name || '?',
      damage: s.damage,
      interrupts: s.interrupts,
    })).sort((a, b) => b.damage - a.damage);
  }

  victory() {
    this.finish({
      victory: true,
      boss: this.bossName,
      timeMs: Date.now() - this.startedAt,
      board: this.board(),
    });
  }

  wipe() {
    this.finish({
      victory: false,
      boss: this.bossName,
      bossHPLeft: Math.max(0, this.bossHP),
      board: this.board(),
    });
  }

  onReconnect(player) {
    this.emitTo(player, 'raid:start', {
      boss: this.bossName,
      bossMax: this.bossMax,
      teamHP: this.teamHP,
      startAt: Date.now(),
    });
    this.dealSentence(player);
  }
}
