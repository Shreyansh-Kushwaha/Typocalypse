import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { copyGhostLink } from '../share';
import { PROGRESSION_EVENT } from '../progression';
import type { ProgressionUpdate } from '../progression';

interface MySummary { games: number; bestWpm: number; avgWpm: number; avgAccuracy: number; totalTyped: number }
interface HistoryPoint { wpm: number; accuracy: number; context: string; mode?: string; at: string }
interface GhostRow { id: string; wpm: number; accuracy: number; genre: string; preview: string; at: string }
interface Streak { current: number; longest: number; atRisk: boolean }
interface Achievement { key: string; name: string; icon: string; description: string; xp: number; unlocked: boolean; at: string | null }
interface Progression { level: number; xp: number; floor: number; next: number; pct: number; achievements: Achievement[]; unlockedCount: number; total: number; locker: { equipped: { title: string } } }
interface Season { id: string; number: number; endsAt: number; players: number; myRank: number | null; lastSeason: { username: string; rank: number; title: string }[] }
interface NextTournament { slug: string; name: string; startsAt: string | number; state: string; entrants: number; registered: boolean; roomCode: string | null }

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

  const loadProgression = () => {
    axios.get('/progression/me').then(res => setProg(res.data)).catch(() => {});
  };

  useEffect(() => {
    axios.get('/stats/me').then(res => {
      setSummary(res.data.summary);
      setHistory(res.data.history);
      setStreak(res.data.streak);
    }).catch(() => {});
    axios.get('/ghosts/mine').then(res => setGhosts(res.data)).catch(() => {});
    axios.get('/seasons/current').then(res => setSeason(res.data)).catch(() => {});
    axios.get('/tournaments/next').then(res => setTourney(res.data?.tournament || null)).catch(() => {});
    loadProgression();
    // keep the XP bar live when a toast fires while the dashboard is open
    const onProg = (e: Event) => {
      const p = (e as CustomEvent<ProgressionUpdate>).detail;
      setProg(prev => prev ? { ...prev, level: p.level, xp: p.xp, floor: p.floor, next: p.next, pct: p.pct } : prev);
    };
    window.addEventListener(PROGRESSION_EVENT, onProg);
    return () => window.removeEventListener(PROGRESSION_EVENT, onProg);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
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

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black pb-20">
      
      {/* Header - Stark & Geometric */}
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-black dark:bg-yellow-400 flex items-center justify-center text-[#f4f4f0] dark:text-black font-black text-xl border-2 border-black dark:border-yellow-400">
              T
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter hidden sm:block">
              Typocalypse
            </h1>
          </div>
          <div className="flex items-center gap-3 md:gap-6 flex-wrap justify-end">
            {prog && (
              <Link to="/progress" title="Your level, achievements, and locker">
                <div className="flex items-center gap-2 border-2 border-black dark:border-yellow-400 px-3 py-1 bg-cyan-300 dark:bg-black font-mono font-black">
                  LVL {prog.level}
                  <span className="hidden sm:inline-block w-20 h-2 border border-black dark:border-yellow-400 bg-white dark:bg-black overflow-hidden">
                    <span className="block h-full bg-black dark:bg-yellow-400" style={{ width: `${prog.pct}%` }} />
                  </span>
                </div>
              </Link>
            )}
            {streak !== null && streak.current > 0 && (
              <div className={`flex items-center gap-1 border-2 border-black dark:border-yellow-400 px-3 py-1 font-mono font-black ${streak.atRisk ? 'bg-red-400 animate-pulse' : 'bg-orange-300 dark:bg-black'} text-black dark:text-yellow-400`}
                title={streak.atRisk ? 'Play today or your streak dies' : `Longest streak ${streak.longest}`}>
                🔥 {streak.current}
              </div>
            )}
            <div className="flex items-center gap-3 border-2 border-black dark:border-yellow-400 px-3 py-1 bg-white dark:bg-black">
              <div className="w-3 h-3 bg-green-500 border border-black dark:border-yellow-400 animate-pulse" />
              <span className="text-sm font-bold uppercase font-mono text-black dark:text-yellow-400">
                {user?.username || 'Diana'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className={`px-4 py-2 bg-white dark:bg-black border-2 border-black dark:border-yellow-400 font-bold uppercase text-xs transition-all ${brutalHover} ${brutalActive}`}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">

        {/* Tournament live / upcoming */}
        {tourney && (tourneyLive || tourney.registered) && (
          <div className={`border-4 border-black dark:border-yellow-400 ${tourneyLive ? 'bg-yellow-300 animate-pulse' : 'bg-white'} dark:bg-black p-4 flex flex-col md:flex-row items-center justify-between gap-4 ${brutalShadowLight} ${brutalShadowDark}`}>
            <p className="font-mono font-black text-black dark:text-yellow-400 uppercase">
              🏆 {tourney.name}{tourneyLive ? ' IS LIVE' : ` — you are registered · starts ${tourneyStarts?.toLocaleString()}`}
              {tourneyLive && tourney.roomCode ? ` — your arena is room ${tourney.roomCode}` : ''}
            </p>
            <Link to={tourneyLive && tourney.roomCode ? `/room/${tourney.roomCode}` : '/tournaments'}>
              <button className={`bg-black text-white dark:bg-yellow-400 dark:text-black border-2 border-black dark:border-yellow-400 font-black uppercase px-5 py-2 whitespace-nowrap transition-all ${brutalHover} ${brutalActive}`}>
                {tourneyLive && tourney.roomCode ? 'Enter the arena' : 'Tournament page'}
              </button>
            </Link>
          </div>
        )}

        {/* Streak at risk */}
        {streak?.atRisk && (
          <div className={`border-4 border-black dark:border-yellow-400 bg-red-400 dark:bg-black p-4 flex flex-col md:flex-row items-center justify-between gap-4 ${brutalShadowLight} ${brutalShadowDark}`}>
            <p className="font-mono font-black text-black dark:text-yellow-400 uppercase">
              🔥 {streak.current} day streak at risk — finish any passage today to keep it alive
            </p>
            <Link to="/genre-selection">
              <button className={`bg-black text-white dark:bg-yellow-400 dark:text-black border-2 border-black dark:border-yellow-400 font-black uppercase px-5 py-2 whitespace-nowrap transition-all ${brutalHover} ${brutalActive}`}>
                Type now
              </button>
            </Link>
          </div>
        )}

        {/* Guest claim banner */}
        {user?.isGuest && (
          <div className={`border-4 border-black dark:border-yellow-400 bg-yellow-300 dark:bg-black p-4 flex flex-col md:flex-row items-center justify-between gap-4 ${brutalShadowLight} ${brutalShadowDark}`}>
            <p className="font-mono font-bold text-black dark:text-yellow-400 uppercase text-sm md:text-base">
              ⚠ You are playing as a guest.{streak && streak.current > 1 ? ` Claim your account so your 🔥 ${streak.current} day streak survives.` : ' Claim your account to keep this identity, your level, and your unlocks.'}
            </p>
            <Link to="/claim">
              <button className={`bg-black text-white dark:bg-yellow-400 dark:text-black border-2 border-black dark:border-yellow-400 font-black uppercase px-5 py-2 whitespace-nowrap transition-all ${brutalHover} ${brutalActive}`}>
                Claim account
              </button>
            </Link>
          </div>
        )}
        
        {/* Welcome Section - Aggressive Typography */}
        <div className="space-y-4">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none text-black dark:text-yellow-400">
            Welcome Back, <br />
            <span className="inline-block mt-2 bg-black text-white dark:bg-yellow-400 dark:text-black px-4 py-1 border-4 border-black dark:border-yellow-400 transform -rotate-2">
              {user?.username || 'Diana'}
            </span>
          </h2>
          <p className="font-mono text-lg font-bold border-l-4 border-black dark:border-yellow-400 pl-4 text-black dark:text-yellow-400 uppercase">
            {prog?.locker?.equipped?.title ? <>“{prog.locker.equipped.title}” · </> : null}
            Initialize your next typing sequence.
            {user && !user.isGuest && (
              <> · <Link to={`/u/${encodeURIComponent(user.username)}`} className="underline">public profile</Link></>
            )}
          </p>
        </div>

        {/* Level + season + stats tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/progress" className="block">
            <div className={`relative p-6 border-4 border-black dark:border-yellow-400 bg-cyan-300 dark:bg-black transition-transform hover:-translate-y-2 ${brutalShadowLight} ${brutalShadowDark} h-full`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-black uppercase text-black dark:text-yellow-400 tracking-widest border-b-2 border-black dark:border-yellow-400 pb-1 inline-block">Level</p>
                  <p className="text-6xl font-black text-black dark:text-yellow-400 font-mono mt-4 tracking-tighter">{prog?.level ?? 1}</p>
                </div>
                <div className="text-4xl">⬆️</div>
              </div>
              <div className="mt-4 w-full h-4 border-2 border-black dark:border-yellow-400 bg-white dark:bg-black overflow-hidden">
                <div className="h-full bg-black dark:bg-yellow-400 transition-all" style={{ width: `${prog?.pct ?? 0}%` }} />
              </div>
              <p className="text-xs text-black dark:text-yellow-400 mt-2 font-bold uppercase font-mono">
                {prog ? `${prog.xp - prog.floor} / ${prog.next - prog.floor} XP to level ${prog.level + 1} · ${prog.unlockedCount}/${prog.total} achievements` : 'LOADING…'}
              </p>
            </div>
          </Link>
          {[
            { label: 'Best WPM', value: String(summary?.bestWpm ?? 0), sub: `AVG ${summary?.avgWpm ?? 0} WPM · ${summary?.games ?? 0} PASSAGES`, icon: '⚡', lightBg: 'bg-pink-300' },
            { label: 'Accuracy', value: `${summary?.avgAccuracy ?? 0}%`, sub: 'LAST 20 PASSAGES', icon: '🎯', lightBg: 'bg-yellow-300' },
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className={`relative p-6 border-4 border-black dark:border-yellow-400 ${stat.lightBg} dark:bg-black transition-transform hover:-translate-y-2 ${brutalShadowLight} ${brutalShadowDark}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-black uppercase text-black dark:text-yellow-400 tracking-widest border-b-2 border-black dark:border-yellow-400 pb-1 inline-block">
                    {stat.label}
                  </p>
                  <p className="text-6xl font-black text-black dark:text-yellow-400 font-mono mt-4 tracking-tighter">
                    {stat.value}
                  </p>
                </div>
                <div className="text-4xl text-black dark:text-yellow-400">
                  {stat.icon}
                </div>
              </div>
              <p className="text-xs text-black dark:text-yellow-400 mt-6 font-bold uppercase font-mono bg-white dark:bg-black border-2 border-black dark:border-yellow-400 px-2 py-1 inline-block">
                {stat.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Start Game CTA - Massive & Loud */}
        <div className={`relative border-4 border-black dark:border-yellow-400 bg-orange-500 dark:bg-yellow-400 ${brutalShadowLight} dark:shadow-[8px_8px_0px_0px_#facc15] p-10 md:p-16 flex flex-col items-center text-center`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none mix-blend-multiply dark:mix-blend-color-burn" />
          
          <div className="relative z-10 space-y-8">
            <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-black">
              Ready for a new challenge?
            </h3>
            <p className="text-black font-mono font-bold text-lg md:text-xl max-w-2xl mx-auto bg-white/80 dark:bg-black/10 border-2 border-black px-4 py-2">
              Select a genre. Warm up your fingers. Destroy the keyboard.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center mt-4">
              <Link to="/genre-selection" className="inline-block">
                <button
                  className={`bg-white dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-black font-black text-2xl px-10 py-5 uppercase transition-all shadow-[8px_8px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none`}
                >
                  🎮 Start New Game
                </button>
              </Link>
              <Link to="/quickmatch" className="inline-block">
                <button
                  className={`bg-black text-white dark:bg-black dark:text-yellow-400 border-4 border-black font-black text-2xl px-10 py-5 uppercase transition-all shadow-[8px_8px_0px_0px_#fff] dark:shadow-[8px_8px_0px_0px_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#fff] dark:hover:shadow-[6px_6px_0px_0px_#facc15] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none`}
                >
                  ⚔️ Quick Match
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Every mode */}
        <div className="space-y-10">
          <div className="flex items-end justify-between border-b-4 border-black dark:border-yellow-400 pb-2 flex-wrap gap-2">
            <h3 className="text-2xl font-black uppercase tracking-tight text-black dark:text-yellow-400">Choose your apocalypse</h3>
            {season && (
              <Link to="/leaderboard" className="font-mono text-xs font-bold uppercase border-2 border-black dark:border-yellow-400 px-2 py-1 bg-white dark:bg-black">
                🏁 Season {season.number} · {seasonDaysLeft}d left{season.myRank ? ` · you are #${season.myRank}` : ''}
              </Link>
            )}
          </div>
          {MODE_GROUPS.map(group => (
            <div key={group.title} className="space-y-4">
              <div>
                <p className="text-lg font-black uppercase tracking-widest">{group.title}</p>
                <p className="font-mono text-xs font-bold text-black/60 dark:text-yellow-400/60 uppercase">{group.blurb}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.modes.map(m => (
                  <Link to={m.to} key={m.to}>
                    <div className={`relative h-full p-5 border-4 border-black dark:border-yellow-400 ${m.bg} dark:bg-black cursor-pointer transition-all ${brutalShadowLight} ${brutalShadowDark} ${brutalHover} ${brutalActive}`}>
                      {m.tag && (
                        <span className="absolute -top-3 -right-2 bg-black text-white dark:bg-yellow-400 dark:text-black font-mono text-[10px] font-black px-2 py-0.5 border-2 border-black dark:border-yellow-400 rotate-3">{m.tag}</span>
                      )}
                      <div className="text-3xl mb-2">{m.icon}</div>
                      <p className="text-xl font-black uppercase leading-tight text-black dark:text-yellow-400">{m.name}</p>
                      <p className="font-mono text-xs font-bold text-black dark:text-yellow-400 mt-2">{m.blurb}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Match history - real data */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-4 border-black dark:border-yellow-400 pb-2">
            <h3 className="text-2xl font-black uppercase tracking-tight text-black dark:text-yellow-400">
              Match History
            </h3>
            <span className="bg-black text-white dark:bg-yellow-400 dark:text-black font-bold uppercase text-xs px-3 py-1">
              Data: {summary?.games ?? 0}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center border-4 border-dashed border-black dark:border-yellow-400 bg-white dark:bg-black flex flex-col items-center justify-center">
              <div className="text-5xl mb-4 grayscale">⌨️</div>
              <h4 className="text-2xl font-black uppercase text-black dark:text-yellow-400 mb-2">
                No Data Found
              </h4>
              <p className="font-mono text-black dark:text-yellow-400 font-bold mb-6">
                Match history is empty. Jump in and set your first record.
              </p>
              <Link to="/genre-selection">
                <button className={`bg-black text-white dark:bg-yellow-400 dark:text-black border-2 border-black dark:border-yellow-400 font-bold uppercase px-6 py-3 transition-all ${brutalHover} ${brutalActive}`}>
                  Play First Game
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* WPM over recent passages - single series, one axis */}
              <div className={`p-6 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black ${brutalShadowLight} ${brutalShadowDark}`}>
                <p className="text-sm font-black uppercase tracking-widest text-black dark:text-yellow-400 mb-4">
                  WPM — last {history.length} passages
                </p>
                <div className="flex items-end gap-[3px] h-32 border-b-2 border-black dark:border-yellow-400">
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
                <p className="font-mono text-xs font-bold text-black dark:text-yellow-400 mt-2">
                  ◼ best run {summary?.bestWpm ?? 0} WPM highlighted · hover a bar for details
                </p>
              </div>

              {/* recent passages table */}
              <div className={`p-6 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black ${brutalShadowLight} ${brutalShadowDark} overflow-x-auto`}>
                <p className="text-sm font-black uppercase tracking-widest text-black dark:text-yellow-400 mb-4">
                  Recent passages
                </p>
                <table className="w-full font-mono text-sm text-black dark:text-yellow-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <tbody>
                    {history.slice(-8).reverse().map((h, i) => (
                      <tr key={i} className="border-b border-black/10 dark:border-yellow-400/10">
                        <td className="py-1 font-bold uppercase">{h.context}{h.mode && h.mode !== h.context ? ` · ${h.mode}` : ''}</td>
                        <td className="text-right font-black">{h.wpm} wpm</td>
                        <td className="text-right">{h.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ghost shelf */}
          {ghosts.length > 0 && (
            <div className={`p-6 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black ${brutalShadowLight} ${brutalShadowDark}`}>
              <p className="text-sm font-black uppercase tracking-widest text-black dark:text-yellow-400 mb-1">
                👻 Ghost shelf — race your past self
              </p>
              <p className="font-mono text-xs font-bold text-black/60 dark:text-yellow-400/60 mb-4">
                Every finished story passage is recorded keystroke for keystroke. Share a link to make friends race your ghost.
              </p>
              <div className="flex flex-wrap gap-3">
                {ghosts.slice(0, 6).map(g => (
                  <div key={g.id} className={`border-2 border-black dark:border-yellow-400 bg-purple-100 dark:bg-black`}>
                    <button
                      onClick={() => navigate(`/ghost/${g.id}`)}
                      className="text-left px-3 py-2 block"
                    >
                      <span className="font-black text-black dark:text-yellow-400">👻 {g.wpm} WPM</span>
                      <span className="font-mono text-xs block text-black/70 dark:text-yellow-400/70">{g.genre} · “{g.preview.slice(0, 28)}…”</span>
                    </button>
                    <button
                      onClick={async (e) => {
                        const btn = e.currentTarget;
                        if (await copyGhostLink(g.id)) {
                          btn.textContent = '✓ copied';
                          setTimeout(() => { btn.textContent = '🔗 copy challenge link'; }, 1500);
                        }
                      }}
                      className="w-full border-t-2 border-black dark:border-yellow-400 font-mono text-[11px] font-bold uppercase py-1 text-black dark:text-yellow-400 hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black"
                    >
                      🔗 copy challenge link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Achievements - real data from the progression engine */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-4 border-black dark:border-yellow-400 pb-2 flex-wrap gap-2">
            <h3 className="text-2xl font-black uppercase tracking-tight text-black dark:text-yellow-400">
              Achievements
            </h3>
            <Link to="/progress" className="bg-black text-white dark:bg-yellow-400 dark:text-black font-bold uppercase text-xs px-3 py-1">
              {prog ? `${prog.unlockedCount} / ${prog.total} · see all + locker →` : 'see all →'}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...recentUnlocked, ...nextLocked].map((a) => (
              <Link to="/progress" key={a.key}>
                <div
                  title={a.description}
                  className={`p-6 h-full text-center border-4 border-black dark:border-yellow-400 transition-all ${
                    a.unlocked ? 'bg-yellow-300 dark:bg-black' : 'bg-gray-200 dark:bg-black/50 opacity-80 hover:opacity-100'
                  } ${brutalShadowLight} ${brutalShadowDark}`}
                >
                  <div className={`text-4xl mb-4 ${a.unlocked ? '' : 'grayscale opacity-50'}`}>
                    {a.icon}
                  </div>
                  <p className="font-black uppercase text-black dark:text-yellow-400 text-sm mb-3">
                    {a.name}
                  </p>
                  <div className="inline-block border-2 border-black dark:border-yellow-400 bg-black text-white dark:bg-yellow-400 dark:text-black px-2 py-1 text-xs font-bold uppercase font-mono">
                    {a.unlocked ? '✓ Unlocked' : `🔒 ${a.description}`}
                  </div>
                </div>
              </Link>
            ))}
            {!prog && [0, 1, 2, 3].map(i => (
              <div key={i} className={`p-6 h-32 border-4 border-dashed border-black/30 dark:border-yellow-400/30 animate-pulse`} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
