import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { streamStory } from '../stream';
import { sfx, isMuted, toggleMute } from '../sound';

interface KeyStat { h: number; m: number }

const GamePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const genre = searchParams.get('genre') || 'fantasy';
  const navigate = useNavigate();

  const [gameId, setGameId] = useState<string | null>(null);
  const [story, setStory] = useState('');
  const [choices, setChoices] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(true);
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
  const [muted, setMuted] = useState(isMuted());
  const [shake, setShake] = useState(false);

  const gameRef = useRef<HTMLDivElement>(null);
  const keyStatsRef = useRef<Record<string, KeyStat>>({});
  const ghostTimesRef = useRef<number[]>([]);
  const savedRef = useRef(false);

  // Brutalist CSS constants
  const brutalShadowLight = "shadow-[8px_8px_0px_0px_#000]";
  const brutalShadowDark = "dark:shadow-[8px_8px_0px_0px_#facc15]";
  const brutalHover = "hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#facc15]";
  const brutalActive = "active:translate-x-[8px] active:translate-y-[8px] active:shadow-none dark:active:shadow-none";

  useEffect(() => {
    void runStream('/game/start-stream', { genre });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runStream = async (path: string, body: Record<string, unknown>) => {
    try {
      setIsStreaming(true);
      setStory('');
      resetGameState();
      const result = await streamStory(path, body, (token) => {
        setLoading(false);
        setStory(prev => prev + token);
      });
      setGameId(result.gameId || gameId);
      setStory(result.story);
      setChoices(result.choices);
      setProgress(result.progress);
      setIsStreaming(false);
      setLoading(false);
      gameRef.current?.focus();
    } catch (error: any) {
      console.error('Story stream failed:', error);
      alert(error?.message || 'CRITICAL FAILURE. ABORTING.');
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
    keyStatsRef.current = {};
    ghostTimesRef.current = [];
    savedRef.current = false;
    if (gameRef.current) gameRef.current.focus();
  };

  // While streaming, only complete words are typeable; the tail may still grow.
  const allWords = story.split(' ').filter(w => w.length > 0);
  const words = isStreaming && allWords.length > 1 ? allWords.slice(0, -1) : allWords;

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
      setAccuracy(Math.round(Math.max(0, ((totalTyped - errors) / totalTyped) * 100)));
    } else {
      setAccuracy(100);
    }
  }, [totalTyped, errors]);

  const recordKey = (expected: string, correct: boolean) => {
    const stats = keyStatsRef.current;
    if (!stats[expected]) stats[expected] = { h: 0, m: 0 };
    if (correct) stats[expected].h += 1;
    else stats[expected].m += 1;
  };

  const finishPassage = () => {
    setIsGameActive(false);
    setShowChoices(true);
    sfx.success();
    if (savedRef.current || !gameStart) return;
    savedRef.current = true;
    const durationMs = Date.now() - gameStart;
    const minutes = durationMs / 60000;
    const finalWpm = minutes > 0 ? Math.round((story.length / 5) / minutes) : 0;
    const finalAcc = totalTyped > 0 ? Math.round(((totalTyped + 1 - errors) / (totalTyped + 1)) * 100) : 100;
    axios.post('/stats/session', {
      context: 'solo',
      mode: genre,
      wpm: finalWpm,
      accuracy: finalAcc,
      errors,
      totalTyped: totalTyped + 1,
      durationMs,
      keyStats: keyStatsRef.current,
    }).catch(() => {});
    if (ghostTimesRef.current.length === story.length) {
      axios.post('/ghosts', {
        text: story,
        times: ghostTimesRef.current,
        wpm: finalWpm,
        accuracy: finalAcc,
        genre,
      }).catch(() => {});
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showChoices) return;

    const key = e.key;
    const currentWord = words[currentWordIndex];
    if (!currentWord) return;

    const isLastWord = !isStreaming && currentWordIndex === words.length - 1;
    const expected = currentLetterIndex < currentWord.length
      ? currentWord[currentLetterIndex]
      : (isLastWord ? null : ' ');

    if (key.length > 1) return;
    if (key === ' ') e.preventDefault();
    if (expected === null) return;

    let start = gameStart;
    if (!isGameActive && key !== ' ') {
      start = Date.now();
      setGameStart(start);
      setIsGameActive(true);
    }
    if (!start) return;

    setTotalTyped(prev => prev + 1);

    if (key === expected) {
      recordKey(expected, true);
      ghostTimesRef.current.push(Date.now() - start);
      sfx.key();
      if (currentLetterIndex < currentWord.length) {
        setCurrentLetterIndex(prev => prev + 1);
        if (isLastWord && currentLetterIndex === currentWord.length - 1) {
          finishPassage();
        }
      } else {
        setCurrentWordIndex(prev => prev + 1);
        setCurrentLetterIndex(0);
      }
    } else {
      recordKey(expected, false);
      setErrors(prev => prev + 1);
      sfx.error();
      setShake(true);
      setTimeout(() => setShake(false), 200);
      if (gameRef.current) {
        gameRef.current.classList.add('bg-red-500/20');
        setTimeout(() => gameRef.current?.classList.remove('bg-red-500/20'), 100);
      }
    }
  };

  const handleChoiceSelect = (choice: string) => {
    if (!gameId) return;
    setLoading(true);
    void runStream('/game/continue-stream', { gameId, choice });
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
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2">Summoning the story…</h2>
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
              CHAPTER {progress + 1}
            </span>
            {isStreaming && (
              <span className="font-mono text-sm font-bold bg-pink-500 text-white dark:bg-yellow-400 dark:text-black px-2 animate-pulse">
                ✍ WRITING…
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMuted(toggleMute())}
              className="text-2xl border-2 border-black dark:border-yellow-400 px-2 py-1 bg-white dark:bg-black"
              title={muted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
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
            ${shake ? 'animate-[typoshake_0.2s_linear]' : ''}
            ${!isGameActive && !showChoices ? 'shadow-[12px_12px_0px_0px_#000] dark:shadow-[12px_12px_0px_0px_#facc15]' : 'shadow-[4px_4px_0px_0px_#000] focus:shadow-[12px_12px_0px_0px_#ff007f] dark:focus:shadow-[12px_12px_0px_0px_#fff]'}
          `}
        >
          {!showChoices ? (
            <div className="leading-relaxed select-none outline-none">
              {words.map((word, index) => renderWord(word, index))}
              {isStreaming && (
                <span className="inline-block w-4 h-6 bg-pink-500 dark:bg-yellow-400 animate-pulse align-middle" />
              )}
            </div>
          ) : (
            <div className="m-auto text-center space-y-6">
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter border-b-8 border-black dark:border-yellow-400 pb-4 inline-block">
                CRITICAL JUNCTURE
              </h2>
              <p className="font-mono font-bold text-xl bg-black text-white dark:bg-yellow-400 dark:text-black p-2 max-w-md mx-auto">
                THE NARRATIVE AWAITS YOUR COMMAND. SELECT A PATH.
              </p>
              <p className="font-mono font-bold text-sm">
                {wpm} WPM · {accuracy}% — saved to your stats and ghost shelf
              </p>
            </div>
          )}

          {!isGameActive && !showChoices && words.length > 0 && (
            <div className="mt-auto pt-8 text-center animate-pulse">
              <span className="font-mono font-black text-lg bg-black text-white dark:bg-yellow-400 dark:text-black px-4 py-2 border-2 border-black dark:border-yellow-400">
                &gt; {isStreaming ? 'THE STORY IS BEING WRITTEN. START TYPING TO CHASE IT.' : 'SYSTEM IDLE. CLICK HERE & START TYPING.'}
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
        {showChoices && choices.length > 0 && (
          <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto w-full pb-12">
            {choices.map((choice, index) => (
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
