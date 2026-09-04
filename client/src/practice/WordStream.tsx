import React, { useLayoutEffect, useRef, useState } from 'react';
import { useCaretClass } from '../theme';
import { brutal } from '../multiplayer/ui';

interface Props {
  words: string[];
  typed: string[];
  cur: number;
  started: boolean;
  finished: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
  /** the hook's error counter - the box shakes when it increases */
  shakeOn?: number;
  boxRef?: React.RefObject<HTMLDivElement | null>;
}

const RENDER_AHEAD = 80;

/** The classic three line window: finished lines scroll away as the caret moves down. */
const WordStream: React.FC<Props> = ({ words, typed, cur, started, finished, onKeyDown, shakeOn, boxRef }) => {
  const caret = useCaretClass();
  const innerRef = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const ref = boxRef ?? localRef;
  const [focused, setFocused] = useState(false);
  const [shaking, setShaking] = useState(false);
  const lastShake = useRef(shakeOn ?? 0);

  useLayoutEffect(() => {
    if (shakeOn !== undefined && shakeOn !== lastShake.current) {
      lastShake.current = shakeOn;
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 200);
      return () => clearTimeout(t);
    }
  }, [shakeOn]);

  // keep the active word on the second visible row once the first line is done
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const active = inner.querySelector<HTMLElement>('[data-active="1"]');
    if (!active) return;
    const lh = parseFloat(getComputedStyle(inner).lineHeight) || active.offsetHeight || 40;
    const line = Math.round(active.offsetTop / lh);
    const shift = Math.max(0, line - 1) * lh;
    inner.style.transform = `translateY(-${shift}px)`;
  });

  useLayoutEffect(() => {
    if (!finished) ref.current?.focus();
  }, [finished, ref]);

  const visible = words.slice(0, cur + RENDER_AHEAD);

  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label="typing area"
      className={`relative outline-none select-none bg-white dark:bg-black ${brutal.border} ${brutal.shadowSm} focus:shadow-[8px_8px_0px_0px_#ff007f] dark:focus:shadow-[8px_8px_0px_0px_#fff] ${shaking ? 'animate-[typoshake_0.2s_linear]' : ''}`}
    >
      <div className={`overflow-hidden h-[7.5rem] px-4 py-0 my-3 transition-[filter] ${focused || finished ? '' : 'blur-[2px] opacity-60'}`}>
        <div
          ref={innerRef}
          className="font-mono text-xl md:text-2xl leading-[2.5rem] transition-transform duration-100 will-change-transform break-words"
        >
          {visible.map((word, wi) => {
            const t = typed[wi] || '';
            const isCur = wi === cur;
            const done = wi < cur;
            const wrongWord = done && t !== word;
            return (
              <span
                key={wi}
                data-active={isCur ? '1' : undefined}
                className={`inline-block mr-[0.6em] ${wrongWord ? 'underline decoration-red-500 decoration-[3px] underline-offset-4' : ''}`}
              >
                {word.split('').map((ch, ci) => {
                  let cls: string;
                  if (isCur && ci === t.length) cls = caret;
                  else if (ci < t.length) {
                    cls = t[ci] === ch
                      ? 'text-black dark:text-yellow-400 font-bold'
                      : 'text-red-600 dark:text-red-400 font-bold bg-red-500/15';
                  } else if (done) cls = 'text-red-400/70 dark:text-red-500/60';
                  else cls = 'text-gray-400 dark:text-yellow-400/40';
                  return <span key={ci} className={cls}>{ch}</span>;
                })}
                {t.length > word.length && t.slice(word.length).split('').map((ch, ei) => (
                  <span key={`x${ei}`} className="text-red-900 dark:text-red-700 font-bold bg-red-900/10">{ch}</span>
                ))}
                {isCur && t.length >= word.length && (
                  <span className={`${caret} inline-block w-[0.5em] align-baseline`}>&nbsp;</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
      {!focused && !finished && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="bg-black text-white dark:bg-yellow-400 dark:text-black font-black uppercase text-xs md:text-sm px-3 py-1 tracking-widest">
            {started ? 'Click here to keep typing' : 'Click here or press any key to start'}
          </span>
        </div>
      )}
    </div>
  );
};

export default WordStream;
