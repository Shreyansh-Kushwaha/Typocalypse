import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Panel, Btn, Tag } from '../multiplayer/ui';
import { useTypingText } from '../multiplayer/useTypingText';
import { sfx } from '../sound';
import { CampaignShell } from '../campaign/Shell';
import { MutatedPassage, MutatorStyles, MutatorTags, TimeBar, MUTATOR_INFO } from '../campaign/mutators';
import { Stars, zoneColor } from '../campaign/map';
import { ransomText } from '../campaign/ransom';
import type { NodeFull, ClearResponse } from '../campaign/types';

interface KeyStat { h: number; m: number }
type Phase = 'brief' | 'countdown' | 'play' | 'result' | 'failed';
interface RunResult { wpm: number; accuracy: number; errors: number; durationMs: number }

const fmtSeconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

const CampaignNodePage: React.FC = () => {
  const { nodeId = '' } = useParams();
  const navigate = useNavigate();
  const [node, setNode] = useState<NodeFull | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = `${node ? node.name : 'Campaign'} — Typocalypse`;
    return () => { document.title = 'Typocalypse — survive the typing apocalypse'; };
  }, [node]);

  useEffect(() => {
    setNode(null);
    setError('');
    axios.get<NodeFull>(`/campaign/${nodeId}`)
      .then(res => setNode(res.data))
      .catch(err => setError(err?.response?.data?.error || 'Could not load this node'));
  }, [nodeId]);

  const title = node ? (
    <>
      <span className="font-mono text-base md:text-lg mr-2">{node.zone}.{node.index}</span>
      <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">{node.name}</span>
    </>
  ) : (
    <>Campaign</>
  );

  return (
    <CampaignShell title={title} onBack={() => navigate('/campaign')} backLabel="Map">
      {node ? (
        <NodeRun key={node.id} node={node} onNext={id => navigate(`/campaign/${id}`)} onMap={() => navigate('/campaign')} />
      ) : (
        <div className="max-w-3xl mx-auto text-center mt-20 space-y-6">
          <p className="font-mono font-black animate-pulse">{error || 'LOADING THE NODE…'}</p>
          {error && <Btn onClick={() => navigate('/campaign')}>Back to map</Btn>}
        </div>
      )}
    </CampaignShell>
  );
};

const NodeRun: React.FC<{ node: NodeFull; onNext: (id: string) => void; onMap: () => void }> = ({ node, onNext, onMap }) => {
  const text = useMemo(() => (node.mutators.includes('ransom') ? ransomText(node.text, node.id) : node.text), [node]);
  const timed = node.timeLimitMs != null;
  const [phase, setPhase] = useState<Phase>('brief');
  const [count, setCount] = useState(3);
  const [run, setRun] = useState(0);
  const [leftMs, setLeftMs] = useState(node.timeLimitMs ?? 0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [clear, setClear] = useState<ClearResponse | null>(null);
  const [clearError, setClearError] = useState('');
  const [shown, setShown] = useState(0);
  const startAt = useRef(0);
  const savedRef = useRef(false);
  const alarmed = useRef(false);
  const keyStatsRef = useRef<Record<string, KeyStat>>({});

  const recordKey = (expected: string, correct: boolean) => {
    const stats = keyStatsRef.current;
    if (!stats[expected]) stats[expected] = { h: 0, m: 0 };
    if (correct) stats[expected].h += 1;
    else stats[expected].m += 1;
  };

  const typing = useTypingText(text, {
    enabled: phase === 'play',
    resetKey: run,
    onKey: recordKey,
    onDone: ({ chars, errors }) => {
      if (savedRef.current) return;
      savedRef.current = true;
      const durationMs = Date.now() - startAt.current;
      const wpm = Math.min(300, Math.round((chars / 5) / (durationMs / 60000)));
      const accuracy = Math.round((chars / (chars + errors)) * 100);
      setResult({ wpm, accuracy, errors, durationMs });
      setPhase('result');
      // history + heatmap (XP for this run comes from /clear, so skipXp)
      axios.post('/stats/session', {
        context: 'campaign', mode: node.id, wpm, accuracy, errors,
        totalTyped: chars + errors, durationMs, keyStats: keyStatsRef.current,
        localHour: new Date().getHours(), skipXp: true,
      }).catch(() => {});
      axios.post<ClearResponse>(`/campaign/${node.id}/clear`, { wpm, accuracy, errors, durationMs })
        .then(res => setClear(res.data))
        .catch(err => {
          setClearError(err?.response?.data?.error || 'Could not record the run');
          sfx.lose();
        });
    },
  });

  const begin = () => {
    savedRef.current = false;
    alarmed.current = false;
    keyStatsRef.current = {};
    setResult(null);
    setClear(null);
    setClearError('');
    setShown(0);
    setLeftMs(node.timeLimitMs ?? 0);
    setRun(r => r + 1);
    setCount(3);
    setPhase('countdown');
  };

  // 3-2-1-go
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      sfx.go();
      startAt.current = Date.now();
      setPhase('play');
      return;
    }
    sfx.countdown();
    const t = setTimeout(() => setCount(c => c - 1), 850);
    return () => clearTimeout(t);
  }, [phase, count]);

  // timebomb clock
  useEffect(() => {
    if (phase !== 'play' || node.timeLimitMs == null) return;
    const limit = node.timeLimitMs;
    const t = setInterval(() => {
      const left = limit - (Date.now() - startAt.current);
      setLeftMs(left);
      if (left < limit * 0.25 && !alarmed.current) { alarmed.current = true; sfx.alarm(); }
      if (left <= 0) {
        clearInterval(t);
        savedRef.current = true; // a late finish must not post a result
        setPhase('failed');
        sfx.lose();
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase, node.timeLimitMs]);

  // stars fly in one at a time
  useEffect(() => {
    if (!clear) return;
    setShown(0);
    if (clear.stars === 0) { sfx.lose(); return; }
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= clear.stars; i++) {
      timers.push(setTimeout(() => {
        setShown(i);
        sfx.success();
        if (i === 3) setTimeout(() => sfx.win(), 250);
      }, 400 * i));
    }
    return () => timers.forEach(clearTimeout);
  }, [clear]);

  const color = zoneColor(node.zone);
  const nextId = clear?.unlockedNext || (node.next?.unlocked ? node.next.id : null);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <MutatorStyles />
      <div className="flex flex-wrap items-center gap-2">
        <Tag className={`${color} dark:bg-black`}>{node.zoneName}</Tag>
        {node.boss && <Tag className="bg-red-400 dark:bg-black">💀 Boss</Tag>}
        <MutatorTags mutators={node.mutators} />
        <Tag>{node.words} words</Tag>
        {timed && <Tag>💣 {Math.round((node.timeLimitMs ?? 0) / 1000)}s</Tag>}
        <span className="ml-auto font-mono text-sm font-black">best <Stars n={Math.max(node.best, clear?.best ?? 0)} /></span>
      </div>

      {phase === 'brief' && (
        <Panel className="space-y-5">
          <div>
            <p className="font-black uppercase text-xs tracking-widest mb-1">Briefing</p>
            <p className="text-2xl md:text-3xl font-black uppercase tracking-tight">{node.name}</p>
            <p className="font-mono font-bold mt-1">{node.blurb}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className={`border-4 border-black dark:border-yellow-400 p-3 ${node.mutators[0] === 'none' ? 'bg-gray-100' : color} dark:bg-black`}>
              <p className="font-black uppercase text-xs tracking-widest mb-2">Conditions</p>
              <ul className="space-y-2">
                {node.mutators.map(m => (
                  <li key={m} className="flex gap-2 items-start">
                    <span className="text-2xl leading-none">{MUTATOR_INFO[m].icon}</span>
                    <div>
                      <p className="font-black uppercase text-sm leading-tight">{MUTATOR_INFO[m].name}</p>
                      <p className="font-mono text-xs font-bold">{MUTATOR_INFO[m].blurb}</p>
                      {m === 'timebomb' && (
                        <p className="font-mono text-xs font-black mt-1">Time limit: {Math.round((node.timeLimitMs ?? 0) / 1000)} seconds</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-4 border-black dark:border-yellow-400 p-3 bg-yellow-200 dark:bg-black">
              <p className="font-black uppercase text-xs tracking-widest mb-2">Stars</p>
              <ul className="font-mono text-sm font-bold space-y-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <li><span className="font-black">★☆☆</span> Finish {timed ? 'inside the time limit' : 'with 80%+ accuracy'}</li>
                <li><span className="font-black">★★☆</span> Accuracy {node.targets.accuracy}% or better</li>
                <li><span className="font-black">★★★</span> …and {node.targets.wpm} WPM or faster{node.boss ? ' (boss: both targets, two mutators)' : ''}</li>
              </ul>
              {node.best > 0 && <p className="font-mono text-xs font-black mt-3">Your best here: <Stars n={node.best} /></p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Btn color="bg-green-300" className="text-2xl px-10 py-4" onClick={begin}>Begin</Btn>
            <Btn onClick={onMap}>Back to map</Btn>
          </div>
        </Panel>
      )}

      {phase === 'countdown' && (
        <Panel className="text-center py-16">
          <p className="font-black uppercase text-xs tracking-widest mb-2">Hands on the keys</p>
          <p className="text-8xl font-black font-mono" key={count}>{count === 0 ? 'GO' : count}</p>
        </Panel>
      )}

      {(phase === 'play' || phase === 'failed') && (
        <div className="space-y-3">
          {timed && <TimeBar leftMs={leftMs} limitMs={node.timeLimitMs ?? 1} />}
          <MutatedPassage
            text={text}
            pos={typing.pos}
            mutators={node.mutators}
            onKeyDown={typing.handleKey}
            shakeOn={typing.errors}
            disabled={phase !== 'play'}
          />
          <div className="flex flex-wrap gap-3 font-mono text-xs font-black uppercase text-gray-600 dark:text-yellow-400/70">
            <span>{typing.pos}/{text.length} chars</span>
            <span>{typing.errors} errors</span>
            {node.mutators.includes('ransom') && <span>🔠 match the case shown</span>}
            {node.mutators.includes('mirror') && <span>🪞 read right to left</span>}
          </div>
        </div>
      )}

      {phase === 'failed' && (
        <Panel className="text-center py-8 space-y-4">
          <p className="text-5xl">💥</p>
          <p className="text-3xl font-black uppercase">Out of time</p>
          <p className="font-mono font-bold">The fuse ran out at {typing.pos} of {text.length} characters. No stars this run.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Btn color="bg-yellow-300" onClick={begin}>Retry</Btn>
            <Btn onClick={onMap}>Back to map</Btn>
          </div>
        </Panel>
      )}

      {phase === 'result' && result && (
        <Panel className="text-center py-8 space-y-4">
          <div className="flex justify-center gap-2 text-6xl md:text-7xl font-mono select-none" aria-label={`${clear?.stars ?? 0} stars`}>
            {[1, 2, 3].map(i => (
              <span
                key={i}
                className={i <= shown ? 'text-black dark:text-yellow-400' : 'text-gray-300 dark:text-yellow-400/20'}
                style={i <= shown ? { animation: 'campstarin 0.45s ease-out' } : undefined}
              >
                {i <= shown ? '★' : '☆'}
              </span>
            ))}
          </div>
          <p className="text-3xl font-black uppercase">
            {!clear && !clearError && 'Recording…'}
            {clearError && 'Run not counted'}
            {clear && (clear.stars === 3 ? 'Flawless' : clear.stars === 2 ? 'Cleared' : clear.stars === 1 ? 'Survived' : 'Not enough')}
          </p>
          {clear && (
            <div className="flex flex-wrap gap-2 justify-center">
              {clear.zoneCleared && <Tag className="bg-green-300 dark:bg-black text-sm">🏁 Zone cleared</Tag>}
              {clear.newStars && <Tag className="bg-yellow-300 dark:bg-black text-sm">New best</Tag>}
              {clear.stars === 0 && <Tag className="bg-red-300 dark:bg-black text-sm">Need 80%+ accuracy for a star</Tag>}
            </div>
          )}
          <p className="font-mono font-bold text-xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {result.wpm} WPM · {result.accuracy}% · {fmtSeconds(result.durationMs)} · {result.errors} errors
          </p>
          <p className="font-mono text-xs font-bold uppercase text-gray-500 dark:text-yellow-400/60">
            Targets: {node.targets.accuracy}% accuracy, {node.targets.wpm} WPM
          </p>
          {clearError && <p className="font-mono text-sm font-bold text-red-600 dark:text-red-400">{clearError}</p>}
          <div className="flex gap-3 justify-center flex-wrap pt-2">
            <Btn color="bg-yellow-300" onClick={begin}>Retry</Btn>
            {nextId && <Btn color="bg-green-300" onClick={() => onNext(nextId)}>Next node →</Btn>}
            <Btn onClick={onMap}>Back to map</Btn>
          </div>
        </Panel>
      )}
    </div>
  );
};

export default CampaignNodePage;
