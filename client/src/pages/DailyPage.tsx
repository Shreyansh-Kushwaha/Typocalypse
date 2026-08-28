import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTypingText } from '../multiplayer/useTypingText';
import { TypingText, Panel, Btn, Tag, Countdown } from '../multiplayer/ui';
import { sfx } from '../sound';
import { copyText } from '../share';

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
  const savedRef = useRef(false);

  const loadLadder = () => {
    axios.get('/daily/leaderboard').then(res => setLadder(res.data.rows)).catch(() => {});
  };

  useEffect(() => {
    document.title = 'Daily Apocalypse — Typocalypse';
    return () => { document.title = 'Typocalypse — survive the typing apocalypse'; };
  }, []);

  useEffect(() => {
    axios.get('/daily').then(res => {
      setDaily(res.data);
      if (res.data.myResult) {
        setResult({
          wpm: res.data.myResult.wpm,
          accuracy: res.data.myResult.accuracy,
          streak: res.data.streak?.current,
        });
      }
    }).catch(() => setError('Could not load the daily challenge'));
    loadLadder();
  }, []);

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
      }).catch(() => {});
    },
  });

  const begin = () => {
    setStarted(true);
    setStartTime(Date.now());
    sfx.go();
  };

  if (!daily) {
    return (
      <Shell onBack={() => navigate(user ? '/dashboard' : '/')}>
        <p className="text-center mt-20 font-mono font-black animate-pulse">{error || 'LOADING TODAY’S APOCALYPSE…'}</p>
      </Shell>
    );
  }

  return (
    <Shell onBack={() => navigate(user ? '/dashboard' : '/')}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tag className="bg-orange-300 text-lg">🧟 DAILY APOCALYPSE #{daily.number}</Tag>
          <Tag>{daily.genre}</Tag>
          <Tag>{daily.players} typed today</Tag>
          <span className="font-mono text-sm font-bold">next daily in <Countdown until={daily.endsAt} /></span>
        </div>

        {result ? (
          <Panel className="text-center py-8">
            <p className="text-4xl mb-2">🧟</p>
            <p className="text-3xl font-black uppercase mb-2">
              {result.rank ? `#${result.rank} of ${result.players} today` : 'Run recorded'}
            </p>
            <p className="font-mono font-bold text-xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {result.wpm} WPM · {result.accuracy}%{result.streak && result.streak > 1 ? ` · 🔥 ${result.streak} day streak` : ''}
            </p>
            {error && <p className="font-mono text-sm font-bold text-red-600 dark:text-red-400 mt-2">{error}</p>}
            <div className="flex gap-4 justify-center mt-6 flex-wrap">
              <Btn color="bg-green-300" onClick={async () => setCopied(await copyText(emojiGrid(daily, result.wpm, result.accuracy, result.streak ?? null)))}>
                {copied ? '✓ Copied — paste it in the group chat' : '📋 Copy result grid'}
              </Btn>
              {user?.isGuest && <Btn color="bg-yellow-300" onClick={() => navigate('/claim')}>Claim account to keep your streak</Btn>}
            </div>
            <p className="font-mono text-xs font-bold uppercase mt-4 text-gray-500 dark:text-yellow-400/60">
              One attempt per day — come back after midnight UTC
            </p>
          </Panel>
        ) : !started ? (
          <Panel className="text-center py-10">
            <p className="text-2xl font-black uppercase mb-2">One passage. One attempt. The whole world types it.</p>
            <p className="font-mono text-sm font-bold mb-6">Everyone gets the same {daily.text.split(' ').length} words today. No retries.</p>
            <Btn color="bg-orange-300" className="text-2xl px-10 py-4" onClick={begin}>Type it</Btn>
          </Panel>
        ) : (
          <TypingText text={daily.text} pos={typing.pos} onKeyDown={typing.handleKey} shakeOn={typing.errors} />
        )}

        <Panel>
          <p className="font-black uppercase text-xs tracking-widest mb-3">Today's ladder</p>
          {ladder.length === 0 ? (
            <p className="font-mono font-bold text-sm">Nobody yet. Set the pace.</p>
          ) : (
            <table className="w-full font-mono text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <tbody>
                {ladder.slice(0, 15).map(r => (
                  <tr key={r.rank} className={`border-b border-black/10 dark:border-yellow-400/10 ${r.me ? 'bg-yellow-200 dark:bg-yellow-400/20 font-black' : ''}`}>
                    <td className="py-1 font-black w-10">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</td>
                    <td className="font-bold">{r.username}{r.me ? ' (you)' : ''}</td>
                    <td className="text-right font-black">{r.wpm} wpm</td>
                    <td className="text-right">{r.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </Shell>
  );
};

const Shell: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-tighter">
          Daily <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Apocalypse</span>
        </h1>
        <Btn color="bg-red-400" onClick={onBack}>Back</Btn>
      </div>
    </header>
    <main className="p-6 relative z-10">{children}</main>
  </div>
);

export default DailyPage;
