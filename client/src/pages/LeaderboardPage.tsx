import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Btn, Panel } from '../multiplayer/ui';

interface Row {
  rank: number;
  username: string;
  bestWpm: number;
  avgAccuracy: number;
  games: number;
  me: boolean;
}

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'weekly' | 'all'>('weekly');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`/leaderboard?period=${period}`)
      .then(res => setRows(res.data.rows))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
            Global <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Ladder</span>
          </h1>
          <Btn color="bg-red-400" onClick={() => navigate('/dashboard')}>Back</Btn>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6 relative z-10">
        <div className="flex gap-3">
          {(['weekly', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`font-black uppercase px-4 py-2 border-4 border-black dark:border-yellow-400 ${
                period === p ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black'
              }`}
            >
              {p === 'weekly' ? 'This week' : 'All time'}
            </button>
          ))}
        </div>

        <Panel>
          <p className="font-mono text-[11px] font-bold uppercase text-gray-500 dark:text-yellow-400/60 mb-3">
            Best clean run per player · runs under 80% accuracy do not count
          </p>
          {loading ? (
            <p className="font-mono font-black animate-pulse py-8 text-center">LOADING LADDER…</p>
          ) : rows.length === 0 ? (
            <p className="font-mono font-bold py-8 text-center">No runs recorded {period === 'weekly' ? 'this week' : 'yet'}. Set the first record.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm md:text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead>
                  <tr className="text-left border-b-4 border-black dark:border-yellow-400 font-black uppercase text-xs">
                    <th className="py-2 pr-2">#</th>
                    <th>Typist</th>
                    <th className="text-right">Best WPM</th>
                    <th className="text-right hidden sm:table-cell">Avg acc</th>
                    <th className="text-right hidden sm:table-cell">Runs</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr
                      key={r.rank}
                      className={`border-b-2 border-black/10 dark:border-yellow-400/10 ${
                        r.me ? 'bg-yellow-200 dark:bg-yellow-400/20 font-black' : ''
                      }`}
                    >
                      <td className="py-2 pr-2 font-black">
                        {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}
                      </td>
                      <td className="font-bold"><Link to={`/u/${encodeURIComponent(r.username)}`} className="underline decoration-2 underline-offset-2 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black">{r.username}</Link>{r.me ? ' (you)' : ''}</td>
                      <td className="text-right font-black">{r.bestWpm}</td>
                      <td className="text-right hidden sm:table-cell">{r.avgAccuracy}%</td>
                      <td className="text-right hidden sm:table-cell">{r.games}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </main>
    </div>
  );
};

export default LeaderboardPage;
