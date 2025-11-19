'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Game, GamePlayer, Player } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ChipIcon from '@/components/ChipIcon';
import BackButton from '@/components/BackButton';
import { addRebuy, removeLastRebuy } from './actions';

interface LiveGameClientProps {
  game: Game;
  initialGamePlayers: GamePlayer[];
  players: Player[];
  isAdmin: boolean;
}

export default function LiveGameClient({
  game,
  initialGamePlayers,
  players,
  isAdmin,
}: LiveGameClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [coinAnimation, setCoinAnimation] = useState<string | null>(null);

  const gamePlayers = initialGamePlayers;

  const handleAddRebuy = async (gamePlayerId: string) => {
    setCoinAnimation(gamePlayerId);
    setTimeout(() => setCoinAnimation(null), 600);

    startTransition(async () => {
      await addRebuy(game.id, gamePlayerId, game.buyIn);
    });
  };

  const handleRemoveRebuy = async (gamePlayerId: string) => {
    if (confirm('Remove the last rebuy for this player?')) {
      startTransition(async () => {
        const result = await removeLastRebuy(game.id, gamePlayerId);
        if ('error' in result) {
          alert(result.error);
        }
      });
    }
  };

  const handleEndGame = () => {
    if (confirm('End the game and proceed to cash-out recording?')) {
      router.push(`/game/${game.id}/cashout`);
    }
  };

  // Calculate total pot from game_players
  const totalPot = gamePlayers.reduce((sum, gp) =>
    sum + gp.buyIns.reduce((total, buyIn) => total + buyIn, 0), 0
  );

  // Find player with most rebuys (only if they have rebuys, not just initial buy-in)
  const playersWithRebuys = gamePlayers.filter(gp => gp.buyIns.length > 1);
  const mostRebuys = playersWithRebuys.length > 0
    ? playersWithRebuys.reduce((max, gp) => gp.buyIns.length > max.buyIns.length ? gp : max, playersWithRebuys[0])
    : null;

  return (
    <>
      {/* Back Button */}
      <BackButton href={`/game/${game.id}`} label="Back to Game" />

      {/* Live Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse-soft"></span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Game</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">Track buy-ins and rebuys in real-time</p>
      </div>

      {/* Total Pot Display */}
      <Card className="p-8 mb-8 text-center card-gradient">
        <p className="text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wide mb-2">Total Pot</p>
        <div className="flex items-center justify-center gap-3">
          <ChipIcon className="w-12 h-12 text-poker-gold-light dark:text-poker-gold-dark" />
          <p className="text-6xl font-bold text-poker-gold-light dark:text-poker-gold-dark">
            {formatCurrency(totalPot)}
          </p>
        </div>
      </Card>

      {/* Game Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Players</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{gamePlayers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Rebuys</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {gamePlayers.reduce((sum, gp) => sum + gp.buyIns.length - 1, 0)}
          </p>
        </Card>
        <Card className="p-4 col-span-2 md:col-span-1">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Most Rebuys</p>
          {mostRebuys ? (
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400 truncate">
              {players.find(p => p.id === mostRebuys.playerId)?.first_name}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">Playing tight!</p>
            </div>
          )}
        </Card>
      </div>

      {/* Player Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {gamePlayers.map(gamePlayer => {
          const player = players.find(p => p.id === gamePlayer.playerId);
          if (!player) return null;

          const totalBuyIn = gamePlayer.buyIns.reduce((sum, amount) => sum + amount, 0);
          const rebuyCount = gamePlayer.buyIns.length - 1;

          return (
            <Card key={gamePlayer.id} className="p-6 relative overflow-hidden">
              {/* Coin Animation */}
              {coinAnimation === gamePlayer.id && (
                <div className="absolute top-4 right-4 animate-coin-drop">
                  <ChipIcon className="w-8 h-8 text-poker-gold-light dark:text-poker-gold-dark" />
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {player.first_name} {player.nickname ? `"${player.nickname}"` : ''} {player.last_name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                      {gamePlayer.buyIns.length} buy-in{gamePlayer.buyIns.length !== 1 ? 's' : ''}
                    </span>
                    {rebuyCount > 0 && (
                      <span className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                        ({rebuyCount} rebuy{rebuyCount !== 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-poker-gold-light dark:text-poker-gold-dark">
                    {formatCurrency(totalBuyIn)}
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <Button
                    onClick={() => handleAddRebuy(gamePlayer.id)}
                    variant="secondary"
                    fullWidth
                    disabled={isPending}
                    className="flex items-center justify-center gap-2"
                  >
                    <ChipIcon className="w-5 h-5" />
                    Add Rebuy +{formatCurrency(game.buyIn)}
                  </Button>
                  {rebuyCount > 0 && (
                    <Button
                      onClick={() => handleRemoveRebuy(gamePlayer.id)}
                      variant="ghost"
                      fullWidth
                      disabled={isPending}
                      className="flex items-center justify-center gap-2 text-sm"
                    >
                      <span className="text-red-600 dark:text-red-400">✕</span>
                      Remove Last Rebuy
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* End Game Button - Admin Only */}
      {isAdmin && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Ready to cash out?</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                End the game and record everyone's final cash-out amounts
              </p>
            </div>
            <Button onClick={handleEndGame} variant="primary">
              End Game
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
