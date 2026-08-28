import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface MySummary { games: number; bestWpm: number; avgWpm: number; avgAccuracy: number; totalTyped: number }
interface HistoryPoint { wpm: number; accuracy: number; context: string; mode?: string; at: string }
interface GhostRow { id: string; wpm: number; accuracy: number; genre: string; preview: string; at: string }
interface Streak { current: number; longest: number; atRisk: boolean }

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<MySummary | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [ghosts, setGhosts] = useState<GhostRow[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    axios.get('/stats/me').then(res => {
      setSummary(res.data.summary);
      setHistory(res.data.history);
      setStreak(res.data.streak);
    }).catch(() => {});
    axios.get('/ghosts/mine').then(res => setGhosts(res.data)).catch(() => {});
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

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black pb-20">
      
      {/* Header - Stark & Geometric */}
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-black dark:bg-yellow-400 flex items-center justify-center text-[#f4f4f0] dark:text-black font-black text-xl border-2 border-black dark:border-yellow-400">
              T
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">
              Typocalypse
            </h1>
          </div>
          <div className="flex items-center gap-6">
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
              ⚠ You are playing as a guest.{streak && streak.current > 1 ? ` Claim your account so your 🔥 ${streak.current} day streak survives.` : ' Claim your account to keep this identity and your progress.'}
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
            Initialize your next typing sequence.
          </p>
        </div>

        {/* Stats Overview - High Contrast Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Games Played', value: String(summary?.games ?? 0), sub: summary?.games ? 'PASSAGES COMPLETED' : 'INITIALIZE FIRST MATCH', icon: '🎮', lightBg: 'bg-cyan-300' },
            { label: 'Best WPM', value: String(summary?.bestWpm ?? 0), sub: `AVG ${summary?.avgWpm ?? 0} WPM`, icon: '⚡', lightBg: 'bg-pink-300' },
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
              <Link to="/multiplayer" className="inline-block">
                <button
                  className={`bg-black text-white dark:bg-black dark:text-yellow-400 border-4 border-black font-black text-2xl px-10 py-5 uppercase transition-all shadow-[8px_8px_0px_0px_#fff] dark:shadow-[8px_8px_0px_0px_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#fff] dark:hover:shadow-[6px_6px_0px_0px_#facc15] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none`}
                >
                  🧟 Multiplayer
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Training + Ladder shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/stats">
            <div className={`p-6 border-4 border-black dark:border-yellow-400 bg-purple-300 dark:bg-black cursor-pointer transition-all ${brutalShadowLight} ${brutalShadowDark} ${brutalHover} ${brutalActive}`}>
              <p className="text-2xl font-black uppercase text-black dark:text-yellow-400">🧪 Training Lab</p>
              <p className="font-mono text-sm font-bold text-black dark:text-yellow-400 mt-2">Weak-key heatmap · AI coach · targeted drills</p>
            </div>
          </Link>
          <Link to="/leaderboard">
            <div className={`p-6 border-4 border-black dark:border-yellow-400 bg-green-300 dark:bg-black cursor-pointer transition-all ${brutalShadowLight} ${brutalShadowDark} ${brutalHover} ${brutalActive}`}>
              <p className="text-2xl font-black uppercase text-black dark:text-yellow-400">🏆 Global Ladder</p>
              <p className="font-mono text-sm font-bold text-black dark:text-yellow-400 mt-2">Weekly and all-time best clean runs</p>
            </div>
          </Link>
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
                  <button
                    key={g.id}
                    onClick={() => navigate(`/ghost/${g.id}`)}
                    className={`text-left border-2 border-black dark:border-yellow-400 px-3 py-2 bg-purple-100 dark:bg-black transition-all ${brutalHover} ${brutalActive}`}
                  >
                    <span className="font-black text-black dark:text-yellow-400">👻 {g.wpm} WPM</span>
                    <span className="font-mono text-xs block text-black/70 dark:text-yellow-400/70">{g.genre} · “{g.preview.slice(0, 28)}…”</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Achievements Section - Geometric Grid */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black uppercase tracking-tight border-b-4 border-black dark:border-yellow-400 pb-2 text-black dark:text-yellow-400">
            Achievements
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🎮', label: 'First Game', unlocked: (summary?.games ?? 0) >= 1 },
              { icon: '⚡', label: 'Speed Demon', unlocked: (summary?.bestWpm ?? 0) >= 60, hint: '60+ WPM' },
              { icon: '🎯', label: 'Accuracy Master', unlocked: (summary?.avgAccuracy ?? 0) >= 95 && (summary?.games ?? 0) >= 5, hint: '95% avg' },
              { icon: '🏆', label: 'Marathon', unlocked: (summary?.games ?? 0) >= 25, hint: '25 passages' },
            ].map((achievement, idx) => (
              <div
                key={idx}
                className={`p-6 text-center border-4 border-black dark:border-yellow-400 transition-all ${
                  achievement.unlocked ? 'bg-yellow-300 dark:bg-black' : 'bg-gray-200 dark:bg-black/50 opacity-80 hover:opacity-100'
                } ${brutalShadowLight} ${brutalShadowDark}`}
              >
                <div className={`text-4xl mb-4 ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                  {achievement.icon}
                </div>
                <p className="font-black uppercase text-black dark:text-yellow-400 text-sm mb-3">
                  {achievement.label}
                </p>
                <div className="inline-block border-2 border-black dark:border-yellow-400 bg-black text-white dark:bg-yellow-400 dark:text-black px-2 py-1 text-xs font-bold uppercase font-mono">
                  {achievement.unlocked ? '✓ Unlocked' : `🔒 ${achievement.hint ?? 'Locked'}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;