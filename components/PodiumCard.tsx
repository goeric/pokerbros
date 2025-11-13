import React from 'react';
import Card from './Card';
import { formatCurrency } from '@/lib/utils';

interface PodiumCardProps {
  rank: 1 | 2 | 3;
  playerName: string;
  profit: number;
  winRate: number;
  gamesPlayed?: number;
  className?: string;
}

const RANK_CONFIG = {
  1: {
    emoji: '👑',
    label: '#1 CHIP LEADER',
    labelColor: 'text-yellow-600 dark:text-yellow-500',
    border: 'border-yellow-500 dark:border-yellow-600',
    gradient: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-gray-800',
    padding: 'p-8',
    emojiSize: 'text-6xl',
    nameSize: 'text-2xl',
    profitSize: 'text-5xl',
  },
  2: {
    emoji: '🥈',
    label: '#2',
    labelColor: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-300 dark:border-gray-600',
    gradient: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900',
    padding: 'p-6',
    emojiSize: 'text-5xl',
    nameSize: 'text-xl',
    profitSize: 'text-3xl',
  },
  3: {
    emoji: '🥉',
    label: '#3',
    labelColor: 'text-gray-600 dark:text-gray-400',
    border: 'border-amber-600 dark:border-amber-700',
    gradient: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-gray-900',
    padding: 'p-6',
    emojiSize: 'text-5xl',
    nameSize: 'text-xl',
    profitSize: 'text-3xl',
  },
};

export default function PodiumCard({
  rank,
  playerName,
  profit,
  winRate,
  gamesPlayed,
  className = '',
}: PodiumCardProps) {
  const config = RANK_CONFIG[rank];

  return (
    <Card
      className={`${config.padding} border-2 ${config.border} ${config.gradient} ${rank === 1 ? 'md:-mt-4' : ''} ${className}`}
    >
      <div className="text-center">
        <p className={`${config.emojiSize} mb-3`}>{config.emoji}</p>
        <p className={`${config.labelColor} font-semibold ${rank === 1 ? 'mb-2' : 'text-sm mb-2'}`}>
          {config.label}
        </p>
        <h3 className={`${config.nameSize} font-bold text-gray-900 dark:text-white ${rank === 1 ? 'mb-3' : 'mb-2'}`}>
          {playerName}
        </h3>
        <p className={`${config.profitSize} font-bold text-poker-profit ${rank === 1 ? 'mb-2' : ''}`}>
          {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
          {winRate.toFixed(0)}% win rate
          {gamesPlayed !== undefined && rank === 1 && ` • ${gamesPlayed} games`}
        </p>
      </div>
    </Card>
  );
}
