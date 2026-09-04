import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useTypingText } from '../multiplayer/useTypingText';
import { TypingText, Panel, Btn, Tag } from '../multiplayer/ui';
import { sfx } from '../sound';
import { copyText } from '../share';
import { timeAgo } from '../social/FeedList';

interface Passage { text: string; by: string; choice: string }
interface Story {
  id: string;
  title: string;
  authorName: string;
  genre: string;
  source: 'solo' | 'relay';
  likes: number;
  plays: number;
  wordCount: number;
  passages: Passage[];
  createdAt: string;
  liked: boolean;
  isMine: boolean;
}
interface Result { wpm: number; accuracy: number }
type Mode = 'read' | 'type' | 'done';

const linkCls = 'underline decoration-2 underline-offset-2 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black';

// One library story: read it, like it, or type it passage by passage.
const StoryPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<Mode>('read');
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const startRef = useRef(0);
  const keysRef = useRef<Record<string, { h: number; m: number }>>({});

  useEffect(() => {
    setStory(null);
    setMode('read');
    axios.get(`/stories/${encodeURIComponent(id || '')}`)
      .then(res => setStory(res.data))
      .catch(err => setError(err?.response?.data?.error || 'Story not found'));
  }, [id]);

  useEffect(() => {
    document.title = story ? `${story.title} — Typocalypse` : 'Story — Typocalypse';
    return () => { document.title = 'Typocalypse — survive the typing apocalypse'; };
  }, [story]);

  const passages = story?.passages || [];
  const current = mode === 'type' ? (passages[idx]?.text || '') : '';

  const typing = useTypingText(current, {
    enabled: mode === 'type',
    resetKey: idx,
    onKey: (expected, correct) => {
      if (!startRef.current) startRef.current = Date.now();
      const k = keysRef.current[expected] || (keysRef.current[expected] = { h: 0, m: 0 });
      if (correct) k.h += 1; else k.m += 1;
    },
    onDone: ({ chars, errors }) => {
      if (!story) return;
      const durationMs = Math.max(1000, Date.now() - startRef.current);
      const wpm = Math.min(300, Math.round((chars / 5) / (durationMs / 60000)));
      const accuracy = Math.round((chars / (chars + errors)) * 100);
      axios.post('/stats/session', {
        context: 'library', mode: story.genre, wpm, accuracy, errors,
        totalTyped: chars + errors, durationMs, keyStats: keysRef.current,
        localHour: new Date().getHours(),
      }).catch(() => {});
      startRef.current = 0;
      keysRef.current = {};
      setResults(prev => [...prev, { wpm, accuracy }]);
      if (idx + 1 < passages.length) {
        sfx.pop();
        setIdx(idx + 1);
      } else {
        sfx.win();
        setMode('done');
      }
    },
  });

  const begin = () => {
    if (!story) return;
    setResults([]);
    setIdx(0);
    startRef.current = 0;
    keysRef.current = {};
    setMode('type');
    sfx.go();
    axios.post(`/stories/${story.id}/play`).then(res => setStory(s => s ? { ...s, plays: res.data.plays } : s)).catch(() => {});
  };

  const like = async () => {
    if (!story) return;
    try {
      const res = await axios.post(`/stories/${story.id}/like`);
      setStory({ ...story, liked: res.data.liked, likes: res.data.likes });
      if (res.data.liked) sfx.pop();
    } catch { /* ignore */ }
  };

  const remove = async () => {
    if (!story || !window.confirm('Delete this story from the library? This cannot be undone.')) return;
    try {
      await axios.delete(`/stories/${story.id}`);
      navigate('/library');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not delete');
    }
  };

  if (error && !story) {
    return (
      <Shell onBack={() => navigate('/library')}>
        <Panel className="max-w-md mx-auto mt-20 text-center">
          <p className="text-xl font-black uppercase mb-4">{error}</p>
          <Btn onClick={() => navigate('/library')}>Back to the library</Btn>
        </Panel>
      </Shell>
    );
  }
  if (!story) {
    return <Shell onBack={() => navigate('/library')}><p className="text-center mt-20 font-mono font-black animate-pulse">OPENING THE BOOK…</p></Shell>;
  }

  const avg = (f: (r: Result) => number) => results.length ? Math.round(results.reduce((a, r) => a + f(r), 0) / results.length) : 0;

  return (
    <Shell onBack={() => navigate('/library')}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">
              <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1 inline-block -rotate-1">{story.title}</span>
            </h2>
            <p className="font-mono text-xs font-bold mt-3 text-gray-600 dark:text-yellow-400/70">
              by <Link to={`/u/${encodeURIComponent(story.authorName)}`} className={`text-black dark:text-yellow-400 ${linkCls}`}>{story.authorName}</Link>
              {' · '}{timeAgo(story.createdAt)}{story.source === 'relay' ? ' · 🕯️ relay chronicle' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Tag>{story.genre}</Tag>
            <Tag>{story.wordCount} words</Tag>
            <Tag>{story.passages.length} passages</Tag>
            <Tag>▶ {story.plays}</Tag>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Btn color={story.liked ? 'bg-pink-300' : 'bg-white'} className="text-sm py-1" onClick={like} title={story.liked ? 'Unlike' : 'Like'}>
            {story.liked ? '♥' : '♡'} {story.likes}
          </Btn>
          <Btn color="bg-white" className="text-sm py-1" onClick={async () => setCopied(await copyText(window.location.href))}>
            {copied ? '✓ Copied' : '🔗 Copy link'}
          </Btn>
          {mode === 'read' && (
            <Btn color="bg-green-300" className="text-sm py-1" onClick={begin}>⌨️ Type this story</Btn>
          )}
          {mode !== 'read' && (
            <Btn color="bg-white" className="text-sm py-1" onClick={() => setMode('read')}>📖 Read mode</Btn>
          )}
          {story.isMine && (
            <Btn color="bg-red-400" className="text-sm py-1 ml-auto" onClick={remove}>🗑 Delete</Btn>
          )}
        </div>
        {error && <p className="font-mono text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}

        {mode === 'read' && (
          <div className="space-y-3">
            {story.passages.map((p, i) => (
              <React.Fragment key={i}>
                <Panel>
                  <p className="font-mono text-base md:text-lg leading-relaxed">{p.text}</p>
                  {story.source === 'relay' && p.by && (
                    <p className="font-mono text-[11px] font-bold uppercase mt-2 text-gray-500 dark:text-yellow-400/60">— typed by <Link to={`/u/${encodeURIComponent(p.by)}`} className={linkCls}>{p.by}</Link></p>
                  )}
                </Panel>
                {p.choice && i < story.passages.length - 1 && (
                  <p className="font-mono text-sm font-black px-2">→ chose: <span className="bg-yellow-200 dark:bg-yellow-400/20 px-1">{p.choice}</span></p>
                )}
              </React.Fragment>
            ))}
            <Panel className="text-center">
              <p className="font-black uppercase mb-3">Now type it and see how you do</p>
              <Btn color="bg-green-300" className="text-lg" onClick={begin}>⌨️ Type this story</Btn>
            </Panel>
          </div>
        )}

        {mode === 'type' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="bg-cyan-300">Passage {idx + 1} / {passages.length}</Tag>
              {idx > 0 && passages[idx - 1]?.choice && <span className="font-mono text-xs font-black">→ chose: {passages[idx - 1].choice}</span>}
              {story.source === 'relay' && passages[idx]?.by && <span className="font-mono text-xs font-bold text-gray-500 dark:text-yellow-400/60">originally typed by {passages[idx].by}</span>}
              <span className="ml-auto flex gap-1 flex-wrap">
                {results.map((r, i) => <Tag key={i} className="bg-green-300">{r.wpm} · {r.accuracy}%</Tag>)}
              </span>
            </div>
            <TypingText text={current} pos={typing.pos} onKeyDown={typing.handleKey} shakeOn={typing.errors} />
            <p className="font-mono text-[11px] font-bold uppercase text-gray-500 dark:text-yellow-400/60">
              {typing.errors} errors this passage · each passage is saved to your stats as a library run
            </p>
          </div>
        )}

        {mode === 'done' && (
          <Panel className="text-center py-8">
            <p className="text-4xl mb-2">📖</p>
            <p className="text-3xl font-black uppercase mb-1">The end</p>
            <p className="font-mono font-bold text-xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {avg(r => r.wpm)} WPM · {avg(r => r.accuracy)}% across {results.length} passages
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {results.map((r, i) => <Tag key={i}>#{i + 1} · {r.wpm} WPM · {r.accuracy}%</Tag>)}
            </div>
            <div className="flex gap-3 justify-center mt-6 flex-wrap">
              <Btn color="bg-green-300" onClick={begin}>Type it again</Btn>
              {!story.liked && <Btn color="bg-pink-300" onClick={like}>♥ Like this story</Btn>}
              <Btn color="bg-white" onClick={() => navigate('/library')}>More stories</Btn>
              {user?.isGuest && <Btn color="bg-yellow-300" onClick={() => navigate('/claim')}>Claim account to keep your stats</Btn>}
            </div>
          </Panel>
        )}
      </div>
    </Shell>
  );
};

const Shell: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black uppercase tracking-tighter">
          Story <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">Library</span>
        </h1>
        <Btn color="bg-red-400" onClick={onBack}>Back</Btn>
      </div>
    </header>
    <main className="p-6 relative z-10">{children}</main>
  </div>
);

export default StoryPage;
