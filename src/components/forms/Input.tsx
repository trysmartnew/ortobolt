import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-menu">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-3 h-[42px] rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#29a399] transition-all ${error ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#29a399]'
            } ${className || ''}`}
          {...props}
        />
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
        {helperText && !error && (
          <span className="text-xs text-slate-400">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
