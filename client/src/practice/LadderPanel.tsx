import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Panel, Btn } from '../multiplayer/ui';

interface Row { rank: number; username: string; bestWpm: number; avgAccuracy: number; games: number; me: boolean }
type Period = 'weekly' | 'season' | 'all';

/**
 * Compact leaderboard for one mode. The request is never on the critical path:
 * the page stays playable while it loads, fails, or is skipped because the
 * browser is offline - it just says so quietly and offers a retry.
 */
const LadderPanel: React.FC<{ mode: string; title: string; online: boolean; refreshKey?: number }> = ({ mode, title, online, refreshKey = 0 }) => {
  const [period, setPeriod] = useState<Period>('weekly');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!online) return;
    let alive = true;
    setFailed(false);
    setRows(null);
    axios.get('/leaderboard', { params: { period, mode }, headers: { Accept: 'application/json' } })
      .then(res => { if (alive) { setRows(res.data.rows || []); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [mode, period, online, refreshKey, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  if (!online) {
    return (
      <p className="font-mono text-xs font-bold uppercase text-gray-500 dark:text-yellow-400/60">
        Ladder unavailable offline — your results are queued and the test still works.
      </p>
    );
  }

  return (
    <Panel className="p-4 sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="font-black uppercase text-xs tracking-widest">{title}</p>
        <div className="flex flex-wrap gap-1">
          {(['weekly', 'season', 'all'] as Period[]).map(p => (
            <Btn key={p} tabIndex={-1} color={period === p ? 'bg-yellow-300' : 'bg-white'} className="text-[10px] py-1 px-2" onClick={() => setPeriod(p)} aria-pressed={period === p}>
              {p}
            </Btn>
          ))}
        </div>
      </div>
      {failed ? (
        <div className="space-y-3">
          <p className="font-mono text-xs font-bold uppercase text-gray-500 dark:text-yellow-400/60">
            Ladder unavailable right now — the test itself is unaffected.
          </p>
          <Btn color="bg-yellow-300" className="w-full sm:w-auto text-xs py-2" onClick={retry}>Retry</Btn>
        </div>
      ) : rows === null ? (
        <div>
          <p className="font-mono text-sm font-bold mb-2">Loading the ladder…</p>
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-6 shrink-0 bg-gray-200 dark:bg-yellow-400/20 animate-pulse" />
                <div className="h-4 flex-1 bg-gray-200 dark:bg-yellow-400/20 animate-pulse" />
                <div className="h-4 w-16 shrink-0 bg-gray-200 dark:bg-yellow-400/20 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <p className="font-mono text-sm font-bold">Nobody yet. Set the pace.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] font-mono text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <tbody>
              {rows.slice(0, 10).map(r => (
                <tr key={r.rank} className={`border-b border-black/10 dark:border-yellow-400/10 ${r.me ? 'bg-yellow-200 dark:bg-yellow-400/20 font-black' : ''}`}>
                  <td className="py-1 font-black w-10">{r.rank <= 3 ? ['1st', '2nd', '3rd'][r.rank - 1] : r.rank}</td>
                  <td className="font-bold truncate max-w-[10rem]">{r.username}{r.me ? ' (you)' : ''}</td>
                  <td className="text-right font-black whitespace-nowrap">{r.bestWpm} wpm</td>
                  <td className="text-right whitespace-nowrap">{r.avgAccuracy}%</td>
                  <td className="text-right text-gray-500 dark:text-yellow-400/60 whitespace-nowrap hidden sm:table-cell">{r.games} runs</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

export default LadderPanel;
