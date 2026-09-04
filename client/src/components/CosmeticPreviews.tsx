// Small presentational pieces shared by the settings drawer and the locker page.
import React from 'react';
import type { CatalogItem } from '../contexts/SettingsContext';
import { caretClasses } from '../theme';

const SAMPLE = 'apocalypse';

/** The word "apocalypse" with the given caret style on its 5th letter. */
export const CaretPreview: React.FC<{ caret: string; pos?: number; className?: string }> = ({ caret, pos = 4, className = '' }) => {
  const cls = caretClasses(caret);
  return (
    <span className={`typo-text font-mono text-lg select-none ${className}`} aria-hidden="true">
      {SAMPLE.split('').map((ch, i) => (
        <span key={i} className={i < pos ? 'text-black dark:text-black bg-green-400 font-bold' : i === pos ? cls : 'text-gray-400 dark:text-yellow-400/40'}>{ch}</span>
      ))}
    </span>
  );
};

/** Three-colour swatch (paper / ink / pop) from the catalog preview triplet. */
export const ThemeSwatch: React.FC<{ item: CatalogItem; className?: string }> = ({ item, className = '' }) => {
  const [paper, ink, pop] = item.preview || ['#f4f4f0', '#000', '#ff007f'];
  return (
    <span className={`inline-flex h-5 w-12 border-2 border-black dark:border-yellow-400 overflow-hidden shrink-0 ${className}`} aria-hidden="true">
      <span className="flex-1" style={{ background: paper }} />
      <span className="flex-1" style={{ background: ink }} />
      <span className="flex-1" style={{ background: pop }} />
    </span>
  );
};

/** "LVL 5" or the achievement name that unlocks a locked item. */
export function lockLabel(item: CatalogItem, achievements: { key: string; name: string }[]): string {
  if (item.unlock?.level) return `LVL ${item.unlock.level}`;
  if (item.unlock?.achievement) return achievements.find(a => a.key === item.unlock.achievement)?.name || item.unlock.achievement;
  return '';
}
