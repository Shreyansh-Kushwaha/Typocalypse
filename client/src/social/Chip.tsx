import React from 'react';

// Toggle chip for tabs / filters - the same hard-edged style as the ladder tabs.
export const Chip: React.FC<{ active?: boolean; onClick?: () => void; className?: string; children: React.ReactNode }> = ({ active, onClick, className = '', children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`font-black uppercase text-xs px-3 py-1.5 border-2 border-black dark:border-yellow-400 transition-colors ${
      active ? 'bg-black text-white dark:bg-yellow-400 dark:text-black' : 'bg-white dark:bg-black hover:bg-yellow-200 dark:hover:bg-yellow-400/20'
    } ${className}`}
  >
    {children}
  </button>
);

export default Chip;
