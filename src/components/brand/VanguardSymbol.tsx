import React from 'react';

interface VanguardSymbolProps {
  size?: number | string;
  variant?: 'default' | 'monochrome' | 'negative' | 'positive';
  className?: string;
}

export const VanguardSymbol: React.FC<VanguardSymbolProps> = ({
  size = 48,
  variant = 'default',
  className = ''
}) => {
  const gradientId = `bolt-gradient-${Math.random().toString(36).substr(2, 9)}`;
  
  const getColors = () => {
    switch (variant) {
      case 'monochrome':
        return { left: '#1D2433', right: '#1D2433', bg: 'transparent' };
      case 'negative':
        return { left: 'var(--color-text-primary)', right: 'var(--color-text-primary)', bg: 'transparent' };
      case 'positive':
        return { left: 'var(--color-primary)', right: 'var(--color-accent)', bg: 'var(--color-text-primary)' };
      default:
        return { left: 'var(--color-primary)', right: 'var(--color-accent)', bg: 'transparent' };
    }
  };

  const colors = getColors();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.left} />
          <stop offset="100%" stopColor={colors.right} />
        </linearGradient>
      </defs>
      
      {/* Hexágono com cantos arredondados */}
      <path
        d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
        fill={`url(#${gradientId})`}
        strokeLinejoin="round"
        strokeWidth="2"
      />
      
      {/* Raio/Bolt - elemento central */}
      <path
        d="M38 16L24 34H32L28 48L42 30H34L38 16Z"
        fill="white"
        strokeLinejoin="round"
      />
    </svg>
  );
};
