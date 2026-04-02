import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean | string;
  hint?: string;
  icon?: React.ReactNode;
}

const InputField = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, hint, icon, className, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
            {label}
          </label>
        )}
        
        <div className="relative">
          <input
            ref={ref}
            className={`
              w-full px-4 py-3 rounded-lg border transition-all
              bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              focus:outline-none focus:ring-2
              ${
                error
                  ? 'border-red-500 focus:ring-red-500/20 focus:border-red-600'
                  : success
                  ? 'border-green-500 focus:ring-green-500/20 focus:border-green-600'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-500'
              }
              ${className || ''}
            `}
            {...props}
          />
          {icon && (
            <div className="absolute right-3 top-3 text-slate-400">
              {icon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </p>
        )}
        
        {success && (
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            ✓ {typeof success === 'string' ? success : 'Success'}
          </p>
        )}
        
        {hint && !error && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = 'InputField';
export default InputField;
