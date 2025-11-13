import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'gold';
  className?: string;
}

export default function Badge({ children, variant = 'info', className = '' }: BadgeProps) {
  const variantStyles = {
    success: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
    warning: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
    danger: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
    info: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700',
    gold: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-300 ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
