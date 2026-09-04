import React, { useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '../types';
import { getSocket, sendGameEvent } from '../socket';
import { useTypingText } from '../useTypingText';
import { Panel, TypingText, ProgressLane, Countdown, useNow, Tag } from '../ui';
import { sfx } from '../../sound';

interface DuelPlayer { userId: string; name: string; rating: number | null }
interface Leg {
  leg: number;
  bestOf: number;
  legsToWin: number;
  text: string;
  startAt: number;
  timeoutAt: number;
  score: Record<string, number>;
  players: DuelPlayer[];
  rated: boolean;
}
interface LaneP { userId: string; name: string; pct: number; wpm: number; acc: number; done: boolean; connected: boolean }
interface LegEnd {
  leg: number;
  winner: { userId: string; name: string };
  scores: Record<string, { name: string; wpm: number; acc: number; chars: number }>;
  score: Record<string, number>;
  reason: 'finish' | 'timeout' | 'forfeit';
}

const DuelGame: React.FC<{ room: RoomSnapshot; myId: string }> = ({ myId }) => {
  const [leg, setLeg] = useState<Leg | null>(null);
  const [lanes, setLanes] = useState<LaneP[]>([]);
  const [score, setScore] = useState<Record<string, number>>({});
  const [banner, setBanner] = useState('');
  const [legEnd, setLegEnd] = useState<LegEnd | null>(null);
  const now = useNow(250);
  const lastTick = useRef(-1);

  useEffect(() => {
    const s = getSocket();
    const onLeg = (data: Leg) => { setLeg(data); setScore(data.score); setBanner(''); setLegEnd(null); lastTick.current = -1; };
    const onProgress = (data: { players: LaneP[]; score: Record<string, number> }) => { setLanes(data.players); setScore(data.score); };
    const onLegEnd = (data: LegEnd) => {
      setLegEnd(data);
      setScore(data.score);
      const mine = data.winner.userId === myId;
      if (data.reason === 'forfeit') setBanner(mine ? 'OPPONENT FORFEITS' : 'YOU FORFEITED');
      else if (data.reason === 'timeout') setBanner(mine ? `TIME — LEG ${data.leg} IS YOURS` : `TIME — ${data.winner.name} TAKES LEG ${data.leg}`);
      else setBanner(mine ? `LEG ${data.leg} — YOU TAKE IT` : `LEG ${data.leg} — ${data.winner.name} TAKES IT`);
      if (mine) sfx.success(); else sfx.lose();
    };
    s.on('duel:leg', onLeg);
    s.on('duel:progress', onProgress);
    s.on('duel:legend', onLegEnd);
    return () => {
      s.off('duel:leg', onLeg);
      s.off('duel:progress', onProgress);
      s.off('duel:legend', onLegEnd);
    };
  }, [myId]);

  // countdown ticks + the gun
  useEffect(() => {
    if (!leg) return;
    const left = Math.ceil((leg.startAt - now) / 1000);
    if (left > 0 && left <= 3 && left !== lastTick.current) { lastTick.current = left; sfx.countdown(); }
    if (left <= 0 && lastTick.current !== 0) { lastTick.current = 0; sfx.go(); }
  }, [now, leg]);

  const running = !!leg && now >= leg.startAt && !legEnd;
  const { pos, errors: typingErrors, handleKey } = useTypingText(leg?.text || '', {
    enabled: running,
    report: p => sendGameEvent('progress', p),
    onDone: ({ chars, errors }) => sendGameEvent('progress', { chars, errors, done: true }),
  });

  if (!leg) return <p className="text-center font-mono font-black animate-pulse mt-10">DRAWING SWORDS…</p>;

  const me = leg.players.find(p => p.userId === myId) || leg.players[0];
  const them = leg.players.find(p => p.userId !== myId) || leg.players[1];
  const myScore = score[me?.userId] ?? 0;
  const theirScore = score[them?.userId] ?? 0;
  const countdown = Math.ceil((leg.startAt - now) / 1000);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tag className="bg-red-300 text-lg">⚔️ LEG {leg.leg}/{leg.bestOf}</Tag>
        <Tag className={leg.rated ? 'bg-pink-300' : 'bg-gray-200 dark:bg-black'}>{leg.rated ? 'RATED' : 'FRIENDLY'}</Tag>
        <Tag>FIRST TO {leg.legsToWin}</Tag>
        {countdown > 0 && <span className="font-mono text-2xl font-black animate-pulse">GET READY… {countdown}</span>}
        {banner && <span className="font-black uppercase bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1">{banner}</span>}
      </div>

      <Panel className="py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="text-right">
            <p className="font-black uppercase text-lg truncate">{me?.name}<span className="text-xs ml-1 text-pink-600 dark:text-yellow-400">(you)</span></p>
            {me?.rating != null && <p className="font-mono text-xs font-bold">{me.rating} rating</p>}
          </div>
          <div className="font-mono font-black text-5xl md:text-6xl tracking-widest bg-black text-white dark:bg-yellow-400 dark:text-black px-4 py-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {myScore} – {theirScore}
          </div>
          <div className="text-left">
            <p className="font-black uppercase text-lg truncate">{them?.name || '…'}</p>
            {them?.rating != null && <p className="font-mono text-xs font-bold">{them.rating} rating</p>}
          </div>
        </div>
      </Panel>

      {legEnd ? (
        <Panel className="text-center py-6">
          <p className="text-2xl font-black uppercase mb-3">{banner}</p>
          <div className="flex justify-center gap-6 font-mono font-bold">
            {Object.entries(legEnd.scores).map(([id, s]) => (
              <span key={id} className={id === myId ? 'text-pink-600 dark:text-yellow-400' : ''}>
                {s.name}: {s.wpm} wpm · {s.acc}%
              </span>
            ))}
          </div>
          <p className="font-mono text-xs font-bold uppercase mt-3 animate-pulse">
            {Object.values(legEnd.score).some(n => n >= leg.legsToWin) || legEnd.reason === 'forfeit' ? 'Settling the duel…' : 'Next passage incoming…'}
          </p>
        </Panel>
      ) : (
        <TypingText text={leg.text} pos={pos} onKeyDown={handleKey} disabled={!running} shakeOn={typingErrors} />
      )}

      <Panel>
        <p className="font-black uppercase text-xs tracking-widest mb-3">Head to head</p>
        <div className="space-y-2">
          {(lanes.length ? lanes : leg.players.map(p => ({ userId: p.userId, name: p.name, pct: 0, wpm: 0, acc: 100, done: false, connected: true }))).map(l => (
            <ProgressLane
              key={l.userId}
              name={l.name + (!l.connected ? ' ⚠' : '')}
              pct={l.pct}
              right={`${l.wpm} wpm${l.done ? ' ✓' : ''}`}
              me={l.userId === myId}
              color={l.userId === myId ? 'bg-pink-500 dark:bg-yellow-400' : 'bg-black dark:bg-yellow-400/60'}
            />
          ))}
        </div>
      </Panel>
      {running && (
        <p className="font-mono text-xs font-bold uppercase">
          Leg timeout <Countdown until={leg.timeoutAt} />
        </p>
      )}
    </div>
  );
};

export default DuelGame;
