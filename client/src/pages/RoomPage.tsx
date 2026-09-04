import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../multiplayer/socket';
import { MODE_LIST, GENRES } from '../multiplayer/types';
import type { RoomSnapshot } from '../multiplayer/types';
import { Btn, Panel, Tag, ChatBox, Countdown, brutal } from '../multiplayer/ui';
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
import DuelGame from '../multiplayer/modes/DuelGame';

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
  duel: DuelGame,
};

interface Notice { text: string; code?: string; tone?: 'info' | 'bad' | 'good' }

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
  const [notice, setNotice] = useState<Notice | null>(null);
  const myId = user?.id;

  useEffect(() => {
    document.title = `Room ${code || ''} — Typocalypse`;
    return () => { document.title = 'Typocalypse — survive the typing apocalypse'; };
  }, [code]);

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
    const onStarted = () => { setResults(null); setNotice(null); setPlaying(true); sfx.go(); };
    const onOver = (data: { mode: string; results: Results }) => {
      setPlaying(false);
      setResults(data.results);
      setResultsMode(data.mode);
      if (data.mode === 'duel' && data.results?.winner && data.results.winner.userId !== myId) sfx.lose();
      else sfx.win();
    };
    const onChat = (msg: ChatMsg) => setMessages(prev => [...prev.slice(-99), msg]);
    const onTStart = (data: { slug: string; name: string; roomCode: string; stage: string }) => {
      if (data.roomCode === code) return;
      setNotice({ text: `${data.name}: your ${data.stage === 'final' ? 'FINAL' : 'heat'} room is open — join within 75s`, code: data.roomCode, tone: 'good' });
      sfx.alarm();
    };
    const onTAdvance = (data: { message: string }) => { setNotice({ text: data.message, tone: 'good' }); sfx.success(); };
    const onTCancel = (data: { message: string; roomCode: string | null }) => {
      if (data.roomCode && data.roomCode !== code) return;
      setNotice({ text: `Tournament: ${data.message}`, tone: 'bad' });
      sfx.alarm();
    };
    socket.on('room:update', onUpdate);
    socket.on('room:started', onStarted);
    socket.on('game:over', onOver);
    socket.on('chat:msg', onChat);
    socket.on('tournament:start', onTStart);
    socket.on('tournament:advance', onTAdvance);
    socket.on('tournament:cancelled', onTCancel);
    return () => {
      socket.off('room:update', onUpdate);
      socket.off('room:started', onStarted);
      socket.off('game:over', onOver);
      socket.off('chat:msg', onChat);
      socket.off('tournament:start', onTStart);
      socket.off('tournament:advance', onTAdvance);
      socket.off('tournament:cancelled', onTCancel);
    };
  }, [code, myId]);

  const leave = () => {
    getSocket().emit('room:leave', () => navigate('/multiplayer'));
  };

  if (error) {
    return (
      <Shell onLeave={() => navigate('/multiplayer')} code={code || ''}>
        {notice && <NoticeBar notice={notice} />}
        <Panel className="max-w-md mx-auto mt-20 text-center">
          <p className="text-xl font-black uppercase mb-4">{error}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Btn onClick={() => navigate('/multiplayer')}>Back to hub</Btn>
            <Btn color="bg-yellow-300" onClick={() => navigate('/tournaments')}>Tournaments</Btn>
          </div>
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
      {notice && <NoticeBar notice={notice} onClose={() => setNotice(null)} />}
      {playing && Game ? (
        <Game room={room} myId={user.id} />
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          {results && <GameOverPanel results={results} mode={resultsMode} room={room} myId={user.id} />}
          <Lobby room={room} myId={user.id} />
          <ChatBox messages={messages} onSend={t => getSocket().emit('chat:send', { text: t })} title="LOBBY COMMS" />
        </div>
      )}
    </Shell>
  );
};

const NoticeBar: React.FC<{ notice: Notice; onClose?: () => void }> = ({ notice, onClose }) => {
  const navigate = useNavigate();
  const tone = notice.tone === 'bad' ? 'bg-red-300' : notice.tone === 'good' ? 'bg-green-300' : 'bg-yellow-300';
  return (
    <div className={`max-w-5xl mx-auto mb-4 ${tone} dark:bg-black ${brutal.border} ${brutal.shadowSm} p-3 flex flex-wrap items-center gap-3`}>
      <span className="font-black uppercase">🏆 {notice.text}</span>
      {notice.code && <Btn color="bg-white" className="text-sm" onClick={() => navigate(`/room/${notice.code}`)}>Join the arena →</Btn>}
      {onClose && <button onClick={onClose} className="ml-auto font-mono font-black text-xl" aria-label="dismiss">×</button>}
    </div>
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

  const playerList = (
    <div className="space-y-2 mb-4">
      {room.players.map(p => (
        <div key={p.userId} className="flex items-center justify-between border-2 border-black dark:border-yellow-400 px-3 py-1.5">
          <span className="font-mono font-bold">
            {p.name}{p.userId === myId ? ' (you)' : ''}{!p.connected ? ' ⚠ offline' : ''}
            {room.ratings?.[p.userId] != null && <span className="text-xs ml-2 opacity-70">{room.ratings[p.userId]}</span>}
          </span>
          <span className="flex gap-2">
            {p.isHost && <Tag className="bg-purple-300">HOST</Tag>}
            {room.system
              ? <Tag className={p.connected ? 'bg-green-300' : 'bg-gray-200 dark:bg-black'}>{p.connected ? 'HERE' : 'AWAY'}</Tag>
              : p.ready || p.isHost
                ? <Tag className="bg-green-300">READY</Tag>
                : <Tag className="bg-gray-200 dark:bg-black">WAITING</Tag>}
          </span>
        </div>
      ))}
      {room.players.length === 0 && <p className="font-mono text-sm font-bold">Nobody here yet.</p>}
    </div>
  );

  if (room.system) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Panel>
          <p className="font-black uppercase text-xs tracking-widest mb-3">Tournament room</p>
          <p className="text-2xl font-black uppercase">🏆 {room.tournament?.name || 'Weekend tournament'}</p>
          <p className="font-mono text-sm mt-1">
            {room.tournament?.stage === 'final' ? 'THE FINAL' : 'HEAT'} · {modeInfo?.icon} {room.modeName} · {room.settings.genre}
          </p>
          <p className="font-mono text-sm mt-1">{modeInfo?.blurb}</p>
          <div className="mt-4 bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-2 font-black uppercase">
            {room.startsAt
              ? <>Starts automatically in <Countdown until={room.startsAt} /></>
              : 'Starts automatically'}
          </div>
          <p className="font-mono text-xs font-bold mt-2 uppercase text-gray-600 dark:text-yellow-400/70">
            No host. Needs 2+ players here at the deadline — if everyone listed shows up early it starts right away.
          </p>
        </Panel>
        <Panel>
          <p className="font-black uppercase text-xs tracking-widest mb-3">
            Players {room.players.length}/{room.limits.max}
          </p>
          {playerList}
        </Panel>
      </div>
    );
  }

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
            {room.mode === 'duel' && (
              <p className="font-mono text-xs font-bold uppercase">
                Friendly duel — no rating change. <Link to="/quickmatch" className="underline">Queue for a rated one</Link>
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-2xl font-black uppercase">{modeInfo?.icon} {room.modeName}</p>
            <p className="font-mono text-sm mt-1">{modeInfo?.blurb}</p>
            <Tag className="mt-2 inline-block">{room.settings.genre}</Tag>
            {room.settings.rated && <Tag className="mt-2 ml-2 inline-block bg-pink-300">RATED</Tag>}
          </div>
        )}
      </Panel>

      <Panel>
        <p className="font-black uppercase text-xs tracking-widest mb-3">
          Players {room.players.length}/{room.limits.max}
        </p>
        {playerList}
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

const GameOverPanel: React.FC<{ results: Results; mode: string; room: RoomSnapshot; myId: string }> = ({ results, mode, room, myId }) => {
  const modeInfo = MODE_LIST.find(m => m.key === mode);
  const [title, setTitle] = useState('');
  const [pub, setPub] = useState<{ busy?: boolean; id?: string; error?: string }>({});
  const nameOf = (id: string) => room.players.find(p => p.userId === id)?.name
    || (results.winner?.userId === id ? results.winner.name : results.loser?.userId === id ? results.loser.name : '?');

  const publish = () => {
    if (!results.chronicle) return;
    setPub({ busy: true });
    axios.post('/stories', {
      source: 'relay',
      title: title.trim() || `Relay chronicle ${room.code}`,
      genre: room.settings.genre,
      passages: results.chronicle.map((c: Results) => ({ text: c.text, by: c.by, choice: c.choice || '' })),
    })
      .then(res => setPub({ id: res.data?.id }))
      .catch(err => setPub({ error: err?.response?.data?.error || 'Could not publish — the library is not answering' }));
  };

  const duelIds: string[] = mode === 'duel' && results.score ? Object.keys(results.score) : [];
  const iWon = results.winner?.userId === myId;

  return (
    <div className={`bg-white dark:bg-black ${brutal.border} ${brutal.shadow} p-6`}>
      <h2 className="text-3xl font-black uppercase tracking-tighter border-b-4 border-black dark:border-yellow-400 pb-2 mb-4">
        {modeInfo?.icon} {modeInfo?.name} — Results
      </h2>

      {results.winner && (
        <p className="text-xl font-black uppercase mb-3">
          🏆 Winner <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">{results.winner.name ?? results.winner}</span>
          {room.tournament?.done && <span className="ml-2 text-sm">· {room.tournament.stage === 'final' ? 'TOURNAMENT CHAMPION' : 'advances to the final'}</span>}
        </p>
      )}

      {mode === 'duel' && duelIds.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono font-black text-4xl bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {duelIds.map(id => results.score[id]).join(' – ')}
            </span>
            <span className="font-black uppercase">{duelIds.map(nameOf).join(' vs ')}</span>
            <Tag className={results.rated ? 'bg-pink-300' : ''}>{results.rated ? 'RATED' : 'FRIENDLY'}</Tag>
            <span className="text-2xl font-black uppercase">{iWon ? '⚔️ VICTORY' : '💀 DEFEAT'}</span>
          </div>
          {results.rated && (
            <div className="flex flex-wrap gap-3">
              {duelIds.map(id => {
                const d = results.ratingDelta?.[id] ?? 0;
                return (
                  <div key={id} className={`border-2 border-black dark:border-yellow-400 px-3 py-2 font-mono ${id === myId ? 'bg-yellow-200 dark:bg-yellow-400/20' : ''}`}>
                    <span className="font-bold">{nameOf(id)}</span>{' '}
                    <span className={`font-black ${d >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {d >= 0 ? `+${d}` : `−${Math.abs(d)}`}
                    </span>{' '}
                    <span className="text-xs">→ {results.ratings?.[id]}</span>
                  </div>
                );
              })}
            </div>
          )}
          {Array.isArray(results.legs) && results.legs.length > 0 && (
            <table className="w-full font-mono text-sm">
              <tbody>
                {results.legs.map((l: Results) => (
                  <tr key={l.leg} className="border-b-2 border-black/20 dark:border-yellow-400/20">
                    <td className="py-1 font-black">Leg {l.leg}</td>
                    <td className="font-bold">{l.winner?.name}</td>
                    <td className="text-right">
                      {l.reason === 'forfeit' ? 'forfeit' : duelIds.map(id => `${nameOf(id)} ${l.wpm?.[id] ?? '?'} wpm`).join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {results.rated && (
            <Link to="/quickmatch"><Btn color="bg-pink-300" className="mt-2">⚔️ Queue again</Btn></Link>
          )}
        </div>
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
          <div className="border-t-2 border-black/20 dark:border-yellow-400/20 pt-3">
            {pub.id ? (
              <p className="font-black uppercase">
                📚 Published! <Link to={`/library/${pub.id}`} className="underline">Read it in the library →</Link>
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder="Give the chronicle a title"
                  className="flex-1 min-w-[12rem] border-2 border-black dark:border-yellow-400 bg-white dark:bg-black px-2 py-1 font-mono text-sm outline-none focus:shadow-[4px_4px_0px_0px_#ff007f]"
                />
                <Btn color="bg-green-300" className="text-sm" onClick={publish} disabled={!!pub.busy}>
                  {pub.busy ? 'Publishing…' : '📚 Publish chronicle to the library'}
                </Btn>
                {pub.error && <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">{pub.error}</span>}
              </div>
            )}
          </div>
        </div>
      )}
      <p className="font-mono text-xs font-bold mt-4 uppercase">
        {mode === 'duel' && results.rated ? 'Queue again for another rated duel' : room.system ? 'Waiting for the tournament to continue' : 'Ready up to run it back'}
      </p>
    </div>
  );
};

export default RoomPage;
