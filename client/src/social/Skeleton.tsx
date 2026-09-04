import React from 'react';
import { Panel, Btn } from '../multiplayer/ui';

// Loading / error furniture shared by the social, competitive and multiplayer
// pages. Skeletons mirror the shape of the real content so the layout does not
// jump when the data lands, and every one of them carries a text alternative -
// the pulse alone means nothing to a screen reader or with reduced motion on.

/** One placeholder block. Decorative: the wrapper does the announcing. */
export const Bar: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div aria-hidden="true" className={`bg-black/10 dark:bg-yellow-400/20 ${className}`} />
);

/** Wraps a tree of <Bar>s: one polite announcement, one pulse. */
export const SkeletonBlock: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({
  label, className = '', children,
}) => (
  <div role="status" aria-live="polite" aria-busy="true" className={`animate-pulse ${className}`}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

/** Skeleton rows shaped like a table body. */
export const SkeletonRows: React.FC<{ rows?: number; label: string; className?: string }> = ({
  rows = 6, label, className = '',
}) => (
  <SkeletonBlock label={label} className={`space-y-2 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 border-b-2 border-black/10 dark:border-yellow-400/10 pb-2">
        <Bar className="h-4 w-6 shrink-0" />
        <Bar className="h-4 flex-1" />
        <Bar className="h-4 w-12 shrink-0" />
      </div>
    ))}
  </SkeletonBlock>
);

/** Failed fetch: say what broke and offer the retry. */
export const ErrorPanel: React.FC<{
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  busy?: boolean;
  className?: string;
  /** already inside a Panel - skip the border and shadow */
  bare?: boolean;
}> = ({ message, onRetry, retryLabel = 'Try again', busy, className = '', bare }) => {
  const body = (
    <>
      <p className="text-lg sm:text-xl font-black uppercase mb-2">
        <span aria-hidden="true">⚠ </span>Something broke
      </p>
      <p className="font-mono text-sm font-bold mb-4 break-words">{message}</p>
      {onRetry && (
        <Btn color="bg-yellow-300" onClick={onRetry} disabled={busy}>
          {busy ? 'Retrying…' : retryLabel}
        </Btn>
      )}
    </>
  );
  if (bare) return <div className={`text-center py-8 ${className}`}>{body}</div>;
  return <Panel className={`text-center py-8 ${className}`}>{body}</Panel>;
};

/** Inline (in-Panel) version of the above, for the narrow side columns. */
export const ErrorNote: React.FC<{ message: string; onRetry?: () => void; busy?: boolean }> = ({ message, onRetry, busy }) => (
  <div className="py-3">
    <p className="font-mono text-sm font-bold text-red-600 dark:text-red-400 break-words">{message}</p>
    {onRetry && (
      <Btn color="bg-yellow-300" className="text-xs py-1 mt-2" onClick={onRetry} disabled={busy}>
        {busy ? 'Retrying…' : 'Retry'}
      </Btn>
    )}
  </div>
);

const MEDALS = ['🥇', '🥈', '🥉'];

/** Rank cell: a medal for the podium, the number below it - always labelled. */
export const Rank: React.FC<{ rank: number }> = ({ rank }) =>
  rank >= 1 && rank <= 3
    ? <span role="img" aria-label={`rank ${rank}`}>{MEDALS[rank - 1]}</span>
    : <span>{rank}</span>;

export default SkeletonBlock;
