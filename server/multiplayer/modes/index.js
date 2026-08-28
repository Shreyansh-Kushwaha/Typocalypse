import { SprintMode } from './sprint.js';
import { RoyaleMode } from './royale.js';
import { WordWarMode } from './wordwar.js';
import { HordeMode } from './horde.js';
import { BossRaidMode } from './bossraid.js';
import { RelayMode } from './relay.js';
import { CorruptorMode } from './corruptor.js';
import { TugMode } from './tug.js';

const ENGINES = {
  sprint: SprintMode,
  royale: RoyaleMode,
  wordwar: WordWarMode,
  horde: HordeMode,
  bossraid: BossRaidMode,
  relay: RelayMode,
  corruptor: CorruptorMode,
  tug: TugMode,
};

export function createEngine(room, io) {
  const Engine = ENGINES[room.mode] || ENGINES.sprint;
  return new Engine(room, io);
}
