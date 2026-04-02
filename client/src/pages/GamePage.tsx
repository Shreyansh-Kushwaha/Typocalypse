import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/Button';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';

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
  const [timeElapsed, setTimeElapsed] = useState(0);

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
    setTimeElapsed(0);
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
        setTimeElapsed(Math.floor((Date.now() - gameStart) / 1000));
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
      <span key={wordIndex} className="word inline-block mr-2 mb-2">
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
      </span>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="p-8 space-y-4 max-w-sm">
          <div className="flex justify-center">
            <svg className="animate-spin h-12 w-12 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-center text-slate-600 dark:text-slate-400 font-medium">
            Loading your adventure...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-soft">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            {genre.charAt(0).toUpperCase() + genre.slice(1)} Quest
          </h1>
          <div className="flex items-center gap-6">
            <span className="font-mono text-base text-slate-600 dark:text-slate-400">
              ⏱️ {formatTime(timeElapsed)}
            </span>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              ⚙️
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
        {/* Story Text Area */}
        <div
          ref={gameRef}
          tabIndex={0}
          onKeyDown={handleKeyPress}
          className="flex-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 shadow-light focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 overflow-y-auto transition-all"
        >
          {!showChoices ? (
            <p className="text-lg leading-relaxed font-light text-slate-900 dark:text-slate-100">
              {words.map((word, index) => renderWord(word, index))}
            </p>
          ) : (
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                🎯 What will you do next?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Choose your path wisely...
              </p>
            </div>
          )}
        </div>

        {/* Prompt */}
        {!isGameActive && !showChoices && gameState && (
          <div className="text-center text-slate-500 dark:text-slate-400 text-sm">
            <p>💡 Click on the text area and start typing to begin</p>
          </div>
        )}

        {/* Input Area */}
        {!showChoices && (
          <Card className="p-6 space-y-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-light">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Your Input
            </label>
            <div className="h-20 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 flex items-start font-mono text-sm text-slate-600 dark:text-slate-300 overflow-y-auto">
              <span className="text-green-600 dark:text-green-400 font-medium">
                {gameState?.story.substring(0, currentWordIndex * 10 + currentLetterIndex)}
              </span>
              <span className="text-indigo-500 animate-pulse">▌</span>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        {!showChoices && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-white dark:bg-slate-800">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                WPM
              </p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-2">
                {wpm}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                Words per minute
              </p>
            </Card>

            <Card className="p-6 bg-white dark:bg-slate-800">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Accuracy
              </p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-2">
                {accuracy}%
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                Typing accuracy
              </p>
            </Card>

            <Card className="p-6 bg-white dark:bg-slate-800">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Progress
              </p>
              <ProgressBar
                value={currentWordIndex}
                max={Math.max(words.length, 1)}
                showLabel={true}
                className="mt-2"
              />
            </Card>
          </div>
        )}

        {/* Choice Buttons */}
        {showChoices && gameState?.choices && (
          <div className="space-y-3 mb-6">
            {gameState.choices.map((choice, index) => (
              <Button
                key={index}
                onClick={() => handleChoiceSelect(choice)}
                variant={index === 0 ? 'primary' : 'secondary'}
                size="lg"
                className="w-full justify-start text-left h-auto py-4 px-6"
              >
                <span className="mr-3">{index === 0 ? '1️⃣' : index === 1 ? '2️⃣' : '3️⃣'}</span>
                {choice}
              </Button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default GamePage;