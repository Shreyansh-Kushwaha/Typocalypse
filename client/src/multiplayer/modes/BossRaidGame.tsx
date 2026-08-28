import React, { useEffect, useState } from 'react';
import type { RoomSnapshot } from '../types';
import { getSocket, sendGameEvent } from '../socket';
import { useTypingText } from '../useTypingText';
import { Panel, TypingText, Countdown, useNow, Tag, brutal } from '../ui';
import { sfx } from '../../sound';

interface RaidState {
  bossHP: number; bossMax: number; teamHP: number; enraged: boolean;
  casting: { word: string; endsAt: number } | null;
  players: { userId: string; name: string; damage: number; combo: number }[];
}

const BossRaidGame: React.FC<{ room: RoomSnapshot; myId: string }> = ({ myId }) => {
  const [boss, setBoss] = useState('');
  const [state, setState] = useState<RaidState | null>(null);
  const [sentence, setSentence] = useState('');
  const [curse, setCurse] = useState<{ curse: string; until: number } | null>(null);
  const [banner, setBanner] = useState('');
  const [counterBuf, setCounterBuf] = useState('');
  const now = useNow(250);

  useEffect(() => {
    const s = getSocket();
    const onStart = (data: { boss: string }) => setBoss(data.boss);
    const onSentence = (data: { text: string }) => setSentence(data.text);
    const onState = (data: RaidState) => setState(data);
    const onCast = () => sfx.alarm();
    const onCurse = (data: { curse: string; until: number }) => {
      setCurse(data);
      sfx.alarm();
      setBanner(`🩸 CAST LANDED — ${data.curse.toUpperCase()} CURSE`);
    };
    const onInterrupted = (data: { by: string; bonus: number }) => { setBanner(`⚡ ${data.by} INTERRUPTED THE CAST +${data.bonus}`); sfx.success(); };
    const onEnrage = () => { setBanner('🔥 THE BOSS IS ENRAGED — DOUBLE DAMAGE, FASTER CASTS'); sfx.alarm(); };
    s.on('raid:start', onStart);
    s.on('raid:cast', onCast);
    s.on('raid:sentence', onSentence);
    s.on('raid:state', onState);
    s.on('raid:curse', onCurse);
    s.on('raid:interrupted', onInterrupted);
    s.on('raid:enrage', onEnrage);
    return () => {
      s.off('raid:start', onStart);
      s.off('raid:cast', onCast);
      s.off('raid:sentence', onSentence);
      s.off('raid:state', onState);
      s.off('raid:curse', onCurse);
      s.off('raid:interrupted', onInterrupted);
      s.off('raid:enrage', onEnrage);
    };
  }, []);

  const { pos, handleKey } = useTypingText(sentence, {
    enabled: !!sentence,
    onDone: stats => sendGameEvent('sentence', stats),
  });

  if (!state) return <p className="text-center font-mono font-black animate-pulse mt-10">THE {boss || 'BOSS'} STIRS…</p>;

  const cursed = curse && now < curse.until ? curse.curse : null;
  const curseClass =
    cursed === 'blur' ? 'blur-[2px]' :
    cursed === 'mirror' ? '[transform:scaleX(-1)]' :
    cursed === 'vanish' ? 'opacity-30 animate-pulse' : '';
  const me = state.players.find(p => p.userId === myId);
  const bossPct = (state.bossHP / state.bossMax) * 100;

  const submitCounter = () => {
    if (state.casting && counterBuf.trim() === state.casting.word) {
      sendGameEvent('interrupt', { word: counterBuf.trim() });
    }
    setCounterBuf('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tag className="bg-red-300 text-lg">☠️ {boss}</Tag>
        {state.enraged && <Tag className="bg-red-500 text-white animate-pulse">ENRAGED</Tag>}
        {me && <Tag className={me.combo > 0 ? 'bg-yellow-300' : ''}>COMBO ×{(1 + me.combo * 0.25).toFixed(2)}</Tag>}
        {banner && <span className="font-mono text-sm font-bold">{banner}</span>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="font-black uppercase text-sm w-24">Boss HP</span>
          <div className="flex-1 h-6 border-4 border-black dark:border-yellow-400 overflow-hidden bg-gray-200 dark:bg-black">
            <div className={`h-full transition-all ${state.enraged ? 'bg-red-600' : 'bg-red-400'}`} style={{ width: `${bossPct}%` }} />
          </div>
          <span className="font-mono font-black w-16 text-right">{Math.round(bossPct)}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-black uppercase text-sm w-24">Team HP</span>
          <div className="flex-1 h-4 border-4 border-black dark:border-yellow-400 overflow-hidden bg-gray-200 dark:bg-black">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${state.teamHP}%` }} />
          </div>
          <span className="font-mono font-black w-16 text-right">{state.teamHP}</span>
        </div>
      </div>

      {state.casting && (
        <div className={`${brutal.border} border-red-600 bg-red-100 dark:bg-red-950 p-4 animate-pulse`}>
          <p className="font-black uppercase mb-2">
            ⚠ CASTING — type the counter-spell <span className="bg-black text-white px-2 font-mono">{state.casting.word}</span> and press enter · <Countdown until={state.casting.endsAt} />
          </p>
          <input
            value={counterBuf}
            onChange={e => setCounterBuf(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitCounter(); }}
            placeholder="counter-spell"
            className="border-4 border-red-600 bg-white dark:bg-black px-3 py-1 font-mono text-lg outline-none"
          />
          <span className="font-mono text-xs font-bold ml-3 uppercase">interrupting drops your sentence focus — someone take it</span>
        </div>
      )}

      <div className={curseClass}>
        <p className="font-black uppercase text-xs tracking-widest mb-1">Your damage sentence {cursed && `— ${cursed.toUpperCase()} CURSED`}</p>
        <TypingText text={sentence} pos={pos} onKeyDown={handleKey} />
      </div>

      <Panel>
        <p className="font-black uppercase text-xs tracking-widest mb-2">Damage meters</p>
        {state.players.sort((a, b) => b.damage - a.damage).map(p => (
          <div key={p.userId} className="flex justify-between font-mono text-sm border-b border-black/10 dark:border-yellow-400/10 py-0.5">
            <span className={p.userId === myId ? 'font-black text-pink-600 dark:text-yellow-400' : 'font-bold'}>
              {p.userId === myId ? '▸ ' : ''}{p.name}
            </span>
            <span>{p.damage} dmg · ×{(1 + p.combo * 0.25).toFixed(2)}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
};

export default BossRaidGame;
