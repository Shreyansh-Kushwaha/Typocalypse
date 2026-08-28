import React, { useEffect, useState } from 'react';
import type { RoomSnapshot } from '../types';
import { getSocket, sendGameEvent } from '../socket';
import { Panel, Countdown, Tag, brutal } from '../ui';
import { sfx } from '../../sound';

interface TugTeams { teal: { userId: string; name: string }[]; crimson: { userId: string; name: string }[]; bestOf: number }
interface TugState { knot: number; teal: number; crimson: number; endsAt: number; wins: { teal: number; crimson: number }; pull: number }

const TugGame: React.FC<{ room: RoomSnapshot; myId: string }> = ({ myId }) => {
  const [teams, setTeams] = useState<TugTeams | null>(null);
  const [state, setState] = useState<TugState | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [buffer, setBuffer] = useState('');
  const [power, setPower] = useState<{ id: number; word: string } | null>(null);
  const [banner, setBanner] = useState('');
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const onTeams = (data: TugTeams) => setTeams(data);
    const onWords = (data: { words: string[] }) => setWords(prev => [...prev, ...data.words]);
    const onPull = (data: { pull: number }) => { setBanner(`🪢 PULL ${data.pull} — HEAVE`); setPower(null); };
    const onState = (data: TugState) => setState(data);
    const onPower = (data: { id: number; word: string }) => setPower(data);
    const onYank = (data: { by: string; team: string }) => { setPower(null); setBanner(`⚡ ${data.by} YANKED FOR ${data.team.toUpperCase()}`); sfx.combo(5); };
    const onPullWon = (data: { team: string }) => { setBanner(`🏁 ${data.team.toUpperCase()} TAKES THE PULL`); sfx.success(); };
    s.on('tug:teams', onTeams);
    s.on('tug:words', onWords);
    s.on('tug:pull', onPull);
    s.on('tug:state', onState);
    s.on('tug:power', onPower);
    s.on('tug:yank', onYank);
    s.on('tug:pullwon', onPullWon);
    return () => {
      s.off('tug:teams', onTeams);
      s.off('tug:words', onWords);
      s.off('tug:pull', onPull);
      s.off('tug:state', onState);
      s.off('tug:power', onPower);
      s.off('tug:yank', onYank);
      s.off('tug:pullwon', onPullWon);
    };
  }, []);

  const myTeam = teams?.teal.some(p => p.userId === myId) ? 'teal' : 'crimson';
  const current = words[idx] || '';

  const submit = () => {
    const typed = buffer.trim();
    setBuffer('');
    if (!typed) return;
    if (power && typed === power.word) {
      sendGameEvent('power', { id: power.id, word: typed });
      return;
    }
    if (typed === current) {
      sendGameEvent('word', { len: current.length });
      sfx.pop();
      setIdx(i => i + 1);
      if (words.length - idx < 8) sendGameEvent('need-words', {});
    } else {
      sendGameEvent('typo', {});
      sfx.error();
      setFlash(true);
      setTimeout(() => setFlash(false), 150);
    }
  };

  if (!teams) return <p className="text-center font-mono font-black animate-pulse mt-10">PICKING TEAMS…</p>;

  const knot = state?.knot ?? 0;
  const knotPct = ((knot + 100) / 200) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tag className="bg-purple-300 text-lg">🪢 PULL {state?.pull ?? 1}</Tag>
        <Tag className={myTeam === 'teal' ? 'bg-cyan-300' : 'bg-red-300'}>YOU ARE {myTeam.toUpperCase()}</Tag>
        <Tag>TEAL {state?.wins.teal ?? 0} — {state?.wins.crimson ?? 0} CRIMSON</Tag>
        {state && <Countdown until={state.endsAt} prefix="⏱ " />}
        {banner && <span className="font-mono text-sm font-bold">{banner}</span>}
      </div>

      <Panel>
        <div className="flex justify-between font-black uppercase text-sm mb-2">
          <span className="text-cyan-600 dark:text-cyan-400">◀ TEAL GOAL · pull {state?.teal ?? 0} wpm</span>
          <span className="text-red-600 dark:text-red-400">pull {state?.crimson ?? 0} wpm · CRIMSON GOAL ▶</span>
        </div>
        <div className="relative h-8 border-4 border-black dark:border-yellow-400 bg-gradient-to-r from-cyan-200 via-gray-100 to-red-200 dark:from-cyan-950 dark:via-black dark:to-red-950">
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-yellow-400 border-4 border-black transition-all duration-500"
            style={{ left: `${knotPct}%` }}
          />
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-black/30 dark:bg-yellow-400/30" />
        </div>
      </Panel>

      {power && (
        <div className={`${brutal.border} border-yellow-500 bg-yellow-100 dark:bg-yellow-950 p-3 animate-pulse font-black uppercase`}>
          ⚡ POWER WORD <span className="font-mono bg-black text-white px-2">{power.word}</span> — first team to type it gets a yank
        </div>
      )}

      <Panel className={flash ? 'bg-red-200 dark:bg-red-900' : ''}>
        <p className="font-black uppercase text-xs tracking-widest mb-2">Type then space — typos mute your pull for 2s</p>
        <p className="font-mono text-3xl font-black mb-3">
          <span className="bg-green-400 text-black">{current.startsWith(buffer) ? buffer : ''}</span>
          {current.startsWith(buffer) ? current.slice(buffer.length) : current}
          <span className="text-gray-400 text-xl ml-4">{words.slice(idx + 1, idx + 5).join(' ')}</span>
        </p>
        <input
          autoFocus
          value={buffer}
          onChange={e => setBuffer(e.target.value.replace(/\s/g, ''))}
          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); submit(); } }}
          className={`w-full ${brutal.border} bg-white dark:bg-black px-3 py-2 font-mono text-xl outline-none`}
          placeholder="heave"
        />
      </Panel>

      <div className="grid grid-cols-2 gap-4 font-mono text-sm">
        <Panel>
          <p className="font-black uppercase text-cyan-600 dark:text-cyan-400 mb-1">Team Teal</p>
          {teams.teal.map(p => <div key={p.userId}>{p.userId === myId ? '▸ ' : ''}{p.name}</div>)}
        </Panel>
        <Panel>
          <p className="font-black uppercase text-red-600 dark:text-red-400 mb-1">Team Crimson</p>
          {teams.crimson.map(p => <div key={p.userId}>{p.userId === myId ? '▸ ' : ''}{p.name}</div>)}
        </Panel>
      </div>
    </div>
  );
};

export default TugGame;
