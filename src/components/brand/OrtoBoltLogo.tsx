import React from 'react';
import { OrtoBoltSymbol } from './OrtoBoltSymbol';

interface OrtoBoltLogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon';
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
  className?: string;
}

export const OrtoBoltLogo: React.FC<OrtoBoltLogoProps> = ({
  variant = 'horizontal',
  size = 'medium',
  showSubtitle = true,
  className = ''
}) => {
  const symbolSizes = { small: 32, medium: 48, large: 64 };
  const symbolSize = symbolSizes[size];
  
  const textSizes = {
    small: 'text-xl',
    medium: 'text-3xl',
    large: 'text-4xl'
  };
  
  const subtitleSizes = {
    small: 'text-[8px]',
    medium: 'text-[10px]',
    large: 'text-xs'
  };

  if (variant === 'icon') {
    return <OrtoBoltSymbol size={symbolSize} className={className} />;
  }

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
        <OrtoBoltSymbol size={symbolSize * 1.5} />
        <div className="flex flex-col items-center">
          <h1 className={`${textSizes[size]} font-semibold tracking-tight`}>
            <span style={{ color: 'var(--color-primary)' }}>Vanguard</span>
            <span style={{ color: 'var(--color-accent)' }}>Veterinary</span>
          </h1>
          {showSubtitle && (
            <p className={`${subtitleSizes[size]} text-slate-500 tracking-widest uppercase mt-1`}>
              Ortopedia Veterinária Inteligente
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <OrtoBoltSymbol size={symbolSize} />
      <div className="flex flex-col">
        <h1 className={`${textSizes[size]} font-semibold tracking-tight leading-none`}>
          <span style={{ color: 'var(--color-primary)' }}>Vanguard</span>
          <span style={{ color: 'var(--color-accent)' }}>Veterinary</span>
        </h1>
        {showSubtitle && (
          <p className={`${subtitleSizes[size]} text-slate-500 tracking-widest uppercase mt-1`}>
            Ortopedia Veterinária Inteligente
          </p>
        )}
      </div>
    </div>
  );
};
