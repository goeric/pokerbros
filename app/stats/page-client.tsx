'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Player } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import BackButton from '@/components/BackButton';
import PodiumCard from '@/components/PodiumCard';

type FilterType = 'all' | 'recent5' | 'month';

interface PlayerStats extends Player {
  rank: number;
  winRate: number;
  avgBuyIn: number;
  hotStreak?: boolean;
  coldStreak?: boolean;
}

interface StatsClientProps {
  players: Player[];
}

export default function StatsClient({ players }: StatsClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');

  // Calculate stats for each player
  const playerStats: PlayerStats[] = players.map(p => {
    const profit = p.totalOut - p.totalIn;
    const winRate = p.gamesPlayed > 0 ? ((profit > 0 ? 1 : 0) / p.gamesPlayed) * 100 : 0;
    const avgBuyIn = p.gamesPlayed > 0 ? p.totalIn / p.gamesPlayed : 0;

    return {
      ...p,
      rank: 0, // Will be set after sorting
      winRate,
      avgBuyIn,
    };
  });

  // Sort by profit and assign ranks
  const sortedStats = playerStats.sort((a, b) =>
    (b.totalOut - b.totalIn) - (a.totalOut - a.totalIn)
  );

  sortedStats.forEach((stat, index) => {
    stat.rank = index + 1;
  });

  const filteredStats = sortedStats.filter(stat => {
    if (filter === 'all') return true;
    if (filter === 'recent5') return stat.gamesPlayed > 0;
    if (filter === 'month') return stat.gamesPlayed > 0;
    return true;
  });

  const getBadge = (stat: PlayerStats) => {
    const profit = stat.totalOut - stat.totalIn;

    if (stat.rank === 1 && profit > 0) return { emoji: '🦈', label: 'Shark' };
    if (stat.rank === filteredStats.length && profit < 0) return { emoji: '💰', label: 'ATM' };
    if (stat.gamesPlayed >= 5) return { emoji: '🎰', label: 'Grinder' };
    if (stat.avgBuyIn >= 30) return { emoji: '💎', label: 'High Roller' };
    if (stat.hotStreak) return { emoji: '🔥', label: 'Hot Streak' };
    if (stat.coldStreak) return { emoji: '❄️', label: 'Cold Streak' };

    return null;
  };

  return (
    <>
      {/* Back Button */}
      <BackButton />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Player Statistics</h1>
        <p className="text-gray-600 dark:text-gray-400">Leaderboard and performance tracking</p>
      </div>

      {/* Filter Options */}
      <div className="flex justify-center gap-3 mb-8">
        <Button
          variant={filter === 'all' ? 'primary' : 'ghost'}
          onClick={() => setFilter('all')}
        >
          All Time
        </Button>
        <Button
          variant={filter === 'recent5' ? 'primary' : 'ghost'}
          onClick={() => setFilter('recent5')}
        >
          Last 5 Games
        </Button>
        <Button
          variant={filter === 'month' ? 'primary' : 'ghost'}
          onClick={() => setFilter('month')}
        >
          This Month
        </Button>
      </div>

      {/* Top 3 Podium */}
      {filteredStats.length >= 3 && (
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <PodiumCard
            rank={2}
            playerName={filteredStats[1].name}
            profit={filteredStats[1].totalOut - filteredStats[1].totalIn}
            winRate={filteredStats[1].winRate}
          />
          <PodiumCard
            rank={1}
            playerName={filteredStats[0].name}
            profit={filteredStats[0].totalOut - filteredStats[0].totalIn}
            winRate={filteredStats[0].winRate}
            gamesPlayed={filteredStats[0].gamesPlayed}
          />
          <PodiumCard
            rank={3}
            playerName={filteredStats[2].name}
            profit={filteredStats[2].totalOut - filteredStats[2].totalIn}
            winRate={filteredStats[2].winRate}
          />
        </div>
      )}

      {/* Full Leaderboard */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Full Leaderboard</h2>

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-8 gap-4 px-4 py-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg mb-3 text-sm font-semibold text-gray-700 dark:text-gray-400">
          <div>Rank</div>
          <div className="col-span-2">Player</div>
          <div>Games</div>
          <div>Profit</div>
          <div>Win Rate</div>
          <div>Biggest Win</div>
          <div>Badges</div>
        </div>

        {/* Table Rows */}
        <div className="space-y-2">
          {filteredStats.map((stat) => {
            const profit = stat.totalOut - stat.totalIn;
            const badge = getBadge(stat);
            const rankColor = stat.rank === 1 ? 'text-yellow-500' : stat.rank === 2 ? 'text-gray-400' : stat.rank === 3 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400';

            return (
              <div
                key={stat.id}
                className="grid md:grid-cols-8 gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                {/* Rank */}
                <div className="flex items-center">
                  <span className={`text-2xl font-bold ${rankColor}`}>
                    {stat.rank <= 3 ? ['🥇', '🥈', '🥉'][stat.rank - 1] : `#${stat.rank}`}
                  </span>
                </div>

                {/* Player */}
                <div className="col-span-2 flex items-center">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{stat.name}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm md:hidden">
                      {stat.gamesPlayed} games • {stat.winRate.toFixed(0)}% win rate
                    </p>
                  </div>
                </div>

                {/* Games */}
                <div className="hidden md:flex items-center">
                  <span className="text-gray-900 dark:text-white">{stat.gamesPlayed}</span>
                </div>

                {/* Profit */}
                <div className="flex items-center">
                  <span className={`font-bold ${profit >= 0 ? 'text-poker-profit' : 'text-poker-loss'}`}>
                    {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                  </span>
                </div>

                {/* Win Rate */}
                <div className="hidden md:flex items-center">
                  <span className="text-gray-900 dark:text-white">{stat.winRate.toFixed(0)}%</span>
                </div>

                {/* Biggest Win */}
                <div className="hidden md:flex items-center">
                  <span className="text-poker-profit">
                    {formatCurrency(stat.biggestWin)}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex items-center">
                  {badge && (
                    <Badge variant="gold" className="text-xs">
                      {badge.emoji} {badge.label}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Empty State */}
      {filteredStats.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-6xl mb-4">📊</p>
          <h3 className="text-2xl font-bold text-white mb-2">No Statistics Yet</h3>
          <p className="text-gray-400 mb-6">
            Play some games to see player statistics and leaderboards!
          </p>
          <Button onClick={() => router.push('/')}>
            Go to Dashboard
          </Button>
        </Card>
      )}
    </>
  );
}
