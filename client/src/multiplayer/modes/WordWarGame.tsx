import React, { useEffect, useState } from 'react';
import type { RoomSnapshot } from '../types';
import { getSocket, sendGameEvent } from '../socket';
import { Panel, Countdown, Tag, brutal } from '../ui';
import { sfx } from '../../sound';

interface QWord { word: string; junk: boolean; from: string | null }
interface WarPlayer { userId: string; name: string; queue: QWord[]; streak: number; points: number; alive: boolean }

const WordWarGame: React.FC<{ room: RoomSnapshot; myId: string }> = ({ myId }) => {
  const [players, setPlayers] = useState<WarPlayer[]>([]);
  const [endsAt, setEndsAt] = useState(0);
  const [cap, setCap] = useState(10);
  const [buffer, setBuffer] = useState('');
  const [banner, setBanner] = useState('');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const onStart = (data: { endsAt: number; cap: number }) => { setEndsAt(data.endsAt); setCap(data.cap); };
    const onState = (data: { players: WarPlayer[]; endsAt: number }) => { setPlayers(data.players); setEndsAt(data.endsAt); };
    const onAttack = (data: { from: { name: string }; to: { userId: string; name: string }; count: number }) => {
      if (data.to.userId === myId) sfx.alarm(); else sfx.pop();
      setBanner(data.to.userId === myId
        ? `⚔️ ${data.from.name} DUMPED ${data.count} JUNK WORDS ON YOU`
        : `⚔️ ${data.from.name} attacked ${data.to.name}`);
    };
    const onElim = (data: { userId: string; name: string }) =>
      setBanner(data.userId === myId ? '💀 YOUR QUEUE OVERFLOWED' : `💀 ${data.name} overflowed`);
    s.on('wordwar:start', onStart);
    s.on('wordwar:state', onState);
    s.on('wordwar:attack', onAttack);
    s.on('wordwar:eliminated', onElim);
    return () => {
      s.off('wordwar:start', onStart);
      s.off('wordwar:state', onState);
      s.off('wordwar:attack', onAttack);
      s.off('wordwar:eliminated', onElim);
    };
  }, [myId]);

  const me = players.find(p => p.userId === myId);
  const opponents = players.filter(p => p.userId !== myId);

  const submit = () => {
    const typed = buffer.trim();
    setBuffer('');
    if (!typed || !me?.alive) return;
    if (me.queue.some(q => q.word === typed)) {
      sendGameEvent('word', { word: typed });
      sfx.pop();
    } else {
      sendGameEvent('typo', {});
      sfx.error();
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Tag className="bg-red-300 text-base sm:text-lg"><span aria-hidden="true">⚔️</span> WORD WAR</Tag>
        {endsAt > 0 && <Countdown until={endsAt} prefix="⏱ " />}
        {me && <Tag className={me.streak >= 3 ? 'bg-yellow-300 animate-pulse' : ''}>STREAK {me.streak}/5</Tag>}
        <span aria-live="polite" className="min-w-0">
          {banner && <span className="font-black uppercase bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1 break-words inline-block">{banner}</span>}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel className={`min-w-0 ${flash ? 'bg-red-200 dark:bg-red-900' : ''}`}>
          <p className="font-black uppercase text-xs tracking-widest mb-2 break-words">
            Your queue {me?.queue.length ?? 0}/{cap} · {me?.points ?? 0} pts {me && !me.alive && '· 💀 OUT'}
          </p>
          <div className="flex flex-wrap gap-2 mb-3 min-h-16">
            {me?.queue.map((q, i) => {
              const match = buffer && q.word.startsWith(buffer);
              return (
                <span key={`${q.word}-${i}`} className={`font-mono px-2 py-1 border-2 ${
                  q.junk
                    ? 'border-red-500 border-dashed text-red-600 dark:text-red-400'
                    : 'border-black dark:border-yellow-400'
                } ${match ? 'bg-green-300 dark:bg-green-700 font-black' : ''}`}>
                  {match ? <><b>{buffer}</b>{q.word.slice(buffer.length)}</> : q.word}
                  {q.junk && q.from && <span className="text-[10px] block">from {q.from}</span>}
                </span>
              );
            })}
          </div>
          <label className="sr-only" htmlFor="wordwar-input">Type a word from your queue, then press space</label>
          <input
            id="wordwar-input"
            autoFocus
            value={buffer}
            disabled={!me?.alive}
            onChange={e => setBuffer(e.target.value.replace(/\s/g, ''))}
            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); submit(); } }}
            placeholder="type a word then space"
            className={`w-full ${brutal.border} bg-white dark:bg-black px-3 py-2 font-mono text-xl outline-none`}
          />
          <p className="font-mono text-[11px] font-bold mt-2 uppercase">5 clean words in a row launches junk at an opponent · junk words score double</p>
        </Panel>

        <div className="space-y-4">
          {opponents.map(p => (
            <Panel key={p.userId} className="min-w-0">
              <p className="font-black uppercase text-xs tracking-widest mb-2 break-words">
                {p.name} {p.queue.length}/{cap} · {p.points} pts · streak {p.streak} {!p.alive && '· 💀 OUT'}
              </p>
              <div className="h-3 border-2 border-black dark:border-yellow-400 overflow-hidden">
                <div
                  className={`h-full transition-all ${p.queue.length >= cap - 2 ? 'bg-red-500' : 'bg-black dark:bg-yellow-400'}`}
                  style={{ width: `${(p.queue.length / cap) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {p.queue.map((q, i) => (
                  <span key={i} className={`font-mono text-[10px] px-1 border ${q.junk ? 'border-red-500 border-dashed' : 'border-black/40 dark:border-yellow-400/40'}`}>
                    {q.word}
                  </span>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WordWarGame;
