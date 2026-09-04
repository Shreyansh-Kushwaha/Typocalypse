import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, Btn, Tag } from '../multiplayer/ui';
import { SeoFor } from '../seo';
import { sfx } from '../sound';
import { generateWords } from '../content/words';
import { recordSession } from '../offline/queue';
import { useWordStream } from '../practice/useWordStream';
import type { WordStreamResult } from '../practice/useWordStream';
import WordStream from '../practice/WordStream';
import WpmChart from '../practice/WpmChart';
import LadderPanel from '../practice/LadderPanel';
import PracticeShell from '../practice/PracticeShell';
import { useOnline } from '../practice/useOnline';
import { localHour } from '../practice/stats';

const SETTINGS_KEY = 'typo-practice';
const DURATIONS = [15, 30, 60] as const;
const WORD_COUNTS = [25, 50, 100] as const;

interface Settings {
  kind: 'time' | 'words';
  seconds: 15 | 30 | 60;
  words: 25 | 50 | 100;
  punctuation: boolean;
  numbers: boolean;
}

const DEFAULTS: Settings = { kind: 'time', seconds: 30, words: 25, punctuation: false, numbers: false };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw);
    return {
      kind: p.kind === 'words' ? 'words' : 'time',
      seconds: DURATIONS.includes(p.seconds) ? p.seconds : DEFAULTS.seconds,
      words: WORD_COUNTS.includes(p.words) ? p.words : DEFAULTS.words,
      punctuation: !!p.punctuation,
      numbers: !!p.numbers,
    };
  } catch {
    return DEFAULTS;
  }
}

type SaveState = 'idle' | 'saving' | 'saved' | 'queued' | 'failed';

const TimedTestPage: React.FC = () => {
  const navigate = useNavigate();
  const { online, queued } = useOnline();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [save, setSave] = useState<SaveState>('idle');
  const [ladderKey, setLadderKey] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage unavailable */ }
  }, [settings]);

  const generate = useCallback(
    (n: number) => generateWords(n, { punctuation: settings.punctuation, numbers: settings.numbers }),
    [settings.punctuation, settings.numbers],
  );

  const onFinish = useCallback((r: WordStreamResult) => {
    sfx.success();
    const mode = r.kind === 'time' ? `test${settings.seconds}` : `words${settings.words}`;
    setSave('saving');
    recordSession({
      context: 'test',
      mode,
      wpm: r.netWpm,
      accuracy: r.accuracy,
      errors: r.incorrect + r.extra + r.missed,
      totalTyped: r.correct + r.incorrect + r.extra,
      durationMs: r.durationMs,
      consistency: r.consistency,
      keyStats: r.keyStats,
      localHour: localHour(),
    })
      .then(res => { setSave(res.queued ? 'queued' : 'saved'); if (!res.queued) setLadderKey(k => k + 1); })
      .catch(() => setSave('failed'));
  }, [settings.seconds, settings.words]);

  const t = useWordStream({
    kind: settings.kind,
    durationSec: settings.seconds,
    wordCount: settings.words,
    generate,
    onFinish,
  });
  const { restart } = t;

  const reset = useCallback(() => {
    setSave('idle');
    restart();
    requestAnimationFrame(() => boxRef.current?.focus());
  }, [restart]);

  // any settings change -> fresh test
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    reset();
  }, [settings, reset]);

  // keyboard-only flow: Tab restarts anywhere on the page, Enter on the result panel starts the next test,
  // and any printable key pulls focus back into the typing box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inBox = !!boxRef.current && boxRef.current.contains(e.target as Node);
      if (e.key === 'Tab') {
        e.preventDefault();
        if (!inBox) reset();
        return;
      }
      if (inBox) return;
      const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON';
      if (e.key === 'Enter' && t.finished && !onButton) { e.preventDefault(); reset(); return; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !t.finished) {
        boxRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [reset, t.finished]);

  const set = (patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch }));
  const r = t.result;
  const ladderMode = settings.kind === 'time' ? `test${settings.seconds}` : 'test60';

  const pick = (active: boolean, label: string, onClick: () => void, color = 'bg-cyan-300') => (
    <Btn key={label} tabIndex={-1} color={active ? color : 'bg-white'} className={`text-xs py-2 px-3 ${active ? '' : 'opacity-70'}`} onClick={onClick} aria-pressed={active}>
      {label}
    </Btn>
  );

  return (
    <PracticeShell title="Timed" accent="Test" onBack={() => navigate('/dashboard')} online={online} queued={queued}>
      <SeoFor path="/practice" />
      <div className="space-y-4">
        {/* config bar - wraps into rows of buttons rather than overflowing on a narrow phone */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Test settings">
          <div className="flex flex-wrap gap-1 items-center">
            {pick(settings.kind === 'time', 'time', () => set({ kind: 'time' }), 'bg-pink-300')}
            {pick(settings.kind === 'words', 'words', () => set({ kind: 'words' }), 'bg-pink-300')}
          </div>
          <span className="font-black text-lg select-none hidden sm:inline" aria-hidden="true">/</span>
          <div className="flex flex-wrap gap-1 items-center">
            {settings.kind === 'time'
              ? DURATIONS.map(d => pick(settings.seconds === d, `${d}s`, () => set({ seconds: d })))
              : WORD_COUNTS.map(w => pick(settings.words === w, `${w}`, () => set({ words: w })))}
          </div>
          <span className="font-black text-lg select-none hidden sm:inline" aria-hidden="true">/</span>
          <div className="flex flex-wrap gap-1 items-center">
            {pick(settings.punctuation, 'punctuation', () => set({ punctuation: !settings.punctuation }), 'bg-green-300')}
            {pick(settings.numbers, 'numbers', () => set({ numbers: !settings.numbers }), 'bg-green-300')}
          </div>
        </div>

        <p className="font-mono text-xs font-bold uppercase text-gray-600 dark:text-yellow-400/70">
          How to: type the words, space moves on, backspace fixes the current word. Timer starts on your first key. Tab or Esc restarts.
        </p>

        {/* live counter */}
        <div className="flex items-center gap-3 font-mono font-black text-2xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {settings.kind === 'time' ? (
            <span className={t.started && !t.finished && (t.timeLeft ?? 0) <= 5 ? 'text-red-600 dark:text-red-400' : ''}>
              {t.timeLeft}
            </span>
          ) : (
            <span>{Math.min(t.cur + (t.finished ? 1 : 0), settings.words)}/{settings.words}</span>
          )}
          {t.started && !t.finished && <Tag className="bg-yellow-300 dark:bg-transparent animate-pulse">live</Tag>}
          {!t.started && <Tag>ready</Tag>}
        </div>

        {!r && (
          <WordStream
            words={t.words}
            typed={t.typed}
            cur={t.cur}
            started={t.started}
            finished={t.finished}
            onKeyDown={t.handleKey}
            shakeOn={t.keyErrors}
            boxRef={boxRef}
          />
        )}

        {r && (
          <div aria-live="polite"><Panel className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-end gap-4 sm:gap-6">
              <div>
                <p className="font-black uppercase text-xs tracking-widest">Net WPM</p>
                <p className="font-mono font-black text-6xl sm:text-7xl md:text-8xl leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.netWpm}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {[
                  ['raw', `${r.rawWpm}`],
                  ['accuracy', `${r.accuracy}%`],
                  ['consistency', `${r.consistency}%`],
                  ['time', r.kind === 'time' ? `${settings.seconds}s` : `${(r.durationMs / 1000).toFixed(1)}s`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="font-black uppercase text-[10px] tracking-widest text-gray-600 dark:text-yellow-400/70">{k}</p>
                    <p className="font-black text-2xl">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Tag className="bg-green-300 dark:bg-transparent">correct {r.correct}</Tag>
              <Tag className="bg-pink-300 dark:bg-transparent">incorrect {r.incorrect}</Tag>
              <Tag className="bg-orange-300 dark:bg-transparent">extra {r.extra}</Tag>
              <Tag className="bg-purple-300 dark:bg-transparent">missed {r.missed}</Tag>
              <Tag>{r.kind === 'time' ? `test${settings.seconds}` : `words${settings.words}`}{settings.punctuation ? ' · punct' : ''}{settings.numbers ? ' · nums' : ''}</Tag>
            </div>

            <WpmChart samples={r.samples} />

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
              <Btn color="bg-cyan-300" className="w-full sm:w-auto" onClick={reset} autoFocus disabled={save === 'saving'}>
                {save === 'saving' ? 'Saving…' : 'Next test'}
              </Btn>
              <span className="font-mono text-xs font-bold uppercase text-gray-600 dark:text-yellow-400/70">Tab or Enter for the next one</span>
              <span className="font-mono text-xs font-bold uppercase sm:ml-auto">
                {save === 'saving' && 'saving…'}
                {save === 'saved' && 'saved to your history'}
                {save === 'queued' && 'saved offline — will sync'}
                {save === 'failed' && <span className="text-red-600 dark:text-red-400">could not save this run</span>}
              </span>
            </div>
          </Panel></div>
        )}

        <LadderPanel mode={ladderMode} title={`Ladder · ${ladderMode}`} online={online} refreshKey={ladderKey} />
      </div>
    </PracticeShell>
  );
};

export default TimedTestPage;
