import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Seo } from '../seo';
import { useAuth } from '../contexts/AuthContext';

// 404. Same brutalist furniture as the rest of the site, kept short and
// useful: say what happened, then hand over the places worth going.

const DESTINATIONS = [
  { to: '/daily', icon: '🧟', name: 'Daily Apocalypse', blurb: 'One passage, one attempt, the whole world.', bg: 'bg-orange-300' },
  { to: '/practice', icon: '⏱️', name: 'Timed test', blurb: '15, 30, or 60 seconds. Works offline.', bg: 'bg-cyan-300' },
  { to: '/campaign', icon: '🗺️', name: 'Campaign', blurb: '24 nodes, eight mutators, stars to earn.', bg: 'bg-green-300' },
  { to: '/arcade/meteor', icon: '☄️', name: 'Meteor Shower', blurb: 'Type the falling words before they land.', bg: 'bg-pink-300' },
  { to: '/library', icon: '📚', name: 'Story library', blurb: 'Read and type what other survivors wrote.', bg: 'bg-purple-300' },
  { to: '/leaderboard', icon: '🏆', name: 'Global ladder', blurb: 'The fastest clean runs anywhere.', bg: 'bg-yellow-300' },
];

const NotFoundPage: React.FC = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black relative pb-16">
      <Seo
        title="Page not found"
        description="This Typocalypse page does not exist. Head back to the daily challenge, the campaign, or the arcade."
        noIndex
      />
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="text-xl sm:text-2xl font-black uppercase tracking-tighter">
            Typo<span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-1">calypse</span>
          </Link>
          <Link to={user ? '/dashboard' : '/'}>
            <span className="font-black uppercase text-xs sm:text-sm border-2 border-black dark:border-yellow-400 px-3 py-1 bg-cyan-300 dark:bg-black inline-block">
              {user ? 'Dashboard' : 'Home'}
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 relative z-10 space-y-10 sm:space-y-14">
        <div className="space-y-6">
          <p
            aria-hidden="true"
            className="text-[26vw] sm:text-[12rem] leading-[0.8] font-black tracking-tighter select-none"
          >
            4<span className="inline-block bg-black text-[#f4f4f0] dark:bg-yellow-400 dark:text-black px-2 -rotate-3">0</span>4
          </p>
          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none">
            This page did not survive
          </h1>
          <p className="font-mono text-sm sm:text-base font-bold border-l-4 border-black dark:border-yellow-400 pl-4 break-words">
            Nothing answers at <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-1 break-all">{pathname}</span>.
            It was moved, mistyped, or it never existed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link to={user ? '/dashboard' : '/'} className="w-full sm:w-auto">
              <button className="w-full bg-cyan-300 dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 font-black text-lg sm:text-xl px-8 py-4 uppercase transition-all shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:active:shadow-none">
                {user ? '← Back to dashboard' : '← Back to safety'}
              </button>
            </Link>
            <Link to="/daily" className="w-full sm:w-auto">
              <button className="w-full bg-orange-300 dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 font-black text-lg sm:text-xl px-8 py-4 uppercase transition-all shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:active:shadow-none">
                🧟 Type today's daily
              </button>
            </Link>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight border-b-4 border-black dark:border-yellow-400 pb-2">
            Somewhere that does exist
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DESTINATIONS.map(d => (
              <Link to={d.to} key={d.to}>
                <div className={`h-full p-4 border-4 border-black dark:border-yellow-400 ${d.bg} dark:bg-black transition-all shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#facc15] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#facc15] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none dark:active:shadow-none`}>
                  <div className="text-2xl mb-1" aria-hidden="true">{d.icon}</div>
                  <p className="font-black uppercase leading-tight">{d.name}</p>
                  <p className="font-mono text-xs font-bold mt-1">{d.blurb}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default NotFoundPage;
