import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-light rounded-lg',
      elevated: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-medium rounded-lg hover:shadow-large hover:-translate-y-1 transition-all duration-200',
      glass: 'bg-white/80 dark:bg-slate-800/60 backdrop-blur-md border border-white/40 dark:border-slate-700/40 rounded-xl shadow-light',
    };
    
    return (
      <div
        ref={ref}
        className={`${variantStyles[variant]} ${className || ''}`}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
export default Card;
