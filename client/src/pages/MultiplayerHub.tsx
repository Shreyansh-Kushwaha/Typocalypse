import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeoFor } from '../seo';
import { getSocket } from '../multiplayer/socket';
import { MODE_LIST, GENRES } from '../multiplayer/types';
import type { RoomSnapshot } from '../multiplayer/types';
import { Btn, Panel, Tag, brutal } from '../multiplayer/ui';

const KIND_COLORS: Record<string, string> = {
  'PVP': 'bg-red-300',
  'CO-OP': 'bg-green-300',
  'TEAMS': 'bg-purple-300',
  'SOCIAL': 'bg-yellow-300',
};

const MultiplayerHub: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('horde');
  const [genre, setGenre] = useState('fantasy');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);

  const createRoom = () => {
    if (busy) return;
    setBusy(true);
    setError('');
    getSocket().emit('room:create', { mode, settings: { genre } }, (res: { ok: boolean; room?: RoomSnapshot; error?: string }) => {
      setBusy(false);
      if (res?.ok && res.room) navigate(`/room/${res.room.code}`);
      else setError(res?.error || 'Failed to create room — the arena is not answering.');
    });
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joining) return;
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return setError('Enter a room code');
    setError('');
    setJoining(true);
    navigate(`/room/${code}`);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative">
      <SeoFor path="/multiplayer" />
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter">
            Multiplayer <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Wasteland</span>
          </h1>
          <Btn color="bg-red-400" onClick={() => navigate('/dashboard')}>Back</Btn>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/quickmatch')}
            className={`text-left bg-pink-300 dark:bg-black ${brutal.border} ${brutal.shadowSm} ${brutal.hover} p-4`}
          >
            <p className="text-3xl mb-1" aria-hidden="true">⚔️</p>
            <p className="font-black uppercase text-lg">Quick match — rated duel</p>
            <p className="text-sm font-medium">Queue up, get paired by rating, best of three passages. Climb the ladder.</p>
          </button>
          <button
            onClick={() => navigate('/tournaments')}
            className={`text-left bg-yellow-300 dark:bg-black ${brutal.border} ${brutal.shadowSm} ${brutal.hover} p-4`}
          >
            <p className="text-3xl mb-1" aria-hidden="true">🏆</p>
            <p className="font-black uppercase text-lg">Weekend tournament</p>
            <p className="text-sm font-medium">Every Saturday 18:00 UTC. Heats of 20, one Typo Royale final, one champion.</p>
          </button>
        </div>

        <form onSubmit={joinRoom} className={`bg-white dark:bg-black ${brutal.border} ${brutal.shadow} p-4 sm:p-6 flex flex-wrap items-center gap-3 sm:gap-4`}>
          <label className="font-black uppercase text-lg" htmlFor="room-code">Join a room</label>
          <input
            id="room-code"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            aria-label="Room code, five letters"
            maxLength={5}
            className="border-4 border-black dark:border-yellow-400 bg-white dark:bg-black px-3 py-2 font-mono text-2xl font-black tracking-[0.3em] w-full sm:w-40 outline-none uppercase"
          />
          <Btn type="submit" color="bg-green-300" className="w-full sm:w-auto" disabled={joining} aria-busy={joining}>
            {joining ? 'Joining…' : 'Join'}
          </Btn>
          {error && <span role="alert" className="font-mono font-bold text-red-600 dark:text-red-400 break-words w-full sm:w-auto">{error}</span>}
        </form>

        <div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
            <h2 className="text-xl font-black uppercase">Or host one</h2>
            <label className="font-mono text-sm font-bold uppercase flex items-center gap-2">
              Genre
              <select
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className="border-2 border-black dark:border-yellow-400 bg-white dark:bg-black px-2 py-1 font-mono uppercase"
              >
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            <Btn color="bg-cyan-300" className="w-full sm:w-auto" onClick={createRoom} disabled={busy} aria-busy={busy}>
              {busy ? 'Creating the room…' : `Create ${MODE_LIST.find(m => m.key === mode)?.name} room`}
            </Btn>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODE_LIST.map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                aria-pressed={mode === m.key}
                className={`text-left bg-white dark:bg-black ${brutal.border} p-4 transition-all ${
                  mode === m.key
                    ? 'shadow-[8px_8px_0px_0px_#ff007f] dark:shadow-[8px_8px_0px_0px_#fff] -translate-y-1'
                    : `${brutal.shadowSm} ${brutal.hover}`
                }`}
              >
                <div className="text-3xl mb-2" aria-hidden="true">{m.icon}</div>
                <p className="font-black uppercase leading-tight">{m.name}</p>
                <div className="flex flex-wrap gap-2 my-2">
                  <Tag className={KIND_COLORS[m.kind]}>{m.kind}</Tag>
                  <Tag>{m.players}P</Tag>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-yellow-400/70">{m.blurb}</p>
              </button>
            ))}
          </div>
        </div>

        <Panel className="p-4 sm:p-6">
          <p className="font-mono text-sm font-bold break-words">
            &gt; HOW IT WORKS — pick a mode, create a room, share the 5 letter code. Friends join from this page. The host starts when everyone is ready.
          </p>
        </Panel>
      </main>
    </div>
  );
};

export default MultiplayerHub;
