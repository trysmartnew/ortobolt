import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 48,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
        style={{ animationDuration: '2s' }}
      >
        <defs>
          <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0A3D8F" />
            <stop offset="100%" stopColor="#00B3A6" />
          </linearGradient>
        </defs>
        
        {/* Hexágono outline */}
        <path
          d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
          stroke="url(#spinner-gradient)"
          strokeWidth="3"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="120"
          strokeDashoffset="40"
        />
        
        {/* Raio central */}
        <path
          d="M38 16L24 34H32L28 48L42 30H34L38 16Z"
          fill="url(#spinner-gradient)"
          opacity="0.6"
        />
      </svg>
    </div>
  );
};
