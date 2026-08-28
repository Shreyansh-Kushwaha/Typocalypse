import React, { useEffect, useState } from 'react';
import type { RoomSnapshot } from '../types';
import { getSocket, sendGameEvent } from '../socket';
import { useTypingText } from '../useTypingText';
import { Panel, Btn, TypingText, ProgressLane, Countdown, useNow, Tag } from '../ui';

interface Leg { leg: number; totalLegs: number; text: string; startAt: number }
interface LaneP { userId: string; name: string; pct: number; wpm: number; done: boolean }

const SprintGame: React.FC<{ room: RoomSnapshot; myId: string }> = ({ myId }) => {
  const [leg, setLeg] = useState<Leg | null>(null);
  const [lanes, setLanes] = useState<LaneP[]>([]);
  const [banner, setBanner] = useState('');
  const [choosing, setChoosing] = useState<{ chooser: string; choices: string[] } | null>(null);
  const now = useNow(250);

  useEffect(() => {
    const s = getSocket();
    const onLeg = (data: Leg) => { setLeg(data); setBanner(''); setChoosing(null); };
    const onProgress = (data: { players: LaneP[] }) => setLanes(data.players);
    const onLegEnd = (data: { leg: number; winner: { name: string } }) =>
      setBanner(`LEG ${data.leg} — ${data.winner.name} TAKES IT`);
    const onChoosing = (data: { chooser: string; choices: string[] }) => setChoosing(data);
    const onChosen = (data: { chooser: string; choice: string }) => {
      setChoosing(null);
      setBanner(`${data.chooser} chose “${data.choice}”`);
    };
    s.on('sprint:leg', onLeg);
    s.on('sprint:progress', onProgress);
    s.on('sprint:legend', onLegEnd);
    s.on('sprint:choosing', onChoosing);
    s.on('sprint:chosen', onChosen);
    return () => {
      s.off('sprint:leg', onLeg);
      s.off('sprint:progress', onProgress);
      s.off('sprint:legend', onLegEnd);
      s.off('sprint:choosing', onChoosing);
      s.off('sprint:chosen', onChosen);
    };
  }, []);

  const running = !!leg && now >= leg.startAt && !banner && !choosing;
  const { pos, handleKey } = useTypingText(leg?.text || '', {
    enabled: running,
    report: p => sendGameEvent('progress', p),
    onDone: () => sendGameEvent('progress', { chars: leg?.text.length || 0, errors: 0, done: true }),
  });

  if (!leg) return <p className="text-center font-mono font-black animate-pulse mt-10">LOADING RACE…</p>;

  const me = lanes.find(l => l.userId === myId);
  const iChoose = choosing && me && choosing.chooser === me.name;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tag className="bg-red-300 text-lg">🏁 LEG {leg.leg}/{leg.totalLegs}</Tag>
        {now < leg.startAt && <span className="font-mono text-2xl font-black animate-pulse">GET READY… {Math.ceil((leg.startAt - now) / 1000)}</span>}
        {banner && <span className="font-black uppercase bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1">{banner}</span>}
      </div>

      {choosing ? (
        <Panel className="text-center py-8">
          <p className="text-2xl font-black uppercase mb-4">
            {iChoose ? 'You won the leg — steer the story' : `${choosing.chooser} is choosing the path…`}
          </p>
          {iChoose && (
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              {choosing.choices.map(c => (
                <Btn key={c} color="bg-green-300" className="text-lg" onClick={() => sendGameEvent('choice', { choice: c })}>
                  {c}
                </Btn>
              ))}
            </div>
          )}
        </Panel>
      ) : (
        <TypingText text={leg.text} pos={pos} onKeyDown={handleKey} disabled={!running} />
      )}

      <Panel>
        <p className="font-black uppercase text-xs tracking-widest mb-3">The field</p>
        <div className="space-y-2">
          {lanes.map(l => (
            <ProgressLane
              key={l.userId}
              name={l.name}
              pct={l.pct}
              right={`${l.wpm} wpm${l.done ? ' ✓' : ''}`}
              me={l.userId === myId}
            />
          ))}
        </div>
      </Panel>
      {leg && now < leg.startAt + 123000 && running && (
        <p className="font-mono text-xs font-bold uppercase">
          Leg timeout <Countdown until={leg.startAt + 120000} />
        </p>
      )}
    </div>
  );
};

export default SprintGame;
