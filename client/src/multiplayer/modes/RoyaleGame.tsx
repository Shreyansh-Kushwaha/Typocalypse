import React, { useEffect, useState } from 'react';
import type { RoomSnapshot } from '../types';
import { getSocket, sendGameEvent } from '../socket';
import { useTypingText } from '../useTypingText';
import { Panel, Btn, TypingText, ProgressLane, Countdown, useNow, Tag } from '../ui';
import { sfx } from '../../sound';

interface Round { round: number; text: string; startAt: number; endsAt: number; alive: string[]; nextTimerMs: number }
interface Standing { userId: string; name: string; wpm: number; acc: number }

const RoyaleGame: React.FC<{ room: RoomSnapshot; myId: string }> = ({ myId }) => {
  const [round, setRound] = useState<Round | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [banner, setBanner] = useState('');
  const [myBet, setMyBet] = useState<string | null>(null);
  const now = useNow(250);

  useEffect(() => {
    const s = getSocket();
    const onRound = (data: Round) => { setRound(data); setBanner(''); setMyBet(null); };
    const onStandings = (data: { standings: Standing[]; remaining: number }) => {
      setStandings(data.standings);
      setRemaining(data.remaining);
    };
    const onElim = (data: { round: number; name: string; userId: string }) => {
      setBanner(data.userId === myId ? 'YOU HAVE BEEN ELIMINATED' : `${data.name} IS OUT`);
      if (data.userId === myId) sfx.lose(); else sfx.alarm();
    };
    s.on('royale:round', onRound);
    s.on('royale:standings', onStandings);
    s.on('royale:eliminated', onElim);
    return () => {
      s.off('royale:round', onRound);
      s.off('royale:standings', onStandings);
      s.off('royale:eliminated', onElim);
    };
  }, [myId]);

  const alive = !!round?.alive.includes(myId);
  const running = !!round && now >= round.startAt && now < round.endsAt && alive;
  const { pos, errors: typingErrors, handleKey } = useTypingText(round?.text || '', {
    enabled: running,
    report: p => sendGameEvent('progress', p),
  });

  if (!round) return <p className="text-center font-mono font-black animate-pulse mt-10">ENTERING THE ARENA…</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tag className="bg-red-300 text-lg">👑 ROUND {round.round}</Tag>
        <Tag>{remaining} LEFT</Tag>
        <span className="font-mono text-xl font-black">
          {now < round.startAt ? `GO IN ${Math.ceil((round.startAt - now) / 1000)}` : <Countdown until={round.endsAt} prefix="⏱ " />}
        </span>
        {banner && <span className="font-black uppercase bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1 animate-pulse">{banner}</span>}
      </div>

      {alive ? (
        <TypingText text={round.text} pos={pos} onKeyDown={handleKey} disabled={!running} shakeOn={typingErrors} />
      ) : (
        <Panel>
          <p className="font-black uppercase mb-2">👻 Spectating — bet on who survives this round (+10 pts)</p>
          <div className="flex flex-wrap gap-2">
            {standings.map(p => (
              <Btn
                key={p.userId}
                color={myBet === p.userId ? 'bg-yellow-300' : 'bg-white'}
                className="text-xs"
                onClick={() => { setMyBet(p.userId); sendGameEvent('bet', { targetId: p.userId }); }}
              >
                {myBet === p.userId ? '● ' : ''}{p.name}
              </Btn>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <p className="font-black uppercase text-xs tracking-widest mb-3">Live standings — slowest gets cut</p>
        <div className="space-y-2">
          {standings.map((p, i) => (
            <ProgressLane
              key={p.userId}
              name={p.name}
              pct={standings.length > 1 ? 100 - (i / (standings.length - 1)) * 70 : 100}
              right={`${p.wpm} wpm · ${p.acc}%`}
              me={p.userId === myId}
              color={i === standings.length - 1 ? 'bg-red-500' : 'bg-black dark:bg-yellow-400'}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
};

export default RoyaleGame;
