import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Panel, Btn } from '../multiplayer/ui';

interface Row { rank: number; username: string; bestWpm: number; avgAccuracy: number; games: number; me: boolean }
type Period = 'weekly' | 'season' | 'all';

/** Compact leaderboard for one mode. Hides itself when offline or when the request fails. */
const LadderPanel: React.FC<{ mode: string; title: string; online: boolean; refreshKey?: number }> = ({ mode, title, online, refreshKey = 0 }) => {
  const [period, setPeriod] = useState<Period>('weekly');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!online) return;
    let alive = true;
    axios.get('/leaderboard', { params: { period, mode }, headers: { Accept: 'application/json' } })
      .then(res => { if (alive) { setRows(res.data.rows || []); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [mode, period, online, refreshKey]);

  if (!online || failed) {
    return (
      <p className="font-mono text-xs font-bold uppercase text-gray-500 dark:text-yellow-400/60">
        Ladder unavailable {online ? 'right now' : 'offline'}
      </p>
    );
  }

  return (
    <Panel>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="font-black uppercase text-xs tracking-widest">{title}</p>
        <div className="flex gap-1">
          {(['weekly', 'season', 'all'] as Period[]).map(p => (
            <Btn key={p} tabIndex={-1} color={period === p ? 'bg-yellow-300' : 'bg-white'} className="text-[10px] py-0.5 px-2" onClick={() => setPeriod(p)}>
              {p}
            </Btn>
          ))}
        </div>
      </div>
      {rows === null ? (
        <p className="font-mono text-sm font-bold animate-pulse">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="font-mono text-sm font-bold">Nobody yet. Set the pace.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
