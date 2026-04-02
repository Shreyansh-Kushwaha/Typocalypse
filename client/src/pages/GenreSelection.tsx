import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';

const genres = [
  { id: 'fantasy', icon: '⚔️', name: 'FANTASY', description: 'Magical worlds and epic quests' },
  { id: 'horror', icon: '👻', name: 'HORROR', description: 'Thrilling tales of fear and suspense' },
  { id: 'sci-fi', icon: '🚀', name: 'SCI-FI', description: 'Future worlds and advanced technology' },
  { id: 'mystery', icon: '🕵️', name: 'MYSTERY', description: 'Intriguing puzzles and detective stories' },
  { id: 'adventure', icon: '🗻', name: 'ADVENTURE', description: 'Exciting journeys and exploration' },
  { id: 'romance', icon: '💔', name: 'ROMANCE', description: 'Stories of love and relationships' },
  { id: 'custom', icon: '🚧', name: 'CUSTOM', description: 'Coming Soon', disabled: true },
];

interface GenreCardProps {
  icon: string;
  name: string;
  description: string;
  disabled?: boolean;
  onSelect: () => void;
}

const GenreCard: React.FC<GenreCardProps> = ({ icon, name, description, disabled, onSelect }) => {
  return (
    <div
      onClick={!disabled ? onSelect : undefined}
      className={`
        relative rounded-xl border overflow-hidden group cursor-pointer
        transition-all duration-300
        ${
          disabled
            ? 'opacity-60 cursor-not-allowed border-slate-300 dark:border-slate-600'
            : 'border-slate-200 dark:border-slate-700 hover:shadow-large hover:-translate-y-2 shadow-light'
        }
        bg-white dark:bg-slate-800
      `}
    >
      {/* Background Overlay */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-br from-indigo-500/10 to-green-500/10
          dark:from-indigo-500/5 dark:to-green-500/5
          group-hover:from-indigo-500/20 group-hover:to-green-500/20
          transition-all pointer-events-none
        `}
      />

      {/* Content */}
      <div className="relative z-10 aspect-square flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="text-5xl group-hover:scale-110 transition-transform">
          {icon}
        </div>

        <div>
          <h3
            className={`
              text-lg font-bold
              group-hover:text-indigo-600 dark:group-hover:text-indigo-400
              transition-colors
              ${
                disabled
                  ? 'text-slate-600 dark:text-slate-400'
                  : 'text-slate-900 dark:text-white'
              }
            `}
          >
            {name}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {description}
          </p>
        </div>

        {disabled && (
          <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full">
            Coming Soon 🚧
          </span>
        )}
      </div>

      {/* Hover Actions */}
      {!disabled && (
        <div
          className={`
            absolute bottom-0 left-0 right-0
            bg-gradient-to-t from-slate-900/80 to-transparent
            p-4 flex gap-2 justify-center
            opacity-0 group-hover:opacity-100
            transition-opacity pointer-events-none group-hover:pointer-events-auto
          `}
        >
          <Button size="sm" variant="primary">
            Play
          </Button>
        </div>
      )}

      {/* Glow Effect */}
      {!disabled && (
        <div
          className="
            absolute inset-0 rounded-xl
            opacity-0 group-hover:opacity-100
            pointer-events-none transition-opacity
            shadow-[0_0_30px_rgba(99,102,241,0.15)] dark:shadow-[0_0_30px_rgba(129,140,248,0.10)]
          "
        />
      )}
    </div>
  );
};

const GenreSelection: React.FC = () => {
  const navigate = useNavigate();

  const handleGenreSelect = (genreId: string) => {
    navigate(`/game?genre=${genreId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900">
      {/* Background Glows */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-indigo-300/20 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-green-300/20 dark:bg-green-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-soft">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Typocalypse
          </h1>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Title Section */}
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white">
            Choose Your Adventure
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Select a genre and immerse yourself in a unique story filled with typing challenges
          </p>
        </div>

        {/* Genre Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {genres.map((genre) => (
            <GenreCard
              key={genre.id}
              icon={genre.icon}
              name={genre.name}
              description={genre.description}
              disabled={genre.disabled}
              onSelect={() => handleGenreSelect(genre.id)}
            />
          ))}
        </div>

        {/* Info Section */}
        <Card className="p-8 bg-gradient-to-r from-indigo-50 to-green-50 dark:from-indigo-950/30 dark:to-green-950/30 border-indigo-200 dark:border-indigo-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl mb-2">📖</div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Read the Story</span> - Beautiful narratives tailored to each genre
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">⌨️</div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Type Accurately</span> - Test your typing speed and precision
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2">🎯</div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold">Make Choices</span> - Your decisions shape the story's outcome
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default GenreSelection;