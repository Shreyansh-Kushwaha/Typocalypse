// Word-level and character-level diffing shared by Last Words (memory) and
// Radio Transmissions (dictation). Comparison is case + punctuation insensitive.

export type DiffStatus = 'ok' | 'wrong' | 'missing' | 'extra';
export interface DiffToken {
  /** original word (or the stray typed word when status is 'extra') */
  word: string;
  status: DiffStatus;
  /** what the player typed in this slot, when there is one */
  typed?: string;
}
export interface WordDiff {
  tokens: DiffToken[];
  total: number;
  correct: number;
  wrong: number;
  missing: number;
  extra: number;
  /** 0-100, extras count against you */
  accuracy: number;
}

export const tokenize = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);
export const normalizeWord = (w: string): string => w.toLowerCase().replace(/[^a-z0-9]/g, '');
export const normalizeText = (s: string): string =>
  tokenize(s).map(normalizeWord).filter(Boolean).join(' ');

/** Align typed words to the original with word-level Levenshtein and label every slot. */
export function diffWords(original: string, typed: string): WordDiff {
  const a = tokenize(original);
  const b = tokenize(typed);
  const na = a.map(normalizeWord);
  const nb = b.map(normalizeWord);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = dp[i - 1][j - 1] + (na[i - 1] === nb[j - 1] ? 0 : 1);
      dp[i][j] = Math.min(sub, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
    }
  }
  const tokens: DiffToken[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && na[i - 1] === nb[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      tokens.push({ word: a[i - 1], status: 'ok', typed: b[j - 1] });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      tokens.push({ word: a[i - 1], status: 'wrong', typed: b[j - 1] });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      tokens.push({ word: a[i - 1], status: 'missing' });
      i--;
    } else {
      tokens.push({ word: b[j - 1], status: 'extra' });
      j--;
    }
  }
  tokens.reverse();
  const count = (s: DiffStatus) => tokens.filter(t => t.status === s).length;
  const correct = count('ok');
  const extra = count('extra');
  const accuracy = n === 0 ? 0 : Math.max(0, Math.round((correct / (n + extra)) * 100));
  return { tokens, total: n, correct, wrong: count('wrong'), missing: count('missing'), extra, accuracy };
}

/** Plain string edit distance (two-row DP). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array<number>(b.length + 1);
  let cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

/** Character accuracy for the stats record: 1 - edits / original length. */
export function charAccuracy(original: string, typed: string): { distance: number; accuracy: number; length: number } {
  const o = normalizeText(original);
  const t = normalizeText(typed);
  const distance = levenshtein(o, t);
  const accuracy = o.length === 0 ? 0 : Math.max(0, Math.round((1 - distance / o.length) * 100));
  return { distance, accuracy, length: o.length };
}
