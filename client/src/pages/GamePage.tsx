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
  const [errors, setErrors] = useState(0);
  const [totalTyped, setTotalTyped] = useState(0);
  const [gameStart, setGameStart] = useState<number | null>(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const gameRef = useRef<HTMLDivElement>(null);

  // Brutalist CSS constants
  const brutalShadowLight = "shadow-[8px_8px_0px_0px_#000]";
  const brutalShadowDark = "dark:shadow-[8px_8px_0px_0px_#facc15]";
  const brutalHover = "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15]";
  const brutalActive = "active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:active:shadow-none";

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = async () => {
    try {
      // Fake delay for the cool loading screen effect (remove in prod if you want it instant)
      setTimeout(async () => {
        const response = await axios.post('/game/start', { genre });
        setGameState(response.data);
        setLoading(false);
        resetGameState();
      }, 800);
    } catch (error: any) {
      console.error('Failed to start game:', error);
      alert(error?.response?.data?.error || error?.message || 'CRITICAL FAILURE. ABORTING.');
      navigate('/dashboard');
    }
  };

  const resetGameState = () => {
    setCurrentWordIndex(0);
    setCurrentLetterIndex(0);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    setTotalTyped(0);
    setGameStart(null);
    setIsGameActive(false);
    setShowChoices(false);
    setTimeElapsed(0);
    if (gameRef.current) gameRef.current.focus();
  };

  const words = gameState?.story.split(' ') || [];

  useEffect(() => {
    let interval: number;
    if (isGameActive && gameStart) {
      interval = window.setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - gameStart) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGameActive, gameStart]);

  useEffect(() => {
    if (isGameActive && gameStart) {
      const minutes = (Date.now() - gameStart) / 60000;
      const typedWords = currentWordIndex + (currentLetterIndex / (words[currentWordIndex]?.length || 1));
      setWpm(minutes > 0 ? Math.round(typedWords / minutes) : 0);
    }
  }, [timeElapsed, currentWordIndex, currentLetterIndex, isGameActive, gameStart, words]);

  useEffect(() => {
    if (totalTyped > 0) {
      const newAccuracy = Math.max(0, ((totalTyped - errors) / totalTyped) * 100);
      setAccuracy(Math.round(newAccuracy));
    } else {
      setAccuracy(100);
    }
  }, [totalTyped, errors]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!gameState || showChoices) return;

    const key = e.key;
    const currentWord = words[currentWordIndex];
    if (!currentWord) return;

    const isLastWord = currentWordIndex === words.length - 1;
    const expected = currentLetterIndex < currentWord.length ? currentWord[currentLetterIndex] : (isLastWord ? null : ' ');

    if (key.length > 1) return;

    if (key === ' ') e.preventDefault();

    if (!isGameActive && key !== ' ') {
      setGameStart(Date.now());
      setIsGameActive(true);
    }

    setTotalTyped(prev => prev + 1);

    if (key === expected) {
      if (currentLetterIndex < currentWord.length) {
        setCurrentLetterIndex(prev => prev + 1);
        if (isLastWord && currentLetterIndex === currentWord.length - 1) {
          setIsGameActive(false);
          setShowChoices(true);
        }
      } else {
        if (!isLastWord) {
          setCurrentWordIndex(prev => prev + 1);
          setCurrentLetterIndex(0);
        }
      }
    } else {
      setErrors(prev => prev + 1);
      // Visual error flash on the terminal
      if (gameRef.current) {
        gameRef.current.classList.add('bg-red-500/20');
        setTimeout(() => gameRef.current?.classList.remove('bg-red-500/20'), 100);
      }
    }
  };

  const handleChoiceSelect = async (choice: string) => {
    if (!gameState) return;
    try {
      const response = await axios.post('/game/continue', { gameId: gameState.gameId, choice });
      setGameState(response.data);
      resetGameState();
    } catch (error) {
      console.error('Failed to continue:', error);
      alert('NODE CONNECTION FAILED. TRY AGAIN.');
    }
  };

  const renderWord = (word: string, wordIndex: number) => {
    return (
      <span key={wordIndex} className="inline-block mr-3 mb-3 font-mono text-xl md:text-2xl">
        {word.split('').map((letter, letterIndex) => {
          const isTyped = wordIndex < currentWordIndex || (wordIndex === currentWordIndex && letterIndex < currentLetterIndex);
          const isCurrent = wordIndex === currentWordIndex && letterIndex === currentLetterIndex;
          
          return (
            <span
              key={letterIndex}
              className={`
                ${isTyped ? 'text-black dark:text-black bg-green-400 dark:bg-green-400 font-black' : ''}
                ${isCurrent ? 'bg-pink-500 text-white dark:bg-yellow-400 dark:text-black animate-pulse font-black border-b-4 border-black dark:border-yellow-400' : ''}
                ${!isTyped && !isCurrent ? 'text-gray-400 dark:text-yellow-400/40' : ''}
              `}
            >
              {letter}
            </span>
          );
        })}
        {wordIndex === currentWordIndex && currentLetterIndex === word.length && wordIndex < words.length - 1 && (
          <span key="space" className="bg-pink-500 text-white dark:bg-yellow-400 animate-pulse border-b-4 border-black dark:border-yellow-400 inline-block w-4">&nbsp;</span>
        )}
      </span>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypedText = () => {
    if (!gameState) return '';
    const completedWords = words.slice(0, currentWordIndex).join(' ');
    const space = completedWords.length > 0 ? ' ' : '';
    const currentPart = words[currentWordIndex]?.substring(0, currentLetterIndex) || '';
    return completedWords + space + currentPart;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black flex items-center justify-center relative">
        <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className={`bg-white dark:bg-black border-4 border-black dark:border-yellow-400 p-10 max-w-sm text-center relative z-10 ${brutalShadowLight} ${brutalShadowDark}`}>
          <div className="text-6xl animate-bounce mb-6">⚙️</div>
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2">Establishing Link...</h2>
          <p className="font-mono font-bold text-sm bg-black text-white dark:bg-yellow-400 dark:text-black px-2 py-1 inline-block animate-pulse">
            INITIALIZING {genre.toUpperCase()} PROTOCOL
          </p>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.max(0, Math.min(100, (currentWordIndex / Math.max(words.length, 1)) * 100));

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans selection:bg-black selection:text-white dark:selection:bg-yellow-400 dark:selection:text-black flex flex-col relative">
      <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-3 py-1 font-black uppercase border-2 border-black dark:border-yellow-400 text-lg md:text-xl">
              {genre}
            </span>
            <span className="font-mono text-sm font-bold bg-white dark:bg-black border-2 border-black dark:border-yellow-400 px-2 hidden sm:inline-block">
              SECTOR_ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="font-mono text-xl md:text-2xl font-black bg-white dark:bg-black border-4 border-black dark:border-yellow-400 px-4 py-1 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#facc15]">
              ⏱️ {formatTime(timeElapsed)}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className={`px-4 py-2 bg-red-500 dark:bg-black text-black dark:text-yellow-400 border-4 border-black dark:border-yellow-400 font-black uppercase text-sm transition-all ${brutalShadowLight} dark:shadow-[6px_6px_0px_0px_#facc15] ${brutalHover} ${brutalActive}`}
            >
              ABORT
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col gap-8 relative z-10">
        
        {/* Story Text Area */}
        <div
          ref={gameRef}
          tabIndex={0}
          onKeyDown={handleKeyPress}
          className={`flex-1 bg-white dark:bg-black border-4 border-black dark:border-yellow-400 p-6 md:p-10 focus:outline-none transition-colors duration-75 min-h-[300px] flex flex-col
            ${!isGameActive && !showChoices ? 'shadow-[12px_12px_0px_0px_#000] dark:shadow-[12px_12px_0px_0px_#facc15]' : 'shadow-[4px_4px_0px_0px_#000] focus:shadow-[12px_12px_0px_0px_#ff007f] dark:focus:shadow-[12px_12px_0px_0px_#fff]'}
          `}
        >
          {!showChoices ? (
            <div className="leading-relaxed select-none outline-none">
              {words.map((word, index) => renderWord(word, index))}
            </div>
          ) : (
            <div className="m-auto text-center space-y-6">
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter border-b-8 border-black dark:border-yellow-400 pb-4 inline-block">
                CRITICAL JUNCTURE
              </h2>
              <p className="font-mono font-bold text-xl bg-black text-white dark:bg-yellow-400 dark:text-black p-2 max-w-md mx-auto">
                THE NARRATIVE AWAITS YOUR COMMAND. SELECT A PATH.
              </p>
            </div>
          )}

          {!isGameActive && !showChoices && gameState && (
            <div className="mt-auto pt-8 text-center animate-pulse">
              <span className="font-mono font-black text-lg bg-black text-white dark:bg-yellow-400 dark:text-black px-4 py-2 border-2 border-black dark:border-yellow-400">
                &gt; SYSTEM IDLE. CLICK HERE & START TYPING.
              </span>
            </div>
          )}
        </div>

        {/* Console / Input Area */}
        {!showChoices && (
          <div className={`bg-black p-4 border-4 border-black dark:border-yellow-400 ${brutalShadowLight} dark:shadow-[8px_8px_0px_0px_#facc15]`}>
            <div className="flex items-center gap-2 mb-2 border-b-2 border-gray-700 pb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full border border-gray-600" />
              <div className="w-3 h-3 bg-yellow-500 rounded-full border border-gray-600" />
              <div className="w-3 h-3 bg-green-500 rounded-full border border-gray-600" />
              <span className="text-gray-400 font-mono text-xs font-bold ml-2">USER_TERMINAL.EXE</span>
            </div>
            <div className="font-mono text-lg md:text-xl text-white break-all">
              <span className="text-gray-500 mr-2">&gt;</span>
              <span className="text-green-400">{getTypedText()}</span>
              <span className="inline-block w-3 h-5 bg-pink-500 dark:bg-yellow-400 ml-1 animate-pulse align-middle" />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {!showChoices && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'VELOCITY (WPM)', value: wpm, bg: 'bg-cyan-300' },
              { label: 'PRECISION (%)', value: accuracy, bg: 'bg-pink-300' }
            ].map((stat, idx) => (
              <div key={idx} className={`${stat.bg} dark:bg-black border-4 border-black dark:border-yellow-400 p-6 ${brutalShadowLight} dark:shadow-[6px_6px_0px_0px_#facc15]`}>
                <p className="text-sm font-black uppercase text-black dark:text-yellow-400 tracking-widest border-b-4 border-black dark:border-yellow-400 pb-2 inline-block">
                  {stat.label}
                </p>
                <p className="text-5xl md:text-6xl font-black text-black dark:text-yellow-400 font-mono mt-4">
                  {stat.value}
                </p>
              </div>
            ))}

            {/* Brutalist Progress Bar */}
            <div className={`bg-white dark:bg-black border-4 border-black dark:border-yellow-400 p-6 ${brutalShadowLight} dark:shadow-[6px_6px_0px_0px_#facc15] flex flex-col justify-center`}>
              <div className="flex justify-between items-end mb-2">
                <p className="text-sm font-black uppercase text-black dark:text-yellow-400 tracking-widest">
                  DATA SYNTHESIS
                </p>
                <span className="font-mono font-bold text-black dark:text-yellow-400">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full h-8 border-4 border-black dark:border-yellow-400 bg-gray-200 dark:bg-black/50 overflow-hidden relative">
                <div 
                  className="h-full bg-black dark:bg-yellow-400 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Choice Buttons */}
        {showChoices && gameState?.choices && (
          <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto w-full pb-12">
            {gameState.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => handleChoiceSelect(choice)}
                className={`
                  w-full text-left bg-white dark:bg-black border-4 border-black dark:border-yellow-400 p-6 md:p-8 
                  font-black text-xl md:text-2xl uppercase text-black dark:text-yellow-400
                  transition-all shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#facc15]
                  hover:bg-cyan-100 dark:hover:bg-yellow-400 dark:hover:text-black
                  hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15]
                  active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:active:shadow-none
                  flex items-center gap-6 group
                `}
              >
                <span className="text-4xl bg-black text-white dark:bg-yellow-400 dark:text-black group-hover:bg-black group-hover:text-white w-16 h-16 flex items-center justify-center border-4 border-black dark:border-transparent shrink-0">
                  {index + 1}
                </span>
                <span>{choice}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default GamePage;