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
      <div className={`${width} mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3`}>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter">
          {title} <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">{accent}</span>
        </h1>
        <Btn color="bg-red-400" className="shrink-0" onClick={onBack}>Back</Btn>
      </div>
    </header>
    <main className="p-4 sm:p-6 relative z-10">
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
  <Panel className="p-4 sm:p-6 sm:py-8">
    <p className="text-4xl mb-2" aria-hidden="true">{icon}</p>
    <p className="text-xl sm:text-2xl md:text-3xl font-black uppercase mb-4">{headline}</p>
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
  <div className={`${color} dark:bg-black border-4 border-black dark:border-yellow-400 px-2 sm:px-3 py-2 min-w-0 ${className}`}>
    <p className="font-black uppercase text-[10px] tracking-widest truncate">{label}</p>
    <p className="font-mono font-black text-lg sm:text-xl md:text-2xl leading-tight break-words" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
  </div>
);

/** Grey pulsing bar used to shape a loading skeleton. */
export const SkeletonBar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-gray-200 dark:bg-yellow-400/20 animate-pulse ${className}`} />
);

/** Skeleton rows shaped like the ladder table below. */
export const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <SkeletonBar className="h-4 w-6 shrink-0" />
        <SkeletonBar className="h-4 flex-1" />
        <SkeletonBar className="h-4 w-16 shrink-0" />
      </div>
    ))}
  </div>
);

/** Original text with the word-level diff coloured in: green = right, red = wrong or missing, struck = extra. */
export const DiffView: React.FC<{ tokens: DiffToken[]; className?: string }> = ({ tokens, className = '' }) => (
  <p className={`font-mono text-sm sm:text-base md:text-lg leading-loose break-words ${className}`}>
    {tokens.map((t, i) => {
      const base = 'inline-block px-1 mr-1 mb-1 max-w-full break-words';
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
    <span><span aria-hidden="true" className="inline-block w-3 h-3 bg-green-300 border border-black align-middle mr-1" />right</span>
    <span><span aria-hidden="true" className="inline-block w-3 h-3 bg-red-300 border border-black align-middle mr-1" />wrong</span>
    <span><span aria-hidden="true" className="inline-block w-3 h-3 border border-dashed border-red-500 align-middle mr-1" />missing</span>
    <span><span className="line-through">extra</span></span>
  </p>
);

/** Ladder table used under the meteor playfield. */
export interface LadderRow { rank: number; username: string; score: number; wave: number; me: boolean }
export const Ladder: React.FC<{
  rows: LadderRow[];
  limit?: number;
  empty?: string;
  /** true while the request is in flight - shows a skeleton table */
  loading?: boolean;
  /** message shown instead of the table when the request failed */
  error?: string;
  onRetry?: () => void;
  retrying?: boolean;
}> = ({ rows, limit = 10, empty = 'Nobody yet. Set the pace.', loading, error, onRetry, retrying }) => (
  <Panel>
    <p className="font-black uppercase text-xs tracking-widest mb-3">Global ladder</p>
    {loading ? (
      <>
        <p className="font-mono font-bold text-sm mb-2">Loading the ladder…</p>
        <SkeletonRows rows={5} />
      </>
    ) : error ? (
      <div className="space-y-3">
        <p className="font-mono font-bold text-sm text-red-600 dark:text-red-400">{error}</p>
        {onRetry && (
          <Btn color="bg-yellow-300" className="w-full sm:w-auto text-xs py-2" onClick={onRetry} disabled={retrying}>
            {retrying ? 'Retrying…' : 'Retry'}
          </Btn>
        )}
      </div>
    ) : rows.length === 0 ? (
      <p className="font-mono font-bold text-sm">{empty}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] font-mono text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <tbody>
            {rows.slice(0, limit).map(r => (
              <tr key={r.rank} className={`border-b border-black/10 dark:border-yellow-400/10 ${r.me ? 'bg-yellow-200 dark:bg-yellow-400/20 font-black' : ''}`}>
                <td className="py-1 font-black w-10"><span aria-hidden={r.rank <= 3 ? 'true' : undefined}>{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>{r.rank <= 3 && <span className="sr-only">{r.rank}</span>}</td>
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
