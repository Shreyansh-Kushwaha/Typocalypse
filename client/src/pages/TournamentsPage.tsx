import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { SeoFor } from '../seo';
import { getSocket } from '../multiplayer/socket';
import { Btn, Panel, Tag, useNow, brutal } from '../multiplayer/ui';
import { Bar, ErrorPanel, SkeletonBlock } from '../social/Skeleton';
import { sfx } from '../sound';

interface TSummary {
  slug: string;
  name: string;
  mode: string;
  genre: string;
  startsAt: string;
  state: 'open' | 'starting' | 'running' | 'finished' | 'cancelled';
  entrants: number;
  registered: boolean;
  roomCode: string | null;
  heats: number;
  winner: { userId: string; username: string } | null;
}
interface Past { slug: string; name: string; startsAt: string; state: string; winner: { username: string } | null; entrants: number }
interface Arena { roomCode: string; name: string; stage: string }

const STATE_COLORS: Record<string, string> = {
  open: 'bg-green-300',
  starting: 'bg-orange-300',
  running: 'bg-red-300',
  finished: 'bg-purple-300',
  cancelled: 'bg-gray-200 dark:bg-black',
};

function fmtLeft(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const TournamentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [next, setNext] = useState<TSummary | null>(null);
  const [past, setPast] = useState<Past[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [arena, setArena] = useState<Arena | null>(null);
  const [flash, setFlash] = useState('');
  const now = useNow(1000);

  const load = useCallback(() => {
    axios.get('/tournaments').then(res => {
      setNext(res.data.next);
      setPast(res.data.past || []);
      setLoadError('');
      setLoaded(true);
    }).catch(() => { setLoadError('Could not reach the tournament desk.'); setLoaded(true); });
  }, []);

  const retry = () => { setLoaded(false); setLoadError(''); load(); };

  useEffect(load, [load]);

  // keep the countdown honest when the state flips server-side
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const s = getSocket();
    const onStart = (data: Arena & { slug: string }) => { setArena(data); sfx.alarm(); load(); };
    const onCancel = (data: { message: string }) => { setFlash(`Tournament cancelled: ${data.message}`); setArena(null); load(); };
    const onFinish = (data: { name: string; winner: { username: string } }) => { setFlash(`${data.name} — champion: ${data.winner.username}`); setArena(null); load(); };
    s.on('tournament:start', onStart);
    s.on('tournament:cancelled', onCancel);
    s.on('tournament:finished', onFinish);
    return () => {
      s.off('tournament:start', onStart);
      s.off('tournament:cancelled', onCancel);
      s.off('tournament:finished', onFinish);
    };
  }, [load]);

  const register = () => {
    if (!next || busy) return;
    setBusy(true);
    setError('');
    const req = next.registered
      ? axios.delete(`/tournaments/${next.slug}/register`)
      : axios.post(`/tournaments/${next.slug}/register`);
    req.then(res => {
      setNext({ ...next, registered: !!res.data.registered, entrants: res.data.entrants });
      if (res.data.registered) sfx.success(); else sfx.pop();
    })
      .catch(err => setError(err?.response?.data?.error || 'Could not update registration'))
      .finally(() => setBusy(false));
  };

  const startsAt = next ? new Date(next.startsAt).getTime() : 0;
  const joinCode = arena?.roomCode || (next && ['starting', 'running'].includes(next.state) ? next.roomCode : null);

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
      <SeoFor path="/tournaments" />
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">
            Weekend <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Tournaments</span>
          </h1>
          <Btn color="bg-red-400" onClick={() => navigate(user ? '/dashboard' : '/')}>Back</Btn>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 relative z-10">
        <div aria-live="polite">
          {joinCode && (
            <div className={`bg-red-300 dark:bg-black ${brutal.border} ${brutal.shadow} p-4 sm:p-5 flex flex-wrap items-center gap-4 animate-pulse mb-6`}>
              <p className="text-lg sm:text-2xl font-black uppercase break-words">
                <span aria-hidden="true">🏟️</span> {arena?.name || next?.name} — your {arena?.stage === 'final' ? 'FINAL' : 'heat'} is open
              </p>
              <Btn color="bg-white" className="w-full sm:w-auto text-lg sm:text-xl sm:ml-auto" onClick={() => navigate(`/room/${joinCode}`)}>Join the arena →</Btn>
            </div>
          )}
          {flash && (
            <div className={`bg-yellow-300 dark:bg-black ${brutal.border} ${brutal.shadowSm} p-3 font-black uppercase flex flex-wrap items-center gap-3 mb-6`}>
              <span className="break-words"><span aria-hidden="true">🏆</span> {flash}</span>
              <button className="ml-auto font-mono text-xl" onClick={() => setFlash('')} aria-label="Dismiss this notice" title="Dismiss this notice">×</button>
            </div>
          )}
        </div>

        {!loaded ? (
          <SkeletonBlock label="Scouting the arena" className={`bg-white dark:bg-black ${brutal.border} ${brutal.shadow} p-4 sm:p-6 space-y-3`}>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Bar key={i} className="h-6 w-24" />)}
            </div>
            <Bar className="h-12 sm:h-14 w-3/4 max-w-lg" />
            <Bar className="h-4 w-64 max-w-full" />
            <Bar className="h-12 w-48" />
            <Bar className="h-14 w-56" />
          </SkeletonBlock>
        ) : loadError ? (
          <ErrorPanel message={loadError} onRetry={retry} retryLabel="Reload tournaments" />
        ) : !next ? (
          <Panel className="text-center py-10 px-4">
            <p className="text-xl sm:text-2xl font-black uppercase">No tournament scheduled</p>
            <p className="font-mono text-sm font-bold mt-2">Check back soon — one opens every week.</p>
          </Panel>
        ) : (
          <div className={`bg-white dark:bg-black ${brutal.border} ${brutal.shadow} p-4 sm:p-6`}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
              <Tag className={`${STATE_COLORS[next.state] || ''} text-base`}>{next.state}</Tag>
              <Tag><span aria-hidden="true">👑</span> Typo Royale</Tag>
              <Tag>{next.genre}</Tag>
              <Tag>{next.entrants} registered</Tag>
              {next.heats > 0 && <Tag>{next.heats} heat{next.heats === 1 ? '' : 's'}</Tag>}
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none break-words">
              <span aria-hidden="true">🏆</span> {next.name}
            </h2>
            <p className="font-mono font-bold mt-3 break-words">
              Saturday 18:00 UTC · your time {new Date(next.startsAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            {next.state === 'open' && (
              <p className="font-mono text-3xl sm:text-4xl font-black mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {startsAt > now ? fmtLeft(startsAt - now) : 'STARTING…'}
              </p>
            )}
            {next.state === 'finished' && next.winner && (
              <p className="text-lg sm:text-xl font-black uppercase mt-2 break-words">Champion: <Link to={`/u/${encodeURIComponent(next.winner.username)}`} className="underline">{next.winner.username}</Link></p>
            )}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-5 sm:items-center">
              {next.state === 'open' && (
                <Btn
                  color={next.registered ? 'bg-yellow-300' : 'bg-green-300'}
                  className="w-full sm:w-auto text-xl sm:text-2xl px-8 py-3"
                  onClick={register}
                  disabled={busy}
                  aria-busy={busy}
                >
                  {busy
                    ? (next.registered ? 'Withdrawing…' : 'Registering…')
                    : next.registered ? '✓ Registered — withdraw' : 'Register'}
                </Btn>
              )}
              {['starting', 'running'].includes(next.state) && !joinCode && (
                <p className="font-mono font-bold">
                  {next.registered ? 'Your room is on its way…' : 'In progress — registration is closed.'}
                </p>
              )}
              {user?.isGuest && next.state === 'open' && (
                <span className="font-mono text-xs font-bold uppercase">Guests can play · <Link to="/claim" className="underline">claim your account</Link> to keep the trophy</span>
              )}
            </div>
            {error && <p role="alert" className="font-mono font-bold text-red-600 dark:text-red-400 mt-2 break-words">{error}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Panel className="p-4 sm:p-6">
            <p className="font-black uppercase text-xs tracking-widest mb-3">The rules</p>
            <ul className="font-mono text-sm font-bold space-y-2">
              <li>&gt; Register before Saturday 18:00 UTC. Guests welcome.</li>
              <li>&gt; At the bell, entrants are split into heats of up to 20. Your room code arrives here and by push — you have 75 seconds to join.</li>
              <li>&gt; Each heat is a <span aria-hidden="true">👑</span> Typo Royale: short bursts, shrinking timer, slowest survivor cut every round.</li>
              <li>&gt; Heat winners meet in the final. With 20 or fewer entrants the heat is the final.</li>
              <li>&gt; Rooms with fewer than 2 players at the deadline are scrapped; a lone player advances.</li>
              <li>&gt; The champion earns the <span aria-hidden="true">🏆</span> Weekend Champion achievement, 300 XP, and unlocks the Royal theme.</li>
            </ul>
          </Panel>

          <Panel className="p-4 sm:p-6">
            <p className="font-black uppercase text-xs tracking-widest mb-3">Past tournaments</p>
            {!loaded ? (
              <SkeletonBlock label="Loading past tournaments" className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3"><Bar className="h-4 flex-1" /><Bar className="h-4 w-20 shrink-0" /></div>
                ))}
              </SkeletonBlock>
            ) : past.length === 0 ? (
              <p className="font-mono font-bold text-sm">None yet. History starts this weekend.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] font-mono text-sm">
                  <caption className="sr-only">Past weekend tournaments and their champions</caption>
                  <tbody>
                    {past.map(p => (
                      <tr key={p.slug} className="border-b border-black/10 dark:border-yellow-400/10">
                        <td className="py-1 font-bold break-words">{p.name}</td>
                        <td className="text-xs whitespace-nowrap">{new Date(p.startsAt).toLocaleDateString()}</td>
                        <td className="text-right">
                          {p.winner
                            ? <Link to={`/u/${encodeURIComponent(p.winner.username)}`} className="underline font-black"><span aria-hidden="true">🏆</span> {p.winner.username}</Link>
                            : <span className="opacity-60">{p.state}</span>}
                        </td>
                        <td className="text-right text-xs whitespace-nowrap">{p.entrants}p</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="font-mono text-xs font-bold uppercase mt-4">
              Rated 1v1 instead? <Link to="/quickmatch" className="underline">Quick match &amp; the rating ladder →</Link>
            </p>
          </Panel>
        </div>
      </main>
    </div>
  );
};

export default TournamentsPage;
