export interface RoomPlayer {
  userId: string;
  name: string;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface RoomSnapshot {
  code: string;
  mode: string;
  modeName: string;
  settings: { genre: string };
  state: 'lobby' | 'playing' | 'ended';
  hostUserId: string;
  players: RoomPlayer[];
  limits: { name: string; min: number; max: number };
}

export interface ModeInfo {
  key: string;
  name: string;
  kind: 'PVP' | 'CO-OP' | 'TEAMS' | 'SOCIAL';
  players: string;
  blurb: string;
  icon: string;
}

export const MODE_LIST: ModeInfo[] = [
  { key: 'horde', name: 'Horde Night', kind: 'CO-OP', players: '1-4', icon: '🧟', blurb: 'Zombie words shamble toward your barricade. Type them dead before the wall falls.' },
  { key: 'sprint', name: 'Story Sprint', kind: 'PVP', players: '2-8', icon: '🏁', blurb: 'Race the same passage. Each leg winner picks the story branch for everyone.' },
  { key: 'royale', name: 'Typo Royale', kind: 'PVP', players: '2-20', icon: '👑', blurb: 'Short bursts, shrinking timer. The slowest survivor is eliminated every round.' },
  { key: 'wordwar', name: 'Word War', kind: 'PVP', players: '2-4', icon: '⚔️', blurb: 'Clear your queue. Streaks dump junk words on your opponents. Overflow and you are out.' },
  { key: 'bossraid', name: 'Boss Raid', kind: 'CO-OP', players: '1-5', icon: '☠️', blurb: 'Sentences deal damage. Interrupt the boss casts or eat the text curses.' },
  { key: 'relay', name: 'Relay Chronicles', kind: 'CO-OP', players: '2-6', icon: '🕯️', blurb: 'One story typed in turns with baton passes. Votes weighted by accuracy.' },
  { key: 'corruptor', name: 'The Corruptor', kind: 'SOCIAL', players: '3-8', icon: '🎭', blurb: 'One of you is sabotaging the team. Type, argue, accuse.' },
  { key: 'tug', name: 'Tug of Words', kind: 'TEAMS', players: '2-10', icon: '🪢', blurb: 'Combined team WPM pulls the rope. Power words give burst yanks.' },
];

export const GENRES = ['fantasy', 'horror', 'sci-fi', 'mystery', 'adventure', 'romance'];
