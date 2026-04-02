import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface GameState {
  gameId: string;
  story: string;
  choices: string[];
  progress: number;
}

const GamePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const genre = searchParams.get('genre') || 'fantasy';
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [gameStart, setGameStart] = useState<number | null>(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [loading, setLoading] = useState(true);

  const gameRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // Initialize game
  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = async () => {
    try {
      const response = await axios.post('/game/start', { genre });
      setGameState(response.data);
      setLoading(false);
      resetGameState();
    } catch (error: any) {
      console.error('Failed to start game:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to start game. Please try again.';
      alert(errorMsg);
      navigate('/dashboard');
    }
  };

  const resetGameState = () => {
    setCurrentWordIndex(0);
    setCurrentLetterIndex(0);
    setWpm(0);
    setAccuracy(100);
    setGameStart(null);
    setIsGameActive(false);
    setShowChoices(false);
  };

  const words = gameState?.story.split(' ') || [];

  // Handle typing
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!gameState || showChoices) return;

    const key = e.key;
    const currentWord = words[currentWordIndex];
    const expected = currentWord?.[currentLetterIndex] || ' ';

    if (!isGameActive && key.length === 1 && key !== ' ') {
      setGameStart(Date.now());
      setIsGameActive(true);
      startWpmTimer();
    }

    if (key === expected) {
      // Correct letter
      if (currentLetterIndex < currentWord.length - 1) {
        setCurrentLetterIndex(prev => prev + 1);
      } else {
        // Word completed
        if (currentWordIndex < words.length - 1) {
          setCurrentWordIndex(prev => prev + 1);
          setCurrentLetterIndex(0);
        } else {
          // Story completed
          setIsGameActive(false);
          setShowChoices(true);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    } else if (key === ' ') {
      e.preventDefault();
      // Space pressed - move to next word
      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setCurrentLetterIndex(0);
      } else {
        setIsGameActive(false);
        setShowChoices(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  };

  const startWpmTimer = () => {
    timerRef.current = setInterval(() => {
      if (gameStart) {
        const minutes = (Date.now() - gameStart) / 60000;
        const typedWords = currentWordIndex + (currentLetterIndex / (words[currentWordIndex]?.length || 1));
        setWpm(minutes > 0 ? Math.round(typedWords / minutes) : 0);
      }
    }, 1000);
  };

  const handleChoiceSelect = async (choice: string) => {
    if (!gameState) return;

    try {
      const response = await axios.post('/game/continue', {
        gameId: gameState.gameId,
        choice
      });

      setGameState(response.data);
      resetGameState();
    } catch (error) {
      console.error('Failed to continue game:', error);
      alert('Failed to continue game. Please try again.');
    }
  };

  const renderWord = (word: string, wordIndex: number) => {
    return (
      <div
        key={wordIndex}
        className={`word inline-block mr-2 mb-2 ${
          wordIndex === currentWordIndex ? 'current' : ''
        }`}
      >
        {word.split('').map((letter, letterIndex) => (
          <span
            key={letterIndex}
            className={`letter ${
              wordIndex < currentWordIndex
                ? 'correct'
                : wordIndex === currentWordIndex && letterIndex < currentLetterIndex
                ? 'correct'
                : wordIndex === currentWordIndex && letterIndex === currentLetterIndex
                ? 'current'
                : ''
            }`}
          >
            {letter}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <div className="text-white">
            <span className="font-bold">WPM: {wpm}</span> | <span>Accuracy: {accuracy}%</span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Dashboard
          </button>
        </div>

        <div
          ref={gameRef}
          tabIndex={0}
          onKeyDown={handleKeyPress}
          className="bg-white/10 backdrop-blur-sm rounded-lg p-8 max-w-4xl mx-auto min-h-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {!showChoices ? (
            <div className="words text-white text-lg leading-relaxed">
              {words.map((word, index) => renderWord(word, index))}
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-6">Choose your next action:</h2>
              <div className="space-y-4">
                {gameState?.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleChoiceSelect(choice)}
                    className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isGameActive && !showChoices && gameState && (
          <div className="text-center mt-4">
            <p className="text-gray-300">Click here and start typing to begin!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;