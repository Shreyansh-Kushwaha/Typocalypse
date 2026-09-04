// Small shared maths for the practice modes.

export interface KeyStat { h: number; m: number }

export function recordKey(stats: Record<string, KeyStat>, expected: string, correct: boolean) {
  if (!expected || expected.length !== 1) return;
  if (!stats[expected]) stats[expected] = { h: 0, m: 0 };
  if (correct) stats[expected].h += 1;
  else stats[expected].m += 1;
}

/** words per minute from a char count, capped at 300 */
export function wpmFrom(chars: number, ms: number): number {
  if (ms <= 0) return 0;
  return Math.max(0, Math.min(300, Math.round((chars / 5) / (ms / 60000))));
}

export function accuracyFrom(hits: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((hits / total) * 100)));
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) * (x - m), 0) / xs.length);
}

/**
 * consistency = clamp(0, 100, round(100 - (stddev / mean) * 100)) over the raw
 * per-second WPM samples. The first second is ignored when it is 0 (reaction time).
 */
export function consistencyFrom(rawPerSecond: number[]): number {
  let xs = rawPerSecond.slice();
  if (xs.length && xs[0] === 0) xs = xs.slice(1);
  if (xs.length < 2) return xs.length === 1 && xs[0] > 0 ? 100 : 0;
  const m = mean(xs);
  if (m <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(100 - (stddev(xs) / m) * 100)));
}

export interface SecondSample { second: number; raw: number; net: number; errors: number }

export function localHour(): number {
  return new Date().getHours();
}
