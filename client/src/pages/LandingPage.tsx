import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SeoFor } from '../seo';

const REPO_URL = 'https://github.com/Shreyansh-Kushwaha/Typocalypse';

const LandingPage: React.FC = () => {
  const { user, guestLogin } = useAuth();
  const navigate = useNavigate();
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState('');

  const handleGuest = async () => {
    if (guestBusy) return;
    setGuestBusy(true);
    setGuestError('');
    try {
      await guestLogin();
      navigate('/dashboard');
    } catch (err: any) {
      setGuestError(err?.message || 'Guest login failed');
      setGuestBusy(false);
    }
  };

  const brutalShadowLight = "shadow-[8px_8px_0px_0px_#000]";
  const brutalShadowDark = "dark:shadow-[8px_8px_0px_0px_#facc15]";
  const brutalHover = "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15]";
  const brutalActive = "active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:active:shadow-none";

  const features = [
    { icon: '📖', title: 'Living Stories', description: 'AI-written passages stream in as you type. Every choice branches the plot.', lightBg: 'bg-cyan-300' },
    { icon: '🗺️', title: 'Campaign', description: 'Four zones, 24 nodes, mutators like fog, storm, and night. Earn every star.', lightBg: 'bg-green-300' },
    { icon: '☄️', title: 'Arcade', description: 'Meteor Shower, Last Words memory runs, and Radio dictation through the static.', lightBg: 'bg-pink-300' },
    { icon: '⚔️', title: 'Quick Match', description: 'Rated 1v1 duels, nine multiplayer modes, and a weekend tournament.', lightBg: 'bg-yellow-300' },
    { icon: '⬆️', title: 'Levels & Locker', description: '48 achievements, XP, unlockable themes, carets, and sound packs.', lightBg: 'bg-orange-300' },
    { icon: '📱', title: 'Installable', description: 'Works offline as an app. Timed tests and drills never need a signal.', lightBg: 'bg-purple-300' },
  ];

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black overflow-x-hidden">
      <SeoFor path="/" />

      {/* Background Grid - CSS Pattern for Brutalism */}
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Navigation / Header */}
      <nav className="fixed top-0 w-full z-50 border-b-4 border-black dark:border-yellow-400 bg-[#f4f4f0] dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-2">
          <div className="text-xl sm:text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2 py-1 border-2 border-black dark:border-yellow-400">T</span>
            Typocalypse
          </div>
          {user && (
            <div className="font-mono font-bold text-xs sm:text-sm bg-green-300 dark:bg-black border-2 border-black dark:border-yellow-400 px-3 py-1 text-black dark:text-yellow-400">
              STATUS: ONLINE
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center py-28 sm:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8 sm:space-y-10 w-full">

          {/* Aggressive Headline */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter leading-[0.9]">
            Type.<br />
            <span className="inline-block bg-black text-white dark:bg-yellow-400 dark:text-black px-4 sm:px-6 py-2 border-4 border-black dark:border-yellow-400 transform -rotate-2 mt-2 shadow-[12px_12px_0px_0px_#ff007f] dark:shadow-[12px_12px_0px_0px_#fff]">
              Survive.
            </span><br />
            Repeat.
          </h1>

          <p className="font-mono text-base sm:text-xl md:text-2xl font-bold max-w-2xl mx-auto bg-white dark:bg-black border-4 border-black dark:border-yellow-400 p-4 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#facc15] break-words">
            An immersive typing protocol where every keystroke alters the narrative.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center pt-6 sm:pt-8">
            {user ? (
              <Link to="/dashboard" className="w-full sm:w-auto">
                <button className={`w-full bg-cyan-400 dark:bg-yellow-400 text-black border-4 border-black font-black text-xl sm:text-2xl px-6 sm:px-10 py-4 sm:py-5 uppercase transition-all ${brutalShadowLight} dark:shadow-[8px_8px_0px_0px_#fff] ${brutalHover} ${brutalActive}`}>
                  ACCESS DASHBOARD →
                </button>
              </Link>
            ) : (
              <>
                <Link to="/signup" className="w-full sm:w-auto">
                  <button className={`w-full bg-pink-500 dark:bg-yellow-400 text-black border-4 border-black font-black text-xl sm:text-2xl px-6 sm:px-10 py-4 sm:py-5 uppercase transition-all ${brutalShadowLight} dark:shadow-[8px_8px_0px_0px_#fff] ${brutalHover} ${brutalActive}`}>
                    INITIALIZE GAME →
                  </button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <button className={`w-full bg-white dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 font-black text-xl sm:text-2xl px-6 sm:px-10 py-4 sm:py-5 uppercase transition-all ${brutalShadowLight} ${brutalShadowDark} ${brutalHover} ${brutalActive}`}>
                    AUTHENTICATE
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Terminal Faux-Preview */}
          <div className={`mt-12 sm:mt-20 w-full max-w-3xl mx-auto border-4 border-black dark:border-yellow-400 bg-black text-left ${brutalShadowLight} ${brutalShadowDark}`}>
            {/* Terminal Header */}
            <div className="bg-gray-200 dark:bg-yellow-400 border-b-4 border-black dark:border-yellow-400 p-2 flex flex-wrap gap-2 items-center">
              <div className="w-4 h-4 rounded-full border-2 border-black bg-red-500" aria-hidden="true" />
              <div className="w-4 h-4 rounded-full border-2 border-black bg-yellow-500" aria-hidden="true" />
              <div className="w-4 h-4 rounded-full border-2 border-black bg-green-500" aria-hidden="true" />
              <span className="ml-2 sm:ml-4 font-mono text-xs font-bold uppercase text-black">Typocalypse.exe</span>
            </div>
            {/* Terminal Body */}
              <div className="p-4 sm:p-6 md:p-8 font-mono text-sm sm:text-lg md:text-xl space-y-4">
                <div className="text-gray-500 line-through decoration-red-500 decoration-4 break-words">
                  &gt; The ancient dragon landed sftly...
                </div>
                <div className="text-white break-words">
                  <span className="text-green-400">&gt; The ancient dragon landed softly</span><span className="animate-pulse bg-white text-black">_</span>
                </div>
              <div className="pt-6 border-t-2 border-dashed border-gray-700 flex flex-wrap gap-x-4 gap-y-1 justify-between text-xs md:text-sm text-cyan-400 font-bold uppercase">
                <span>WPM: 114</span>
                <span>ERRORS: 1</span>
                <span>SYS_STABLE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Marquee / Divider */}
      <div className="border-y-4 border-black dark:border-yellow-400 bg-yellow-300 dark:bg-black overflow-hidden py-3 flex whitespace-nowrap" aria-hidden="true">
        <div className="animate-marquee font-black uppercase text-base sm:text-xl text-black dark:text-yellow-400 tracking-widest flex gap-8">
          <span>WARNING: HIGH SPEED REQUIRED</span> • <span>NO MERCY FOR TYPOS</span> • <span>ADAPT OR FAIL</span> • <span>WARNING: HIGH SPEED REQUIRED</span> • <span>NO MERCY FOR TYPOS</span> • <span>ADAPT OR FAIL</span> •
        </div>
      </div>

      {/* Features Section */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 sm:mb-16 border-l-8 border-black dark:border-yellow-400 pl-4 sm:pl-6">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter text-black dark:text-yellow-400">
              System Specs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`p-6 sm:p-8 border-4 border-black dark:border-yellow-400 ${feature.lightBg} dark:bg-black ${brutalShadowLight} ${brutalShadowDark} hover:-translate-y-2 transition-transform duration-200`}
              >
                <div className="text-4xl sm:text-5xl mb-6 bg-white dark:bg-black border-4 border-black dark:border-yellow-400 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center transform -rotate-3" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-black dark:text-yellow-400 mb-3">
                  {feature.title}
                </h3>
                <p className="font-mono font-bold text-sm sm:text-base text-black dark:text-yellow-400 border-t-2 border-black dark:border-yellow-400 pt-3 break-words">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Massive CTA Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-orange-500 dark:bg-yellow-400 flex flex-col items-center text-center">
        <h2 className="text-3xl sm:text-5xl md:text-8xl font-black uppercase tracking-tighter text-black mb-8 border-b-8 border-black pb-4">
          DO YOU HAVE <br/> WHAT IT TAKES?
        </h2>

        {user ? (
          <Link to="/dashboard" className="w-full sm:w-auto max-w-md">
            <button className={`w-full bg-white text-black border-4 border-black font-black text-2xl sm:text-3xl px-6 sm:px-12 py-5 sm:py-6 uppercase transition-all shadow-[10px_10px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[8px_8px_0px_0px_#000] active:translate-x-[10px] active:translate-y-[10px] active:shadow-none`}>
              RETURN TO BATTLE
            </button>
          </Link>
        ) : (
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full max-w-md md:max-w-none md:w-auto">
            <Link to="/signup" className="w-full md:w-auto">
              <button className={`w-full bg-black text-white dark:bg-black dark:text-yellow-400 border-4 border-black font-black text-xl sm:text-2xl md:text-3xl px-6 sm:px-12 py-5 sm:py-6 uppercase transition-all shadow-[10px_10px_0px_0px_#fff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[8px_8px_0px_0px_#fff] active:translate-x-[10px] active:translate-y-[10px] active:shadow-none`}>
                CREATE ACCOUNT
              </button>
            </Link>
            <button
              onClick={handleGuest}
              disabled={guestBusy}
              aria-busy={guestBusy}
              className={`w-full md:w-auto bg-white text-black border-4 border-black font-black text-lg sm:text-xl md:text-2xl px-6 sm:px-8 py-5 sm:py-6 uppercase transition-all shadow-[10px_10px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[8px_8px_0px_0px_#000] active:translate-x-[10px] active:translate-y-[10px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none`}
            >
              {guestBusy ? 'Waking the wasteland…' : 'GUEST MODE'}
            </button>
          </div>
        )}
        <div aria-live="polite" className="w-full max-w-md">
          {guestError && (
            <p role="alert" className="mt-4 font-mono font-bold text-black bg-white border-4 border-black px-3 py-2 break-words">
              Could not start a guest session: {guestError}{' '}
              <button onClick={handleGuest} className="underline font-black uppercase">Try again</button>
            </p>
          )}
        </div>
      </section>

      {/* Brutalist Footer */}
      <footer className="bg-[#f4f4f0] dark:bg-black border-t-8 border-black dark:border-yellow-400 py-10 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-black dark:text-yellow-400">
              Typocalypse.
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-3">
              <Link to="/privacy" className="font-mono text-xs sm:text-sm font-bold uppercase border-2 border-black dark:border-yellow-400 px-3 py-2 bg-white dark:bg-black hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black transition-colors">
                Privacy
              </Link>
              <Link to="/leaderboard" className="font-mono text-xs sm:text-sm font-bold uppercase border-2 border-black dark:border-yellow-400 px-3 py-2 bg-white dark:bg-black hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black transition-colors">
                Global ladder
              </Link>
              <Link to="/daily" className="font-mono text-xs sm:text-sm font-bold uppercase border-2 border-black dark:border-yellow-400 px-3 py-2 bg-white dark:bg-black hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black transition-colors">
                Daily Apocalypse
              </Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-xs sm:text-sm font-bold uppercase border-2 border-black dark:border-yellow-400 px-3 py-2 bg-white dark:bg-black hover:bg-black hover:text-white dark:hover:bg-yellow-400 dark:hover:text-black transition-colors"
              >
                Source on GitHub
              </a>
            </nav>
          </div>
          <p className="font-mono font-bold text-xs sm:text-sm text-black dark:text-yellow-400 border-2 border-black dark:border-yellow-400 p-3 break-words">
            Typocalypse is free and open source. No ads, no paywalls, no account required — play in the browser or install it as an app.
          </p>
          <p className="font-mono font-bold text-xs text-black/70 dark:text-yellow-400/70 uppercase">
            © 2026 // KEEP TYPING
          </p>
        </div>
      </footer>

      {/* Global CSS for Marquee Animation - add to your globals.css if not present */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
