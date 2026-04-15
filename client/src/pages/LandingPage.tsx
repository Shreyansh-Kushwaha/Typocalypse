import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LandingPage: React.FC = () => {
  const { user } = useAuth();

  const brutalShadowLight = "shadow-[8px_8px_0px_0px_#000]";
  const brutalShadowDark = "dark:shadow-[8px_8px_0px_0px_#facc15]";
  const brutalHover = "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15]";
  const brutalActive = "active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:active:shadow-none";

  const features = [
    { icon: '⚡', title: 'Adaptive Engine', description: 'Real-time difficulty adjustment based on WPM.', lightBg: 'bg-cyan-300' },
    { icon: '🎯', title: 'Focus Protocol', description: 'Distraction-free environment. Just you and the keys.', lightBg: 'bg-pink-300' },
    { icon: '🏆', title: 'Global Ladder', description: 'Destroy the competition and climb the ranks.', lightBg: 'bg-yellow-300' },
    { icon: '📚', title: '7+ Sectors', description: 'Horror, Sci-Fi, Mystery, Fantasy, and Custom.', lightBg: 'bg-green-300' },
    { icon: '🎨', title: 'High Contrast', description: 'Eye-bleedingly cool light and dark themes.', lightBg: 'bg-orange-300' },
    { icon: '💾', title: 'Auto-Sync', description: 'Progress secured locally and in the cloud.', lightBg: 'bg-purple-300' },
  ];

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black overflow-x-hidden">
      
      {/* Background Grid - CSS Pattern for Brutalism */}
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Navigation / Header */}
      <nav className="fixed top-0 w-full z-50 border-b-4 border-black dark:border-yellow-400 bg-[#f4f4f0] dark:bg-black">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
            <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2 py-1 border-2 border-black dark:border-yellow-400">T</span>
            Typocalypse
          </div>
          {user && (
            <div className="font-mono font-bold text-sm bg-green-300 dark:bg-black border-2 border-black dark:border-yellow-400 px-3 py-1 text-black dark:text-yellow-400">
              STATUS: ONLINE
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center py-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          
          {/* Aggressive Headline */}
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter leading-[0.9]">
            Type.<br />
            <span className="inline-block bg-black text-white dark:bg-yellow-400 dark:text-black px-6 py-2 border-4 border-black dark:border-yellow-400 transform -rotate-2 mt-2 shadow-[12px_12px_0px_0px_#ff007f] dark:shadow-[12px_12px_0px_0px_#fff]">
              Survive.
            </span><br />
            Repeat.
          </h1>

          <p className="font-mono text-xl md:text-2xl font-bold max-w-2xl mx-auto bg-white dark:bg-black border-4 border-black dark:border-yellow-400 p-4 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#facc15]">
            An immersive typing protocol where every keystroke alters the narrative.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
            {user ? (
              <Link to="/dashboard" className="w-full sm:w-auto">
                <button className={`w-full bg-cyan-400 dark:bg-yellow-400 text-black border-4 border-black font-black text-2xl px-10 py-5 uppercase transition-all ${brutalShadowLight} dark:shadow-[8px_8px_0px_0px_#fff] ${brutalHover} ${brutalActive}`}>
                  ACCESS DASHBOARD →
                </button>
              </Link>
            ) : (
              <>
                <Link to="/signup" className="w-full sm:w-auto">
                  <button className={`w-full bg-pink-500 dark:bg-yellow-400 text-black border-4 border-black font-black text-2xl px-10 py-5 uppercase transition-all ${brutalShadowLight} dark:shadow-[8px_8px_0px_0px_#fff] ${brutalHover} ${brutalActive}`}>
                    INITIALIZE GAME →
                  </button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <button className={`w-full bg-white dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 font-black text-2xl px-10 py-5 uppercase transition-all ${brutalShadowLight} ${brutalShadowDark} ${brutalHover} ${brutalActive}`}>
                    AUTHENTICATE
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Terminal Faux-Preview */}
          <div className={`mt-20 w-full max-w-3xl mx-auto border-4 border-black dark:border-yellow-400 bg-black text-left ${brutalShadowLight} ${brutalShadowDark}`}>
            {/* Terminal Header */}
            <div className="bg-gray-200 dark:bg-yellow-400 border-b-4 border-black dark:border-yellow-400 p-2 flex gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-black bg-red-500" />
              <div className="w-4 h-4 rounded-full border-2 border-black bg-yellow-500" />
              <div className="w-4 h-4 rounded-full border-2 border-black bg-green-500" />
              <span className="ml-4 font-mono text-xs font-bold uppercase text-black">Typocalypse.exe</span>
            </div>
            {/* Terminal Body */}
              <div className="p-6 md:p-8 font-mono text-lg md:text-xl space-y-4">
                <div className="text-gray-500 line-through decoration-red-500 decoration-4">
                  &gt; The ancient dragon landed sftly...
                </div>
                <div className="text-white">
                  <span className="text-green-400">&gt; The ancient dragon landed softly</span><span className="animate-pulse bg-white text-black">_</span>
                </div>
              <div className="pt-6 border-t-2 border-dashed border-gray-700 flex justify-between text-xs md:text-sm text-cyan-400 font-bold uppercase">
                <span>WPM: 114</span>
                <span>ERRORS: 1</span>
                <span>SYS_STABLE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Marquee / Divider */}
      <div className="border-y-4 border-black dark:border-yellow-400 bg-yellow-300 dark:bg-black overflow-hidden py-3 flex whitespace-nowrap">
        <div className="animate-marquee font-black uppercase text-xl text-black dark:text-yellow-400 tracking-widest flex gap-8">
          <span>WARNING: HIGH SPEED REQUIRED</span> • <span>NO MERCY FOR TYPOS</span> • <span>ADAPT OR FAIL</span> • <span>WARNING: HIGH SPEED REQUIRED</span> • <span>NO MERCY FOR TYPOS</span> • <span>ADAPT OR FAIL</span> •
        </div>
      </div>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-6 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 border-l-8 border-black dark:border-yellow-400 pl-6">
            <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-black dark:text-yellow-400">
              System Specs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className={`p-8 border-4 border-black dark:border-yellow-400 ${feature.lightBg} dark:bg-black ${brutalShadowLight} ${brutalShadowDark} hover:-translate-y-2 transition-transform duration-200`}
              >
                <div className="text-5xl mb-6 bg-white dark:bg-black border-4 border-black dark:border-yellow-400 w-20 h-20 flex items-center justify-center transform -rotate-3">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black uppercase text-black dark:text-yellow-400 mb-3">
                  {feature.title}
                </h3>
                <p className="font-mono font-bold text-black dark:text-yellow-400 border-t-2 border-black dark:border-yellow-400 pt-3">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Massive CTA Section */}
      <section className="py-24 px-6 bg-orange-500 dark:bg-yellow-400 flex flex-col items-center text-center">
        <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-black mb-8 border-b-8 border-black pb-4">
          DO YOU HAVE <br/> WHAT IT TAKES?
        </h2>
        
        {user ? (
          <Link to="/dashboard">
            <button className={`bg-white text-black border-4 border-black font-black text-3xl px-12 py-6 uppercase transition-all shadow-[10px_10px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[8px_8px_0px_0px_#000] active:translate-x-[10px] active:translate-y-[10px] active:shadow-none`}>
              RETURN TO BATTLE
            </button>
          </Link>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            <Link to="/signup">
              <button className={`bg-black text-white dark:bg-black dark:text-yellow-400 border-4 border-black font-black text-2xl md:text-3xl px-12 py-6 uppercase transition-all shadow-[10px_10px_0px_0px_#fff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[8px_8px_0px_0px_#fff] active:translate-x-[10px] active:translate-y-[10px] active:shadow-none`}>
                CREATE ACCOUNT
              </button>
            </Link>
            <button className={`bg-white text-black border-4 border-black font-black text-xl md:text-2xl px-8 py-6 uppercase transition-all shadow-[10px_10px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[8px_8px_0px_0px_#000] active:translate-x-[10px] active:translate-y-[10px] active:shadow-none`}>
              GUEST MODE
            </button>
          </div>
        )}
      </section>

      {/* Brutalist Footer */}
      <footer className="bg-[#f4f4f0] dark:bg-black border-t-8 border-black dark:border-yellow-400 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-3xl font-black uppercase tracking-tighter text-black dark:text-yellow-400">
            Typocalypse.
          </div>
          <div className="font-mono font-bold text-sm text-black dark:text-yellow-400 border-2 border-black dark:border-yellow-400 p-2 text-center">
            © 2026 // ALL RIGHTS RESERVED // KEEP TYPING
          </div>
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