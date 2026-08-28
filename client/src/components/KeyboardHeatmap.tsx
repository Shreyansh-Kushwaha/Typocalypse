import React from 'react';

export interface KeyStat { h: number; m: number }

const KEY_ROWS = ['qwertyuiop', 'asdfghjkl', "zxcvbnm,.'"];

// fold case so 'E' and 'e' count as one key
export function foldKeyStats(raw: Record<string, KeyStat>): Record<string, KeyStat> {
  const out: Record<string, KeyStat> = {};
  for (const [ch, v] of Object.entries(raw)) {
    const k = ch.toLowerCase();
    if (!out[k]) out[k] = { h: 0, m: 0 };
    out[k].h += v.h;
    out[k].m += v.m;
  }
  return out;
}

// Sequential single-hue ramp on miss rate; neutral below 5 attempts.
const KeyboardHeatmap: React.FC<{ keyStats: Record<string, KeyStat> }> = ({ keyStats }) => {
  const folded = foldKeyStats(keyStats);
  const heat = (ch: string) => {
    const v = folded[ch];
    if (!v || v.h + v.m < 5) return null;
    return { missRate: v.m / (v.h + v.m), attempts: v.h + v.m, misses: v.m };
  };
  const cell = (ch: string, wide = false) => {
    const h = heat(ch);
    const alpha = h ? Math.min(0.85, h.missRate * 2.5) : 0;
    return (
      <div
        key={ch}
        title={h ? `${ch === ' ' ? 'space' : ch} — ${Math.round(h.missRate * 100)}% missed (${h.misses}/${h.attempts})` : `${ch === ' ' ? 'space' : ch} — not enough data`}
        className={`${wide ? 'w-56 text-xs' : 'w-9 md:w-11'} h-9 md:h-11 border-2 border-black dark:border-yellow-400 flex items-center justify-center font-mono font-black uppercase shrink-0`}
        style={{ backgroundColor: h ? `rgba(220,38,38,${alpha})` : undefined }}
      >
        {ch === ' ' ? 'space' : ch}
      </div>
    );
  };
  return (
    <div className="space-y-1.5 overflow-x-auto pb-1">
      {KEY_ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1.5" style={{ paddingLeft: `${ri * 14}px` }}>
          {row.split('').map(ch => cell(ch))}
        </div>
      ))}
      <div className="flex" style={{ paddingLeft: '56px' }}>
        {cell(' ', true)}
      </div>
    </div>
  );
};

export default KeyboardHeatmap;
