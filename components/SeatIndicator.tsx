import React from 'react';

interface SeatIndicatorProps {
  total?: number;
  filled: number;
  className?: string;
}

export default function SeatIndicator({ total = 8, filled, className = '' }: SeatIndicatorProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`flex-1 h-2 rounded-full transition-colors ${
            index < filled
              ? 'bg-green-500 dark:bg-green-400'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
}
