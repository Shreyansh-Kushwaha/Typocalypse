import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useTypingText } from '../multiplayer/useTypingText';
import { Panel, Btn, ProgressLane, Tag, useNow, brutal } from '../multiplayer/ui';
import { sfx } from '../sound';
import { copyGhostLink } from '../share';
import { useAuth } from '../contexts/AuthContext';

interface GhostData {
  id: string;
  username: string;
  text: string;
  times: number[];
  wpm: number;
  accuracy: number;
  genre: string;
  mine: boolean;
}

const GhostRacePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [ghost, setGhost] = useState<GhostData | null>(null);
  const [error, setError] = useState('');
  const [startAt, setStartAt] = useState(0);
  const [result, setResult] = useState<{ won: boolean; myMs: number; ghostMs: number; wpm: number } | null>(null);
  const savedRef = useRef(false);
  const now = useNow(100);

  useEffect(() => {
    axios.get(`/ghosts/${id}`)
      .then(res => { setGhost(res.data); setStartAt(Date.now() + 3500); })
      .catch(() => setError('Ghost not found'));
  }, [id]);

  const started = !!ghost && now >= startAt;
  const elapsed = started ? now - startAt : 0;
  const ghostMs = ghost ? ghost.times[ghost.times.length - 1] : 0;

  const typing = useTypingText(ghost?.text || '', {
    enabled: started && !result,
    resetKey: startAt,
    onDone: ({ chars, errors }) => {
      if (!ghost || savedRef.current) return;
      savedRef.current = true;
      const myMs = Date.now() - startAt;
      const wpm = Math.min(300, Math.round((chars / 5) / (myMs / 60000)));
      const acc = Math.round((chars / (chars + errors)) * 100);
      const won = myMs < ghostMs;
      setResult({ won, myMs, ghostMs, wpm });
      if (won) sfx.win(); else sfx.lose();
      axios.post('/stats/session', {
        context: 'ghost', mode: ghost.genre, wpm, accuracy: acc,
        errors, totalTyped: chars + errors, durationMs: myMs, keyStats: {},
        won, localHour: new Date().getHours(),
      }).catch(() => {});
    },
  });

  // countdown beeps
  const lastBeep = useRef(0);
  useEffect(() => {
    if (!ghost || started) return;
    const secLeft = Math.ceil((startAt - now) / 1000);
    if (secLeft !== lastBeep.current && secLeft <= 3 && secLeft > 0) {
      lastBeep.current = secLeft;
      sfx.countdown();
    }
    if (secLeft <= 0 && lastBeep.current !== -1) {
      lastBeep.current = -1;
      sfx.go();
    }
  }, [now, ghost, started, startAt]);

  if (error) {
    return (
      <Shell onBack={() => navigate('/dashboard')}>
        <Panel className="max-w-md mx-auto mt-20 text-center">
          <p className="text-xl font-black uppercase mb-4">{error}</p>
          <Btn onClick={() => navigate('/dashboard')}>Back</Btn>
        </Panel>
      </Shell>
    );
  }
  if (!ghost) {
    return <Shell onBack={() => navigate('/dashboard')}><p className="text-center mt-20 font-mono font-black animate-pulse">SUMMONING GHOST…</p></Shell>;
  }

  // ghost position: how many chars the recording had landed by `elapsed`
  let ghostPos = 0;
  if (started) {
    while (ghostPos < ghost.times.length && ghost.times[ghostPos] <= elapsed) ghostPos++;
  }
  if (result) ghostPos = ghost.times.length;
  const myPct = Math.round((typing.pos / ghost.text.length) * 100);
  const ghostPct = Math.round((ghostPos / ghost.text.length) * 100);
  const liveWpm = started && elapsed > 1000 ? Math.min(300, Math.round((typing.pos / 5) / (elapsed / 60000))) : 0;

  const rematch = () => {
    savedRef.current = false;
    setResult(null);
    setStartAt(Date.now() + 3500);
    lastBeep.current = 0;
    // remount the typing hook by re-fetching is overkill - text unchanged, reset via key
    setGhost({ ...ghost });
  };

  return (
    <Shell onBack={() => navigate('/dashboard')}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tag className="bg-purple-300 text-lg">👻 GHOST RACE</Tag>
          <Tag>vs {ghost.username}{ghost.mine ? ' (your past self)' : ''} · {ghost.wpm} WPM</Tag>
          {!started && <span className="font-mono text-2xl font-black animate-pulse">GO IN {Math.max(0, Math.ceil((startAt - now) / 1000))}…</span>}
        </div>

        {result ? (
          <Panel className="text-center py-10">
            <p className="text-5xl mb-3">{result.won ? '🏆' : '👻'}</p>
            <p className="text-3xl font-black uppercase mb-2">
              {result.won ? 'You beat the ghost' : 'The ghost got you'}
            </p>
            <p className="font-mono font-bold text-lg" style={{ fontVariantNumeric: 'tabular-nums' }}>
              you {(result.myMs / 1000).toFixed(1)}s · {result.wpm} WPM — ghost {(result.ghostMs / 1000).toFixed(1)}s · {ghost.wpm} WPM
            </p>
            <div className="flex gap-4 justify-center mt-6 flex-wrap">
              <Btn color="bg-green-300" onClick={rematch}>Rematch</Btn>
              <Btn color="bg-purple-300" onClick={async () => setCopied(await copyGhostLink(ghost.id))}>
                {copied ? '✓ Copied' : '🔗 Challenge someone else'}
              </Btn>
              <Btn onClick={() => navigate('/dashboard')}>Done</Btn>
            </div>
            {user?.isGuest && (
              <p className="font-mono text-sm font-bold mt-6">
                Playing as <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-1">{user.username}</span> —{' '}
                <button className="underline font-black" onClick={() => navigate('/claim')}>claim your account</button> to keep this run
              </p>
            )}
          </Panel>
        ) : (
          <RaceText
            key={startAt /* remounts per race so the hook resets */}
            text={ghost.text}
            myPos={typing.pos}
            ghostPos={ghostPos}
            onKeyDown={typing.handleKey}
            shakeOn={typing.errors}
          />
        )}

        <Panel>
          <div className="space-y-2">
            <ProgressLane name="you" pct={myPct} right={`${liveWpm} wpm`} me />
            <ProgressLane name={`👻 ${ghost.username}`} pct={ghostPct} right={`${ghost.wpm} wpm`} color="bg-purple-500" />
          </div>
        </Panel>
        <p className="font-mono text-xs font-bold uppercase text-gray-500 dark:text-yellow-400/60">
          The purple marker is the ghost's live position, replayed keystroke for keystroke.
        </p>
      </div>
    </Shell>
  );
};

const RaceText: React.FC<{
  text: string;
  myPos: number;
  ghostPos: number;
  onKeyDown: (e: React.KeyboardEvent) => void;
  shakeOn?: number;
}> = ({ text, myPos, ghostPos, onKeyDown, shakeOn }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shaking, setShaking] = useState(false);
  const lastShake = useRef(shakeOn ?? 0);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    if (shakeOn !== undefined && shakeOn !== lastShake.current) {
      lastShake.current = shakeOn;
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 200);
      return () => clearTimeout(t);
    }
  }, [shakeOn]);
  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={`font-mono text-lg md:text-xl leading-relaxed outline-none select-none p-6 bg-white dark:bg-black ${brutal.border} ${shaking ? 'animate-[typoshake_0.2s_linear]' : ''} focus:shadow-[8px_8px_0px_0px_#ff007f] dark:focus:shadow-[8px_8px_0px_0px_#fff]`}
    >
      {text.split('').map((ch, i) => (
        <span
          key={i}
          className={[
            i < myPos ? 'text-black dark:text-black bg-green-400 font-bold' : '',
            i === myPos ? 'bg-pink-500 text-white dark:bg-yellow-400 dark:text-black animate-pulse font-bold' : '',
            i > myPos ? 'text-gray-400 dark:text-yellow-400/40' : '',
            i === ghostPos ? 'border-b-4 border-purple-500' : '',
          ].join(' ')}
        >
          {ch}
        </span>
      ))}
    </div>
  );
};

const Shell: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-tighter">
          Ghost <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Race</span>
        </h1>
        <Btn color="bg-red-400" onClick={onBack}>Leave</Btn>
      </div>
    </header>
    <main className="p-6 relative z-10">{children}</main>
  </div>
);

export default GhostRacePage;
