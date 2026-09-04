// Caret cosmetics. The current-character span in every typing surface takes
// its classes from caretClasses(); the visual rules live in themes.css.
import { useSettings } from './contexts/SettingsContext';

export type CaretKey = 'block' | 'line' | 'underline' | 'box' | 'ghost' | 'rainbow';
export const CARET_KEYS: CaretKey[] = ['block', 'line', 'underline', 'box', 'ghost', 'rainbow'];

const INK = 'font-bold text-black dark:text-yellow-400';

/** Tailwind (+ themes.css) classes for the "current character" span. */
export function caretClasses(caret: string): string {
  switch (caret) {
    case 'line': return `caret-line ${INK}`;
    case 'underline': return `caret-underline ${INK}`;
    case 'box': return `caret-box ${INK}`;
    case 'ghost': return `caret-ghost ${INK}`;
    case 'rainbow': return 'caret-rainbow bg-pink-500 text-white font-bold';
    case 'block':
    default:
      return 'bg-pink-500 text-white dark:bg-yellow-400 dark:text-black animate-pulse font-bold';
  }
}

/** Current-character class for the equipped caret (reads the settings context). */
export function useCaretClass(): string {
  const { settings } = useSettings();
  return caretClasses(settings.caret);
}
