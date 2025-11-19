'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Game, GamePlayer, Player } from '@/types';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import Card from '@/components/Card';
import Button from '@/components/Button';
import ChipIcon from '@/components/ChipIcon';
import BackButton from '@/components/BackButton';

interface ResultsClientProps {
  game: Game;
  gamePlayers: GamePlayer[];
  players: Player[];
  isAdmin: boolean;
}

export default function ResultsClient({
  game,
  gamePlayers,
  players,
  isAdmin,
}: ResultsClientProps) {
  const router = useRouter();

  useEffect(() => {
    // Trigger confetti on load
    setTimeout(() => triggerConfetti(), 500);
  }, []);

  const handleShareResults = () => {
    let text = `🎴 Poker Night Results - ${formatDate(game.date)}\n\n`;

    gamePlayers.forEach((gp, index) => {
      const player = players.find(p => p.id === gp.playerId);
      if (player) {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
        const playerName = `${player.first_name} ${player.nickname ? `"${player.nickname}"` : ''} ${player.last_name}`.trim().replace(/\s+/g, ' ');
        text += `${medal} ${playerName}: ${gp.profit >= 0 ? '+' : ''}${formatCurrency(gp.profit)}\n`;
      }
    });

    navigator.clipboard.writeText(text);
    alert('Results copied to clipboard!');
  };

  const winner = gamePlayers[0];
  const loser = gamePlayers[gamePlayers.length - 1];
  const totalPot = gamePlayers.reduce((sum, gp) =>
    sum + gp.buyIns.reduce((s, b) => s + b, 0), 0
  );
  const totalRebuys = gamePlayers.reduce((sum, gp) => sum + gp.buyIns.length - 1, 0);
  const avgBuyIn = totalPot / gamePlayers.length;

  const winnerPlayer = players.find(p => p.id === winner?.playerId);
  const loserPlayer = players.find(p => p.id === loser?.playerId);

  return (
    <>
      {/* Back Button */}
      <BackButton />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Game Results</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {formatDate(game.date)} at {formatTime(game.time)}
        </p>
      </div>

      {/* Winner/Loser Highlights */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Biggest Winner */}
        {winnerPlayer && winner && winner.profit > 0 && (
          <Card className="p-6 border-2 border-yellow-500 dark:border-yellow-600 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-gray-800">
            <div className="text-center">
              <p className="text-6xl mb-3">👑</p>
              <p className="text-yellow-600 dark:text-yellow-500 font-semibold mb-2">Biggest Winner</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {winnerPlayer.first_name} {winnerPlayer.nickname ? `"${winnerPlayer.nickname}"` : ''} {winnerPlayer.last_name}
              </h3>
              <p className="text-4xl font-bold text-poker-profit">
                +{formatCurrency(winner.profit)}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                {((winner.profit / winner.buyIns.reduce((sum, b) => sum + b, 0)) * 100).toFixed(0)}% ROI
              </p>
            </div>
          </Card>
        )}

        {/* Biggest Loser */}
        {loserPlayer && loser && loser.profit < 0 && (
          <Card className="p-6 border-2 border-red-500 dark:border-red-600 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-gray-800">
            <div className="text-center">
              <p className="text-6xl mb-3">😢</p>
              <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Biggest Loser</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {loserPlayer.first_name} {loserPlayer.nickname ? `"${loserPlayer.nickname}"` : ''} {loserPlayer.last_name}
              </h3>
              <p className="text-4xl font-bold text-poker-loss">
                {formatCurrency(loser.profit)}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                Better luck next time!
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Results Table */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Final Standings</h2>
        <div className="space-y-3">
          {gamePlayers.map((gamePlayer, index) => {
            const player = players.find(p => p.id === gamePlayer.playerId);
            if (!player) return null;

            const totalBuyIn = gamePlayer.buyIns.reduce((sum, amount) => sum + amount, 0);
            const roi = (gamePlayer.profit / totalBuyIn) * 100;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

            return (
              <div
                key={gamePlayer.id}
                className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="w-8 text-center">
                  {medal ? (
                    <span className="text-2xl">{medal}</span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 font-bold">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white font-bold">
                    {player.first_name} {player.nickname ? `"${player.nickname}"` : ''} {player.last_name}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    In: {formatCurrency(totalBuyIn)} • Out: {formatCurrency(gamePlayer.cashOut)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${gamePlayer.profit >= 0 ? 'text-poker-profit' : 'text-poker-loss'}`}>
                    {gamePlayer.profit >= 0 ? '+' : ''}{formatCurrency(gamePlayer.profit)}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Game Statistics */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Game Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Pot</p>
            <p className="text-2xl font-bold text-poker-gold-light dark:text-poker-gold-dark flex items-center gap-2">
              <ChipIcon className="w-5 h-5" />
              {formatCurrency(totalPot)}
            </p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Players</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{gamePlayers.length}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Rebuys</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRebuys}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Avg Buy-in</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(avgBuyIn)}</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Button onClick={handleShareResults} variant="secondary" fullWidth>
          Share Results
        </Button>
        <Button onClick={() => router.push('/')} variant="primary" fullWidth>
          Back to Dashboard
        </Button>
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Admin Actions</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Button onClick={() => router.push(`/game/${game.id}/live`)} variant="secondary" fullWidth>
              Edit Player Results
            </Button>
            <Button onClick={() => router.push(`/game/${game.id}`)} variant="ghost" fullWidth>
              Back to Game Details
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
