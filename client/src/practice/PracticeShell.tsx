import React from 'react';
import { Btn } from '../multiplayer/ui';

/** Brutalist page shell shared by the practice modes: sticky header, Back, grid background, offline banner. */
const PracticeShell: React.FC<{
  title: string;
  accent: string;
  onBack: () => void;
  online: boolean;
  queued: number;
  children: React.ReactNode;
}> = ({ title, accent, onBack, online, queued, children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16 overflow-x-hidden">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter">
          {title} <span className="bg-black text-white dark:bg-yellow-400 dark:text-black px-2">{accent}</span>
        </h1>
        <Btn color="bg-red-400" className="shrink-0" onClick={onBack}>Back</Btn>
      </div>
    </header>
    {(!online || queued > 0) && (
      <div role="status" aria-live="polite" className={`relative z-30 border-b-4 border-black dark:border-yellow-400 ${online ? 'bg-yellow-300 dark:bg-yellow-400/20' : 'bg-orange-300 dark:bg-orange-500/30'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2 font-black uppercase tracking-widest text-sm md:text-base">
          {online
            ? `Syncing ${queued} saved result${queued === 1 ? '' : 's'}…`
            : `OFFLINE — results will sync when you are back${queued ? ` (${queued} waiting)` : ''}`}
        </div>
      </div>
    )}
    <main className="max-w-4xl mx-auto p-4 sm:p-6 relative z-10 min-w-0">{children}</main>
  </div>
);

export default PracticeShell;
