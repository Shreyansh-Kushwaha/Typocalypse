import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../multiplayer/socket';
import { MODE_LIST, GENRES } from '../multiplayer/types';
import type { RoomSnapshot } from '../multiplayer/types';
import { Btn, Panel, Tag, ChatBox, brutal } from '../multiplayer/ui';
import type { ChatMsg } from '../multiplayer/ui';
import { sfx, isMuted, toggleMute } from '../sound';
import SprintGame from '../multiplayer/modes/SprintGame';
import RoyaleGame from '../multiplayer/modes/RoyaleGame';
import WordWarGame from '../multiplayer/modes/WordWarGame';
import HordeGame from '../multiplayer/modes/HordeGame';
import BossRaidGame from '../multiplayer/modes/BossRaidGame';
import RelayGame from '../multiplayer/modes/RelayGame';
import CorruptorGame from '../multiplayer/modes/CorruptorGame';
import TugGame from '../multiplayer/modes/TugGame';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Results = any;

const GAMES: Record<string, React.FC<{ room: RoomSnapshot; myId: string }>> = {
  sprint: SprintGame,
  royale: RoyaleGame,
  wordwar: WordWarGame,
  horde: HordeGame,
  bossraid: BossRaidGame,
  relay: RelayGame,
  corruptor: CorruptorGame,
  tug: TugGame,
};

const RoomPage: React.FC = () => {
  const { code } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [resultsMode, setResultsMode] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('room:join', { code }, (res: { ok: boolean; room?: RoomSnapshot; error?: string }) => {
      if (res?.ok && res.room) {
        setRoom(res.room);
        if (res.room.state === 'playing') setPlaying(true);
      } else {
        setError(res?.error || 'Could not join room');
      }
    });
    const onUpdate = (snap: RoomSnapshot) => setRoom(snap);
    const onStarted = () => { setResults(null); setPlaying(true); sfx.go(); };
    const onOver = (data: { mode: string; results: Results }) => {
      setPlaying(false);
      setResults(data.results);
      setResultsMode(data.mode);
      sfx.win();
    };
    const onChat = (msg: ChatMsg) => setMessages(prev => [...prev.slice(-99), msg]);
    socket.on('room:update', onUpdate);
    socket.on('room:started', onStarted);
    socket.on('game:over', onOver);
    socket.on('chat:msg', onChat);
    return () => {
      socket.off('room:update', onUpdate);
      socket.off('room:started', onStarted);
      socket.off('game:over', onOver);
      socket.off('chat:msg', onChat);
    };
  }, [code]);

  const leave = () => {
    getSocket().emit('room:leave', () => navigate('/multiplayer'));
  };

  if (error) {
    return (
      <Shell onLeave={() => navigate('/multiplayer')} code={code || ''}>
        <Panel className="max-w-md mx-auto mt-20 text-center">
          <p className="text-xl font-black uppercase mb-4">{error}</p>
          <Btn onClick={() => navigate('/multiplayer')}>Back to hub</Btn>
        </Panel>
      </Shell>
    );
  }

  if (!room || !user) {
    return (
      <Shell onLeave={leave} code={code || ''}>
        <p className="text-center mt-20 font-mono font-black animate-pulse">CONNECTING…</p>
      </Shell>
    );
  }

  const Game = GAMES[room.mode];

  return (
    <Shell onLeave={leave} code={room.code}>
      {playing && Game ? (
        <Game room={room} myId={user.id} />
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          {results && <GameOverPanel results={results} mode={resultsMode} />}
          <Lobby room={room} myId={user.id} />
          <ChatBox messages={messages} onSend={t => getSocket().emit('chat:send', { text: t })} title="LOBBY COMMS" />
        </div>
      )}
    </Shell>
  );
};

const Shell: React.FC<{ code: string; onLeave: () => void; children: React.ReactNode }> = ({ code, onLeave, children }) => {
  const [muted, setMuted] = useState(isMuted());
  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="font-mono text-2xl font-black tracking-[0.3em] bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1">
            {code}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMuted(toggleMute())}
              className="text-2xl border-2 border-black dark:border-yellow-400 px-2 py-1 bg-white dark:bg-black"
              title={muted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <Btn color="bg-red-400" onClick={onLeave}>Leave</Btn>
          </div>
        </div>
      </header>
      <main className="p-4 md:p-6 relative z-10">{children}</main>
    </div>
  );
};

const Lobby: React.FC<{ room: RoomSnapshot; myId: string }> = ({ room, myId }) => {
  const me = room.players.find(p => p.userId === myId);
  const isHost = room.hostUserId === myId;
  const [startError, setStartError] = useState('');
  const modeInfo = MODE_LIST.find(m => m.key === room.mode);

  const start = () => {
    setStartError('');
    getSocket().emit('room:start', (res: { ok: boolean; error?: string }) => {
      if (!res?.ok) setStartError(res?.error || 'Could not start');
    });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Panel>
        <p className="font-black uppercase text-xs tracking-widest mb-3">Mode</p>
        {isHost ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {MODE_LIST.map(m => (
                <button
                  key={m.key}
                  onClick={() => getSocket().emit('room:mode', { mode: m.key })}
                  className={`text-left border-2 border-black dark:border-yellow-400 px-2 py-1 font-bold text-sm uppercase ${
                    room.mode === m.key ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black'
                  }`}
                >
                  {m.icon} {m.name}
                </button>
              ))}
            </div>
            <label className="font-mono text-xs font-bold uppercase flex items-center gap-2">
              Genre
              <select
                value={room.settings.genre}
                onChange={e => getSocket().emit('room:mode', { mode: room.mode, settings: { genre: e.target.value } })}
                className="border-2 border-black dark:border-yellow-400 bg-white dark:bg-black px-2 py-1 font-mono uppercase"
              >
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-black uppercase">{modeInfo?.icon} {room.modeName}</p>
            <p className="font-mono text-sm mt-1">{modeInfo?.blurb}</p>
            <Tag className="mt-2 inline-block">{room.settings.genre}</Tag>
          </div>
        )}
      </Panel>

      <Panel>
        <p className="font-black uppercase text-xs tracking-widest mb-3">
          Players {room.players.length}/{room.limits.max}
        </p>
        <div className="space-y-2 mb-4">
          {room.players.map(p => (
            <div key={p.userId} className="flex items-center justify-between border-2 border-black dark:border-yellow-400 px-3 py-1.5">
              <span className="font-mono font-bold">
                {p.name}{p.userId === myId ? ' (you)' : ''}{!p.connected ? ' ⚠ offline' : ''}
              </span>
              <span className="flex gap-2">
                {p.isHost && <Tag className="bg-purple-300">HOST</Tag>}
                {p.ready || p.isHost
                  ? <Tag className="bg-green-300">READY</Tag>
                  : <Tag className="bg-gray-200 dark:bg-black">WAITING</Tag>}
              </span>
            </div>
          ))}
        </div>
        {isHost ? (
          <div>
            <Btn color="bg-green-300" className="w-full text-xl" onClick={start}>Start game</Btn>
            {startError && <p className="font-mono font-bold text-red-600 dark:text-red-400 mt-2">{startError}</p>}
          </div>
        ) : (
          <Btn
            color={me?.ready ? 'bg-yellow-300' : 'bg-green-300'}
            className="w-full text-xl"
            onClick={() => getSocket().emit('room:ready', { ready: !me?.ready })}
          >
            {me?.ready ? 'Unready' : 'Ready up'}
          </Btn>
        )}
      </Panel>
    </div>
  );
};

const GameOverPanel: React.FC<{ results: Results; mode: string }> = ({ results, mode }) => {
  const modeInfo = MODE_LIST.find(m => m.key === mode);
  return (
    <div className={`bg-white dark:bg-black ${brutal.border} ${brutal.shadow} p-6`}>
      <h2 className="text-3xl font-black uppercase tracking-tighter border-b-4 border-black dark:border-yellow-400 pb-2 mb-4">
        {modeInfo?.icon} {modeInfo?.name} — Results
      </h2>

      {results.winner && (
        <p className="text-xl font-black uppercase mb-3">
          🏆 Winner <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">{results.winner.name ?? results.winner}</span>
        </p>
      )}
      {typeof results.victory === 'boolean' && (
        <p className="text-xl font-black uppercase mb-3">
          {results.victory ? `🏆 ${results.boss} DEFEATED` : `☠️ WIPED BY ${results.boss}`}
        </p>
      )}
      {typeof results.wavesCleared === 'number' && (
        <p className="text-xl font-black uppercase mb-3">🧟 Waves survived {results.wavesCleared}</p>
      )}
      {typeof results.crewWins === 'boolean' && (
        <p className="text-xl font-black uppercase mb-3">
          {results.crewWins ? '✅ CREW WINS' : '🎭 THE CORRUPTOR WINS'} — it was{' '}
          <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">{results.corruptor?.name}</span>
        </p>
      )}

      {(results.placements || results.board || results.kills || results.stats || results.betPoints) && (
        <table className="w-full font-mono text-sm">
          <tbody>
            {(results.placements || results.board || results.kills || results.stats || []).map((r: Results, i: number) => (
              <tr key={i} className="border-b-2 border-black/20 dark:border-yellow-400/20">
                <td className="py-1 font-black">{i + 1}</td>
                <td className="font-bold">{r.name}</td>
                <td className="text-right">
                  {r.legWins != null && `${r.legWins} legs`}
                  {r.points != null && ` ${r.points} pts`}
                  {r.damage != null && ` ${r.damage} dmg`}
                  {r.kills != null && ` ${r.kills} kills`}
                  {r.avgWpm != null && ` ${r.avgWpm} wpm ${r.avgAcc ?? ''}% acc`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {results.chronicle && (
        <div className="mt-4 space-y-3">
          <p className="font-black uppercase text-xs tracking-widest">The chronicle</p>
          {results.chronicle.map((c: Results, i: number) => (
            <div key={i} className="border-l-4 border-black dark:border-yellow-400 pl-3">
              <p className="font-medium">{c.text}</p>
              <p className="font-mono text-xs mt-1">
                — {c.by} · {c.wpm} wpm · {c.acc}% {c.choice ? `· chose “${c.choice}”` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="font-mono text-xs font-bold mt-4 uppercase">Ready up to run it back</p>
    </div>
  );
};

export default RoomPage;
