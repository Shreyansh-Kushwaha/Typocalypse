import React from 'react';
import { useNavigate } from 'react-router-dom';

const genres = [
  { id: 'fantasy', icon: '⚔️', name: 'FANTASY', description: 'Magical worlds & epic quests', lightBg: 'bg-cyan-300' },
  { id: 'horror', icon: '👻', name: 'HORROR', description: 'Thrilling tales of fear', lightBg: 'bg-purple-400' },
  { id: 'sci-fi', icon: '🚀', name: 'SCI-FI', description: 'Future worlds & tech', lightBg: 'bg-green-400' },
  { id: 'mystery', icon: '🕵️', name: 'MYSTERY', description: 'Puzzles & detective stories', lightBg: 'bg-pink-400' },
  { id: 'adventure', icon: '🗻', name: 'ADVENTURE', description: 'Journeys & exploration', lightBg: 'bg-orange-400' },
  { id: 'romance', icon: '💔', name: 'ROMANCE', description: 'Love & relationships', lightBg: 'bg-red-400' },
  { id: 'custom', icon: '🚧', name: 'CUSTOM', description: 'Under Construction', disabled: true, lightBg: 'bg-gray-300' },
];

interface GenreCardProps {
  icon: string;
  name: string;
  description: string;
  disabled?: boolean;
  lightBg: string;
  onSelect: () => void;
}

const brutalShadowLight = "shadow-[6px_6px_0px_0px_#000]";
const brutalShadowDark = "dark:shadow-[6px_6px_0px_0px_#facc15]";
const brutalHover = "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#facc15]";
const brutalActive = "active:translate-x-[6px] active:translate-y-[6px] active:shadow-none dark:active:shadow-none";

const GenreCard: React.FC<GenreCardProps> = ({ icon, name, description, disabled, lightBg, onSelect }) => {
  if (disabled) {
    return (
      <div className="relative border-4 border-dashed border-black dark:border-yellow-400/50 bg-gray-200 dark:bg-black opacity-70 cursor-not-allowed p-6 flex flex-col items-center justify-center text-center grayscale">
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className="text-xl font-black uppercase text-black dark:text-yellow-400/50 mb-2">{name}</h3>
        <p className="text-xs font-mono font-bold text-black dark:text-yellow-400/50 mb-4">{description}</p>
        <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1 text-xs font-bold uppercase border-2 border-black dark:border-yellow-400">
          LOCKED
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onSelect}
      className={`
        relative w-full border-4 border-black dark:border-yellow-400 
        ${lightBg} dark:bg-black 
        p-0 flex flex-col text-center 
        transition-all duration-75 
        ${brutalShadowLight} ${brutalShadowDark}
        ${brutalHover} ${brutalActive}
        group
      `}
    >
      <div className="p-8 flex-grow flex flex-col items-center justify-center border-b-4 border-black dark:border-yellow-400 w-full">
        <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-200">
          {icon}
        </div>
        <h3 className="text-2xl font-black uppercase text-black dark:text-yellow-400">
          {name}
        </h3>
        <p className="text-sm font-mono font-bold text-black dark:text-yellow-400 mt-2 bg-white/80 dark:bg-yellow-400/10 px-2 py-1 border-2 border-black dark:border-transparent">
          {description}
        </p>
      </div>
      
      {/* Brutalist Button Footer */}
      <div className="bg-black dark:bg-yellow-400 w-full py-3 flex items-center justify-center gap-2 group-hover:bg-white dark:group-hover:bg-black transition-colors">
        <span className="font-black uppercase text-white group-hover:text-black dark:text-black dark:group-hover:text-yellow-400 text-lg tracking-widest">
          INITIATE
        </span>
        <span className="text-white group-hover:text-black dark:text-black dark:group-hover:text-yellow-400">
          →
        </span>
      </div>
    </button>
  );
};

const GenreSelection: React.FC = () => {
  const navigate = useNavigate();

  const handleGenreSelect = (genreId: string) => {
    navigate(`/game?genre=${genreId}`);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black pb-20">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-black uppercase tracking-tighter">
            Typocalypse
          </h1>
          <button
            onClick={() => navigate('/dashboard')}
            className={`px-4 py-2 bg-white dark:bg-black border-2 border-black dark:border-yellow-400 font-bold uppercase text-xs transition-all ${brutalHover} ${brutalActive}`}
          >
            ← Retreat
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        
        {/* Title Section */}
        <div className="text-center space-y-4">
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none inline-block border-4 border-black dark:border-yellow-400 bg-yellow-300 dark:bg-black px-6 py-4 shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#facc15] transform -rotate-1">
            Select Protocol
          </h2>
          <p className="font-mono text-lg font-bold text-black dark:text-yellow-400 uppercase mt-8 max-w-2xl mx-auto">
            Choose your environment. Calibrate your sensors. Survive the narrative.
          </p>
        </div>

        {/* Genre Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {genres.map((genre) => (
            <GenreCard
              key={genre.id}
              icon={genre.icon}
              name={genre.name}
              description={genre.description}
              disabled={genre.disabled}
              lightBg={genre.lightBg || 'bg-white'}
              onSelect={() => handleGenreSelect(genre.id)}
            />
          ))}
        </div>

        {/* Info Section - High Contrast Grid */}
        <div className={`mt-16 border-4 border-black dark:border-yellow-400 bg-white dark:bg-black ${brutalShadowLight} ${brutalShadowDark}`}>
          <div className="border-b-4 border-black dark:border-yellow-400 bg-black dark:bg-yellow-400 p-4">
            <h3 className="text-xl font-black text-white dark:text-black uppercase tracking-widest">
              SYSTEM MECHANICS
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y-4 md:divide-y-0 md:divide-x-4 divide-black dark:divide-yellow-400">
            <div className="p-8 flex flex-col items-center text-center hover:bg-cyan-100 dark:hover:bg-yellow-400/10 transition-colors">
              <div className="text-5xl mb-4">📖</div>
              <p className="text-black dark:text-yellow-400 font-mono text-sm uppercase font-bold">
                <span className="block text-lg font-black mb-2 bg-black text-white dark:bg-yellow-400 dark:text-black px-2 py-1">Process Data</span> 
                Read the narrative prompts tailored to your selected sector.
              </p>
            </div>
            <div className="p-8 flex flex-col items-center text-center hover:bg-pink-100 dark:hover:bg-yellow-400/10 transition-colors">
              <div className="text-5xl mb-4">⌨️</div>
              <p className="text-black dark:text-yellow-400 font-mono text-sm uppercase font-bold">
                <span className="block text-lg font-black mb-2 bg-black text-white dark:bg-yellow-400 dark:text-black px-2 py-1">Input Commands</span> 
                Type accurately to survive. Errors equal system failure.
              </p>
            </div>
            <div className="p-8 flex flex-col items-center text-center hover:bg-green-100 dark:hover:bg-yellow-400/10 transition-colors">
              <div className="text-5xl mb-4">🎯</div>
              <p className="text-black dark:text-yellow-400 font-mono text-sm uppercase font-bold">
                <span className="block text-lg font-black mb-2 bg-black text-white dark:bg-yellow-400 dark:text-black px-2 py-1">Branch Reality</span> 
                Your speed and choices directly alter the timeline's outcome.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GenreSelection;