'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Game, GamePlayer, Player } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ChipIcon from '@/components/ChipIcon';
import BackButton from '@/components/BackButton';
import { finalizeGameResults } from './actions';

interface CashOutClientProps {
  game: Game;
  gamePlayers: GamePlayer[];
  players: Player[];
}

export default function CashOutClient({
  game,
  gamePlayers,
  players,
}: CashOutClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Initialize cash-outs from existing data
  const initialCashOuts: Record<string, number> = {};
  gamePlayers.forEach(gp => {
    initialCashOuts[gp.playerId] = gp.cashOut || 0;
  });
  const [cashOuts, setCashOuts] = useState<Record<string, number>>(initialCashOuts);

  const updateCashOut = (playerId: string, amount: number) => {
    setCashOuts(prev => ({
      ...prev,
      [playerId]: Math.max(0, amount),
    }));
  };

  const handleQuickSet = (playerId: string, type: 'busted' | 'even') => {
    const gamePlayer = gamePlayers.find(gp => gp.playerId === playerId);
    if (!gamePlayer) return;

    const totalBuyIn = gamePlayer.buyIns.reduce((sum, amount) => sum + amount, 0);

    if (type === 'busted') {
      updateCashOut(playerId, 0);
    } else if (type === 'even') {
      updateCashOut(playerId, totalBuyIn);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Finalize results? This will end the game.')) {
      return;
    }

    startTransition(async () => {
      const result = await finalizeGameResults(game.id, cashOuts);
      if (result && 'error' in result) {
        alert(result.error);
      }
    });
  };

  // Calculate validation
  const totalIn = gamePlayers.reduce((sum, gp) =>
    sum + gp.buyIns.reduce((total, buyIn) => total + buyIn, 0), 0
  );
  const totalOut = Object.values(cashOuts).reduce((sum, amount) => sum + amount, 0);
  const difference = totalOut - totalIn;
  const validation = {
    valid: Math.abs(difference) < 0.01,
    totalIn,
    totalOut,
    difference,
  };

  return (
    <>
      {/* Back Button */}
      <BackButton href={`/game/${game.id}/live`} label="Back to Live Game" />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cash-Out Recording</h1>
        <p className="text-gray-600 dark:text-gray-400">Record final cash-out amounts for each player</p>
      </div>

      {/* Total Pot Reminder */}
      <Card className="p-6 mb-8 text-center card-gradient">
        <p className="text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wide mb-2">
          Total Pot to Distribute
        </p>
        <div className="flex items-center justify-center gap-3">
          <ChipIcon className="w-10 h-10 text-poker-gold-light dark:text-poker-gold-dark" />
          <p className="text-5xl font-bold text-poker-gold-light dark:text-poker-gold-dark">
            {formatCurrency(totalIn)}
          </p>
        </div>
      </Card>

      {/* Player List */}
      <div className="space-y-4 mb-8">
        {gamePlayers.map(gamePlayer => {
          const player = players.find(p => p.id === gamePlayer.playerId);
          if (!player) return null;

          const totalBuyIn = gamePlayer.buyIns.reduce((sum, amount) => sum + amount, 0);
          const cashOut = cashOuts[gamePlayer.playerId] || 0;
          const profit = cashOut - totalBuyIn;

          return (
            <Card key={gamePlayer.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {player.first_name} {player.nickname ? `"${player.nickname}"` : ''} {player.last_name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Total in: {formatCurrency(totalBuyIn)}
                  </p>
                </div>
                <div className={`text-right ${profit >= 0 ? 'text-poker-profit' : 'text-poker-loss'}`}>
                  <p className="text-2xl font-bold">
                    {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                  </p>
                  <p className="text-sm">
                    {profit >= 0 ? 'profit' : 'loss'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleQuickSet(gamePlayer.playerId, 'busted')}
                  disabled={isPending}
                >
                  Busted ($0)
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleQuickSet(gamePlayer.playerId, 'even')}
                  disabled={isPending}
                >
                  Even ({formatCurrency(totalBuyIn)})
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateCashOut(gamePlayer.playerId, cashOut - 5)}
                  disabled={isPending}
                >
                  -$5
                </Button>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={cashOut}
                    onChange={(e) => updateCashOut(gamePlayer.playerId, Number(e.target.value))}
                    min="0"
                    step="5"
                    disabled={isPending}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-center font-bold text-lg focus:ring-2 focus:ring-poker-green focus:border-transparent disabled:opacity-50"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateCashOut(gamePlayer.playerId, cashOut + 5)}
                  disabled={isPending}
                >
                  +$5
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Validation Section */}
      <Card className={`p-6 mb-6 ${validation.valid ? 'border-green-700' : 'border-red-700'}`}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Validation</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total In</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(validation.totalIn)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Out</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(validation.totalOut)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Difference</p>
            <p className={`text-2xl font-bold ${validation.valid ? 'text-poker-profit' : 'text-poker-loss'}`}>
              {formatCurrency(Math.abs(validation.difference))}
            </p>
          </div>
        </div>

        {!validation.valid && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm font-medium text-center">
              ⚠️ Totals must match before finalizing!
            </p>
          </div>
        )}
      </Card>

      {/* Finalize Button */}
      <Button
        onClick={handleFinalize}
        disabled={!validation.valid || isPending}
        variant="primary"
        fullWidth
        size="lg"
      >
        {isPending ? 'Finalizing...' : 'Finalize Results'}
      </Button>
    </>
  );
}
