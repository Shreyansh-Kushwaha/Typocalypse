import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
            { label: 'Games Played', value: '0', sub: 'INITIALIZE FIRST MATCH', icon: '🎮', lightBg: 'bg-cyan-300' },
            { label: 'Best WPM', value: '0', sub: 'PERSONAL RECORD', icon: '⚡', lightBg: 'bg-pink-300' },
            { label: 'Accuracy', value: '0%', sub: 'PRECISION RATING', icon: '🎯', lightBg: 'bg-yellow-300' },
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
            
            <Link to="/genre-selection" className="inline-block mt-4">
              <button
                className={`bg-white dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-black font-black text-2xl px-10 py-5 uppercase transition-all shadow-[8px_8px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none`}
              >
                🎮 Start New Game
              </button>
            </Link>
          </div>
        </div>

        {/* Recent Games Section - Stark Empty State */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b-4 border-black dark:border-yellow-400 pb-2">
            <h3 className="text-2xl font-black uppercase tracking-tight text-black dark:text-yellow-400">
              Match History
            </h3>
            <span className="bg-black text-white dark:bg-yellow-400 dark:text-black font-bold uppercase text-xs px-3 py-1">
              Data: 0
            </span>
          </div>
          
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
        </div>

        {/* Achievements Section - Geometric Grid */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black uppercase tracking-tight border-b-4 border-black dark:border-yellow-400 pb-2 text-black dark:text-yellow-400">
            Achievements
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🎮', label: 'First Game' },
              { icon: '⚡', label: 'Speed Demon' },
              { icon: '🎯', label: 'Accuracy Master' },
              { icon: '🏆', label: 'Champion' },
            ].map((achievement, idx) => (
              <div 
                key={idx} 
                className={`p-6 text-center border-4 border-black dark:border-yellow-400 bg-gray-200 dark:bg-black/50 opacity-80 transition-all hover:opacity-100 ${brutalShadowLight} ${brutalShadowDark}`}
              >
                <div className="text-4xl mb-4 grayscale opacity-50">
                  {achievement.icon}
                </div>
                <p className="font-black uppercase text-black dark:text-yellow-400 text-sm mb-3">
                  {achievement.label}
                </p>
                <div className="inline-block border-2 border-black dark:border-yellow-400 bg-black text-white dark:bg-yellow-400 dark:text-black px-2 py-1 text-xs font-bold uppercase font-mono">
                  🔒 Locked
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