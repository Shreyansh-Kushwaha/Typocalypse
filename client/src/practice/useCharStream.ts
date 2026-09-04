// Char-stream engine for code mode: the target contains newlines, Enter
// types '\n', leading indentation after a newline is skipped automatically,
// Tab is swallowed (and counts as two spaces when the target has them),
// Backspace works within the current line. Wrong chars are marked and the
// caret still advances (monkeytype semantics); line breaks must be exact.
import { useCallback, useEffect, useReducer, useRef } from 'react';
import type React from 'react';
import { sfx } from '../sound';
import { recordKey, wpmFrom, accuracyFrom, consistencyFrom } from './stats';
import type { KeyStat, SecondSample } from './stats';

export interface CharStreamOptions {
  target: string;
  enabled?: boolean;
  onFinish?: (result: CharStreamResult) => void;
}

export interface CharStreamResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  correct: number;
  incorrect: number;
  keystrokes: number;
  errors: number;
  durationMs: number;
  samples: SecondSample[];
  keyStats: Record<string, KeyStat>;
}

interface Internal {
  target: string;
  typed: (string | null)[];
  auto: boolean[];
  pos: number;
  lineStart: number;
  started: boolean;
  finished: boolean;
  startedAt: number;
  keystrokes: number;
  errors: number;
  keyStats: Record<string, KeyStat>;
  samples: SecondSample[];
  lastTickKeystrokes: number;
  lastTickErrors: number;
  elapsedMs: number;
  result: CharStreamResult | null;
  timer: ReturnType<typeof setInterval> | null;
}

function fresh(target: string): Internal {
  const s: Internal = {
    target, typed: new Array(target.length).fill(null), auto: new Array(target.length).fill(false),
    pos: 0, lineStart: 0, started: false, finished: false, startedAt: 0, keystrokes: 0, errors: 0,
    keyStats: {}, samples: [], lastTickKeystrokes: 0, lastTickErrors: 0, elapsedMs: 0, result: null, timer: null,
  };
  skipIndent(s);
  return s;
}

function skipIndent(s: Internal) {
  while (s.pos < s.target.length && s.target[s.pos] === ' ') {
    s.typed[s.pos] = ' ';
    s.auto[s.pos] = true;
    s.pos += 1;
  }
  s.lineStart = s.pos;
}

function tally(s: Internal) {
  let correct = 0, incorrect = 0;
  for (let i = 0; i < s.pos; i++) {
    if (s.auto[i]) continue;
    const t = s.typed[i];
    if (t === null) continue;
    if (t === s.target[i]) correct += 1; else incorrect += 1;
  }
  return { correct, incorrect };
}

export function useCharStream(opts: CharStreamOptions) {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const S = useRef<Internal | null>(null);
  if (!S.current) S.current = fresh(opts.target);

  const stopTimer = useCallback(() => {
    const s = S.current!;
    if (s.timer) { clearInterval(s.timer); s.timer = null; }
  }, []);

  const restart = useCallback(() => {
    stopTimer();
    S.current = fresh(optsRef.current.target);
    rerender();
  }, [stopTimer]);

  // new snippet -> reset
  useEffect(() => {
    if (S.current && S.current.target !== opts.target) restart();
  }, [opts.target, restart]);
  useEffect(() => () => stopTimer(), [stopTimer]);

  const finish = useCallback(() => {
    const s = S.current!;
    if (s.finished) return;
    stopTimer();
    s.finished = true;
    const durationMs = Math.max(1, Date.now() - s.startedAt);
    const partialMs = durationMs - s.samples.length * 1000;
    const partialKeys = s.keystrokes - s.lastTickKeystrokes;
    const t = tally(s);
    if (partialMs >= 400 && partialKeys > 0) {
      s.samples.push({
        second: s.samples.length + 1,
        raw: Math.min(300, Math.round((partialKeys / 5) * (60000 / partialMs))),
        net: wpmFrom(t.correct, durationMs),
        errors: s.errors - s.lastTickErrors,
      });
    }
    const result: CharStreamResult = {
      wpm: wpmFrom(t.correct, durationMs),
      rawWpm: wpmFrom(s.keystrokes, durationMs),
      accuracy: accuracyFrom(s.keystrokes - s.errors, s.keystrokes),
      consistency: consistencyFrom(s.samples.map(x => x.raw)),
      correct: t.correct,
      incorrect: t.incorrect,
      keystrokes: s.keystrokes,
      errors: s.errors,
      durationMs,
      samples: s.samples.slice(),
      keyStats: { ...s.keyStats },
    };
    s.result = result;
    s.elapsedMs = durationMs;
    rerender();
    optsRef.current.onFinish?.(result);
  }, [stopTimer]);

  const tick = useCallback(() => {
    const s = S.current!;
    if (!s.started || s.finished) return;
    const elapsed = Date.now() - s.startedAt;
    const t = tally(s);
    const keys = s.keystrokes - s.lastTickKeystrokes;
    s.samples.push({
      second: s.samples.length + 1,
      raw: Math.min(300, Math.round((keys / 5) * 60)),
      net: wpmFrom(t.correct, elapsed),
      errors: s.errors - s.lastTickErrors,
    });
    s.lastTickKeystrokes = s.keystrokes;
    s.lastTickErrors = s.errors;
    s.elapsedMs = elapsed;
    rerender();
  }, []);

  const start = useCallback(() => {
    const s = S.current!;
    s.started = true;
    s.startedAt = Date.now();
    s.timer = setInterval(tick, 1000);
  }, [tick]);

  const hit = useCallback((s: Internal, ch: string) => {
    s.keystrokes += 1;
    const expected = s.target[s.pos];
    const correct = ch === expected;
    if (correct) { recordKey(s.keyStats, expected, true); sfx.key(); }
    else { s.errors += 1; recordKey(s.keyStats, expected, false); sfx.error(); }
    s.typed[s.pos] = ch;
    s.auto[s.pos] = false;
    s.pos += 1;
    return correct;
  }, []);

  const miss = useCallback((s: Internal) => {
    s.keystrokes += 1;
    s.errors += 1;
    recordKey(s.keyStats, s.target[s.pos], false);
    sfx.error();
  }, []);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    const s = S.current!;
    const o = optsRef.current;
    const key = e.key;

    if (key === 'Escape') { e.preventDefault(); restart(); return; }
    if (key === 'Tab') e.preventDefault(); // never leave the box
    if (o.enabled === false || s.finished) return;
    if (e.metaKey || (e.ctrlKey && key !== 'Backspace')) return;

    if (key === 'Backspace') {
      e.preventDefault();
      if (!s.started) return;
      if (s.pos > s.lineStart) {
        if (e.ctrlKey || e.altKey) {
          // back to the previous word boundary on this line
          let p = s.pos;
          while (p > s.lineStart && s.target[p - 1] === ' ') p -= 1;
          while (p > s.lineStart && s.target[p - 1] !== ' ') p -= 1;
          for (let i = p; i < s.pos; i++) s.typed[i] = null;
          s.pos = p;
        } else {
          s.pos -= 1;
          s.typed[s.pos] = null;
        }
        rerender();
      }
      return;
    }

    const expected = s.target[s.pos];
    if (expected === undefined) return;

    if (key === 'Tab') {
      if (!s.started) start();
      if (expected === ' ' && s.target[s.pos + 1] === ' ') { hit(s, ' '); hit(s, ' '); }
      else miss(s);
      rerender();
      return;
    }

    if (key === 'Enter') {
      e.preventDefault();
      if (!s.started) start();
      if (expected === '\n') {
        hit(s, '\n');
        skipIndent(s);
      } else {
        miss(s);
      }
      if (s.pos >= s.target.length) { finish(); return; }
      rerender();
      return;
    }

    if (key.length !== 1) return;
    e.preventDefault();
    if (!s.started) {
      if (key === ' ') return;
      start();
    }
    if (expected === '\n') {
      // line breaks must be exact - a stray char here is an error, no advance
      miss(s);
      rerender();
      return;
    }
    hit(s, key);
    if (s.pos >= s.target.length) { finish(); return; }
    rerender();
  }, [restart, start, hit, miss, finish]);

  const s = S.current;
  return {
    target: s.target,
    typed: s.typed,
    auto: s.auto,
    pos: s.pos,
    started: s.started,
    finished: s.finished,
    result: s.result,
    errors: s.errors,
    keystrokes: s.keystrokes,
    secondsElapsed: s.started ? Math.floor(s.elapsedMs / 1000) : 0,
    samples: s.samples,
    handleKey,
    restart,
  };
}
