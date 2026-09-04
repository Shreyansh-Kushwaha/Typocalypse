import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Btn, Panel, Tag, useNow } from '../multiplayer/ui';
import { Chip } from '../social/Chip';

interface Row {
  rank: number;
  username: string;
  bestWpm: number;
  avgAccuracy: number;
  games: number;
  me: boolean;
}
interface Season {
  id: string;
  number: number;
  startsAt: number;
  endsAt: number;
  players: number;
  myRank: number | null;
  lastSeason: { username: string; rank: number; title: string; bestWpm: number }[];
}
type Period = 'weekly' | 'season' | 'all';
type Scope = 'global' | 'friends';

const MODES: [string, string][] = [
  ['all', 'All'], ['story', 'Story'], ['test60', '60s test'], ['test30', '30s'], ['test15', '15s'], ['code', 'Code'], ['campaign', 'Campaign'],
];

function untilText(endsAt: number, now: number): string {
  const ms = Math.max(0, endsAt - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('weekly');
  const [scope, setScope] = useState<Scope>('global');
  const [mode, setMode] = useState('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<Season | null>(null);
  const now = useNow(60000);

  useEffect(() => {
    document.title = 'Global Ladder — Typocalypse';
    return () => { document.title = 'Typocalypse — survive the typing apocalypse'; };
  }, []);

  useEffect(() => {
    axios.get('/seasons/current').then(res => setSeason(res.data)).catch(() => setSeason(null));
  }, []);

  useEffect(() => {
    setLoading(true);
    axios.get('/leaderboard', { params: { period, scope, mode } })
      .then(res => setRows(res.data.rows))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [period, scope, mode]);

  const periodLabel = period === 'weekly' ? 'this week' : period === 'season' ? `in Season ${season?.number ?? ''}`.trim() : 'yet';
  const modeLabel = MODES.find(m => m[0] === mode)?.[1] || mode;

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
            {scope === 'friends' ? 'Friends' : 'Global'} <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Ladder</span>
          </h1>
          <Btn color="bg-red-400" onClick={() => navigate(user ? '/dashboard' : '/')}>Back</Btn>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6 relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          {([['weekly', 'This week'], ['season', `Season ${season?.number ?? ''}`.trim()], ['all', 'All time']] as [Period, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`font-black uppercase px-4 py-2 border-4 border-black dark:border-yellow-400 ${
                period === p ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black'
              }`}
            >
              {label}
            </button>
          ))}
          {user && (
            <div className="flex gap-1 sm:ml-auto">
              {(['global', 'friends'] as Scope[]).map(s => (
                <Chip key={s} active={scope === s} onClick={() => setScope(s)} className="text-sm px-3 py-2">{s === 'global' ? '🌍 Global' : '🫂 Friends'}</Chip>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {MODES.map(([k, label]) => <Chip key={k} active={mode === k} onClick={() => setMode(k)}>{label}</Chip>)}
        </div>

        {season && (
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="bg-yellow-300 text-sm">🏁 Season {season.number}</Tag>
            <span className="font-mono text-sm font-bold">ends in <span className="font-black">{untilText(season.endsAt, now)}</span></span>
            <Tag>{season.players} ranked</Tag>
            {season.myRank && <Tag className="bg-green-300">you: #{season.myRank}</Tag>}
          </div>
        )}

        <Panel>
          <p className="font-mono text-[11px] font-bold uppercase text-gray-500 dark:text-yellow-400/60 mb-3">
            Best clean run per player · {modeLabel} · runs under 80% accuracy do not count
          </p>
          {loading ? (
            <p className="font-mono font-black animate-pulse py-8 text-center">LOADING LADDER…</p>
          ) : rows.length === 0 ? (
            <p className="font-mono font-bold py-8 text-center">
              {scope === 'friends'
                ? <>No runs from you or your friends {periodLabel}. <Link to="/friends" className="underline">Follow some typists</Link>.</>
                : <>No runs recorded {periodLabel}. Set the first record.</>}
            </p>
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

        {season && season.lastSeason.length > 0 && (
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-3">🏁 Season {season.number - 1} podium</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {season.lastSeason.map(a => (
                <div key={a.rank} className={`border-2 border-black dark:border-yellow-400 p-3 ${a.rank === 1 ? 'bg-yellow-300 dark:bg-black' : a.rank === 2 ? 'bg-gray-200 dark:bg-black' : 'bg-orange-300 dark:bg-black'}`}>
                  <p className="text-2xl">{['🥇', '🥈', '🥉'][a.rank - 1]}</p>
                  <Link to={`/u/${encodeURIComponent(a.username)}`} className="font-black uppercase underline decoration-2 underline-offset-2">{a.username}</Link>
                  <p className="font-mono text-xs font-bold mt-1">{a.title} · {a.bestWpm} WPM</p>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {!user && (
          <Panel className="text-center">
            <p className="font-black uppercase mb-3">Want a friends-only ladder?</p>
            <Link to="/login"><Btn color="bg-yellow-300">Log in</Btn></Link>
          </Panel>
        )}
      </main>
    </div>
  );
};

export default LeaderboardPage;
