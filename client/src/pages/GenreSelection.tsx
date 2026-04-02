import React from 'react';
import { useNavigate } from 'react-router-dom';

const genres = [
  { id: 'fantasy', name: 'Fantasy', description: 'Magical worlds and epic quests' },
  { id: 'horror', name: 'Horror', description: 'Thrilling tales of fear and suspense' },
  { id: 'sci-fi', name: 'Sci-Fi', description: 'Future worlds and advanced technology' },
  { id: 'mystery', name: 'Mystery', description: 'Intriguing puzzles and detective stories' },
  { id: 'adventure', name: 'Adventure', description: 'Exciting journeys and exploration' },
  { id: 'romance', name: 'Romance', description: 'Stories of love and relationships' },
  { id: 'custom', name: 'Custom Story', description: 'Coming Soon 🚧' },
];

const GenreSelection: React.FC = () => {
  const navigate = useNavigate();

  const handleGenreSelect = (genreId: string) => {
    if (genreId === 'custom') {
      alert('Custom stories coming soon!');
      return;
    }
    navigate(`/game?genre=${genreId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Story Genre</h1>
          <p className="text-xl text-gray-300">Select a genre to begin your typing adventure</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {genres.map((genre) => (
            <div
              key={genre.id}
              onClick={() => handleGenreSelect(genre.id)}
              className={`bg-white/10 backdrop-blur-sm rounded-lg p-6 cursor-pointer transition duration-300 hover:bg-white/20 ${
                genre.id === 'custom' ? 'opacity-50' : ''
              }`}
            >
              <h3 className="text-2xl font-bold text-white mb-2">{genre.name}</h3>
              <p className="text-gray-300">{genre.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenreSelection;