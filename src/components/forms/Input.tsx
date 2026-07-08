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
          className={`w-full px-3 py-3 h-[42px] rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
            error ? 'border-error focus:ring-error' : 'focus:ring-primary'
          } ${className || ''}`}
          {...props}
        />
        {error && (
          <span className="text-xs text-error">{error}</span>
        )}
        {helperText && !error && (
          <span className="text-xs text-menu-muted">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
