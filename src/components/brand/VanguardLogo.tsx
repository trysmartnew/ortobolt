import React from 'react';
import { VanguardSymbol } from './VanguardSymbol';

interface VanguardLogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon';
  size?: 'small' | 'medium' | 'large';
  showSubtitle?: boolean;
  className?: string;
}

export const VanguardLogo: React.FC<VanguardLogoProps> = ({
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
    return <VanguardSymbol size={symbolSize} className={className} />;
  }

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
        <VanguardSymbol size={symbolSize * 1.5} />
        <div className="flex flex-col items-center">
          <h1 className={`${textSizes[size]} font-semibold tracking-tight`}>
            <span style={{ color: 'var(--color-primary)' }}>Vanguard</span>
            <span style={{ color: 'var(--color-accent)' }}>Veterinary</span>
          </h1>
          {showSubtitle && (
            <p className={`${subtitleSizes[size]} text-[var(--color-text-tertiary)] tracking-widest uppercase mt-1`}>
              Ortopedia Veterinária Inteligente
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <VanguardSymbol size={symbolSize} />
      <div className="flex flex-col">
        <h1 className={`${textSizes[size]} font-semibold tracking-tight leading-none`}>
          <span style={{ color: 'var(--color-primary)' }}>Vanguard</span>
          <span style={{ color: 'var(--color-accent)' }}>Veterinary</span>
        </h1>
        {showSubtitle && (
          <p className={`${subtitleSizes[size]} text-[var(--color-text-tertiary)] tracking-widest uppercase mt-1`}>
            Ortopedia Veterinária Inteligente
          </p>
        )}
      </div>
    </div>
  );
};
