import React, { useEffect, useMemo, useRef, useState } from 'react';
import { brutal } from '../multiplayer/ui';
import { useCaretClass } from '../theme';
import type { MutatorKey } from './types';

export const MUTATOR_INFO: Record<MutatorKey, { icon: string; name: string; blurb: string }> = {
  none: { icon: '📖', name: 'Clear', blurb: 'A plain passage. Just type it.' },
  fog: { icon: '🌫', name: 'Fog', blurb: 'Only the current word and the next two are visible. The rest is grey.' },
  storm: { icon: '🌩', name: 'Storm', blurb: 'The box never stops shaking. Every typo shakes it harder.' },
  night: { icon: '🌙', name: 'Night', blurb: 'Pitch dark. Only a dozen characters around the caret are lit.' },
  ransom: { icon: '🔠', name: 'Ransom', blurb: 'CaPiTaLs are scrambled. Type the case exactly as shown.' },
  blur: { icon: '👓', name: 'Blur', blurb: 'Every word except the current one is out of focus.' },
  vanish: { icon: '🫥', name: 'Vanish', blurb: 'Typed words disappear behind you. No looking back.' },
  timebomb: { icon: '💣', name: 'Timebomb', blurb: 'Finish before the bar drains or the run fails with no stars.' },
  mirror: { icon: '🪞', name: 'Mirror', blurb: 'The passage is flipped horizontally. Your typing is not.' },
};

export const MUTATOR_KEYS: MutatorKey[] = ['fog', 'storm', 'night', 'ransom', 'blur', 'vanish', 'timebomb', 'mirror'];

// Keyframes the mutators need. Rendered once inside the passage box so the
// page does not depend on global CSS it does not own.
const CSS = `
@keyframes campstorm {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-1.5px, 1px); }
  40% { transform: translate(1.5px, -1px); }
  60% { transform: translate(-1px, -1.5px); }
  80% { transform: translate(1px, 1.5px); }
  100% { transform: translate(0, 0); }
}
@keyframes campstormshake {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-12px, 4px) rotate(-0.5deg); }
  40% { transform: translate(12px, -4px) rotate(0.5deg); }
  60% { transform: translate(-9px, 3px); }
  80% { transform: translate(9px, -3px); }
}
@keyframes campstarin {
  from { transform: scale(0) rotate(-120deg); opacity: 0; }
  60% { transform: scale(1.4) rotate(10deg); opacity: 1; }
  to { transform: scale(1) rotate(0); opacity: 1; }
}
`;

export const MutatorStyles: React.FC = () => <style>{CSS}</style>;

/** Small icon pills, e.g. on map tiles */
export const MutatorTags: React.FC<{ mutators: MutatorKey[]; iconsOnly?: boolean; className?: string }> = ({ mutators, iconsOnly, className = '' }) => (
  <span className={`inline-flex flex-wrap gap-1 ${className}`}>
    {mutators.filter(m => m !== 'none').map(m => (
      <span
        key={m}
        role="img"
        aria-label={`${MUTATOR_INFO[m].name} mutator: ${MUTATOR_INFO[m].blurb}`}
        title={`${MUTATOR_INFO[m].name}: ${MUTATOR_INFO[m].blurb}`}
        className={iconsOnly ? 'text-base leading-none' : 'font-mono text-[10px] font-bold uppercase border-2 border-black dark:border-yellow-400 px-1 leading-4 bg-white dark:bg-black break-words'}
      >
        {MUTATOR_INFO[m].icon}{iconsOnly ? '' : ` ${MUTATOR_INFO[m].name}`}
      </span>
    ))}
  </span>
);

/** Draining bar for the timebomb mutator */
export const TimeBar: React.FC<{ leftMs: number; limitMs: number }> = ({ leftMs, limitMs }) => {
  const pct = Math.max(0, Math.min(100, (leftMs / Math.max(1, limitMs)) * 100));
  const danger = pct < 25;
  return (
    <div className="flex items-center gap-2 sm:gap-3" role="timer" aria-label="Time left on the timebomb">
      <span aria-hidden="true" className={`text-2xl shrink-0 ${danger ? 'animate-bounce' : ''}`}>💣</span>
      <div className="flex-1 min-w-0 h-6 border-4 border-black dark:border-yellow-400 bg-gray-100 dark:bg-black overflow-hidden">
        <div
          className={`h-full ${danger ? 'bg-red-500' : 'bg-orange-400 dark:bg-yellow-400'}`}
          style={{ width: `${pct}%`, transition: 'width 100ms linear' }}
        />
      </div>
      <span
        className={`font-mono font-black text-sm sm:text-base w-14 sm:w-16 text-right shrink-0 ${danger ? 'text-red-600 dark:text-red-400 animate-pulse' : ''}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {(Math.max(0, leftMs) / 1000).toFixed(1)}s
      </span>
    </div>
  );
};

interface PassageProps {
  /** the text the player types (already ransom-transformed when needed) */
  text: string;
  pos: number;
  mutators: MutatorKey[];
  onKeyDown: (e: React.KeyboardEvent) => void;
  /** pass the engine's error count - the box shakes when it increases */
  shakeOn?: number;
  disabled?: boolean;
  className?: string;
}

const NIGHT_RADIUS = 12;
const FOG_AHEAD = 2;

/**
 * Passage renderer with the campaign mutators applied as render effects.
 * Word-level effects (fog, blur, vanish) wrap each word; character-level
 * effects (night) style each glyph; box-level effects (storm, mirror) go on
 * the containers. `ransom` is a pure text transform done before the text
 * reaches here, `timebomb` is the TimeBar above.
 */
export const MutatedPassage: React.FC<PassageProps> = ({ text, pos, mutators, onKeyDown, shakeOn, disabled, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const caret = useCaretClass();
  const [shaking, setShaking] = useState(false);
  const lastShake = useRef(shakeOn ?? 0);
  const has = (k: MutatorKey) => mutators.includes(k);
  const night = has('night');
  const mirror = has('mirror');

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled, text]);

  useEffect(() => {
    if (shakeOn !== undefined && shakeOn !== lastShake.current) {
      lastShake.current = shakeOn;
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 250);
      return () => clearTimeout(t);
    }
  }, [shakeOn]);

  const words = useMemo(() => {
    const parts = text.split(' ');
    let at = 0;
    return parts.map((w, i) => {
      const start = at;
      at += w.length + 1;
      return { w, start, last: i === parts.length - 1 };
    });
  }, [text]);

  let cur = 0;
  for (let i = 0; i < words.length; i++) if (words[i].start <= pos) cur = i;

  const typedCls = 'text-black bg-green-400 font-bold';
  const untypedCls = night ? 'text-gray-100' : 'text-gray-400 dark:text-yellow-400/40';
  const charCls = (gi: number) => (gi < pos ? typedCls : gi === pos ? caret : untypedCls);
  const nightStyle = (gi: number): React.CSSProperties | undefined =>
    night && Math.abs(gi - pos) > NIGHT_RADIUS ? { opacity: 0.1 } : undefined;

  const animation = has('storm')
    ? shaking ? 'campstormshake 0.25s linear' : 'campstorm 0.3s linear infinite'
    : shaking ? 'typoshake 0.2s linear' : undefined;

  return (
    <div className={className} style={mirror ? { transform: 'scaleX(-1)' } : undefined}>
      <MutatorStyles />
      <div
        ref={ref}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={`font-mono text-lg md:text-xl leading-relaxed outline-none select-none p-4 ${brutal.border} ${
          night ? 'bg-black text-white' : 'bg-white dark:bg-black'
        } focus:shadow-[8px_8px_0px_0px_#ff007f] dark:focus:shadow-[8px_8px_0px_0px_#fff] transition-shadow`}
        style={{ animation }}
      >
        {words.map((wd, wi) => {
          const end = wd.start + wd.w.length; // index of the trailing space
          const fogged = has('fog') && (wi < cur || wi > cur + FOG_AHEAD);
          const blurred = has('blur') && wi !== cur;
          const vanished = has('vanish') && wi < cur;
          const wordStyle: React.CSSProperties = {};
          if (blurred) wordStyle.filter = 'blur(3px)';
          if (night && (fogged || vanished)) {
            const dist = pos < wd.start ? wd.start - pos : pos > end ? pos - end : 0;
            if (dist > NIGHT_RADIUS) wordStyle.opacity = 0.1;
          }
          const space = !wd.last && (
            <span className={vanished ? '' : charCls(end)} style={nightStyle(end)}>{'\u00a0'}</span>
          );
          if (vanished) {
            return (
              <span key={wi} className="inline-block whitespace-nowrap" style={wordStyle}>
                <span
                  className="inline-block border-b-2 border-gray-400 dark:border-yellow-400/40 align-middle"
                  style={{ width: `${wd.w.length}ch`, height: '0.5em' }}
                />
                {space}
              </span>
            );
          }
          if (fogged) {
            return (
              <span key={wi} className="inline-block whitespace-nowrap" style={wordStyle}>
                <span className="bg-gray-400 dark:bg-yellow-400/30 text-transparent select-none">{wd.w}</span>
                {space}
              </span>
            );
          }
          return (
            <span key={wi} className="inline-block whitespace-nowrap" style={wordStyle}>
              {wd.w.split('').map((ch, ci) => {
                const gi = wd.start + ci;
                return (
                  <span key={ci} className={charCls(gi)} style={nightStyle(gi)}>{ch}</span>
                );
              })}
              {space}
            </span>
          );
        })}
        {!disabled && pos === 0 && (
          <div
            className="mt-2 font-sans text-xs font-black uppercase text-gray-500 dark:text-yellow-400/60 animate-pulse"
            style={mirror ? { transform: 'scaleX(-1)' } : undefined}
          >
            Click here and type
          </div>
        )}
      </div>
    </div>
  );
};
