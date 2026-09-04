import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../multiplayer/socket';
import { GENRES, tierOf } from '../multiplayer/types';
import { Btn, Panel, Tag, useNow, brutal } from '../multiplayer/ui';
import { sfx } from '../sound';

interface Recent { opponent: string; won: boolean; delta: number; rated: boolean; at: string }
interface MyRating { rating: number; tier: string; games: number; wins: number; losses: number; rank: number | null; recent: Recent[] }
interface LadderRow { rank: number; username: string; rating: number; tier: string; games: number; wins: number; losses: number; me: boolean }
interface QueueStatus { searching: boolean; waited: number; window: number; inQueue: number }
interface Matched { code: string; opponent: { username: string; rating: number } }

const TIER_COLORS: Record<string, string> = {
  Scrap: 'bg-gray-200 dark:bg-black',
  Survivor: 'bg-green-300',
  Raider: 'bg-cyan-300',
  Warlord: 'bg-orange-300',
  Apocalypse: 'bg-pink-300',
};

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const QuickMatchPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [me, setMe] = useState<MyRating | null>(null);
  const [ladder, setLadder] = useState<LadderRow[]>([]);
  const [genre, setGenre] = useState('fantasy');
  const [phase, setPhase] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [matched, setMatched] = useState<Matched | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [error, setError] = useState('');
  const now = useNow(500);
  const searchingRef = useRef(false);

  useEffect(() => {
    document.title = 'Quick Match — Typocalypse';
    return () => { document.title = 'Typocalypse — survive the typing apocalypse'; };
  }, []);

  const load = () => {
    axios.get('/ratings/me').then(res => setMe(res.data)).catch(() => {});
    axios.get('/ratings/top').then(res => setLadder(res.data.rows || [])).catch(() => {});
  };
  useEffect(load, []);

  useEffect(() => {
    const s = getSocket();
    const onConnectError = (err: Error) => setError(`Cannot reach the arena: ${err.message}. Sign in and try again.`);
    const onStatus = (data: QueueStatus) => { setStatus(data); if (searchingRef.current) sfx.countdown(); };
    const onMatched = (data: Matched) => {
      searchingRef.current = false;
      setMatched(data);
      setPhase('matched');
      sfx.success();
      setTimeout(() => navigate(`/room/${data.code}`), 1500);
    };
    const onQueueError = (data: { error: string }) => { searchingRef.current = false; setPhase('idle'); setError(data.error); };
    s.on('connect_error', onConnectError);
    s.on('queue:status', onStatus);
    s.on('queue:matched', onMatched);
    s.on('queue:error', onQueueError);
    return () => {
      s.off('connect_error', onConnectError);
      s.off('queue:status', onStatus);
      s.off('queue:matched', onMatched);
      s.off('queue:error', onQueueError);
      if (searchingRef.current) { s.emit('queue:leave'); searchingRef.current = false; }
    };
  }, [navigate]);

  const find = () => {
    setError('');
    getSocket().emit('queue:join', { genre }, (res: { ok: boolean; rating?: number; position?: number; error?: string }) => {
      if (!res?.ok) return setError(res?.error || 'Could not join the queue');
      searchingRef.current = true;
      setStartedAt(Date.now());
      setStatus({ searching: true, waited: 0, window: 100, inQueue: res.position || 1 });
      setPhase('searching');
      sfx.go();
    });
  };

  const cancel = () => {
    getSocket().emit('queue:leave');
    searchingRef.current = false;
    setPhase('idle');
    setStatus(null);
    sfx.pop();
  };

  const rating = me?.rating ?? 1000;
  const tier = me?.tier || tierOf(rating);

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-black uppercase tracking-tighter">
            Quick <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Match</span>
          </h1>
          <Btn color="bg-red-400" onClick={() => navigate('/dashboard')}>Back</Btn>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6 relative z-10">
        <div className="grid md:grid-cols-3 gap-6">
          <div className={`${TIER_COLORS[tier] || 'bg-cyan-300'} dark:bg-black ${brutal.border} ${brutal.shadow} p-5`}>
            <p className="font-black uppercase text-xs tracking-widest">Your rating</p>
            <p className="font-mono text-6xl font-black leading-none my-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{rating}</p>
            <Tag className="bg-white dark:bg-black">{tier}</Tag>
            <p className="font-mono text-sm font-bold mt-3">
              {me ? `${me.wins}W – ${me.losses}L · ${me.games} rated` : '…'}
            </p>
            <p className="font-mono text-sm font-bold">
              {me?.rank ? `Ladder rank #${me.rank}` : 'Unranked — win a duel to place'}
            </p>
            <p className="font-mono text-xs mt-2 opacity-70">{user?.username}</p>
          </div>

          <div className={`md:col-span-2 bg-white dark:bg-black ${brutal.border} ${brutal.shadow} p-5`}>
            {phase === 'matched' && matched ? (
              <div className="text-center py-6">
                <p className="text-4xl mb-2">⚔️</p>
                <p className="text-3xl font-black uppercase">Matched vs {matched.opponent.username}</p>
                <p className="font-mono font-bold text-lg mt-1">{matched.opponent.rating} · {tierOf(matched.opponent.rating)}</p>
                <p className="font-mono text-xs font-bold uppercase mt-4 animate-pulse">Entering the arena…</p>
              </div>
            ) : phase === 'searching' ? (
              <div className="text-center py-4">
                <p className="text-2xl font-black uppercase animate-pulse">Searching for an opponent…</p>
                <p className="font-mono text-5xl font-black my-3" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(now - startedAt)}</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <Tag>window ±{status?.window ?? 100}</Tag>
                  <Tag>{status?.inQueue ?? 1} in queue</Tag>
                  <Tag>{genre}</Tag>
                </div>
                <p className="font-mono text-xs font-bold uppercase mt-3 text-gray-600 dark:text-yellow-400/70">
                  The window widens by 50 every 5 seconds
                </p>
                <Btn color="bg-red-400" className="mt-4" onClick={cancel}>Cancel</Btn>
              </div>
            ) : (
              <div>
                <p className="font-black uppercase text-xs tracking-widest mb-2">Passage genre</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      onClick={() => setGenre(g)}
                      className={`border-2 border-black dark:border-yellow-400 px-3 py-1 font-mono text-sm font-bold uppercase ${
                        genre === g ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <Btn color="bg-pink-300" className="w-full text-3xl py-5" onClick={find}>⚔️ Find a duel</Btn>
                <p className="font-mono text-xs font-bold uppercase mt-3">
                  Best of three passages · rated · paired by Elo (±100, widening) · 3s countdown per leg
                </p>
                {error && <p className="font-mono font-bold text-red-600 dark:text-red-400 mt-2">{error}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-3">Recent duels</p>
            {!me || me.recent.length === 0 ? (
              <p className="font-mono font-bold text-sm">No duels yet. The ladder is waiting.</p>
            ) : (
              <table className="w-full font-mono text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <tbody>
                  {me.recent.map((r, i) => (
                    <tr key={i} className="border-b border-black/10 dark:border-yellow-400/10">
                      <td className="py-1 font-black">{r.won ? '⚔️ W' : '💀 L'}</td>
                      <td className="font-bold">
                        <Link to={`/u/${encodeURIComponent(r.opponent)}`} className="underline">{r.opponent}</Link>
                      </td>
                      <td className={`text-right font-black ${r.delta >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {r.rated ? (r.delta >= 0 ? `+${r.delta}` : `−${Math.abs(r.delta)}`) : 'friendly'}
                      </td>
                      <td className="text-right text-xs opacity-70">{new Date(r.at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel>
            <p className="font-black uppercase text-xs tracking-widest mb-3">Rating ladder</p>
            {ladder.length === 0 ? (
              <p className="font-mono font-bold text-sm">Nobody rated yet. Be the first.</p>
            ) : (
              <table className="w-full font-mono text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <tbody>
                  {ladder.map(r => (
                    <tr key={r.rank} className={`border-b border-black/10 dark:border-yellow-400/10 ${r.me ? 'bg-yellow-200 dark:bg-yellow-400/20 font-black' : ''}`}>
                      <td className="py-1 font-black w-10">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</td>
                      <td className="font-bold">
                        <Link to={`/u/${encodeURIComponent(r.username)}`} className="underline">{r.username}</Link>{r.me ? ' (you)' : ''}
                      </td>
                      <td className="text-right font-black">{r.rating}</td>
                      <td className="text-right text-xs">{r.tier}</td>
                      <td className="text-right text-xs">{r.wins}–{r.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        <Panel>
          <p className="font-mono text-sm font-bold">
            &gt; TIERS — Scrap &lt;900 · Survivor 900–1099 · Raider 1100–1299 · Warlord 1300–1499 · Apocalypse 1500+. Everyone starts at 1000.
            Want the big stage? <Link to="/tournaments" className="underline">Weekend tournaments</Link>.
          </p>
        </Panel>
      </main>
    </div>
  );
};

export default QuickMatchPage;
