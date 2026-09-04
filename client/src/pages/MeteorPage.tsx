import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Panel, Btn, Tag, brutal } from '../multiplayer/ui';
import { sfx } from '../sound';
import { copyText } from '../share';
import { ArcadeShell, HowTo, Stat, Ladder } from '../arcade/ui';
import type { LadderRow } from '../arcade/ui';
import { BOSS_WORDS, REPAIR_WORDS, SLOW_WORDS, wordsOfLength } from '../arcade/words';

// Meteor Shower - words fall on the bunker, type them out of the sky.
// The whole simulation lives in a ref and is stepped by requestAnimationFrame;
// React only re-renders once per frame to paint positions.

type Kind = 'normal' | 'gold' | 'repair' | 'slow' | 'boss';
interface Meteor { id: number; text: string; x: number; y: number; speed: number; kind: Kind }
interface Popup { id: number; text: string; x: number; y: number; until: number; color: string }
interface Sim {
  meteors: Meteor[];
  popups: Popup[];
  nextId: number;
  hp: number;
  score: number;
  kills: number;
  streak: number;
  maxCombo: number;
  wave: number;
  elapsed: number;      // seconds of simulated play
  lastSpawn: number;
  slowUntil: number;
  slowDueWave: number;  // spawn one slow-mo word per wave
  target: number | null;
  buffer: string;
  running: boolean;
  paused: boolean;
  lastTs: number;
  flash: { kind: 'hit' | 'miss'; until: number } | null;
  banner: { text: string; until: number } | null;
}
interface Result { score: number; wave: number; kills: number; durationMs: number; maxCombo: number }
interface ServerResult { best: number; isNewBest: boolean; rank: number; players: number }

const WAVE_SECONDS = 15;
const LAND_Y = 90;       // % of the field where the bunker roof starts
const START_HP = 100;
const BEST_KEY = 'typo-meteor-best';

const comboMult = (streak: number) => Math.min(5, 1 + Math.floor(streak / 4));

function waveParams(wave: number) {
  const fallSeconds = Math.max(4.5, 14 * Math.pow(0.92, wave - 1));
  const maxWords = Math.min(10, 2 + Math.floor(wave * 0.8));
  const spawnSeconds = Math.max(0.65, 2.4 * Math.pow(0.9, wave - 1));
  const minLen = Math.min(3 + Math.floor((wave - 1) / 2), 7);
  const maxLen = Math.min(minLen + 3, 9);
  return { fallSeconds, maxWords, spawnSeconds, minLen, maxLen };
}

function freshSim(): Sim {
  return {
    meteors: [], popups: [], nextId: 1, hp: START_HP, score: 0, kills: 0, streak: 0, maxCombo: 1,
    wave: 1, elapsed: 0, lastSpawn: -10, slowUntil: 0, slowDueWave: 1, target: null, buffer: '',
    running: false, paused: false, lastTs: 0, flash: null, banner: { text: '☄️ WAVE 1', until: 2 },
  };
}

function readLocalBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function shareLine(r: Result): string {
  const blocks = '▓'.repeat(Math.max(1, r.maxCombo)).padEnd(5, '░');
  return `☄️ Meteor Shower · ${r.score.toLocaleString()} pts · wave ${r.wave} · ${r.kills} kills · combo ${blocks} x${r.maxCombo}\n${window.location.origin}/arcade/meteor`;
}

const KIND_STYLE: Record<Kind, string> = {
  normal: 'border-black dark:border-yellow-400 bg-white dark:bg-black',
  gold: 'border-yellow-500 bg-yellow-300 dark:bg-yellow-400 dark:text-black',
  repair: 'border-green-600 bg-green-300 dark:bg-green-400 dark:text-black',
  slow: 'border-cyan-600 bg-cyan-300 dark:bg-cyan-400 dark:text-black',
  boss: 'border-purple-700 bg-purple-300 dark:bg-purple-400 dark:text-black text-lg md:text-xl',
};
const KIND_ICON: Record<Kind, string> = { normal: '☄️', gold: '⭐', repair: '🔧', slow: '🐌', boss: '💀' };

function spawn(s: Sim) {
  const p = waveParams(s.wave);
  let kind: Kind = 'normal';
  if (s.slowDueWave <= s.wave && s.elapsed - (s.wave - 1) * WAVE_SECONDS > 3) {
    kind = 'slow';
    s.slowDueWave = s.wave + 1;
  } else {
    const r = Math.random();
    if (r < 0.06 && s.hp < START_HP) kind = 'repair';
    else if (r < 0.15) kind = 'gold';
    else if (s.wave >= 3 && r < 0.23) kind = 'boss';
  }
  const bank = kind === 'boss' ? BOSS_WORDS : kind === 'repair' ? REPAIR_WORDS : kind === 'slow' ? SLOW_WORDS : wordsOfLength(p.minLen, p.maxLen);
  let text = bank[Math.floor(Math.random() * bank.length)];
  for (let tries = 0; tries < 8; tries++) {
    const clash = s.meteors.some(m => m.text === text || m.text[0] === text[0]);
    if (!clash) break;
    text = bank[Math.floor(Math.random() * bank.length)];
  }
  let x = 8 + Math.random() * 84;
  for (let tries = 0; tries < 6; tries++) {
    if (!s.meteors.some(m => m.y < 18 && Math.abs(m.x - x) < 14)) break;
    x = 8 + Math.random() * 84;
  }
  const speed = (LAND_Y / p.fallSeconds) * (0.85 + Math.random() * 0.3) * (kind === 'boss' ? 0.8 : 1);
  s.meteors.push({ id: s.nextId++, text, x, y: -6, speed, kind });
  s.lastSpawn = s.elapsed;
}

function kill(s: Sim, t: Meteor) {
  s.meteors = s.meteors.filter(m => m.id !== t.id);
  s.kills += 1;
  s.streak += 1;
  const mult = comboMult(s.streak);
  s.maxCombo = Math.max(s.maxCombo, mult);
  const kindMult = t.kind === 'gold' || t.kind === 'boss' ? 2 : 1;
  const pts = t.text.length * 10 * mult * kindMult;
  s.score += pts;
  let label = `+${pts}`;
  let color = 'text-black dark:text-yellow-400';
  if (t.kind === 'repair') { s.hp = Math.min(START_HP, s.hp + 10); label = `+${pts} · +10 HP`; color = 'text-green-700 dark:text-green-400'; }
  if (t.kind === 'slow') { s.slowUntil = s.elapsed + 5; label = `+${pts} · SLOW-MO`; color = 'text-cyan-700 dark:text-cyan-400'; }
  if (t.kind === 'gold') color = 'text-yellow-700 dark:text-yellow-300';
  if (t.kind === 'boss') color = 'text-purple-700 dark:text-purple-300';
  s.popups.push({ id: s.nextId++, text: label, x: t.x, y: t.y, until: s.elapsed + 0.9, color });
  s.target = null;
  s.buffer = '';
  sfx.pop();
  if (mult > 1 && s.streak % 4 === 0) sfx.combo(mult);
}

const MeteorPage: React.FC = () => {
  const navigate = useNavigate();
  const sim = useRef<Sim>(freshSim());
  const fieldRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [, setFrame] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'playing' | 'over'>('intro');
  const [result, setResult] = useState<Result | null>(null);
  const [server, setServer] = useState<ServerResult | null>(null);
  const [serverBest, setServerBest] = useState<{ score: number; rank: number } | null>(null);
  const [localBest, setLocalBest] = useState(readLocalBest);
  const [ladder, setLadder] = useState<LadderRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const loadLadder = useCallback(() => {
    axios.get('/arcade/leaderboard', { params: { game: 'meteor' } }).then(res => setLadder(res.data.rows)).catch(() => {});
  }, []);

  useEffect(() => {
    document.title = 'Meteor Shower — Typocalypse';
    return () => { document.title = 'Typocalypse — survive the typing apocalypse'; };
  }, []);

  useEffect(() => {
    loadLadder();
    axios.get('/arcade/me').then(res => {
      const m = res.data?.bests?.meteor;
      if (m) setServerBest({ score: m.score, rank: m.rank });
    }).catch(() => {});
  }, [loadLadder]);

  const gameOver = useCallback((s: Sim) => {
    s.running = false;
    s.paused = false;
    s.hp = 0;
    cancelAnimationFrame(rafRef.current);
    sfx.lose();
    const r: Result = { score: s.score, wave: s.wave, kills: s.kills, durationMs: Math.round(s.elapsed * 1000), maxCombo: s.maxCombo };
    setResult(r);
    setServer(null);
    setCopied(false);
    setError('');
    setPhase('over');
    const prev = readLocalBest();
    if (r.score > prev) {
      try { localStorage.setItem(BEST_KEY, String(r.score)); } catch { /* private mode */ }
      setLocalBest(r.score);
    }
    axios.post('/arcade/score', { game: 'meteor', score: r.score, wave: r.wave, kills: r.kills, durationMs: r.durationMs })
      .then(res => {
        setServer({ best: res.data.best.score, isNewBest: res.data.isNewBest, rank: res.data.rank, players: res.data.players });
        setServerBest({ score: res.data.best.score, rank: res.data.rank });
        loadLadder();
      })
      .catch(err => setError(err?.response?.data?.error || 'Could not save your run'));
  }, [loadLadder]);

  const tick = useCallback((ts: number) => {
    const s = sim.current;
    if (!s.running) return;
    const dt = s.lastTs ? Math.min(0.1, (ts - s.lastTs) / 1000) : 0;
    s.lastTs = ts;
    if (!s.paused) {
      s.elapsed += dt;
      const wave = Math.floor(s.elapsed / WAVE_SECONDS) + 1;
      if (wave !== s.wave) {
        s.wave = wave;
        s.banner = { text: `☄️ WAVE ${wave}`, until: s.elapsed + 2 };
        sfx.go();
      }
      const slow = s.slowUntil > s.elapsed ? 0.4 : 1;
      for (const m of s.meteors) m.y += m.speed * slow * dt;
      const landed = s.meteors.filter(m => m.y >= LAND_Y);
      if (landed.length) {
        for (const m of landed) {
          s.hp -= m.text.length;
          s.popups.push({ id: s.nextId++, text: `−${m.text.length} HP`, x: m.x, y: LAND_Y - 8, until: s.elapsed + 1, color: 'text-red-600 dark:text-red-400' });
          if (s.target === m.id) { s.target = null; s.buffer = ''; }
        }
        s.meteors = s.meteors.filter(m => m.y < LAND_Y);
        s.streak = 0;
        s.flash = { kind: 'hit', until: s.elapsed + 0.35 };
        sfx.alarm();
        if (s.hp <= 0) { gameOver(s); return; }
      }
      const p = waveParams(s.wave);
      if (s.meteors.length < p.maxWords && s.elapsed - s.lastSpawn >= p.spawnSeconds) spawn(s);
      s.popups = s.popups.filter(pp => pp.until > s.elapsed);
      if (s.flash && s.flash.until < s.elapsed) s.flash = null;
      if (s.banner && s.banner.until < s.elapsed) s.banner = null;
    }
    setFrame(f => f + 1);
    rafRef.current = requestAnimationFrame(tick);
  }, [gameOver]);

  const start = () => {
    cancelAnimationFrame(rafRef.current);
    sim.current = freshSim();
    sim.current.running = true;
    setResult(null);
    setServer(null);
    setPhase('playing');
    sfx.go();
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // focus the field whenever a run starts; pause on blur, resume on click
  useEffect(() => {
    if (phase === 'playing') fieldRef.current?.focus();
  }, [phase]);
  useEffect(() => {
    const onBlur = () => {
      const s = sim.current;
      if (s.running) { s.paused = true; setFrame(f => f + 1); }
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  const resume = () => {
    const s = sim.current;
    if (s.running && s.paused) { s.paused = false; s.lastTs = 0; }
    fieldRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    const s = sim.current;
    if (!s.running) return;
    if (s.paused) { resume(); return; }
    if (e.key === ' ') e.preventDefault();
    if (e.key === 'Escape') { s.target = null; s.buffer = ''; return; }
    if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    let target = s.meteors.find(m => m.id === s.target);
    if (!target) {
      // first keystroke locks onto the lowest word that starts with that letter
      target = s.meteors.filter(m => m.text.startsWith(k)).sort((a, b) => b.y - a.y)[0];
      if (!target) {
        s.flash = { kind: 'miss', until: s.elapsed + 0.2 };
        sfx.error();
        return;
      }
      s.target = target.id;
      s.buffer = k;
      sfx.key();
      if (target.text === k) kill(s, target);
      return;
    }
    const next = s.buffer + k;
    if (target.text.startsWith(next)) {
      s.buffer = next;
      sfx.key();
      if (target.text === next) kill(s, target);
    } else {
      s.buffer = '';
      s.streak = 0;
      s.flash = { kind: 'miss', until: s.elapsed + 0.25 };
      sfx.error();
    }
  };

  // ---- derived view values ----
  const s = sim.current;
  const mult = comboMult(s.streak);
  const minutes = s.elapsed / 60;
  const kpm = minutes > 0.05 ? Math.round(s.kills / minutes) : 0;
  const hpColor = s.hp > 60 ? 'bg-green-500' : s.hp > 30 ? 'bg-yellow-400' : 'bg-red-500';
  const timeStr = `${Math.floor(s.elapsed / 60)}:${String(Math.floor(s.elapsed % 60)).padStart(2, '0')}`;
  const slowActive = s.slowUntil > s.elapsed;

  return (
    <ArcadeShell title="Meteor" accent="Shower" onBack={() => navigate('/dashboard')} width="max-w-5xl">
      {phase === 'intro' && (
        <HowTo
          icon="☄️"
          headline="Words are falling on the bunker. Type them out of the sky."
          steps={[
            'Type the first letter of any word to lock on - it targets the lowest one that matches. Esc drops the target.',
            'A wrong letter clears what you typed so far and breaks your combo. Consecutive kills raise the multiplier up to x5.',
            'Every word that lands hits the bunker for its length in HP. At 0 HP the shower wins.',
            '⭐ gold words are worth double, 🔧 repair words heal 10 HP, 🐌 slow-mo words slow the whole sky, 💀 boss words are long and worth double.',
            'It never ends - every 15 seconds the wave gets faster, denser and longer. The window loses focus? The game pauses.',
          ]}
        >
          <div className="flex flex-wrap items-center gap-4">
            <Btn color="bg-orange-300" className="text-2xl px-10 py-4" onClick={start}>Man the bunker</Btn>
            {(serverBest || localBest > 0) && (
              <span className="font-mono text-sm font-bold">
                Your best: {Math.max(localBest, serverBest?.score || 0).toLocaleString()}
                {serverBest ? ` · rank #${serverBest.rank}` : ''}
              </span>
            )}
          </div>
        </HowTo>
      )}

      {phase !== 'intro' && (
        <>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <Stat label="Score" value={s.score.toLocaleString()} color="bg-orange-300" />
            <Stat label="Combo" value={<span className={mult >= 3 ? 'text-pink-600 dark:text-pink-400' : ''}>x{mult}</span>} color="bg-pink-300" />
            <Stat label="Wave" value={s.wave} color="bg-cyan-300" />
            <Stat label="Time" value={timeStr} />
            <Stat label="Kills" value={s.kills} />
            <Stat label="Kills / min" value={kpm} />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-black uppercase text-sm whitespace-nowrap">Bunker</span>
            <div className="flex-1 h-6 border-4 border-black dark:border-yellow-400 overflow-hidden bg-gray-200 dark:bg-black">
              <div className={`h-full ${hpColor} transition-all duration-150`} style={{ width: `${Math.max(0, s.hp)}%` }} />
            </div>
            <span className="font-mono font-black w-16 text-right">{Math.max(0, s.hp)}/{START_HP}</span>
          </div>
        </>
      )}

      {phase === 'playing' && (
        <div
          ref={fieldRef}
          tabIndex={0}
          onKeyDown={handleKey}
          onClick={resume}
          className={`relative w-full aspect-[16/10] min-h-[300px] max-h-[560px] bg-white dark:bg-black ${brutal.border} ${brutal.shadowSm} outline-none overflow-hidden select-none focus:shadow-[8px_8px_0px_0px_#ff007f] dark:focus:shadow-[8px_8px_0px_0px_#fff] ${
            s.flash?.kind === 'hit' ? 'bg-red-200 dark:bg-red-950' : s.flash?.kind === 'miss' ? 'animate-[typoshake_0.2s_linear]' : ''
          }`}
        >
          {/* combo, big */}
          <div className={`absolute top-2 right-3 font-black text-5xl md:text-7xl pointer-events-none transition-opacity ${mult > 1 ? 'opacity-30' : 'opacity-0'} ${mult >= 4 ? 'text-pink-600' : ''}`}>
            x{mult}
          </div>
          {slowActive && <div className="absolute top-2 left-3 font-black uppercase text-cyan-600 dark:text-cyan-400 animate-pulse pointer-events-none">🐌 slow-mo</div>}
          {s.banner && (
            <div className="absolute inset-x-0 top-1/3 text-center font-black text-3xl md:text-5xl uppercase pointer-events-none animate-pulse">{s.banner.text}</div>
          )}

          {s.meteors.map(m => {
            const mine = m.id === s.target;
            const typed = mine ? s.buffer.length : 0;
            const danger = m.y > LAND_Y - 20;
            return (
              <div
                key={m.id}
                className={`absolute font-mono text-sm md:text-base px-2 py-0.5 border-2 whitespace-nowrap ${KIND_STYLE[m.kind]} ${
                  mine ? 'ring-4 ring-pink-500 dark:ring-white z-10' : danger ? 'animate-pulse' : ''
                }`}
                style={{ top: `${m.y}%`, left: `${m.x}%`, transform: 'translateX(-50%)', willChange: 'top' }}
              >
                {KIND_ICON[m.kind]} <span className="bg-green-400 text-black font-black">{m.text.slice(0, typed)}</span>{m.text.slice(typed)}
              </div>
            );
          })}
          {s.popups.map(p => (
            <div
              key={p.id}
              className={`absolute font-mono font-black text-sm pointer-events-none ${p.color}`}
              style={{ top: `${p.y - 4}%`, left: `${p.x}%`, transform: 'translateX(-50%)', opacity: Math.max(0, (p.until - s.elapsed) / 0.9) }}
            >
              {p.text}
            </div>
          ))}

          <div className="absolute bottom-0 left-0 right-0 border-t-4 border-black dark:border-yellow-400 bg-[#f4f4f0] dark:bg-black text-center font-mono text-[10px] md:text-xs font-black py-1 uppercase" style={{ height: `${100 - LAND_Y}%` }}>
            ▙▄▄▄ Bunker — click here and type · esc drops your target ▄▄▄▟
          </div>

          {s.paused && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer">
              <div className="text-center text-white">
                <p className="text-4xl font-black uppercase">Paused</p>
                <p className="font-mono text-sm font-bold mt-2">click to resume</p>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'over' && result && (
        <Panel className="text-center py-8">
          <p className="text-4xl mb-2">💥</p>
          <p className="text-3xl font-black uppercase mb-1">The bunker fell on wave {result.wave}</p>
          <p className="font-mono font-black text-4xl mb-4" style={{ fontVariantNumeric: 'tabular-nums' }}>{result.score.toLocaleString()} pts</p>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <Tag>{result.kills} kills</Tag>
            <Tag>{Math.round(result.durationMs / 1000)}s survived</Tag>
            <Tag>max combo x{result.maxCombo}</Tag>
            <Tag className="bg-yellow-300 dark:bg-transparent">local best {Math.max(localBest, result.score).toLocaleString()}</Tag>
            {server && (
              <>
                <Tag className={server.isNewBest ? 'bg-green-300 dark:bg-transparent' : ''}>
                  {server.isNewBest ? '🏆 new server best' : `server best ${server.best.toLocaleString()}`}
                </Tag>
                <Tag className="bg-cyan-300 dark:bg-transparent">rank #{server.rank} of {server.players}</Tag>
              </>
            )}
          </div>
          {!server && !error && <p className="font-mono text-xs font-bold animate-pulse mb-2">saving to the ladder…</p>}
          {error && <p className="font-mono text-sm font-bold text-red-600 dark:text-red-400 mb-2">{error}</p>}
          <div className="flex gap-4 justify-center flex-wrap">
            <Btn color="bg-orange-300" className="text-xl px-8 py-3" onClick={start} autoFocus>Play again</Btn>
            <Btn color="bg-green-300" onClick={async () => setCopied(await copyText(shareLine(result)))}>
              {copied ? '✓ Copied' : '📋 Copy result'}
            </Btn>
          </div>
        </Panel>
      )}

      <Ladder rows={ladder} limit={10} />
    </ArcadeShell>
  );
};

export default MeteorPage;
