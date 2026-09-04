import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { copyGhostLink } from '../share';
import { PROGRESSION_EVENT } from '../progression';
import type { ProgressionUpdate } from '../progression';
import { SeoFor } from '../seo';

interface MySummary { games: number; bestWpm: number; avgWpm: number; avgAccuracy: number; totalTyped: number }
interface HistoryPoint { wpm: number; accuracy: number; context: string; mode?: string; at: string }
interface GhostRow { id: string; wpm: number; accuracy: number; genre: string; preview: string; at: string }
interface Streak { current: number; longest: number; atRisk: boolean }
interface Achievement { key: string; name: string; icon: string; description: string; xp: number; unlocked: boolean; at: string | null }
interface Progression { level: number; xp: number; floor: number; next: number; pct: number; achievements: Achievement[]; unlockedCount: number; total: number; locker: { equipped: { title: string } } }
interface Season { id: string; number: number; endsAt: number; players: number; myRank: number | null; lastSeason: { username: string; rank: number; title: string }[] }
interface NextTournament { slug: string; name: string; startsAt: string | number; state: string; entrants: number; registered: boolean; roomCode: string | null }

type Load = 'loading' | 'ok' | 'error';

// The dashboard fires five independent requests. Each one owns its own
// loading / error / empty state so a slow or dead endpoint never renders as
// a confident zero.

/** A pulsing bar in the shape of the real content it stands in for. */
const Skel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`block bg-black/15 dark:bg-yellow-400/20 animate-pulse ${className}`} />
);

/** Inline "this fetch failed" strip with a retry, in the brutalist vocabulary. */
const FailStrip: React.FC<{ what: string; onRetry: () => void }> = ({ what, onRetry }) => (
  <div role="alert" className="border-4 border-black dark:border-yellow-400 bg-red-400 dark:bg-black p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
    <p className="font-mono font-black uppercase text-sm text-black dark:text-yellow-400 break-words">
      <span aria-hidden="true">⚠ </span>{what}
    </p>
    <button
      onClick={onRetry}
      className="w-full sm:w-auto bg-black text-white dark:bg-yellow-400 dark:text-black border-2 border-black dark:border-yellow-400 font-black uppercase px-5 py-2 min-h-[40px]"
    >
      Retry
    </button>
  </div>
);

// Every playable thing on the site, grouped. Colours cycle through the brutalist tile palette.
const MODE_GROUPS: { title: string; blurb: string; modes: { to: string; icon: string; name: string; blurb: string; bg: string; tag?: string }[] }[] = [
  {
    title: 'Story',
    blurb: 'The narrative engine. AI-written passages that branch on your choices.',
    modes: [
      { to: '/genre-selection', icon: '📖', name: 'Story Mode', blurb: 'Six genres. Type the story as it streams in, then pick the path.', bg: 'bg-orange-300' },
      { to: '/campaign', icon: '🗺️', name: 'Campaign', blurb: 'Four zones, 24 nodes, mutators like fog, storm, and night. Earn stars.', bg: 'bg-green-300', tag: 'NEW' },
      { to: '/library', icon: '📚', name: 'Story Library', blurb: 'Read and type stories other survivors published.', bg: 'bg-purple-300', tag: 'NEW' },
    ],
  },
  {
    title: 'Arcade',
    blurb: 'Quick solo loops. No account needed, high scores kept.',
    modes: [
      { to: '/arcade/meteor', icon: '☄️', name: 'Meteor Shower', blurb: 'Words fall on the bunker. Type them dead before they land. Endless.', bg: 'bg-pink-300', tag: 'NEW' },
      { to: '/arcade/memory', icon: '🧠', name: 'Last Words', blurb: 'The passage shows, then vanishes. Type it from memory.', bg: 'bg-cyan-300', tag: 'NEW' },
      { to: '/arcade/radio', icon: '📻', name: 'Radio Transmissions', blurb: 'Type what you hear through the static. Dictation mode.', bg: 'bg-yellow-300', tag: 'NEW' },
    ],
  },
  {
    title: 'Practice',
    blurb: 'Comparable numbers and targeted training. Works offline.',
    modes: [
      { to: '/practice', icon: '⏱️', name: 'Timed Test', blurb: '15, 30, or 60 seconds. Punctuation and numbers. Consistency score.', bg: 'bg-cyan-300', tag: 'NEW' },
      { to: '/practice/code', icon: '💻', name: 'Code Mode', blurb: 'Snippets in JavaScript, Python, SQL, and more.', bg: 'bg-green-300', tag: 'NEW' },
      { to: '/stats', icon: '🧪', name: 'Training Lab', blurb: 'Weak-key heatmap, AI coach, drills built from your misses.', bg: 'bg-purple-300' },
    ],
  },
  {
    title: 'Compete',
    blurb: 'Other people. Live.',
    modes: [
      { to: '/quickmatch', icon: '⚔️', name: 'Quick Match', blurb: 'Rated 1v1 duels. Find a stranger at your level in seconds.', bg: 'bg-pink-300', tag: 'NEW' },
      { to: '/multiplayer', icon: '🧟', name: 'Multiplayer Rooms', blurb: 'Nine modes with friends: Horde Night, Boss Raid, The Corruptor...', bg: 'bg-orange-300' },
      { to: '/tournaments', icon: '🏆', name: 'Weekend Tournament', blurb: 'Saturday Typo Royale bracket. Winner takes the crown.', bg: 'bg-yellow-300', tag: 'NEW' },
      { to: '/daily', icon: '🗓️', name: 'Daily Apocalypse', blurb: 'One passage, one attempt, the whole world.', bg: 'bg-cyan-300' },
      { to: '/leaderboard', icon: '📊', name: 'Global Ladder', blurb: 'Weekly, seasonal, all-time. Friends-only view too.', bg: 'bg-green-300' },
      { to: '/friends', icon: '🫂', name: 'Friends', blurb: 'Follow typists, see their feed, race their ghosts.', bg: 'bg-purple-300', tag: 'NEW' },
    ],
  },
];

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<MySummary | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [ghosts, setGhosts] = useState<GhostRow[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [prog, setProg] = useState<Progression | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [tourney, setTourney] = useState<NextTournament | null>(null);

  const [statsState, setStatsState] = useState<Load>('loading');
  const [ghostsState, setGhostsState] = useState<Load>('loading');
  const [progState, setProgState] = useState<Load>('loading');
  const [copiedGhost, setCopiedGhost] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    setStatsState('loading');
    axios.get('/stats/me').then(res => {
      setSummary(res.data.summary);
      setHistory(res.data.history);
      setStreak(res.data.streak);
      setStatsState('ok');
    }).catch(() => setStatsState('error'));
  }, []);

  const loadGhosts = useCallback(() => {
    setGhostsState('loading');
    axios.get('/ghosts/mine').then(res => {
      setGhosts(res.data);
      setGhostsState('ok');
    }).catch(() => setGhostsState('error'));
  }, []);

  const loadProgression = useCallback(() => {
    setProgState('loading');
    axios.get('/progression/me').then(res => {
      setProg(res.data);
      setProgState('ok');
    }).catch(() => setProgState('error'));
  }, []);

  useEffect(() => {
    loadStats();
    loadGhosts();
    loadProgression();
    axios.get('/seasons/current').then(res => setSeason(res.data)).catch(() => {});
    axios.get('/tournaments/next').then(res => setTourney(res.data?.tournament || null)).catch(() => {});
    // keep the XP bar live when a toast fires while the dashboard is open
    const onProg = (e: Event) => {
      const p = (e as CustomEvent<ProgressionUpdate>).detail;
      setProg(prev => prev ? { ...prev, level: p.level, xp: p.xp, floor: p.floor, next: p.next, pct: p.pct } : prev);
    };
    window.addEventListener(PROGRESSION_EVENT, onProg);
    return () => window.removeEventListener(PROGRESSION_EVENT, onProg);
  }, [loadStats, loadGhosts, loadProgression]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const copyGhost = async (id: string) => {
    if (await copyGhostLink(id)) {
      setCopiedGhost(id);
      setTimeout(() => setCopiedGhost(c => (c === id ? null : c)), 1500);
    }
  };

  // Brutalist hard shadow definitions for reusability
  const brutalShadowLight = "shadow-[6px_6px_0px_0px_#000]";
  const brutalShadowDark = "dark:shadow-[6px_6px_0px_0px_#facc15]";
  const brutalHover = "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#facc15]";
  const brutalActive = "active:translate-x-[6px] active:translate-y-[6px] active:shadow-none dark:active:shadow-none";

  const recentUnlocked = (prog?.achievements || []).filter(a => a.unlocked).sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 4);
  const nextLocked = (prog?.achievements || []).filter(a => !a.unlocked).slice(0, Math.max(0, 4 - recentUnlocked.length));
  const seasonDaysLeft = season ? Math.max(0, Math.ceil((season.endsAt - Date.now()) / 86400000)) : 0;
  const tourneyStarts = tourney ? new Date(tourney.startsAt) : null;
  const tourneyLive = tourney && (tourney.state === 'starting' || tourney.state === 'running');

  const statsLoading = statsState === 'loading';
  const statTiles = [
    { label: 'Best WPM', value: String(summary?.bestWpm ?? 0), sub: `AVG ${summary?.avgWpm ?? 0} WPM · ${summary?.games ?? 0} PASSAGES`, icon: '⚡', lightBg: 'bg-pink-300' },
    { label: 'Accuracy', value: `${summary?.avgAccuracy ?? 0}%`, sub: 'LAST 20 PASSAGES', icon: '🎯', lightBg: 'bg-yellow-300' },
  ];

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black pb-20 overflow-x-hidden">
      <SeoFor path="/dashboard" />

      {/* Header - Stark & Geometric */}
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black dark:bg-yellow-400 flex items-center justify-center text-[#f4f4f0] dark:text-black font-black text-lg sm:text-xl border-2 border-black dark:border-yellow-400" aria-hidden="true">
              T
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tighter hidden sm:block">
              Typocalypse
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-wrap justify-end min-w-0">
            {progState === 'loading' && <Skel className="h-8 w-24 border-2 border-black/20 dark:border-yellow-400/20" />}
            {prog && (
              <Link to="/progress" title="Your level, achievements, and locker">
                <div className="flex items-center gap-2 border-2 border-black dark:border-yellow-400 px-2 sm:px-3 py-1 bg-cyan-300 dark:bg-black font-mono font-black text-sm sm:text-base">
                  LVL {prog.level}
                  <span
                    className="hidden sm:inline-block w-20 h-2 border border-black dark:border-yellow-400 bg-white dark:bg-black overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round(prog.pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${Math.round(prog.pct)} percent of the way to level ${prog.level + 1}`}
                  >
                    <span className="block h-full bg-black dark:bg-yellow-400" style={{ width: `${prog.pct}%` }} />
                  </span>
                </div>
              </Link>
            )}
            {streak !== null && streak.current > 0 && (
              <div
                className={`flex items-center gap-1 border-2 border-black dark:border-yellow-400 px-2 sm:px-3 py-1 font-mono font-black text-sm sm:text-base ${streak.atRisk ? 'bg-red-400 animate-pulse' : 'bg-orange-300 dark:bg-black'} text-black dark:text-yellow-400`}
                title={streak.atRisk ? 'Play today or your streak dies' : `Longest streak ${streak.longest}`}
                aria-label={
                  streak.atRisk
                    ? `${streak.current} day streak, at risk — play today to keep it`
                    : `${streak.current} day streak, longest ${streak.longest} days`
                }
              >
                <span aria-hidden="true">🔥 {streak.current}</span>
              </div>
            )}
            <div className="flex items-center gap-2 sm:gap-3 border-2 border-black dark:border-yellow-400 px-2 sm:px-3 py-1 bg-white dark:bg-black min-w-0">
              <div className="w-3 h-3 shrink-0 bg-green-500 border border-black dark:border-yellow-400 animate-pulse" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-bold uppercase font-mono text-black dark:text-yellow-400 truncate max-w-[7rem] sm:max-w-[12rem]">
                {user?.username || 'Survivor'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className={`px-3 sm:px-4 py-2 min-h-[40px] bg-white dark:bg-black border-2 border-black dark:border-yellow-400 font-bold uppercase text-xs transition-all ${brutalHover} ${brutalActive}`}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-16">

        {/* Tournament live / upcoming */}
        {tourney && (tourneyLive || tourney.registered) && (
          <div className={`border-4 border-black dark:border-yellow-400 ${tourneyLive ? 'bg-yellow-300 animate-pulse' : 'bg-white'} dark:bg-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${brutalShadowLight} ${brutalShadowDark}`}>
            <p className="font-mono font-black text-black dark:text-yellow-400 uppercase text-sm md:text-base break-words">
              <span aria-hidden="true">🏆 </span>{tourney.name}{tourneyLive ? ' IS LIVE' : ` — you are registered · starts ${tourneyStarts?.toLocaleString()}`}
              {tourneyLive && tourney.roomCode ? ` — your arena is room ${tourney.roomCode}` : ''}
            </p>
            <Link to={tourneyLive && tourney.roomCode ? `/room/${tourney.roomCode}` : '/tournaments'} className="w-full md:w-auto">
              <button className={`w-full bg-black text-white dark:bg-yellow-400 dark:text-black border-2 border-black dark:border-yellow-400 font-black uppercase px-5 py-2 min-h-[40px] transition-all ${brutalHover} ${brutalActive}`}>
                {tourneyLive && tourney.roomCode ? 'Enter the arena' : 'Tournament page'}
              </button>
            </Link>
          </div>
        )}

        {/* Streak at risk */}
        {streak?.atRisk && (
          <div className={`border-4 border-black dark:border-yellow-400 bg-red-400 dark:bg-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${brutalShadowLight} ${brutalShadowDark}`}>
            <p className="font-mono font-black text-black dark:text-yellow-400 uppercase text-sm md:text-base break-words">
              <span aria-hidden="true">🔥 </span>{streak.current} day streak at risk — finish any passage today to keep it alive
            </p>
            <Link to="/genre-selection" className="w-full md:w-auto">
              <button className={`w-full bg-black text-white dark:bg-yellow-400 dark:text-black border-2 border-black dark:border-yellow-400 font-black uppercase px-5 py-2 min-h-[40px] transition-all ${brutalHover} ${brutalActive}`}>
                Type now
              </button>
            </Link>
          </div>
        )}

        {/* Guest claim banner */}
        {user?.isGuest && (
          <div className={`border-4 border-black dark:border-yellow-400 bg-yellow-300 dark:bg-black p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${brutalShadowLight} ${brutalShadowDark}`}>
            <p className="font-mono font-bold text-black dark:text-yellow-400 uppercase text-sm md:text-base break-words">
              <span aria-hidden="true">⚠ </span>You are playing as a guest.{streak && streak.current > 1 ? ` Claim your account so your ${streak.current} day streak survives.` : ' Claim your account to keep this identity, your level, and your unlocks.'}
            </p>
            <Link to="/claim" className="w-full md:w-auto">
              <button className={`w-full bg-black text-white dark:bg-yellow-400 dark:text-black border-2 border-black dark:border-yellow-400 font-black uppercase px-5 py-2 min-h-[40px] transition-all ${brutalHover} ${brutalActive}`}>
                Claim account
              </button>
            </Link>
          </div>
        )}

        {/* Welcome Section - Aggressive Typography */}
        <div className="space-y-4">
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none text-black dark:text-yellow-400">
            Welcome Back, <br />
            <span className="inline-block mt-2 max-w-full break-words bg-black text-white dark:bg-yellow-400 dark:text-black px-3 sm:px-4 py-1 border-4 border-black dark:border-yellow-400 transform -rotate-2">
              {user?.username || 'Survivor'}
            </span>
          </h2>
          <p className="font-mono text-sm sm:text-lg font-bold border-l-4 border-black dark:border-yellow-400 pl-4 text-black dark:text-yellow-400 uppercase break-words">
            {prog?.locker?.equipped?.title ? <>“{prog.locker.equipped.title}” · </> : null}
            Initialize your next typing sequence.
            {user && !user.isGuest && (
              <> · <Link to={`/u/${encodeURIComponent(user.username)}`} className="underline">public profile</Link></>
            )}
          </p>
        </div>

        {/* The stats strip failed to load: say so instead of showing zeros */}
        {statsState === 'error' && (
          <FailStrip what="Could not load your stats" onRetry={loadStats} />
        )}
        {progState === 'error' && (
          <FailStrip what="Could not load your level and achievements" onRetry={loadProgression} />
        )}

        {/* Level + season + stats tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {progState === 'loading' ? (
            <div className={`p-5 sm:p-6 border-4 border-black dark:border-yellow-400 bg-cyan-300 dark:bg-black ${brutalShadowLight} ${brutalShadowDark} h-full`} aria-busy="true">
              <p className="text-sm font-black uppercase text-black dark:text-yellow-400 tracking-widest border-b-2 border-black dark:border-yellow-400 pb-1 inline-block">Level</p>
              <Skel className="h-14 w-24 mt-4" />
              <Skel className="h-4 w-full mt-4" />
              <p className="text-xs mt-2 font-bold uppercase font-mono">Loading your level…</p>
            </div>
          ) : (
            <Link to="/progress" className="block">
              <div className={`relative p-5 sm:p-6 border-4 border-black dark:border-yellow-400 bg-cyan-300 dark:bg-black transition-transform hover:-translate-y-2 ${brutalShadowLight} ${brutalShadowDark} h-full`}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase text-black dark:text-yellow-400 tracking-widest border-b-2 border-black dark:border-yellow-400 pb-1 inline-block">Level</p>
                    <p className="text-5xl sm:text-6xl font-black text-black dark:text-yellow-400 font-mono mt-4 tracking-tighter">{prog?.level ?? '—'}</p>
                  </div>
                  <div className="text-3xl sm:text-4xl" aria-hidden="true">⬆️</div>
                </div>
                <div
                  className="mt-4 w-full h-4 border-2 border-black dark:border-yellow-400 bg-white dark:bg-black overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(prog?.pct ?? 0)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={prog ? `${Math.round(prog.pct)} percent of the way to level ${prog.level + 1}` : 'Level progress unavailable'}
                >
                  <div className="h-full bg-black dark:bg-yellow-400 transition-all" style={{ width: `${prog?.pct ?? 0}%` }} />
                </div>
                <p className="text-xs text-black dark:text-yellow-400 mt-2 font-bold uppercase font-mono break-words">
                  {prog
                    ? `${prog.xp - prog.floor} / ${prog.next - prog.floor} XP to level ${prog.level + 1} · ${prog.unlockedCount}/${prog.total} achievements`
                    : 'Level unavailable — retry above'}
                </p>
              </div>
            </Link>
          )}
          {statTiles.map((stat, idx) => (
            <div
              key={idx}
              className={`relative p-5 sm:p-6 border-4 border-black dark:border-yellow-400 ${stat.lightBg} dark:bg-black transition-transform hover:-translate-y-2 ${brutalShadowLight} ${brutalShadowDark}`}
              aria-busy={statsLoading}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase text-black dark:text-yellow-400 tracking-widest border-b-2 border-black dark:border-yellow-400 pb-1 inline-block">
                    {stat.label}
                  </p>
                  {statsLoading
                    ? <Skel className="h-14 w-28 mt-4" />
                    : (
                      <p className="text-5xl sm:text-6xl font-black text-black dark:text-yellow-400 font-mono mt-4 tracking-tighter">
                        {statsState === 'error' ? '—' : stat.value}
                      </p>
                    )}
                </div>
                <div className="text-3xl sm:text-4xl text-black dark:text-yellow-400" aria-hidden="true">
                  {stat.icon}
                </div>
              </div>
              {statsLoading ? (
                <Skel className="h-6 w-40 mt-6" />
              ) : (
                <p className="text-xs text-black dark:text-yellow-400 mt-6 font-bold uppercase font-mono bg-white dark:bg-black border-2 border-black dark:border-yellow-400 px-2 py-1 inline-block break-words">
                  {statsState === 'error' ? 'NOT LOADED' : stat.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Start Game CTA - Massive & Loud. Needs no data, so it never waits. */}
        <div className={`relative border-4 border-black dark:border-yellow-400 bg-orange-500 dark:bg-yellow-400 ${brutalShadowLight} dark:shadow-[8px_8px_0px_0px_#facc15] p-6 sm:p-10 md:p-16 flex flex-col items-center text-center overflow-hidden`}>
          {/* Local CSS texture: no third-party image to fail, block, or leak a referrer. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply dark:mix-blend-color-burn"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 10px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 10px)',
            }}
          />

          <div className="relative z-10 space-y-6 sm:space-y-8 w-full">
            <h3 className="text-2xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter text-black">
              Ready for a new challenge?
            </h3>
            <p className="text-black font-mono font-bold text-base sm:text-lg md:text-xl max-w-2xl mx-auto bg-white/80 dark:bg-black/10 border-2 border-black px-4 py-2 break-words">
              Select a genre. Warm up your fingers. Destroy the keyboard.
            </p>

            <div className="flex flex-col md:flex-row gap-4 justify-center mt-4">
              <Link to="/genre-selection" className="w-full md:w-auto">
                <button
                  className={`w-full bg-white dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-black font-black text-xl sm:text-2xl px-6 sm:px-10 py-4 sm:py-5 uppercase transition-all shadow-[8px_8px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none`}
                >
                  <span aria-hidden="true">🎮 </span>Start New Game
                </button>
              </Link>
              <Link to="/quickmatch" className="w-full md:w-auto">
                <button
                  className={`w-full bg-black text-white dark:bg-black dark:text-yellow-400 border-4 border-black font-black text-xl sm:text-2xl px-6 sm:px-10 py-4 sm:py-5 uppercase transition-all shadow-[8px_8px_0px_0px_#fff] dark:shadow-[8px_8px_0px_0px_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#fff] dark:hover:shadow-[6px_6px_0px_0px_#facc15] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none`}
                >
                  <span aria-hidden="true">⚔️ </span>Quick Match
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Every mode */}
        <div className="space-y-8 sm:space-y-10">
          <div className="flex items-end justify-between border-b-4 border-black dark:border-yellow-400 pb-2 flex-wrap gap-2">
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-yellow-400">Choose your apocalypse</h3>
            {season && (
              <Link to="/leaderboard" className="font-mono text-xs font-bold uppercase border-2 border-black dark:border-yellow-400 px-2 py-1 bg-white dark:bg-black break-words">
                <span aria-hidden="true">🏁 </span>Season {season.number} · {seasonDaysLeft}d left{season.myRank ? ` · you are #${season.myRank}` : ''}
              </Link>
            )}
          </div>
          {MODE_GROUPS.map(group => (
            <div key={group.title} className="space-y-4">
              <div>
                <p className="text-base sm:text-lg font-black uppercase tracking-widest">{group.title}</p>
                <p className="font-mono text-xs font-bold text-black/60 dark:text-yellow-400/60 uppercase break-words">{group.blurb}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {group.modes.map(m => (
                  <Link to={m.to} key={m.to}>
                    <div className={`relative h-full p-4 sm:p-5 border-4 border-black dark:border-yellow-400 ${m.bg} dark:bg-black cursor-pointer transition-all ${brutalShadowLight} ${brutalShadowDark} ${brutalHover} ${brutalActive}`}>
                      {m.tag && (
                        <span className="absolute -top-3 -right-2 bg-black text-white dark:bg-yellow-400 dark:text-black font-mono text-[10px] font-black px-2 py-0.5 border-2 border-black dark:border-yellow-400 rotate-3">{m.tag}</span>
                      )}
                      <div className="text-3xl mb-2" aria-hidden="true">{m.icon}</div>
                      <p className="text-lg sm:text-xl font-black uppercase leading-tight text-black dark:text-yellow-400 break-words">{m.name}</p>
                      <p className="font-mono text-xs font-bold text-black dark:text-yellow-400 mt-2 break-words">{m.blurb}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Match history - real data */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-4 border-black dark:border-yellow-400 pb-2 flex-wrap gap-2">
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-yellow-400">
              Match History
            </h3>
            <span className="bg-black text-white dark:bg-yellow-400 dark:text-black font-bold uppercase text-xs px-3 py-1">
              Data: {statsLoading ? '…' : statsState === 'error' ? '—' : summary?.games ?? 0}
            </span>
          </div>

          {statsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6" aria-busy="true">
              <div className={`p-4 sm:p-6 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black ${brutalShadowLight} ${brutalShadowDark}`}>
                <p className="text-sm font-black uppercase tracking-widest mb-4">WPM — loading your last passages…</p>
                <div className="flex items-end gap-[3px] h-32 border-b-2 border-black dark:border-yellow-400">
                  {[38, 62, 45, 80, 55, 70, 48, 90, 60, 74, 52, 66].map((h, i) => (
                    <span key={i} className="flex-1 min-w-[4px] bg-black/15 dark:bg-yellow-400/20 animate-pulse" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <Skel className="h-4 w-2/3 mt-3" />
              </div>
              <div className={`p-4 sm:p-6 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black ${brutalShadowLight} ${brutalShadowDark}`}>
                <p className="text-sm font-black uppercase tracking-widest mb-4">Recent passages</p>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4, 5].map(i => <Skel key={i} className="h-5 w-full" />)}
                </div>
              </div>
            </div>
          ) : statsState === 'error' ? (
            <FailStrip what="Could not load your match history" onRetry={loadStats} />
          ) : history.length === 0 ? (
            <div className="p-8 sm:p-12 text-center border-4 border-dashed border-black dark:border-yellow-400 bg-white dark:bg-black flex flex-col items-center justify-center">
              <div className="text-5xl mb-4 grayscale" aria-hidden="true">⌨️</div>
              <h4 className="text-xl sm:text-2xl font-black uppercase text-black dark:text-yellow-400 mb-2">
                No Data Found
              </h4>
              <p className="font-mono text-black dark:text-yellow-400 font-bold mb-6 break-words">
                Match history is empty. Jump in and set your first record.
              </p>
              <Link to="/genre-selection" className="w-full sm:w-auto">
                <button className={`w-full bg-black text-white dark:bg-yellow-400 dark:text-black border-2 border-black dark:border-yellow-400 font-bold uppercase px-6 py-3 transition-all ${brutalHover} ${brutalActive}`}>
                  Play First Game
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* WPM over recent passages - single series, one axis */}
              <div className={`p-4 sm:p-6 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black ${brutalShadowLight} ${brutalShadowDark}`}>
                <p className="text-sm font-black uppercase tracking-widest text-black dark:text-yellow-400 mb-4">
                  WPM — last {history.length} passages
                </p>
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-[3px] h-32 min-w-[240px] border-b-2 border-black dark:border-yellow-400">
                    {(() => {
                      const maxWpm = Math.max(...history.map(h => h.wpm), 1);
                      return history.map((h, i) => (
                        <div
                          key={i}
                          title={`${h.wpm} WPM · ${h.accuracy}% · ${h.context}${h.mode ? ` (${h.mode})` : ''}`}
                          className={`flex-1 min-w-[4px] rounded-t-[4px] transition-all hover:opacity-70 ${h.wpm === maxWpm ? 'bg-pink-500 dark:bg-white' : 'bg-black dark:bg-yellow-400'}`}
                          style={{ height: `${Math.max(4, (h.wpm / maxWpm) * 100)}%` }}
                        />
                      ));
                    })()}
                  </div>
                </div>
                <p className="font-mono text-xs font-bold text-black dark:text-yellow-400 mt-2 break-words">
                  Bar chart of your last {history.length} passages, best run {summary?.bestWpm ?? 0} WPM highlighted. Hover a bar for details; the table beside it lists the same runs.
                </p>
              </div>

              {/* recent passages table */}
              <div className={`p-4 sm:p-6 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black ${brutalShadowLight} ${brutalShadowDark}`}>
                <p className="text-sm font-black uppercase tracking-widest text-black dark:text-yellow-400 mb-4">
                  Recent passages
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[280px] font-mono text-sm text-black dark:text-yellow-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <caption className="sr-only">Your most recent passages, newest first</caption>
                    <thead className="sr-only">
                      <tr><th scope="col">Mode</th><th scope="col">Speed</th><th scope="col">Accuracy</th></tr>
                    </thead>
                    <tbody>
                      {history.slice(-8).reverse().map((h, i) => (
                        <tr key={i} className="border-b border-black/10 dark:border-yellow-400/10">
                          <td className="py-1 font-bold uppercase break-words">{h.context}{h.mode && h.mode !== h.context ? ` · ${h.mode}` : ''}</td>
                          <td className="text-right font-black">{h.wpm} wpm</td>
                          <td className="text-right">{h.accuracy}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Ghost shelf */}
          <div className={`p-4 sm:p-6 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black ${brutalShadowLight} ${brutalShadowDark}`}>
            <p className="text-sm font-black uppercase tracking-widest text-black dark:text-yellow-400 mb-1">
              <span aria-hidden="true">👻 </span>Ghost shelf — race your past self
            </p>
            <p className="font-mono text-xs font-bold text-black/60 dark:text-yellow-400/60 mb-4 break-words">
              Every finished story passage is recorded keystroke for keystroke. Share a link to make friends race your ghost.
            </p>
            {ghostsState === 'loading' ? (
              <div className="flex flex-wrap gap-3" aria-busy="true">
                {[0, 1, 2].map(i => <Skel key={i} className="h-20 w-full sm:w-64 border-2 border-black/20 dark:border-yellow-400/20" />)}
              </div>
            ) : ghostsState === 'error' ? (
              <FailStrip what="Could not load your ghost shelf" onRetry={loadGhosts} />
            ) : ghosts.length === 0 ? (
              <p className="font-mono text-sm font-bold break-words">
                No ghosts yet. Finish a story passage and the run is recorded here automatically.
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {ghosts.slice(0, 6).map(g => (
                  <div key={g.id} className="border-2 border-black dark:border-yellow-400 bg-purple-100 dark:bg-black w-full sm:w-auto sm:max-w-xs">
                    <button
                      onClick={() => navigate(`/ghost/${g.id}`)}
                      className="text-left px-3 py-2 block w-full"
                    >
                      <span className="font-black text-black dark:text-yellow-400"><span aria-hidden="true">👻 </span>{g.wpm} WPM</span>
                      <span className="font-mono text-xs block text-black/70 dark:text-yellow-400/70 break-words">{g.genre} · “{g.preview.slice(0, 28)}…”</span>
                    </button>
                    <button
                      onClick={() => void copyGhost(g.id)}
                      className="w-full border-t-2 border-black dark:border-yellow-400 font-mono text-[11px] font-bold uppercase py-2 min-h-[40px] text-black dark:text-yellow-400 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black"
                    >
                      {copiedGhost === g.id ? '✓ copied' : '🔗 copy challenge link'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Achievements - real data from the progression engine */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-4 border-black dark:border-yellow-400 pb-2 flex-wrap gap-2">
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black dark:text-yellow-400">
              Achievements
            </h3>
            <Link to="/progress" className="bg-black text-white dark:bg-yellow-400 dark:text-black font-bold uppercase text-xs px-3 py-1">
              {prog ? `${prog.unlockedCount} / ${prog.total} · see all + locker →` : 'see all →'}
            </Link>
          </div>
          {progState === 'error' ? (
            <FailStrip what="Could not load your achievements" onRetry={loadProgression} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {progState === 'loading'
                ? [0, 1, 2, 3].map(i => (
                  <div key={i} className="p-4 sm:p-6 border-4 border-black/30 dark:border-yellow-400/30 flex flex-col items-center gap-3" aria-busy="true">
                    <Skel className="h-10 w-10" />
                    <Skel className="h-4 w-3/4" />
                    <Skel className="h-6 w-full" />
                  </div>
                ))
                : [...recentUnlocked, ...nextLocked].map((a) => (
                  <Link to="/progress" key={a.key}>
                    <div
                      title={a.description}
                      className={`p-4 sm:p-6 h-full text-center border-4 border-black dark:border-yellow-400 transition-all ${
                        a.unlocked ? 'bg-yellow-300 dark:bg-black' : 'bg-gray-200 dark:bg-black/50 opacity-80 hover:opacity-100'
                      } ${brutalShadowLight} ${brutalShadowDark}`}
                    >
                      <div className={`text-3xl sm:text-4xl mb-4 ${a.unlocked ? '' : 'grayscale opacity-50'}`} aria-hidden="true">
                        {a.icon}
                      </div>
                      <p className="font-black uppercase text-black dark:text-yellow-400 text-sm mb-3 break-words">
                        {a.name}
                      </p>
                      <div className="inline-block border-2 border-black dark:border-yellow-400 bg-black text-white dark:bg-yellow-400 dark:text-black px-2 py-1 text-xs font-bold uppercase font-mono break-words">
                        {a.unlocked ? '✓ Unlocked' : `🔒 ${a.description}`}
                      </div>
                    </div>
                  </Link>
                ))}
              {progState === 'ok' && recentUnlocked.length === 0 && nextLocked.length === 0 && (
                <p className="font-mono font-bold text-sm col-span-full">No achievements defined yet.</p>
              )}
            </div>
          )}
        </div>

        <footer className="border-t-4 border-black dark:border-yellow-400 pt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs font-bold uppercase">
          <Link to="/privacy" className="underline decoration-2 underline-offset-4">Privacy</Link>
          <Link to="/leaderboard" className="underline decoration-2 underline-offset-4">Global ladder</Link>
          <Link to="/daily" className="underline decoration-2 underline-offset-4">Daily</Link>
          <span className="text-black/60 dark:text-yellow-400/60 normal-case">Typocalypse is free and open source.</span>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;
