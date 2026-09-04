import React from 'react';

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
  /** Sentence a screen reader hears instead of the bare number. */
  label?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  showLabel = true,
  animated = true,
  className = '',
  label,
}) => {
  const percentage = (value / max) * 100;

  return (
    <div className={className}>
      <div
        className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? `${value} of ${max} words typed`}
      >
        <div
          className={`
            h-full bg-gradient-to-r from-indigo-500 to-green-500
            rounded-full transition-all
            ${animated ? 'duration-300 ease-out' : ''}
          `}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2">
          {value} / {max} words
        </p>
      )}
    </div>
  );
};

export default ProgressBar;
