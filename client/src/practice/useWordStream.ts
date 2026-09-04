// Monkeytype-style word stream engine for the timed / word-count test.
// Wrong chars are recorded and the caret still advances, extra chars pile up
// past the word end, Backspace corrects within the word (and steps back into
// the previous word when that one was wrong). Space advances.
import { useCallback, useEffect, useReducer, useRef } from 'react';
import type React from 'react';
import { sfx } from '../sound';
import { recordKey, wpmFrom, accuracyFrom, consistencyFrom } from './stats';
import type { KeyStat, SecondSample } from './stats';

export interface WordStreamOptions {
  /** 'time' ends after durationSec; 'words' ends when the last word is typed */
  kind: 'time' | 'words';
  durationSec?: number;
  wordCount?: number;
  /** produce the next batch of words - called again for the infinite stream */
  generate: (n: number) => string[];
  enabled?: boolean;
  onFinish?: (result: WordStreamResult) => void;
}

export interface WordStreamResult {
  kind: 'time' | 'words';
  netWpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
  keystrokes: number;
  keyErrors: number;
  durationMs: number;
  wordsTyped: number;
  samples: SecondSample[];
  keyStats: Record<string, KeyStat>;
}

interface Internal {
  words: string[];
  typed: string[];
  cur: number;
  started: boolean;
  finished: boolean;
  startedAt: number;
  keystrokes: number;
  keyErrors: number;
  keyStats: Record<string, KeyStat>;
  samples: SecondSample[];
  lastTickKeystrokes: number;
  lastTickErrors: number;
  elapsedMs: number;
  result: WordStreamResult | null;
  timer: ReturnType<typeof setInterval> | null;
}

const LOOKAHEAD = 60;
const MAX_EXTRA = 12;

function tally(s: Internal) {
  let correct = 0, incorrect = 0, extra = 0, missed = 0, spaces = 0, correctSpaces = 0;
  const last = Math.min(s.cur, s.words.length - 1);
  for (let i = 0; i <= last; i++) {
    const w = s.words[i];
    const t = s.typed[i] || '';
    const n = Math.min(w.length, t.length);
    for (let j = 0; j < n; j++) {
      if (t[j] === w[j]) correct += 1; else incorrect += 1;
    }
    if (t.length > w.length) extra += t.length - w.length;
    if (i < s.cur) {
      if (t.length < w.length) missed += w.length - t.length;
      spaces += 1;
      if (t === w) correctSpaces += 1;
    }
  }
  return { correct, incorrect, extra, missed, spaces, correctSpaces };
}

export function useWordStream(opts: WordStreamOptions) {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const fresh = useCallback((): Internal => {
    const o = optsRef.current;
    const words = o.kind === 'words' ? o.generate(o.wordCount || 25) : o.generate(LOOKAHEAD * 2);
    return {
      words, typed: [''], cur: 0, started: false, finished: false, startedAt: 0,
      keystrokes: 0, keyErrors: 0, keyStats: {}, samples: [], lastTickKeystrokes: 0, lastTickErrors: 0,
      elapsedMs: 0, result: null, timer: null,
    };
  }, []);

  const S = useRef<Internal | null>(null);
  if (!S.current) S.current = fresh();

  const stopTimer = useCallback(() => {
    const s = S.current!;
    if (s.timer) { clearInterval(s.timer); s.timer = null; }
  }, []);

  const finish = useCallback(() => {
    const s = S.current!;
    if (s.finished) return;
    const o = optsRef.current;
    stopTimer();
    s.finished = true;
    const now = Date.now();
    const durationMs = o.kind === 'time' ? (o.durationSec || 30) * 1000 : Math.max(1, now - s.startedAt);
    // partial last second (word mode) - scale it so the chart stays honest
    const partialMs = durationMs - s.samples.length * 1000;
    const partialKeys = s.keystrokes - s.lastTickKeystrokes;
    if (partialMs >= 400 && partialKeys > 0) {
      const t = tally(s);
      s.samples.push({
        second: s.samples.length + 1,
        raw: Math.min(300, Math.round((partialKeys / 5) * (60000 / partialMs))),
        net: wpmFrom(t.correct + t.correctSpaces, durationMs),
        errors: s.keyErrors - s.lastTickErrors,
      });
    }
    const t = tally(s);
    const result: WordStreamResult = {
      kind: o.kind,
      netWpm: wpmFrom(t.correct + t.correctSpaces, durationMs),
      rawWpm: wpmFrom(t.correct + t.incorrect + t.extra + t.spaces, durationMs),
      accuracy: accuracyFrom(s.keystrokes - s.keyErrors, s.keystrokes),
      consistency: consistencyFrom(s.samples.map(x => x.raw)),
      correct: t.correct + t.correctSpaces,
      incorrect: t.incorrect,
      extra: t.extra,
      missed: t.missed,
      keystrokes: s.keystrokes,
      keyErrors: s.keyErrors,
      durationMs,
      wordsTyped: s.cur + (s.typed[s.cur] && s.typed[s.cur] === s.words[s.cur] ? 1 : 0),
      samples: s.samples.slice(),
      keyStats: { ...s.keyStats },
    };
    s.result = result;
    s.elapsedMs = durationMs;
    rerender();
    o.onFinish?.(result);
  }, [stopTimer]);

  const tick = useCallback(() => {
    const s = S.current!;
    if (!s.started || s.finished) return;
    const o = optsRef.current;
    const elapsed = Date.now() - s.startedAt;
    const t = tally(s);
    const keys = s.keystrokes - s.lastTickKeystrokes;
    s.samples.push({
      second: s.samples.length + 1,
      raw: Math.min(300, Math.round((keys / 5) * 60)),
      net: wpmFrom(t.correct + t.correctSpaces, elapsed),
      errors: s.keyErrors - s.lastTickErrors,
    });
    s.lastTickKeystrokes = s.keystrokes;
    s.lastTickErrors = s.keyErrors;
    s.elapsedMs = elapsed;
    if (o.kind === 'time' && s.samples.length >= (o.durationSec || 30)) {
      finish();
      return;
    }
    rerender();
  }, [finish]);

  const restart = useCallback(() => {
    stopTimer();
    S.current = fresh();
    rerender();
  }, [fresh, stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const start = useCallback(() => {
    const s = S.current!;
    s.started = true;
    s.startedAt = Date.now();
    s.timer = setInterval(tick, 1000);
  }, [tick]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    const s = S.current!;
    const o = optsRef.current;
    const key = e.key;

    if (key === 'Tab' || key === 'Escape') {
      e.preventDefault();
      restart();
      return;
    }
    if (o.enabled === false || s.finished) return;
    if (e.metaKey || (e.ctrlKey && key !== 'Backspace')) return;

    if (key === 'Backspace') {
      e.preventDefault();
      if (!s.started) return;
      const t = s.typed[s.cur] || '';
      if (t.length > 0) {
        s.typed[s.cur] = e.ctrlKey || e.altKey ? '' : t.slice(0, -1);
      } else if (s.cur > 0 && s.typed[s.cur - 1] !== s.words[s.cur - 1]) {
        s.cur -= 1;
      }
      rerender();
      return;
    }

    if (key.length !== 1) return;
    e.preventDefault();
    if (!s.started) {
      if (key === ' ') return;
      start();
    }

    const word = s.words[s.cur];
    const typed = s.typed[s.cur] || '';

    if (key === ' ') {
      if (typed.length === 0) return;
      s.keystrokes += 1;
      const isLast = o.kind === 'words' && s.cur >= s.words.length - 1;
      if (typed.length < word.length) {
        s.keyErrors += 1;
        recordKey(s.keyStats, word[typed.length], false);
        sfx.error();
      } else {
        recordKey(s.keyStats, ' ', true);
        sfx.key();
      }
      if (isLast) { finish(); return; }
      s.cur += 1;
      s.typed[s.cur] = s.typed[s.cur] || '';
      if (o.kind === 'time' && s.words.length - s.cur < LOOKAHEAD) {
        s.words.push(...o.generate(LOOKAHEAD));
      }
      rerender();
      return;
    }

    // printable char
    if (typed.length >= word.length + MAX_EXTRA) return;
    s.keystrokes += 1;
    const expected = word[typed.length];
    const correct = expected !== undefined && key === expected;
    if (correct) {
      recordKey(s.keyStats, expected, true);
      sfx.key();
    } else {
      s.keyErrors += 1;
      if (expected !== undefined) recordKey(s.keyStats, expected, false);
      sfx.error();
    }
    s.typed[s.cur] = typed + key;
    if (o.kind === 'words' && s.cur >= s.words.length - 1 && s.typed[s.cur] === word) {
      finish();
      return;
    }
    rerender();
  }, [restart, start, finish]);

  const s = S.current;
  const o = optsRef.current;
  const secondsElapsed = s.started ? s.samples.length : 0;
  return {
    words: s.words,
    typed: s.typed,
    cur: s.cur,
    started: s.started,
    finished: s.finished,
    result: s.result,
    keyErrors: s.keyErrors,
    keystrokes: s.keystrokes,
    secondsElapsed,
    timeLeft: o.kind === 'time' ? Math.max(0, (o.durationSec || 30) - secondsElapsed) : null,
    samples: s.samples,
    handleKey,
    restart,
  };
}
