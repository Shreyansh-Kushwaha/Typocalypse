import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTypingText } from '../multiplayer/useTypingText';
import { TypingText, Panel, Btn, Tag } from '../multiplayer/ui';
import { sfx } from '../sound';
import KeyboardHeatmap from '../components/KeyboardHeatmap';
import { SeoFor } from '../seo';

interface KeyStat { h: number; m: number }
interface WeakKey { ch: string; attempts: number; missRate: number }
interface MyStats {
  summary: { games: number; bestWpm: number; avgWpm: number; avgAccuracy: number; totalTyped: number };
  keyStats: Record<string, KeyStat>;
  weakKeys: WeakKey[];
  history: { wpm: number; accuracy: number; context: string; mode?: string; at: string }[];
}

/** A pulsing bar in the shape of the content it stands in for. */
const Skel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`block bg-black/15 dark:bg-yellow-400/20 animate-pulse ${className}`} />
);

const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [statsState, setStatsState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [coach, setCoach] = useState('');
  const [coachError, setCoachError] = useState('');
  const [coachSource, setCoachSource] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);
  const [drill, setDrill] = useState<{ text: string; targets: string[] } | null>(null);
  const [drillBusy, setDrillBusy] = useState(false);
  const [drillError, setDrillError] = useState('');
  const [drillDone, setDrillDone] = useState<{ wpm: number; acc: number } | null>(null);
  const drillStart = useRef(0);
  const drillKeys = useRef<Record<string, KeyStat>>({});

  const loadStats = async () => {
    setStatsState('loading');
    try {
      const res = await axios.get('/stats/me');
      setStats(res.data);
      setStatsState('ok');
    } catch (err) {
      console.error('Failed to load stats', err);
      setStatsState('error');
    }
  };

  useEffect(() => { void loadStats(); }, []);

  const getCoaching = async () => {
    if (coachBusy) return;
    setCoachBusy(true);
    setCoachError('');
    try {
      const res = await axios.post('/stats/coach');
      setCoach(res.data.coach);
      setCoachSource(res.data.source);
    } catch {
      setCoachError('The coach did not answer. Try again in a moment.');
    }
    setCoachBusy(false);
  };

  const newDrill = async () => {
    if (drillBusy) return;
    setDrillBusy(true);
    setDrillError('');
    try {
      const res = await axios.get('/stats/drill');
      setDrill(res.data);
      setDrillDone(null);
      drillStart.current = 0;
      drillKeys.current = {};
    } catch {
      setDrillError('Could not build a drill right now. Try again.');
    }
    setDrillBusy(false);
  };

  const typing = useTypingText(drill?.text || '', {
    enabled: !!drill && !drillDone,
    onKey: (expected, correct) => {
      if (!drillStart.current) drillStart.current = Date.now();
      const k = drillKeys.current;
      const ch = expected;
      if (!k[ch]) k[ch] = { h: 0, m: 0 };
      if (correct) k[ch].h += 1; else k[ch].m += 1;
    },
    onDone: ({ chars, errors }) => {
      const durationMs = Date.now() - drillStart.current;
      const wpm = Math.min(300, Math.round((chars / 5) / (durationMs / 60000)));
      const acc = Math.round((chars / (chars + errors)) * 100);
      setDrillDone({ wpm, acc });
      sfx.success();
      axios.post('/stats/session', {
        context: 'drill', mode: 'drill', wpm, accuracy: acc,
        errors, totalTyped: chars + errors, durationMs, keyStats: drillKeys.current,
        localHour: new Date().getHours(),
      }).then(loadStats).catch(() => {});
    },
  });

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16 overflow-x-hidden">
      <SeoFor path="/stats" />
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter">
            Training <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Lab</span>
          </h1>
          <Btn color="bg-red-400" onClick={() => navigate('/dashboard')}>Back</Btn>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 relative z-10">
        {statsState === 'error' && (
          <div role="alert" className="border-4 border-black dark:border-yellow-400 bg-red-400 dark:bg-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="font-mono font-black uppercase text-sm text-black dark:text-yellow-400 break-words">
              <span aria-hidden="true">⚠ </span>Could not load your typing stats
            </p>
            <Btn color="bg-white" className="w-full sm:w-auto" onClick={() => void loadStats()}>Retry</Btn>
          </div>
        )}

        {/* summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Best WPM', value: stats?.summary.bestWpm ?? '—' },
            { label: 'Avg WPM', value: stats?.summary.avgWpm ?? '—' },
            { label: 'Avg accuracy', value: stats ? `${stats.summary.avgAccuracy}%` : '—' },
            { label: 'Passages', value: stats?.summary.games ?? '—' },
          ].map(t => (
            <Panel key={t.label}>
              <p className="font-black uppercase text-xs tracking-widest break-words">{t.label}</p>
              {statsState === 'loading'
                ? <Skel className="h-10 w-20 mt-2" />
                : <p className="font-mono text-3xl sm:text-4xl font-black mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{t.value}</p>}
            </Panel>
          ))}
        </div>

        {/* keyboard heatmap - sequential red ramp on miss rate */}
        <Panel>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <p className="font-black uppercase text-xs tracking-widest">Weak key heatmap — darker red means more misses</p>
            <span className="font-mono text-[11px] font-bold text-gray-500 dark:text-yellow-400/60">keys with under 5 attempts stay neutral · hover for exact numbers</span>
          </div>
          {statsState === 'loading' ? (
            <div className="space-y-1.5" aria-busy="true">
              <p className="font-mono text-xs font-bold uppercase mb-2">Loading your key history…</p>
              {[0, 1, 2].map(r => (
                <div key={r} className="flex gap-1.5" style={{ paddingLeft: `${r * 14}px` }}>
                  {Array.from({ length: 10 }).map((_, i) => <Skel key={i} className="w-9 md:w-11 h-9 md:h-11 shrink-0" />)}
                </div>
              ))}
            </div>
          ) : (
            <KeyboardHeatmap keyStats={stats?.keyStats || {}} />
          )}

          {statsState === 'ok' && stats && stats.weakKeys.length === 0 && (
            <p className="font-mono text-sm font-bold mt-4">
              Not enough keystrokes yet. Type a few passages and your weakest keys show up here.
            </p>
          )}
          {stats && stats.weakKeys.length > 0 && (
            <div className="overflow-x-auto mt-4">
              <table className="font-mono text-sm w-full min-w-[280px] max-w-md">
                <caption className="sr-only">Your most-missed keys</caption>
                <thead>
                  <tr className="text-left border-b-2 border-black dark:border-yellow-400 font-black uppercase text-xs">
                    <th scope="col" className="py-1">Key</th><th scope="col">Missed</th><th scope="col">Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.weakKeys.map(k => (
                    <tr key={k.ch} className="border-b border-black/10 dark:border-yellow-400/10">
                      <td className="py-1 font-black">{k.ch === ' ' ? 'space' : k.ch}</td>
                      <td>{Math.round(k.missRate * 100)}%</td>
                      <td>{k.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* AI coach */}
        <Panel>
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <p className="font-black uppercase text-xs tracking-widest">Typing coach</p>
            <Btn className="text-xs py-1" onClick={getCoaching} disabled={coachBusy} aria-busy={coachBusy}>
              {coachBusy ? 'Analyzing…' : coach ? 'Re-analyze' : 'Get coaching'}
            </Btn>
            {coachSource && <Tag className={coachSource === 'ai' ? 'bg-purple-300' : ''}>{coachSource === 'ai' ? 'AI COACH' : 'RULE ENGINE'}</Tag>}
          </div>
          <div aria-live="polite">
            {coachBusy && <Skel className="h-16 w-full max-w-3xl" />}
            {!coachBusy && coachError && (
              <p role="alert" className="font-mono text-sm font-bold uppercase text-black bg-red-400 border-2 border-black px-3 py-2 break-words">
                {coachError}{' '}
                <button onClick={getCoaching} className="underline font-black">Retry</button>
              </p>
            )}
            {!coachBusy && !coachError && (coach
              ? <p className="font-medium text-base sm:text-lg leading-relaxed max-w-3xl break-words">{coach}</p>
              : <p className="font-mono text-sm text-gray-500 dark:text-yellow-400/60 break-words">The coach reads your last 200 passages and tells you exactly what to fix.</p>)}
          </div>
        </Panel>

        {/* targeted drill */}
        <Panel>
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <p className="font-black uppercase text-xs tracking-widest">Targeted drill</p>
            <Btn className="text-xs py-1" color="bg-green-300" onClick={newDrill} disabled={drillBusy} aria-busy={drillBusy}>
              {drillBusy ? 'Building…' : drill ? 'New drill' : 'Generate drill'}
            </Btn>
            {drill && drill.targets.length > 0 && (
              <span className="font-mono text-xs font-bold break-words">
                loaded with your weak keys: {drill.targets.map(t => `“${t}”`).join(' ')}
              </span>
            )}
          </div>
          <div aria-live="polite">
            {drillBusy && <Skel className="h-20 w-full mb-3" />}
            {drillError && (
              <p role="alert" className="font-mono text-sm font-bold uppercase text-black bg-red-400 border-2 border-black px-3 py-2 mb-3 break-words">
                {drillError}{' '}
                <button onClick={newDrill} className="underline font-black">Retry</button>
              </p>
            )}
          </div>
          {drill && !drillDone && (
            <TypingText text={drill.text} pos={typing.pos} onKeyDown={typing.handleKey} shakeOn={typing.errors} />
          )}
          {drillDone && (
            <div className="flex items-center gap-4 flex-wrap" aria-live="polite">
              <p className="font-mono text-2xl font-black">✓ {drillDone.wpm} WPM · {drillDone.acc}%</p>
              <Btn className="text-xs py-1" color="bg-green-300" onClick={newDrill}>Run it again</Btn>
            </div>
          )}
          {!drill && !drillBusy && !drillError && (
            <p className="font-mono text-sm text-gray-500 dark:text-yellow-400/60 break-words">
              A 25 word gauntlet built from the keys you miss the most.
            </p>
          )}
        </Panel>
      </main>
    </div>
  );
};

export default StatsPage;
