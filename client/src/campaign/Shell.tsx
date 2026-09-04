import React from 'react';
import { Btn } from '../multiplayer/ui';

/** Brutalist page frame shared by the campaign map and node pages. */
export const CampaignShell: React.FC<{
  onBack: () => void;
  backLabel?: string;
  title: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ onBack, backLabel = 'Back', title, right, children }) => (
  <div className="min-h-screen bg-[#f4f4f0] dark:bg-black text-black dark:text-yellow-400 font-sans relative pb-16 overflow-x-hidden">
    <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    <header className="sticky top-0 z-40 bg-[#f4f4f0] dark:bg-black border-b-4 border-black dark:border-yellow-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter truncate">{title}</h1>
        <div className="flex items-center gap-3 shrink-0">
          {right}
          <Btn color="bg-red-400" onClick={onBack}>{backLabel}</Btn>
        </div>
      </div>
    </header>
    <main className="p-4 sm:p-6 relative z-10">{children}</main>
  </div>
);
