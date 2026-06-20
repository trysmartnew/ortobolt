import React from 'react';

interface HexagonPatternProps {
  className?: string;
  opacity?: number;
}

export const HexagonPattern: React.FC<HexagonPatternProps> = ({
  className = '',
  opacity = 0.05
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hex-pattern" x="0" y="0" width="60" height="104" patternUnits="userSpaceOnUse">
            <path
              d="M30 4L52 17V43L30 56L8 43V17L30 4Z"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1"
              opacity={opacity}
            />
            <path
              d="M30 56L52 69V95L30 108L8 95V69L30 56Z"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1"
              opacity={opacity}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-pattern)" />
      </svg>
    </div>
  );
};
