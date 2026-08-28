import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const createRoom = () => {
    setBusy(true);
    setError('');
    getSocket().emit('room:create', { mode, settings: { genre } }, (res: { ok: boolean; room?: RoomSnapshot; error?: string }) => {
      setBusy(false);
      if (res?.ok && res.room) navigate(`/room/${res.room.code}`);
      else setError(res?.error || 'Failed to create room');
    });
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return setError('Enter a room code');
    navigate(`/room/${code}`);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <header className={`sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">
            Multiplayer <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Wasteland</span>
          </h1>
          <Btn color="bg-red-400" onClick={() => navigate('/dashboard')}>Back</Btn>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8 relative z-10">
        <form onSubmit={joinRoom} className={`bg-white dark:bg-black ${brutal.border} ${brutal.shadow} p-6 flex flex-wrap items-center gap-4`}>
          <p className="font-black uppercase text-lg">Join a room</p>
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            maxLength={5}
            className="border-4 border-black dark:border-yellow-400 bg-white dark:bg-black px-3 py-2 font-mono text-2xl font-black tracking-[0.3em] w-40 outline-none uppercase"
          />
          <Btn type="submit" color="bg-green-300">Join</Btn>
          {error && <span className="font-mono font-bold text-red-600 dark:text-red-400">{error}</span>}
        </form>

        <div>
          <div className="flex flex-wrap items-center gap-4 mb-4">
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
            <Btn color="bg-cyan-300" onClick={createRoom} disabled={busy}>
              {busy ? 'Creating…' : `Create ${MODE_LIST.find(m => m.key === mode)?.name} room`}
            </Btn>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODE_LIST.map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`text-left bg-white dark:bg-black ${brutal.border} p-4 transition-all ${
                  mode === m.key
                    ? 'shadow-[8px_8px_0px_0px_#ff007f] dark:shadow-[8px_8px_0px_0px_#fff] -translate-y-1'
                    : `${brutal.shadowSm} ${brutal.hover}`
                }`}
              >
                <div className="text-3xl mb-2">{m.icon}</div>
                <p className="font-black uppercase leading-tight">{m.name}</p>
                <div className="flex gap-2 my-2">
                  <Tag className={KIND_COLORS[m.kind]}>{m.kind}</Tag>
                  <Tag>{m.players}P</Tag>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-yellow-400/70">{m.blurb}</p>
              </button>
            ))}
          </div>
        </div>

        <Panel>
          <p className="font-mono text-sm font-bold">
            &gt; HOW IT WORKS — pick a mode, create a room, share the 5 letter code. Friends join from this page. The host starts when everyone is ready.
          </p>
        </Panel>
      </main>
    </div>
  );
};

export default MultiplayerHub;
