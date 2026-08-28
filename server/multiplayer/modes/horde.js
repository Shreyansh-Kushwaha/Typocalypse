import { BaseMode } from './base.js';
import { COMMON_WORDS, pick, getPassage } from '../content.js';

const WALL_ROW = 10;
const START_HP = 100;
const SHOP_MS = 12000;
const STORY_MS = 45000;
const SHOP_ITEMS = {
  repair: { cost: 30, label: 'Repair barricade +15 HP' },
  slow: { cost: 40, label: 'Slow the next wave' },
  nuke: { cost: 50, label: 'Nuke word - clears 3 nearest zombies' },
};

// Horde Night - co-op zombie word defense with waves shop and story beats.
export class HordeMode extends BaseMode {
  start() {
    this.hp = START_HP;
    this.teamPoints = 0;
    this.wave = 0;
    this.zombies = new Map(); // id -> {id, word, row, col, claimedBy}
    this.nextId = 1;
    this.nukes = 0;
    this.slowNext = false;
    this.kills = new Map(); // userId -> kill count
    for (const p of this.players()) this.kills.set(p.userId, 0);
    this.phase = 'intro';
    this.emit('horde:start', { hp: this.hp, wall: WALL_ROW });
    this.after(3000, () => this.startWave());
  }

  startWave() {
    this.wave += 1;
    this.phase = 'wave';
    this.spawnRemaining = 5 + this.wave * 2;
    const speedFactor = this.slowNext ? 1.35 : 1;
    this.slowNext = false;
    this.spawnInterval = Math.max(900, 2200 * Math.pow(0.94, this.wave));
    this.advanceInterval = Math.max(700, 1500 * Math.pow(0.96, this.wave)) * speedFactor;
    this.emit('horde:wave', { wave: this.wave, spawns: this.spawnRemaining, hp: this.hp, points: this.teamPoints, nukes: this.nukes });
    this.spawnTimer = this.every(this.spawnInterval, () => this.spawnZombie());
    this.advanceTimer = this.every(this.advanceInterval, () => this.advance());
    this.spawnZombie();
  }

  wordForWave() {
    const minLen = Math.min(3 + Math.floor(this.wave / 2), 8);
    const candidates = COMMON_WORDS.filter(w => w.length >= minLen);
    return pick(candidates.length ? candidates : COMMON_WORDS);
  }

  spawnZombie() {
    if (this.phase !== 'wave' || this.spawnRemaining <= 0) return;
    this.spawnRemaining -= 1;
    const z = {
      id: this.nextId++,
      word: this.wordForWave(),
      row: 0,
      col: 5 + Math.floor(Math.random() * 85),
      claimedBy: null,
    };
    this.zombies.set(z.id, z);
    this.broadcastField();
  }

  advance() {
    if (this.phase !== 'wave') return;
    for (const z of [...this.zombies.values()]) {
      z.row += 1;
      if (z.row >= WALL_ROW) {
        this.zombies.delete(z.id);
        this.hp -= z.word.length;
        this.emit('horde:breach', { word: z.word, damage: z.word.length, hp: Math.max(0, this.hp) });
      }
    }
    if (this.hp <= 0) return this.gameOver();
    this.broadcastField();
    this.checkWaveClear();
  }

  checkWaveClear() {
    if (this.phase === 'wave' && this.spawnRemaining <= 0 && this.zombies.size === 0) {
      this.clearTimer(this.spawnTimer);
      this.clearTimer(this.advanceTimer);
      if (this.wave % 3 === 0) this.startStory();
      else this.startShop();
    }
  }

  startShop() {
    this.phase = 'shop';
    this.emit('horde:shop', {
      wave: this.wave,
      points: this.teamPoints,
      hp: this.hp,
      nukes: this.nukes,
      items: SHOP_ITEMS,
      endsAt: Date.now() + SHOP_MS,
    });
    this.after(SHOP_MS, () => this.startWave());
  }

  startStory() {
    this.phase = 'story';
    this.storyText = getPassage(this.room.settings.genre);
    this.storyDone = new Set();
    this.emit('horde:story', {
      wave: this.wave,
      text: this.storyText,
      endsAt: Date.now() + STORY_MS,
      bonus: 20,
    });
    this.storyTimer = this.after(STORY_MS, () => this.endStory());
  }

  endStory() {
    if (this.phase !== 'story') return;
    this.clearTimer(this.storyTimer);
    this.startShop();
  }

  onEvent(player, type, data) {
    if (this.phase === 'wave') {
      const z = data.id != null ? this.zombies.get(Number(data.id)) : null;
      if (type === 'claim' && z && !z.claimedBy) {
        z.claimedBy = player.userId;
        this.broadcastField();
      } else if (type === 'unclaim' && z && z.claimedBy === player.userId) {
        z.claimedBy = null;
        this.broadcastField();
      } else if (type === 'typo' && z && z.claimedBy === player.userId) {
        z.row = Math.min(WALL_ROW - 1, z.row + 1); // the lurch
        this.broadcastField();
      } else if (type === 'kill' && z && (z.claimedBy === player.userId || !z.claimedBy)) {
        this.zombies.delete(z.id);
        this.teamPoints += z.word.length;
        this.kills.set(player.userId, (this.kills.get(player.userId) || 0) + 1);
        this.emit('horde:kill', { id: z.id, by: player.name, points: this.teamPoints });
        this.broadcastField();
        this.checkWaveClear();
      } else if (type === 'nuke' && this.nukes > 0) {
        this.nukes -= 1;
        const nearest = [...this.zombies.values()].sort((a, b) => b.row - a.row).slice(0, 3);
        for (const nz of nearest) this.zombies.delete(nz.id);
        this.emit('horde:nuked', { by: player.name, cleared: nearest.length, nukes: this.nukes });
        this.broadcastField();
        this.checkWaveClear();
      }
    } else if (this.phase === 'shop' && type === 'buy') {
      const item = SHOP_ITEMS[data.item];
      if (!item || this.teamPoints < item.cost) return;
      this.teamPoints -= item.cost;
      if (data.item === 'repair') this.hp = Math.min(START_HP, this.hp + 15);
      if (data.item === 'slow') this.slowNext = true;
      if (data.item === 'nuke') this.nukes += 1;
      this.emit('horde:bought', { by: player.name, item: data.item, points: this.teamPoints, hp: this.hp, nukes: this.nukes });
    } else if (this.phase === 'story' && type === 'progress' && data.done) {
      if (!this.storyDone.has(player.userId)) {
        this.storyDone.add(player.userId);
        this.teamPoints += 20;
        this.emit('horde:storydone', { name: player.name, points: this.teamPoints });
      }
      if (this.storyDone.size >= this.room.connectedPlayers().length) this.endStory();
    }
  }

  broadcastField() {
    this.emit('horde:field', {
      zombies: [...this.zombies.values()],
      hp: Math.max(0, this.hp),
      points: this.teamPoints,
      wave: this.wave,
      nukes: this.nukes,
      remaining: this.spawnRemaining,
    });
  }

  gameOver() {
    const killBoard = [...this.kills.entries()].map(([id, k]) => ({
      userId: id,
      name: this.room.players.get(id)?.name || '?',
      kills: k,
    })).sort((a, b) => b.kills - a.kills);
    this.finish({ wavesCleared: this.wave - 1, kills: killBoard, teamPoints: this.teamPoints });
  }

  onReconnect(player) {
    this.emitTo(player, 'horde:start', { hp: this.hp, wall: WALL_ROW });
    this.broadcastField();
  }
}
