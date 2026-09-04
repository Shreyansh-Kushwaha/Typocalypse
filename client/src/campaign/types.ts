export type MutatorKey = 'none' | 'fog' | 'storm' | 'night' | 'ransom' | 'blur' | 'vanish' | 'timebomb' | 'mirror';

export interface Targets { accuracy: number; wpm: number }

export interface NodeSummary {
  id: string;
  zone: number;
  index: number;
  name: string;
  blurb: string;
  mutators: MutatorKey[];
  targets: Targets;
  boss: boolean;
  words: number;
  timeLimitMs: number | null;
  unlocked: boolean;
  stars: number;
}

export interface ZoneSummary {
  id: number;
  name: string;
  blurb: string;
  cleared: boolean;
  nodes: NodeSummary[];
}

export interface CampaignMap {
  zones: ZoneSummary[];
  progress: { stars: Record<string, number>; cleared: string[]; totalStars: number; maxStars: number };
  zonesCleared: number;
  allStars: boolean;
}

export interface NodeFull extends NodeSummary {
  zoneName: string;
  text: string;
  best: number;
  next: { id: string; name: string; unlocked: boolean } | null;
}

export interface ClearResponse {
  stars: number;
  best: number;
  newStars: boolean;
  unlockedNext: string | null;
  zoneCleared: boolean;
  wpm: number;
  accuracy: number;
  progression: unknown;
}
