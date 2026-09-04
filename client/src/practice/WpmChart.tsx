import React from 'react';
import type { SecondSample } from './stats';

/** Per-second chart: raw WPM bars, cumulative net WPM line, red ticks for errors. Plain SVG. */
const WpmChart: React.FC<{ samples: SecondSample[]; className?: string }> = ({ samples, className = '' }) => {
  if (samples.length === 0) return null;
  const W = 640, H = 200;
  const padL = 40, padR = 12, padT = 14, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = samples.length;
  const peak = Math.max(20, ...samples.map(s => Math.max(s.raw, s.net)));
  const yMax = Math.ceil(peak / 20) * 20;
  const y = (v: number) => padT + plotH - (v / yMax) * plotH;
  const slot = plotW / n;
  const barW = Math.max(2, slot * 0.6);
  const cx = (i: number) => padL + slot * i + slot / 2;
  const line = samples.map((s, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${y(s.net).toFixed(1)}`).join(' ');
  const ticks = [0, yMax / 2, yMax];
  const xEvery = n <= 15 ? 1 : n <= 30 ? 5 : 10;
  const peakRaw = Math.round(Math.max(...samples.map(s => s.raw)));
  const finalNet = Math.round(samples[samples.length - 1].net);
  const errorSeconds = samples.filter(s => s.errors > 0).length;
  const label =
    `Words per minute per second over ${n} second${n === 1 ? '' : 's'}, peaking at ${peakRaw} raw WPM ` +
    `and finishing at ${finalNet} net WPM` +
    (errorSeconds ? `, with errors in ${errorSeconds} second${errorSeconds === 1 ? '' : 's'}.` : ', with no errors.');

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto text-black dark:text-yellow-400"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        {ticks.map(t => (
          <g key={t} aria-hidden="true">
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={t === 0 ? 0.6 : 0.15} strokeWidth={t === 0 ? 2 : 1} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700" fill="currentColor">{t}</text>
          </g>
        ))}
        {samples.map((s, i) => (
          <g key={s.second} aria-hidden="true">
            <rect x={cx(i) - barW / 2} y={y(s.raw)} width={barW} height={Math.max(0, y(0) - y(s.raw))} fill="currentColor" fillOpacity={0.22} />
            {s.errors > 0 && (
              <text x={cx(i)} y={Math.max(padT + 8, y(s.raw) - 4)} textAnchor="middle" fontSize="12" fontWeight="900" fill="#dc2626">x</text>
            )}
            {(s.second % xEvery === 0 || n <= 15) && (
              <text x={cx(i)} y={H - 8} textAnchor="middle" fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="700" fill="currentColor" fillOpacity={0.7}>{s.second}s</text>
            )}
          </g>
        ))}
        <path aria-hidden="true" d={line} fill="none" stroke="#ff007f" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" className="dark:[stroke:#facc15]" />
        {samples.map((s, i) => (
          <circle aria-hidden="true" key={`d${s.second}`} cx={cx(i)} cy={y(s.net)} r={2.5} fill="#ff007f" className="dark:[fill:#facc15]" />
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] font-bold uppercase mt-1 text-gray-600 dark:text-yellow-400/70">
        <span><span aria-hidden="true" className="inline-block w-3 h-3 align-middle bg-current opacity-25 mr-1" />raw / second</span>
        <span><span aria-hidden="true" className="inline-block w-3 h-[3px] align-middle bg-[#ff007f] dark:bg-yellow-400 mr-1" />net wpm</span>
        <span><span aria-hidden="true" className="text-red-600 font-black mr-1">x</span>errors</span>
      </div>
    </div>
  );
};

export default WpmChart;
