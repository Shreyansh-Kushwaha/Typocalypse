import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTypingText } from '../multiplayer/useTypingText';
import { TypingText, Panel, Btn, Tag } from '../multiplayer/ui';
import { sfx } from '../sound';

interface KeyStat { h: number; m: number }
interface WeakKey { ch: string; attempts: number; missRate: number }
interface MyStats {
  summary: { games: number; bestWpm: number; avgWpm: number; avgAccuracy: number; totalTyped: number };
  keyStats: Record<string, KeyStat>;
  weakKeys: WeakKey[];
  history: { wpm: number; accuracy: number; context: string; mode?: string; at: string }[];
}

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', "zxcvbnm,.'"];

// fold case so 'E' and 'e' count as one key
function foldKeyStats(raw: Record<string, KeyStat>): Record<string, KeyStat> {
  const out: Record<string, KeyStat> = {};
  for (const [ch, v] of Object.entries(raw)) {
    const k = ch.toLowerCase();
    if (!out[k]) out[k] = { h: 0, m: 0 };
    out[k].h += v.h;
    out[k].m += v.m;
  }
  return out;
}

const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MyStats | null>(null);
  const [coach, setCoach] = useState('');
  const [coachSource, setCoachSource] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);
  const [drill, setDrill] = useState<{ text: string; targets: string[] } | null>(null);
  const [drillDone, setDrillDone] = useState<{ wpm: number; acc: number } | null>(null);
  const drillStart = useRef(0);
  const drillKeys = useRef<Record<string, KeyStat>>({});

  const loadStats = async () => {
    try {
      const res = await axios.get('/stats/me');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  useEffect(() => { void loadStats(); }, []);

  const getCoaching = async () => {
    setCoachBusy(true);
    try {
      const res = await axios.post('/stats/coach');
      setCoach(res.data.coach);
      setCoachSource(res.data.source);
    } catch {
      setCoach('Coach unavailable right now.');
    }
    setCoachBusy(false);
  };

  const newDrill = async () => {
    try {
      const res = await axios.get('/stats/drill');
      setDrill(res.data);
      setDrillDone(null);
      drillStart.current = 0;
      drillKeys.current = {};
    } catch {
      setDrill(null);
    }
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
      }).then(loadStats).catch(() => {});
    },
  });

  const folded = stats ? foldKeyStats(stats.keyStats) : {};
  const heat = (ch: string) => {
    const v = folded[ch];
    if (!v || v.h + v.m < 5) return null;
    return { missRate: v.m / (v.h + v.m), attempts: v.h + v.m, misses: v.m };
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
            Training <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Lab</span>
          </h1>
          <Btn color="bg-red-400" onClick={() => navigate('/dashboard')}>Back</Btn>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8 relative z-10">
        {/* summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Best WPM', value: stats?.summary.bestWpm ?? '—' },
            { label: 'Avg WPM', value: stats?.summary.avgWpm ?? '—' },
            { label: 'Avg accuracy', value: stats ? `${stats.summary.avgAccuracy}%` : '—' },
            { label: 'Passages', value: stats?.summary.games ?? '—' },
          ].map(t => (
            <Panel key={t.label}>
              <p className="font-black uppercase text-xs tracking-widest">{t.label}</p>
              <p className="font-mono text-4xl font-black mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{t.value}</p>
            </Panel>
          ))}
        </div>

        {/* keyboard heatmap - sequential red ramp on miss rate */}
        <Panel>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <p className="font-black uppercase text-xs tracking-widest">Weak key heatmap — darker red means more misses</p>
            <span className="font-mono text-[11px] font-bold text-gray-500 dark:text-yellow-400/60">keys with under 5 attempts stay neutral · hover for exact numbers</span>
          </div>
          <div className="space-y-1.5 overflow-x-auto pb-1">
            {KEY_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1.5" style={{ paddingLeft: `${ri * 14}px` }}>
                {row.split('').map(ch => {
                  const h = heat(ch);
                  const alpha = h ? Math.min(0.85, h.missRate * 2.5) : 0;
                  return (
                    <div
                      key={ch}
                      title={h ? `${ch} — ${Math.round(h.missRate * 100)}% missed (${h.misses}/${h.attempts})` : `${ch} — not enough data`}
                      className="w-9 h-9 md:w-11 md:h-11 border-2 border-black dark:border-yellow-400 flex items-center justify-center font-mono font-black uppercase shrink-0"
                      style={{ backgroundColor: h ? `rgba(220,38,38,${alpha})` : undefined }}
                    >
                      {ch}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="flex" style={{ paddingLeft: '56px' }}>
              {(() => {
                const h = heat(' ');
                const alpha = h ? Math.min(0.85, h.missRate * 2.5) : 0;
                return (
                  <div
                    title={h ? `space — ${Math.round(h.missRate * 100)}% missed (${h.misses}/${h.attempts})` : 'space — not enough data'}
                    className="h-9 md:h-11 w-56 border-2 border-black dark:border-yellow-400 flex items-center justify-center font-mono font-bold text-xs uppercase"
                    style={{ backgroundColor: h ? `rgba(220,38,38,${alpha})` : undefined }}
                  >
                    space
                  </div>
                );
              })()}
            </div>
          </div>

          {stats && stats.weakKeys.length > 0 && (
            <table className="mt-4 font-mono text-sm w-full max-w-md">
              <thead>
                <tr className="text-left border-b-2 border-black dark:border-yellow-400 font-black uppercase text-xs">
                  <th className="py-1">Key</th><th>Missed</th><th>Attempts</th>
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
          )}
        </Panel>

        {/* AI coach */}
        <Panel>
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <p className="font-black uppercase text-xs tracking-widest">Typing coach</p>
            <Btn className="text-xs py-1" onClick={getCoaching} disabled={coachBusy}>
              {coachBusy ? 'Analyzing…' : coach ? 'Re-analyze' : 'Get coaching'}
            </Btn>
            {coachSource && <Tag className={coachSource === 'ai' ? 'bg-purple-300' : ''}>{coachSource === 'ai' ? 'AI COACH' : 'RULE ENGINE'}</Tag>}
          </div>
          {coach
            ? <p className="font-medium text-lg leading-relaxed max-w-3xl">{coach}</p>
            : <p className="font-mono text-sm text-gray-500 dark:text-yellow-400/60">The coach reads your last 200 passages and tells you exactly what to fix.</p>}
        </Panel>

        {/* targeted drill */}
        <Panel>
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <p className="font-black uppercase text-xs tracking-widest">Targeted drill</p>
            <Btn className="text-xs py-1" color="bg-green-300" onClick={newDrill}>
              {drill ? 'New drill' : 'Generate drill'}
            </Btn>
            {drill && drill.targets.length > 0 && (
              <span className="font-mono text-xs font-bold">
                loaded with your weak keys: {drill.targets.map(t => `“${t}”`).join(' ')}
              </span>
            )}
          </div>
          {drill && !drillDone && (
            <TypingText text={drill.text} pos={typing.pos} onKeyDown={typing.handleKey} shakeOn={typing.errors} />
          )}
          {drillDone && (
            <div className="flex items-center gap-4 flex-wrap">
              <p className="font-mono text-2xl font-black">✓ {drillDone.wpm} WPM · {drillDone.acc}%</p>
              <Btn className="text-xs py-1" color="bg-green-300" onClick={newDrill}>Run it again</Btn>
            </div>
          )}
          {!drill && (
            <p className="font-mono text-sm text-gray-500 dark:text-yellow-400/60">
              A 25 word gauntlet built from the keys you miss the most.
            </p>
          )}
        </Panel>
      </main>
    </div>
  );
};

export default StatsPage;
