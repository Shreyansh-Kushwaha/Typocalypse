import React from 'react';

// "LVL 7" tile. Pass `pct` to draw the XP bar under the number; `small`
// renders an inline tag for lists and table rows.
export const LevelBadge: React.FC<{
  level: number;
  pct?: number;
  small?: boolean;
  className?: string;
  title?: string;
}> = ({ level, pct, small, className = '', title }) => {
  const label = title ?? (pct !== undefined ? `Level ${level} · ${pct}% to next` : `Level ${level}`);
  if (small) {
    return (
      <span
        title={label}
        className={`inline-flex items-center font-mono text-[11px] font-black uppercase leading-none border-2 border-black dark:border-yellow-400 bg-black text-white dark:bg-yellow-400 dark:text-black px-1.5 py-0.5 ${className}`}
      >
        LVL {level}
      </span>
    );
  }
  return (
    <div
      title={label}
      className={`inline-flex flex-col items-center justify-center border-4 border-black dark:border-yellow-400 bg-yellow-300 dark:bg-black shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#facc15] px-3 py-2 min-w-[80px] ${className}`}
    >
      <span className="font-black uppercase text-[10px] tracking-widest leading-none">LVL</span>
      <span className="font-mono font-black text-3xl leading-none mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>{level}</span>
      {pct !== undefined && (
        <div className="w-full h-2 border-2 border-black dark:border-yellow-400 bg-white dark:bg-black mt-2 overflow-hidden">
          <div className="h-full bg-black dark:bg-yellow-400" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
        </div>
      )}
    </div>
  );
};

export default LevelBadge;
