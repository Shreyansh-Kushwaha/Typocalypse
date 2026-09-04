import React, { useLayoutEffect, useRef, useState } from 'react';
import { useCaretClass } from '../theme';
import { brutal } from '../multiplayer/ui';

interface Props {
  target: string;
  typed: (string | null)[];
  auto: boolean[];
  pos: number;
  started: boolean;
  finished: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
  shakeOn?: number;
  boxRef?: React.RefObject<HTMLDivElement | null>;
}

/** Code target rendered with line numbers; indentation and newlines are preserved. */
const CodeBlock: React.FC<Props> = ({ target, typed, auto, pos, started, finished, onKeyDown, shakeOn, boxRef }) => {
  const caret = useCaretClass();
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

  useLayoutEffect(() => {
    if (!finished) ref.current?.focus();
  }, [finished, target, ref]);

  const lines = target.split('\n');
  let index = 0;

  const classFor = (i: number, ch: string): string => {
    if (i === pos) return caret;
    if (i > pos) return 'text-gray-400 dark:text-yellow-400/40';
    if (auto[i]) return 'text-gray-300 dark:text-yellow-400/20';
    const t = typed[i];
    if (t === null || t === undefined) return 'text-gray-400 dark:text-yellow-400/40';
    if (t === ch) return 'text-black dark:text-yellow-400 font-bold';
    return 'text-red-600 dark:text-red-400 font-bold bg-red-500/20 underline decoration-2';
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label="code typing area"
      className={`relative outline-none select-none bg-white dark:bg-black ${brutal.border} ${brutal.shadowSm} focus:shadow-[8px_8px_0px_0px_#ff007f] dark:focus:shadow-[8px_8px_0px_0px_#fff] ${shaking ? 'animate-[typoshake_0.2s_linear]' : ''}`}
    >
      <div className={`overflow-x-auto py-3 transition-[filter] ${focused || finished ? '' : 'blur-[2px] opacity-60'}`}>
        <div className="font-mono text-base md:text-lg leading-8 min-w-max pr-6">
          {lines.map((line, li) => {
            const start = index;
            index += line.length + 1; // + newline
            const hasNewline = li < lines.length - 1;
            const nlIndex = start + line.length;
            return (
              <div key={li} className="flex">
                <span className="w-10 shrink-0 text-right pr-3 text-gray-400 dark:text-yellow-400/40 select-none border-r-2 border-black/20 dark:border-yellow-400/20 mr-3">
                  {li + 1}
                </span>
                <span className="whitespace-pre">
                  {line.split('').map((ch, ci) => (
                    <span key={ci} className={classFor(start + ci, ch)}>{ch}</span>
                  ))}
                  {hasNewline && (
                    <span className={`${classFor(nlIndex, '\n')} ${nlIndex === pos ? '' : 'opacity-60'} text-sm`}>&#8629;</span>
                  )}
                </span>
              </div>
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

export default CodeBlock;
