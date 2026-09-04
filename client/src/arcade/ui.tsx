import React from 'react';
import { Btn, Panel } from '../multiplayer/ui';
import type { DiffToken } from './diff';

// Shared chrome for the three solo arcade pages - same brutalist Shell as DailyPage.

export const ArcadeShell: React.FC<{
  title: string;
  accent: string;
  onBack: () => void;
  width?: string;
  children: React.ReactNode;
}> = ({ title, accent, onBack, width = 'max-w-4xl', children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16 overflow-x-hidden">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className={`${width} mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-3`}>
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter">
          {title} <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">{accent}</span>
        </h1>
        <Btn color="bg-red-400" onClick={onBack}>Back</Btn>
      </div>
    </header>
    <main className="p-4 md:p-6 relative z-10">
      <div className={`${width} mx-auto space-y-4`}>{children}</div>
    </main>
  </div>
);

export const HowTo: React.FC<{
  icon: string;
  headline: string;
  steps: string[];
  children?: React.ReactNode;
}> = ({ icon, headline, steps, children }) => (
  <Panel className="py-8 px-6">
    <p className="text-4xl mb-2">{icon}</p>
    <p className="text-2xl md:text-3xl font-black uppercase mb-4">{headline}</p>
    <ol className="font-mono text-sm font-bold space-y-1 mb-6 list-decimal pl-5 max-w-2xl">
      {steps.map((s, i) => <li key={i}>{s}</li>)}
    </ol>
    {children}
  </Panel>
);

/** Big number tile for HUDs and summaries. */
export const Stat: React.FC<{ label: string; value: React.ReactNode; color?: string; className?: string }> = ({
  label, value, color = 'bg-white', className = '',
}) => (
  <div className={`${color} dark:bg-black border-4 border-black dark:border-yellow-400 px-3 py-2 min-w-0 ${className}`}>
    <p className="font-black uppercase text-[10px] tracking-widest truncate">{label}</p>
    <p className="font-mono font-black text-xl md:text-2xl leading-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
  </div>
);

/** Original text with the word-level diff coloured in: green = right, red = wrong or missing, struck = extra. */
export const DiffView: React.FC<{ tokens: DiffToken[]; className?: string }> = ({ tokens, className = '' }) => (
  <p className={`font-mono text-base md:text-lg leading-loose ${className}`}>
    {tokens.map((t, i) => {
      const base = 'inline-block px-1 mr-1 mb-1';
      if (t.status === 'ok') return <span key={i} className={`${base} bg-green-300 text-black`}>{t.word}</span>;
      if (t.status === 'wrong') {
        return (
          <span key={i} className={`${base} bg-red-300 text-black`} title={`you typed: ${t.typed ?? ''}`}>
            {t.word}<span className="text-[10px] font-bold ml-1 opacity-70 line-through">{t.typed}</span>
          </span>
        );
      }
      if (t.status === 'missing') return <span key={i} className={`${base} border-2 border-dashed border-red-500 text-red-600 dark:text-red-400`}>{t.word}</span>;
      return <span key={i} className={`${base} line-through text-gray-400 dark:text-yellow-400/40`}>{t.word}</span>;
    })}
  </p>
);

export const DiffLegend: React.FC = () => (
  <p className="font-mono text-[10px] font-bold uppercase flex flex-wrap gap-3">
    <span><span className="inline-block w-3 h-3 bg-green-300 border border-black align-middle mr-1" />right</span>
    <span><span className="inline-block w-3 h-3 bg-red-300 border border-black align-middle mr-1" />wrong</span>
    <span><span className="inline-block w-3 h-3 border border-dashed border-red-500 align-middle mr-1" />missing</span>
    <span><span className="line-through">extra</span></span>
  </p>
);

/** Ladder table used under the meteor playfield. */
export interface LadderRow { rank: number; username: string; score: number; wave: number; me: boolean }
export const Ladder: React.FC<{ rows: LadderRow[]; limit?: number; empty?: string }> = ({ rows, limit = 10, empty = 'Nobody yet. Set the pace.' }) => (
  <Panel>
    <p className="font-black uppercase text-xs tracking-widest mb-3">Global ladder</p>
    {rows.length === 0 ? (
      <p className="font-mono font-bold text-sm">{empty}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <tbody>
            {rows.slice(0, limit).map(r => (
              <tr key={r.rank} className={`border-b border-black/10 dark:border-yellow-400/10 ${r.me ? 'bg-yellow-200 dark:bg-yellow-400/20 font-black' : ''}`}>
                <td className="py-1 font-black w-10">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</td>
                <td className="font-bold truncate max-w-[10rem]">{r.username}{r.me ? ' (you)' : ''}</td>
                <td className="text-right font-black">{r.score.toLocaleString()}</td>
                <td className="text-right whitespace-nowrap">wave {r.wave}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
);
