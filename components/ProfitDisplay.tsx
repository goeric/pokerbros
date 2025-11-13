import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface ProfitDisplayProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
}

export default function ProfitDisplay({
  amount,
  size = 'md',
  showLabel = false,
  className = ''
}: ProfitDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  const isProfit = amount >= 0;
  const colorClass = isProfit ? 'text-poker-profit' : 'text-poker-loss';

  return (
    <div className={className}>
      <p className={`font-bold ${sizeClasses[size]} ${colorClass}`}>
        {isProfit ? '+' : ''}{formatCurrency(amount)}
      </p>
      {showLabel && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isProfit ? 'profit' : 'loss'}
        </p>
      )}
    </div>
  );
}
