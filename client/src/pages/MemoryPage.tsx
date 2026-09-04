import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Panel, Btn, Tag, brutal } from '../multiplayer/ui';
import { SeoFor } from '../seo';
import { sfx } from '../sound';
import { copyText } from '../share';
import { ArcadeShell, HowTo, Stat, DiffView, DiffLegend } from '../arcade/ui';
import { diffWords, charAccuracy } from '../arcade/diff';
import type { WordDiff } from '../arcade/diff';
import { pickMemorySession, ROUNDS } from '../arcade/memoryPassages';
import type { Passage } from '../arcade/memoryPassages';

// Last Words - read a passage once, then type it from memory.

interface RoundResult {
  passage: Passage;
  typed: string;
  diff: WordDiff;
  charAcc: number;
  charErrors: number;
  wpm: number;
  durationMs: number;
}

type Phase = 'intro' | 'reveal' | 'recall' | 'result' | 'summary';
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';
const FAIL_BELOW = 60;
const revealMsFor = (words: number) => Math.max(4000, 1200 * words);

function shareLine(rounds: RoundResult[]): string {
  const avg = Math.round(rounds.reduce((a, r) => a + r.diff.accuracy, 0) / Math.max(1, rounds.length));
  const best = rounds.reduce((a, r) => Math.max(a, r.diff.accuracy), 0);
  const longest = rounds.filter(r => r.diff.accuracy >= FAIL_BELOW).reduce((a, r) => Math.max(a, r.passage.words), 0);
  const blocks = rounds.map(r => (r.diff.accuracy >= 95 ? '🟩' : r.diff.accuracy >= FAIL_BELOW ? '🟨' : '🟥')).join('');
  return `🧠 Last Words · ${rounds.length}/${ROUNDS} rounds ${blocks} · avg ${avg}% · best ${best}% · ${longest} words recalled\n${window.location.origin}/arcade/memory`;
}

const MemoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('intro');
  const [session, setSession] = useState<Passage[]>([]);
  const [round, setRound] = useState(0);
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [typed, setTyped] = useState('');
  const [revealPct, setRevealPct] = useState(100);
  const [ended, setEnded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [save, setSave] = useState<SaveState>('idle');
  const revealEndsAt = useRef(0);
  const recallStart = useRef(0);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const lastPayload = useRef<Record<string, unknown> | null>(null);

  const passage = session[round];

  const persist = (payload: Record<string, unknown>) => {
    lastPayload.current = payload;
    setSave('saving');
    axios.post('/stats/session', payload)
      .then(() => setSave('saved'))
      .catch(() => setSave('failed'));
  };

  // reveal countdown bar
  useEffect(() => {
    if (phase !== 'reveal') return;
    const total = revealEndsAt.current - Date.now();
    const t = setInterval(() => {
      const left = revealEndsAt.current - Date.now();
      setRevealPct(Math.max(0, (left / total) * 100));
      if (left <= 0) {
        clearInterval(t);
        beginRecall();
      }
    }, 50);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === 'recall') boxRef.current?.focus();
  }, [phase]);

  const startSession = () => {
    const fresh = pickMemorySession();
    setSession(fresh);
    setRounds([]);
    setRound(0);
    setEnded(false);
    setCopied(false);
    setSave('idle');
    startReveal(0, fresh);
  };

  const startReveal = (r: number, list: Passage[] = session) => {
    setRound(r);
    setTyped('');
    setRevealPct(100);
    revealEndsAt.current = Date.now() + revealMsFor(list[r].words);
    setPhase('reveal');
    sfx.countdown();
  };

  const beginRecall = () => {
    recallStart.current = Date.now();
    setPhase('recall');
    sfx.go();
  };

  const submit = () => {
    if (phase !== 'recall' || !passage) return;
    const durationMs = Math.max(1, Date.now() - recallStart.current);
    const diff = diffWords(passage.text, typed);
    const ca = charAccuracy(passage.text, typed);
    const correctChars = Math.max(0, ca.length - ca.distance);
    const wpm = Math.min(300, Math.round((correctChars / 5) / (durationMs / 60000)));
    const result: RoundResult = { passage, typed, diff, charAcc: ca.accuracy, charErrors: ca.distance, wpm, durationMs };
    const all = [...rounds, result];
    setRounds(all);
    const failed = diff.accuracy < FAIL_BELOW;
    setEnded(failed);
    if (failed) sfx.lose();
    else if (diff.accuracy >= 95) sfx.success();
    else sfx.pop();
    setPhase('result');
    persist({
      context: 'memory',
      mode: `words${passage.words}`,
      wpm,
      accuracy: diff.accuracy,
      errors: ca.distance,
      totalTyped: passage.text.length, // the ORIGINAL length so a clean 30-word recall counts for Photographic
      durationMs,
      keyStats: {},
      localHour: new Date().getHours(),
    });
  };

  const next = () => {
    if (ended || round + 1 >= ROUNDS) { setPhase('summary'); if (!ended) sfx.win(); return; }
    startReveal(round + 1);
  };

  const wordsTyped = typed.trim() ? typed.trim().split(/\s+/).length : 0;
  const last = rounds[rounds.length - 1];

  return (
    <ArcadeShell title="Last" accent="Words" onBack={() => navigate('/dashboard')}>
      <SeoFor path="/arcade/memory" />
      {phase === 'intro' && (
        <HowTo
          icon="🧠"
          headline="Read it once. Then it is gone. Type it back."
          steps={[
            `${ROUNDS} passages, each longer than the last - from a sentence to a small paragraph.`,
            'You get 1.2 seconds per word to memorise it (at least 4). The bar shows how long is left.',
            'Then the passage vanishes and you type what you remember. Enter or Done to score it.',
            'Scored word by word: green is right, red is wrong or missing, struck-through words you invented.',
            `Score under ${FAIL_BELOW}% and the session ends there - the words are gone.`,
          ]}
        >
          <Btn color="bg-purple-300" className="w-full sm:w-auto text-xl sm:text-2xl px-6 sm:px-10 py-4" onClick={startSession}>Begin</Btn>
        </HowTo>
      )}

      {phase !== 'intro' && phase !== 'summary' && passage && (
        <div className="flex flex-wrap items-center gap-2">
          <Tag className="bg-purple-300 text-base sm:text-lg"><span aria-hidden="true">🧠 </span>ROUND {round + 1} / {ROUNDS}</Tag>
          <Tag>{passage.words} words</Tag>
          <Tag>{passage.text.length} chars</Tag>
          {rounds.length > 0 && <Tag>avg {Math.round(rounds.reduce((a, r) => a + r.diff.accuracy, 0) / rounds.length)}%</Tag>}
        </div>
      )}

      {phase === 'reveal' && passage && (
        <Panel className="space-y-4 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="font-black uppercase text-xs tracking-widest shrink-0">Memorise</span>
            <div className="flex-1 min-w-0 h-4 border-2 border-black dark:border-yellow-400 bg-gray-100 dark:bg-black overflow-hidden">
              <div className="h-full bg-purple-400 dark:bg-yellow-400" style={{ width: `${revealPct}%`, transition: 'width 50ms linear' }} />
            </div>
          </div>
          <p className="font-mono text-base sm:text-lg md:text-xl leading-relaxed select-none break-words" onCopy={e => e.preventDefault()}>{passage.text}</p>
          <div className="flex sm:justify-end">
            <Btn className="w-full sm:w-auto text-xs py-2" onClick={beginRecall}>Got it — hide it now</Btn>
          </div>
        </Panel>
      )}

      {phase === 'recall' && passage && (
        <div className="space-y-3">
          <p className="font-black uppercase text-sm">The words are gone. Type them back, then press Enter.</p>
          <textarea
            ref={boxRef}
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onPaste={e => e.preventDefault()}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
            rows={5}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="from memory…"
            aria-label="Type the passage you just read, from memory"
            className={`w-full font-mono text-base sm:text-lg md:text-xl leading-relaxed p-3 sm:p-4 bg-white dark:bg-black text-black dark:text-yellow-400 ${brutal.border} outline-none resize-y focus:shadow-[8px_8px_0px_0px_#ff007f] dark:focus:shadow-[8px_8px_0px_0px_#fff]`}
          />
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            <Btn color="bg-purple-300" className="w-full sm:w-auto" onClick={submit}>Done</Btn>
            <span className="font-mono text-xs font-bold">{wordsTyped} / {passage.words} words</span>
          </div>
        </div>
      )}

      {phase === 'result' && last && (
        <div aria-live="polite"><Panel className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label="Word accuracy" value={`${last.diff.accuracy}%`} color={last.diff.accuracy >= 95 ? 'bg-green-300' : last.diff.accuracy >= FAIL_BELOW ? 'bg-yellow-300' : 'bg-red-300'} />
            <Stat label="Char accuracy" value={`${last.charAcc}%`} />
            <Stat label="WPM" value={last.wpm} />
            <Stat label="Right / wrong / missed" value={`${last.diff.correct}/${last.diff.wrong}/${last.diff.missing}`} />
          </div>
          <DiffView tokens={last.diff.tokens} />
          <DiffLegend />
          {ended ? (
            <p className="text-xl sm:text-2xl font-black uppercase text-red-600 dark:text-red-400">The words are gone.</p>
          ) : last.diff.accuracy >= 95 ? (
            <p className="text-lg sm:text-xl font-black uppercase text-green-700 dark:text-green-400">Photographic.</p>
          ) : null}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Btn autoFocus color="bg-purple-300" className="w-full sm:w-auto text-lg sm:text-xl px-6 sm:px-8 py-3" onClick={next}>
              {ended || round + 1 >= ROUNDS ? 'See the summary' : 'Next passage'}
            </Btn>
            <span className="font-mono text-xs font-bold uppercase text-gray-600 dark:text-yellow-400/70">
              {save === 'saving' && 'saving this round…'}
              {save === 'saved' && 'saved to your history'}
              {save === 'failed' && (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-red-600 dark:text-red-400">could not save this round</span>
                  <Btn
                    color="bg-yellow-300"
                    className="text-[10px] py-1 px-2"
                    onClick={() => { if (lastPayload.current) persist(lastPayload.current); }}
                  >
                    Retry
                  </Btn>
                </span>
              )}
            </span>
          </div>
        </Panel></div>
      )}

      {phase === 'summary' && rounds.length > 0 && (
        <div aria-live="polite"><Panel className="text-center p-4 sm:p-6 sm:py-8 space-y-4">
          <p className="text-4xl" aria-hidden="true">{ended ? '🕯️' : '🧠'}</p>
          <p className="text-2xl sm:text-3xl font-black uppercase">{ended ? `Memory failed on round ${rounds.length}` : 'All five passages recalled'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-xl mx-auto">
            <Stat label="Average" value={`${Math.round(rounds.reduce((a, r) => a + r.diff.accuracy, 0) / rounds.length)}%`} color="bg-purple-300" />
            <Stat label="Best round" value={`${rounds.reduce((a, r) => Math.max(a, r.diff.accuracy), 0)}%`} color="bg-green-300" />
            <Stat label="Longest recalled" value={`${rounds.filter(r => r.diff.accuracy >= FAIL_BELOW).reduce((a, r) => Math.max(a, r.passage.words), 0)}w`} color="bg-cyan-300" />
          </div>
          <div className="text-left max-w-xl mx-auto font-mono text-xs sm:text-sm space-y-1">
            {rounds.map((r, i) => (
              <div key={i} className="flex flex-wrap justify-between gap-2 border-b border-black/10 dark:border-yellow-400/10 py-1">
                <span>Round {i + 1} · {r.passage.words} words</span>
                <span className="font-black">{r.diff.accuracy}% · {r.wpm} wpm</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-center sm:flex-wrap">
            <Btn color="bg-purple-300" className="w-full sm:w-auto text-lg sm:text-xl px-6 sm:px-8 py-3" onClick={startSession} autoFocus>Run it back</Btn>
            <Btn
              color="bg-green-300"
              className="w-full sm:w-auto"
              disabled={copying}
              onClick={async () => {
                setCopying(true);
                try { setCopied(await copyText(shareLine(rounds))); } finally { setCopying(false); }
              }}
            >
              {copying ? 'Copying…' : copied ? '✓ Copied' : <><span aria-hidden="true">📋 </span>Copy result</>}
            </Btn>
          </div>
        </Panel></div>
      )}
    </ArcadeShell>
  );
};

export default MemoryPage;
