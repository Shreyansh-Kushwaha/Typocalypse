import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTypingText } from '../multiplayer/useTypingText';
import { TypingText, Panel, Btn, Tag, Countdown } from '../multiplayer/ui';
import { sfx } from '../sound';
import { copyText } from '../share';
import { SeoFor } from '../seo';

interface Daily {
  day: number;
  number: number;
  dateUTC: string;
  endsAt: number;
  genre: string;
  text: string;
  players: number;
  myResult: { wpm: number; accuracy: number; durationMs: number } | null;
  streak: { current: number; longest: number; atRisk: boolean } | null;
}
interface LadderRow { rank: number; username: string; wpm: number; accuracy: number; me: boolean }

function emojiGrid(daily: Daily, wpm: number, accuracy: number, streak: number | null): string {
  const blocks = '▓'.repeat(Math.max(1, Math.round(accuracy / 20))).padEnd(5, '░');
  const streakBit = streak && streak > 1 ? ` · 🔥${streak}` : '';
  return `🧟 Daily Apocalypse #${daily.number} · ${wpm} WPM · ${blocks} ${accuracy}%${streakBit}\n${window.location.origin}/daily`;
}

const DailyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [daily, setDaily] = useState<Daily | null>(null);
  const [ladder, setLadder] = useState<LadderRow[]>([]);
  const [result, setResult] = useState<{ wpm: number; accuracy: number; rank?: number; players?: number; streak?: number } | null>(null);
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [ladderState, setLadderState] = useState<'loading' | 'ok' | 'error'>('loading');
  const savedRef = useRef(false);

  const loadLadder = useCallback(() => {
    setLadderState('loading');
    axios.get('/daily/leaderboard')
      .then(res => { setLadder(res.data.rows); setLadderState('ok'); })
      .catch(() => setLadderState('error'));
  }, []);

  const loadDaily = useCallback(() => {
    setLoadError('');
    axios.get('/daily').then(res => {
      setDaily(res.data);
      if (res.data.myResult) {
        setResult({
          wpm: res.data.myResult.wpm,
          accuracy: res.data.myResult.accuracy,
          streak: res.data.streak?.current,
        });
      }
    }).catch(() => setLoadError('Could not load today\u2019s challenge.'));
  }, []);

  useEffect(() => {
    loadDaily();
    loadLadder();
  }, [loadDaily, loadLadder]);

  const typing = useTypingText(daily?.text || '', {
    enabled: started && !result,
    onDone: ({ chars, errors }) => {
      if (!daily || savedRef.current) return;
      savedRef.current = true;
      const durationMs = Date.now() - startTime;
      const wpm = Math.min(300, Math.round((chars / 5) / (durationMs / 60000)));
      const accuracy = Math.round((chars / (chars + errors)) * 100);
      sfx.success();
      axios.post('/daily/result', { wpm, accuracy, errors, durationMs })
        .then(res => {
          setResult({ wpm, accuracy, rank: res.data.rank, players: res.data.players, streak: res.data.streak?.current });
          loadLadder();
        })
        .catch(err => {
          setResult({ wpm, accuracy });
          setError(err?.response?.data?.error || '');
        });
      // feed the heatmap and history too
      axios.post('/stats/session', {
        context: 'solo', mode: 'daily', wpm, accuracy, errors,
        totalTyped: chars + errors, durationMs, keyStats: {},
        localHour: new Date().getHours(), skipXp: true, // XP comes from /daily/result
      }).catch(() => {});
    },
  });

  const begin = () => {
    setStarted(true);
    setStartTime(Date.now());
    sfx.go();
  };

  // Keep the page shell and the ladder frame on screen while the challenge loads.
  if (!daily) {
    return (
      <Shell onBack={() => navigate(user ? '/dashboard' : '/')}>
        <div className="max-w-4xl mx-auto space-y-4">
          {loadError ? (
            <Panel className="text-center py-8">
              <p role="alert" className="text-xl font-black uppercase mb-2">{loadError}</p>
              <p className="font-mono text-sm font-bold mb-6">The daily passage could not be fetched. Your streak is safe.</p>
              <Btn color="bg-orange-300" onClick={loadDaily}>Retry</Btn>
            </Panel>
          ) : (
            <div aria-busy="true" className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Skel className="h-7 w-52" />
                <Skel className="h-7 w-20" />
                <Skel className="h-7 w-28" />
              </div>
              <Panel className="text-center py-10">
                <p className="font-mono font-black uppercase mb-4">Loading today’s apocalypse…</p>
                <Skel className="h-8 w-3/4 mx-auto mb-3" />
                <Skel className="h-5 w-1/2 mx-auto mb-6" />
                <Skel className="h-14 w-40 mx-auto" />
              </Panel>
            </div>
          )}
          <LadderPanel rows={ladder} state={ladderState} onRetry={loadLadder} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={() => navigate(user ? '/dashboard' : '/')}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tag className="bg-orange-300 text-base sm:text-lg break-words"><span aria-hidden="true">🧟 </span>DAILY APOCALYPSE #{daily.number}</Tag>
          <Tag>{daily.genre}</Tag>
          <Tag>{daily.players} typed today</Tag>
          <span className="font-mono text-sm font-bold">next daily in <Countdown until={daily.endsAt} /></span>
        </div>

        {result ? (
          <Panel className="text-center py-8">
            <div aria-live="polite">
              <p className="text-4xl mb-2" aria-hidden="true">🧟</p>
              <p className="text-2xl sm:text-3xl font-black uppercase mb-2 break-words">
                {result.rank ? `#${result.rank} of ${result.players} today` : 'Run recorded'}
              </p>
              <p className="font-mono font-bold text-lg sm:text-xl break-words" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {result.wpm} WPM · {result.accuracy}%{result.streak && result.streak > 1 ? ` · ${result.streak} day streak` : ''}
              </p>
            </div>
            {error && <p role="alert" className="font-mono text-sm font-bold text-red-600 dark:text-red-400 mt-2 break-words">{error}</p>}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6 flex-wrap">
              <Btn color="bg-green-300" className="w-full sm:w-auto" onClick={async () => setCopied(await copyText(emojiGrid(daily, result.wpm, result.accuracy, result.streak ?? null)))}>
                {copied ? '✓ Copied — paste it in the group chat' : '📋 Copy result grid'}
              </Btn>
              {user?.isGuest && <Btn color="bg-yellow-300" className="w-full sm:w-auto" onClick={() => navigate('/claim')}>Claim account to keep your streak</Btn>}
            </div>
            <p className="font-mono text-xs font-bold uppercase mt-4 text-gray-500 dark:text-yellow-400/60">
              One attempt per day — come back after midnight UTC
            </p>
          </Panel>
        ) : !started ? (
          <Panel className="text-center py-8 sm:py-10">
            <p className="text-xl sm:text-2xl font-black uppercase mb-2 break-words">One passage. One attempt. The whole world types it.</p>
            <p className="font-mono text-sm font-bold mb-6 break-words">Everyone gets the same {daily.text.split(' ').length} words today. No retries.</p>
            <Btn color="bg-orange-300" className="text-xl sm:text-2xl px-8 sm:px-10 py-4 w-full sm:w-auto" onClick={begin}>Type it</Btn>
          </Panel>
        ) : (
          <TypingText text={daily.text} pos={typing.pos} onKeyDown={typing.handleKey} shakeOn={typing.errors} />
        )}

        <LadderPanel rows={ladder} state={ladderState} onRetry={loadLadder} />
      </div>
    </Shell>
  );
};

/** A pulsing bar in the shape of the content it stands in for. */
const Skel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`block bg-black/15 dark:bg-yellow-400/20 animate-pulse ${className}`} />
);

const LadderPanel: React.FC<{ rows: LadderRow[]; state: 'loading' | 'ok' | 'error'; onRetry: () => void }> = ({ rows, state, onRetry }) => (
  <Panel>
    <p className="font-black uppercase text-xs tracking-widest mb-3">Today's ladder</p>
    {state === 'loading' ? (
      <div className="space-y-2" aria-busy="true">
        <p className="font-mono text-xs font-bold uppercase">Loading the ladder…</p>
        {[0, 1, 2, 3, 4].map(i => <Skel key={i} className="h-5 w-full" />)}
      </div>
    ) : state === 'error' ? (
      <div role="alert" className="flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="font-mono font-bold text-sm break-words">Could not load today's ladder.</p>
        <Btn color="bg-orange-300" className="text-xs py-1 w-full sm:w-auto" onClick={onRetry}>Retry</Btn>
      </div>
    ) : rows.length === 0 ? (
      <p className="font-mono font-bold text-sm">Nobody yet. Set the pace.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] font-mono text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <caption className="sr-only">Today's fastest runs</caption>
          <thead className="sr-only">
            <tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Speed</th><th scope="col">Accuracy</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, 15).map(r => (
              <tr key={r.rank} className={`border-b border-black/10 dark:border-yellow-400/10 ${r.me ? 'bg-yellow-200 dark:bg-yellow-400/20 font-black' : ''}`}>
                <td className="py-1 font-black w-10">
                  {r.rank <= 3
                    ? <span aria-label={`Rank ${r.rank}`}><span aria-hidden="true">{['🥇', '🥈', '🥉'][r.rank - 1]}</span></span>
                    : r.rank}
                </td>
                <td className="font-bold break-words">{r.username}{r.me ? ' (you)' : ''}</td>
                <td className="text-right font-black">{r.wpm} wpm</td>
                <td className="text-right">{r.accuracy}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
);

const Shell: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16 overflow-x-hidden">
    <SeoFor path="/daily" />
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">
          Daily <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Apocalypse</span>
        </h1>
        <Btn color="bg-red-400" onClick={onBack}>Back</Btn>
      </div>
    </header>
    <main className="p-4 sm:p-6 relative z-10">{children}</main>
  </div>
);

export default DailyPage;
