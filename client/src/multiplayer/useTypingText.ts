import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  enabled: boolean;
  onDone?: (stats: { chars: number; errors: number }) => void;
  onTypo?: () => void;
  report?: (p: { chars: number; errors: number; done: boolean }) => void;
  reportMs?: number;
  /** remap incoming keys (used by Corruptor sticky-keys sabotage) */
  keymap?: (key: string) => string;
}

// Core typing engine for passage-based modes. Tracks correct chars and
// errors against a target text and throttles progress reports upstream.
export function useTypingText(text: string, opts: Options) {
  const [pos, setPos] = useState(0);
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);
  const lastReport = useRef(0);
  const stateRef = useRef({ pos: 0, errors: 0, done: false });
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    setPos(0);
    setErrors(0);
    setDone(false);
    stateRef.current = { pos: 0, errors: 0, done: false };
    lastReport.current = 0;
  }, [text]);

  const report = useCallback((force: boolean) => {
    const o = optsRef.current;
    if (!o.report) return;
    const now = Date.now();
    if (!force && now - lastReport.current < (o.reportMs ?? 400)) return;
    lastReport.current = now;
    const s = stateRef.current;
    o.report({ chars: s.pos, errors: s.errors, done: s.done });
  }, []);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    const o = optsRef.current;
    const s = stateRef.current;
    if (!o.enabled || s.done || !text) return;
    let key = e.key;
    if (key === ' ') e.preventDefault();
    if (key.length > 1) return;
    if (o.keymap) key = o.keymap(key);

    if (key === text[s.pos]) {
      s.pos += 1;
      setPos(s.pos);
      if (s.pos >= text.length) {
        s.done = true;
        setDone(true);
        report(true);
        o.onDone?.({ chars: s.pos, errors: s.errors });
        return;
      }
    } else {
      s.errors += 1;
      setErrors(s.errors);
      o.onTypo?.();
    }
    report(false);
  }, [text, report]);

  return { pos, errors, done, handleKey };
}
