import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Panel, Btn, Tag, brutal } from '../multiplayer/ui';
import { SeoFor } from '../seo';
import { sfx } from '../sound';
import { copyText } from '../share';
import { ArcadeShell, HowTo, Stat, DiffView, DiffLegend, SkeletonBar } from '../arcade/ui';
import { diffWords, charAccuracy } from '../arcade/diff';
import type { WordDiff } from '../arcade/diff';
import { playStatic } from '../arcade/static';
import { pickFallbackSession } from '../arcade/radioFallback';
import type { RadioLine } from '../arcade/radioFallback';

// Radio Transmissions - dictation over the Web Speech API. The line is spoken,
// never shown; type what you heard.

interface LineResult {
  line: RadioLine;
  typed: string;
  diff: WordDiff;
  score: number;      // 0-100 after replay penalty
  replays: number;
  charErrors: number;
  typingMs: number;
}
type Phase = 'intro' | 'loading' | 'playing' | 'typing' | 'reveal' | 'summary';
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

const LINES_PER_SESSION = 10;
const MAX_REPLAYS = 2;
const REPLAY_PENALTY = 0.1;
const rateFor = (i: number) => 0.9 + (i / (LINES_PER_SESSION - 1)) * 0.4;

function operatorRank(acc: number): { name: string; icon: string } {
  if (acc >= 95) return { name: 'Ghost Frequency', icon: '👻' };
  if (acc >= 80) return { name: 'Signals Officer', icon: '📡' };
  if (acc >= 60) return { name: 'Operator', icon: '🎧' };
  return { name: 'Rookie', icon: '📻' };
}

function summarise(results: LineResult[]) {
  const total = results.reduce((a, r) => a + r.score, 0);
  const words = results.reduce((a, r) => a + r.diff.total + r.diff.extra, 0);
  const correct = results.reduce((a, r) => a + r.diff.correct, 0);
  const accuracy = words ? Math.round((correct / words) * 100) : 0;
  return { total, accuracy, rank: operatorRank(accuracy) };
}

function shareLine(results: LineResult[]): string {
  const { total, accuracy, rank } = summarise(results);
  const blocks = results.map(r => (r.score >= 95 ? '🟩' : r.score >= 60 ? '🟨' : '🟥')).join('');
  return `📻 Radio Transmissions · ${total}/${LINES_PER_SESSION * 100} · ${accuracy}% · ${rank.icon} ${rank.name}\n${blocks}\n${window.location.origin}/arcade/radio`;
}

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const RadioPage: React.FC = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('intro');
  const [lines, setLines] = useState<RadioLine[]>([]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [replays, setReplays] = useState(0);
  const [results, setResults] = useState<LineResult[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [showText, setShowText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [save, setSave] = useState<SaveState>('idle');
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingSince = useRef(0);
  const lineTypingMs = useRef(0);
  const transmitId = useRef(0);
  const linesRef = useRef<RadioLine[]>([]);
  const savePayload = useRef<Record<string, unknown> | null>(null);
  const phaseRef = useRef<Phase>('intro');
  phaseRef.current = phase;

  // voice selection - voices often arrive asynchronously
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { setDegraded(true); return; }
    const synth = window.speechSynthesis;
    const pickVoice = () => {
      const voices = synth.getVoices();
      const en = voices.filter(v => /^en([-_]|$)/i.test(v.lang));
      voiceRef.current = en.find(v => v.default) || en.find(v => /en[-_]US/i.test(v.lang)) || en[0] || voices[0] || null;
    };
    pickVoice();
    synth.addEventListener('voiceschanged', pickVoice);
    return () => {
      synth.removeEventListener('voiceschanged', pickVoice);
      synth.cancel();
    };
  }, []);

  useEffect(() => {
    if (phase === 'typing') inputRef.current?.focus();
  }, [phase]);

  const speak = (text: string, rate: number) => new Promise<void>(resolve => {
    const synth = window.speechSynthesis;
    let done = false;
    let timer = 0;
    const finish = () => { if (!done) { done = true; window.clearTimeout(timer); resolve(); } };
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      u.pitch = 0.9;
      if (voiceRef.current) { u.voice = voiceRef.current; u.lang = voiceRef.current.lang; } else u.lang = 'en-US';
      u.onend = finish;
      u.onerror = finish;
      utterRef.current = u; // keep a reference or Chrome may GC it before onend fires
      const est = (text.split(/\s+/).length / (2.4 * rate)) * 1000;
      timer = window.setTimeout(finish, est + 4000);
      window.setTimeout(() => synth.speak(u), 60);
    } catch {
      finish();
    }
  });

  const transmit = async (i: number, isReplay: boolean) => {
    const line = linesRef.current[i];
    if (!line) return;
    const id = ++transmitId.current;
    if (isReplay && typingSince.current) {
      lineTypingMs.current += Date.now() - typingSince.current;
      typingSince.current = 0;
    }
    setPhase('playing');
    await playStatic(0.4);
    if (id !== transmitId.current) return;
    if (degraded) {
      setShowText(true);
      await wait(2000);
      setShowText(false);
    } else {
      await speak(line.text, rateFor(i));
    }
    if (id !== transmitId.current) return;
    typingSince.current = Date.now();
    setPhase('typing');
  };

  const startSession = async () => {
    setResults([]);
    setIdx(0);
    setTyped('');
    setReplays(0);
    setCopied(false);
    setSave('idle');
    setOffline(false);
    lineTypingMs.current = 0;
    typingSince.current = 0;
    setPhase('loading');
    let picked: RadioLine[];
    try {
      const res = await axios.get('/arcade/radio');
      picked = (res.data.lines as RadioLine[]).slice(0, LINES_PER_SESSION);
      if (picked.length < 3) throw new Error('short bank');
    } catch {
      picked = pickFallbackSession();
      setOffline(true);
    }
    linesRef.current = picked;
    setLines(picked);
    sfx.go();
    void transmit(0, false);
  };

  const replay = () => {
    if (phase !== 'typing' || replays >= MAX_REPLAYS) return;
    setReplays(r => r + 1);
    void transmit(idx, true);
  };

  const submit = () => {
    if (phaseRef.current !== 'typing') return;
    const line = linesRef.current[idx];
    if (!line) return;
    transmitId.current += 1; // cancel anything still speaking
    try { window.speechSynthesis?.cancel(); } catch { /* no speech */ }
    if (typingSince.current) {
      lineTypingMs.current += Date.now() - typingSince.current;
      typingSince.current = 0;
    }
    const diff = diffWords(line.text, typed);
    const ca = charAccuracy(line.text, typed);
    const score = Math.round(diff.accuracy * (1 - REPLAY_PENALTY * replays));
    const r: LineResult = { line, typed, diff, score, replays, charErrors: ca.distance, typingMs: lineTypingMs.current };
    setResults(prev => [...prev, r]);
    lineTypingMs.current = 0;
    if (diff.accuracy >= 95) sfx.success(); else if (diff.accuracy >= 60) sfx.pop(); else sfx.error();
    setPhase('reveal');
  };

  const next = () => {
    if (idx + 1 >= lines.length) { finish(); return; }
    setIdx(idx + 1);
    setTyped('');
    setReplays(0);
    void transmit(idx + 1, false);
  };

  const persist = (payload: Record<string, unknown>) => {
    savePayload.current = payload;
    setSave('saving');
    axios.post('/stats/session', payload)
      .then(() => setSave('saved'))
      .catch(() => setSave('failed'));
  };

  const finish = () => {
    setPhase('summary');
    const { accuracy } = summarise(results);
    if (accuracy >= 90) sfx.win(); else sfx.success();
    const typingMs = results.reduce((a, r) => a + r.typingMs, 0);
    const typedChars = results.reduce((a, r) => a + r.typed.trim().length, 0);
    const totalTyped = results.reduce((a, r) => a + r.line.text.length, 0);
    const errors = results.reduce((a, r) => a + r.charErrors, 0);
    const wpm = typingMs > 0 ? Math.min(300, Math.round((typedChars / 5) / (typingMs / 60000))) : 0;
    persist({
      context: 'radio', mode: 'radio', wpm, accuracy, errors, totalTyped,
      durationMs: Math.max(1000, typingMs), keyStats: {}, localHour: new Date().getHours(),
    });
  };

  const line = lines[idx];
  const last = results[results.length - 1];
  const summary = summarise(results);
  const testVoice = () => { if (!degraded) void speak('Radio check. This is Typocalypse control, do you copy?', 1); };

  return (
    <ArcadeShell title="Radio" accent="Transmissions" onBack={() => navigate('/dashboard')}>
      <SeoFor path="/arcade/radio" />
      {phase === 'intro' && (
        <HowTo
          icon="📻"
          headline="Ten transmissions. You hear them once. Type what you heard."
          steps={[
            'A burst of static, then a voice reads one line. The text is never shown.',
            'Type it into the box and press Enter. Case and punctuation do not matter - words do.',
            `Missed it? Replay the transmission up to ${MAX_REPLAYS} times, but each replay costs 10% of that line's score.`,
            'The operator speaks faster as the session goes on, and the lines get longer.',
            'Finish at 90%+ overall to earn your Radio Operator badge.',
          ]}
        >
          {degraded && (
            <p className="font-mono text-sm font-bold text-red-600 dark:text-red-400 mb-4 border-l-4 border-red-500 pl-3">
              No speech mode. This browser cannot speak, so each transmission will be shown as text on screen for two seconds
              instead of being read aloud. Everything else works the same.
            </p>
          )}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
            <Btn color="bg-cyan-300" className="w-full sm:w-auto text-xl sm:text-2xl px-6 sm:px-10 py-4" onClick={() => void startSession()}>Tune in</Btn>
            {!degraded && (
              <Btn
                className="w-full sm:w-auto text-xs py-2"
                onClick={testVoice}
                aria-label="Test the voice — plays a sample transmission"
                title="Test the voice — plays a sample transmission"
              >
                <span aria-hidden="true">🔊 </span>Test the voice
              </Btn>
            )}
          </div>
        </HowTo>
      )}

      {phase === 'loading' && (
        <Panel className="space-y-3 p-4 sm:p-6">
          <p className="font-mono font-black uppercase text-sm">Scanning frequencies…</p>
          <div aria-hidden="true" className="space-y-2">
            <SkeletonBar className="h-4 w-2/3" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-5/6" />
            <SkeletonBar className="h-12 w-full" />
          </div>
        </Panel>
      )}

      {(phase === 'playing' || phase === 'typing' || phase === 'reveal') && line && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="bg-cyan-300 text-base sm:text-lg"><span aria-hidden="true">📻 </span>TRANSMISSION {idx + 1} / {lines.length}</Tag>
            <Tag><span aria-hidden="true">{'▮'.repeat(line.difficulty)}{'▯'.repeat(3 - line.difficulty)}</span> difficulty {line.difficulty} of 3</Tag>
            <Tag>rate {rateFor(idx).toFixed(2)}x</Tag>
            {results.length > 0 && <Tag>{summary.total} pts</Tag>}
            {offline && (
              <Tag className="bg-orange-300 dark:bg-transparent" >
                <span title="The server did not answer, so these lines come from the small bank built into the app.">offline lines</span>
              </Tag>
            )}
            {degraded && (
              <Tag className="bg-red-300 dark:bg-transparent">
                <span title="This browser has no speech synthesis, so each line is shown as text instead of spoken.">no speech — text shown</span>
              </Tag>
            )}
          </div>

          {offline && (
            <p className="font-mono text-xs font-bold border-l-4 border-orange-400 pl-3 text-gray-700 dark:text-yellow-400/80">
              The transmission bank did not answer. Playing the offline lines built into the app — your score still saves.
            </p>
          )}

          {phase === 'playing' && (
            <div aria-live="polite"><Panel className="text-center p-4 sm:p-6 sm:py-10">
              <p className="text-4xl mb-2 animate-pulse" aria-hidden="true">📡</p>
              <p className="text-xl sm:text-2xl font-black uppercase">{showText ? 'Read fast — it vanishes' : 'Incoming transmission…'}</p>
              {showText ? (
                <p className="font-mono text-base sm:text-lg md:text-xl mt-4 select-none break-words">{line.text}</p>
              ) : (
                <p className="font-mono text-sm font-bold mt-2">listen closely</p>
              )}
            </Panel></div>
          )}

          {phase === 'typing' && (
            <div className="space-y-3">
              <p className="font-black uppercase text-sm">What did you hear? Type it, then press Enter.</p>
              <input
                ref={inputRef}
                value={typed}
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                placeholder="transcribe the transmission…"
                aria-label="Type the transmission you just heard"
                className={`w-full font-mono text-base sm:text-lg md:text-xl p-3 sm:p-4 bg-white dark:bg-black text-black dark:text-yellow-400 ${brutal.border} outline-none focus:shadow-[8px_8px_0px_0px_#ff007f] dark:focus:shadow-[8px_8px_0px_0px_#fff]`}
              />
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
                <Btn color="bg-cyan-300" className="w-full sm:w-auto" onClick={submit}>Send</Btn>
                <Btn
                  color="bg-yellow-300"
                  className="w-full sm:w-auto"
                  onClick={replay}
                  disabled={replays >= MAX_REPLAYS}
                  aria-label={`Replay transmission — ${MAX_REPLAYS - replays} replays left, each costs 10% of this line's score`}
                  title={`Replay transmission — ${MAX_REPLAYS - replays} replays left, each costs 10% of this line's score`}
                >
                  <span aria-hidden="true">🔁 </span>Replay transmission ({MAX_REPLAYS - replays} left, −10% each)
                </Btn>
              </div>
            </div>
          )}

          {phase === 'reveal' && last && (
            <div aria-live="polite"><Panel className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Stat label="Line score" value={last.score} color={last.score >= 95 ? 'bg-green-300' : last.score >= 60 ? 'bg-yellow-300' : 'bg-red-300'} />
                <Stat label="Word accuracy" value={`${last.diff.accuracy}%`} />
                <Stat label="Replays" value={last.replays} />
              </div>
              <div>
                <p className="font-black uppercase text-xs tracking-widest mb-1">The transmission said</p>
                <DiffView tokens={last.diff.tokens} />
                <DiffLegend />
              </div>
              {last.typed.trim() && (
                <p className="font-mono text-sm break-words"><span className="font-black uppercase text-xs tracking-widest">You typed: </span>{last.typed}</p>
              )}
              <Btn autoFocus color="bg-cyan-300" className="w-full sm:w-auto text-lg sm:text-xl px-6 sm:px-8 py-3" onClick={next}>
                {idx + 1 >= lines.length ? 'End of broadcast' : 'Next transmission'}
              </Btn>
            </Panel></div>
          )}
        </>
      )}

      {phase === 'summary' && results.length > 0 && (
        <div aria-live="polite"><Panel className="text-center p-4 sm:p-6 sm:py-8 space-y-4">
          <p className="text-4xl" aria-hidden="true">{summary.rank.icon}</p>
          <p className="text-2xl sm:text-3xl font-black uppercase">{summary.rank.name}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-w-xl mx-auto">
            <Stat label="Score" value={`${summary.total}/${LINES_PER_SESSION * 100}`} color="bg-cyan-300" />
            <Stat label="Accuracy" value={`${summary.accuracy}%`} color={summary.accuracy >= 90 ? 'bg-green-300' : 'bg-yellow-300'} />
            <Stat label="Replays" value={results.reduce((a, r) => a + r.replays, 0)} />
          </div>
          <div className="text-left max-w-xl mx-auto font-mono text-xs sm:text-sm space-y-1">
            {results.map((r, i) => (
              <div key={i} className="flex justify-between gap-3 border-b border-black/10 dark:border-yellow-400/10 py-1">
                <span className="truncate">{i + 1}. {r.line.text}</span>
                <span className="font-black whitespace-nowrap">{r.score} pts</span>
              </div>
            ))}
          </div>
          {summary.accuracy >= 90 && (
            <p className="font-black uppercase text-green-700 dark:text-green-400">
              Radio Operator badge earned{save === 'saved' ? '' : '…'}
            </p>
          )}
          <p className="font-mono text-xs font-bold uppercase text-gray-600 dark:text-yellow-400/70">
            {save === 'saving' && 'saving this session…'}
            {save === 'saved' && 'saved to your history'}
            {save === 'failed' && (
              <span className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-red-600 dark:text-red-400">could not save this session</span>
                <Btn color="bg-yellow-300" className="text-[10px] py-1 px-2" onClick={() => { if (savePayload.current) persist(savePayload.current); }}>
                  Retry
                </Btn>
              </span>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-center sm:flex-wrap">
            <Btn color="bg-cyan-300" className="w-full sm:w-auto text-lg sm:text-xl px-6 sm:px-8 py-3" onClick={() => void startSession()} autoFocus>Tune in again</Btn>
            <Btn
              color="bg-green-300"
              className="w-full sm:w-auto"
              disabled={copying}
              onClick={async () => {
                setCopying(true);
                try { setCopied(await copyText(shareLine(results))); } finally { setCopying(false); }
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

export default RadioPage;
