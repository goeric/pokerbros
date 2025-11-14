'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Game, RSVP, Player } from '@/types';
import { formatDate, formatDateWithDay, formatTime, formatCurrency, formatPlayerName, isToday } from '@/lib/utils';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import SeatIndicator from '@/components/SeatIndicator';
import ChipIcon from '@/components/ChipIcon';
import BackButton from '@/components/BackButton';
import GameFormModal from '@/components/GameFormModal';
import { addRSVP, cancelRSVP, startGame, updateGame, deleteGame } from './actions';

interface GameDetailClientProps {
  game: Game;
  initialRSVPs: RSVP[];
  players: Player[];
  user: User | null;
  isAdmin: boolean;
}

export default function GameDetailClient({
  game,
  initialRSVPs,
  players,
  user,
  isAdmin,
}: GameDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [showPromotion, setShowPromotion] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const rsvps = initialRSVPs;

  const handleRSVP = async () => {
    if (!selectedPlayerId) return;

    startTransition(async () => {
      await addRSVP(game.id, selectedPlayerId);
      setSelectedPlayerId('');
    });
  };

  const handleCancelRSVP = async (playerId: string) => {
    if (!confirm('Cancel your spot? (Waitlist players will be auto-promoted)')) return;

    startTransition(async () => {
      const result = await cancelRSVP(game.id, playerId);
      if ('error' in result) {
        alert(result.error);
      }
    });
  };

  const handleStartGame = async () => {
    if (!confirm('Start the game? This will activate live tracking.')) return;

    startTransition(async () => {
      await startGame(game.id);
      router.push(`/game/${game.id}/live`);
    });
  };

  const handleDeleteGame = async () => {
    if (!confirm('Delete this game? This action cannot be undone.')) return;

    startTransition(async () => {
      await deleteGame(game.id);
      router.push('/');
    });
  };

  const handleEditGame = async (formData: { date: string; time: string; buyIn: number; venue: string; notes: string }) => {
    startTransition(async () => {
      const result = await updateGame(game.id, formData);

      if ('error' in result) {
        alert('Failed to update game. Please try again.');
        return;
      }

      setShowEditModal(false);
      router.refresh();
    });
  };

  // Check if game should be live based on its scheduled time
  const isGameLive = () => {
    if (game.status === 'in_progress') return true;
    if (game.status === 'completed') return false;

    const gameDateTime = new Date(`${game.date}T${game.time}`);
    const now = new Date();
    return gameDateTime <= now;
  };

  const gameShouldBeLive = isGameLive();

  const confirmedRSVPs = rsvps.filter(r => r.status === 'confirmed');
  const waitlistRSVPs = rsvps.filter(r => r.status === 'waitlist').sort((a, b) =>
    (a.waitlistPosition || 0) - (b.waitlistPosition || 0)
  );
  const availablePlayers = players.filter(p => !rsvps.find(r => r.playerId === p.id));

  // Find the player that matches the current user's email
  const currentPlayer = user?.email ? players.find(p => p.email === user.email) : null;
  const hasRSVPd = currentPlayer ? rsvps.find(r => r.playerId === currentPlayer.id) : null;
  const canSelfRSVP = user && currentPlayer && !hasRSVPd;

  // Determine display status based on actual state
  const displayStatus = gameShouldBeLive ? 'in_progress' : game.status;

  const statusColors = {
    upcoming: 'info',
    in_progress: 'warning',
    completed: 'success',
  } as const;

  const statusLabels = {
    upcoming: 'Upcoming',
    in_progress: 'Live',
    completed: 'Completed',
  };

  return (
    <>
      {/* Promotion Banner */}
      {showPromotion && (
        <div className="mb-6 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-700 rounded-lg p-4 animate-slide-in">
          <p className="text-green-400 font-bold flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            You've been promoted from the waitlist!
          </p>
        </div>
      )}

      {/* Back Button */}
      <BackButton />

      {/* Game Info Header */}
      <Card className="p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {formatDateWithDay(game.date)}
            </h1>
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <span>{formatTime(game.time)}</span>
              <span>•</span>
              <span>{game.venue}</span>
            </div>
          </div>
          <Badge variant={statusColors[displayStatus]}>
            {gameShouldBeLive && <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1.5 animate-pulse"></span>}
            {statusLabels[displayStatus]}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-poker-gold-light dark:text-poker-gold-dark mb-4">
          <ChipIcon className="w-6 h-6" />
          <span className="text-2xl font-bold">{formatCurrency(game.buyIn)}</span>
          <span className="text-gray-600 dark:text-gray-400">buy-in</span>
        </div>

        {game.notes && (
          <p className="text-gray-600 dark:text-gray-400 italic mb-4">
            {game.notes}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {/* View Live Game - show for any live game */}
          {gameShouldBeLive && game.status !== 'completed' && (
            <Button onClick={() => router.push(`/game/${game.id}/live`)} variant="primary" fullWidth>
              <span className="inline-block w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
              View Live Game
            </Button>
          )}

          {/* Start Game - only for admins on upcoming games that aren't live yet */}
          {!gameShouldBeLive && game.status === 'upcoming' && isToday(game.date) && confirmedRSVPs.length > 0 && isAdmin && (
            <Button onClick={handleStartGame} variant="primary" fullWidth disabled={isPending}>
              Start Game
            </Button>
          )}

          {/* View Results - completed games */}
          {game.status === 'completed' && (
            <Button onClick={() => router.push(`/game/${game.id}/results`)} variant="primary" fullWidth>
              View Results
            </Button>
          )}

          {/* Edit/Delete - only for upcoming games that aren't live yet */}
          {!gameShouldBeLive && game.status === 'upcoming' && isAdmin && (
            <>
              <Button onClick={() => setShowEditModal(true)} variant="secondary" disabled={isPending}>
                Edit Game
              </Button>
              <Button onClick={handleDeleteGame} variant="danger" disabled={isPending}>
                Delete Game
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* RSVP Section - only for upcoming games that aren't live yet */}
      {!gameShouldBeLive && game.status === 'upcoming' && (
        <>
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">RSVP</h2>

            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-600 dark:text-gray-400">
                  {confirmedRSVPs.length}/8 Seats Filled
                </span>
                {waitlistRSVPs.length > 0 && (
                  <span className="text-amber-700 dark:text-amber-400">
                    {waitlistRSVPs.length} on waitlist
                  </span>
                )}
              </div>
              <SeatIndicator filled={confirmedRSVPs.length} />
            </div>

            {/* Admin can RSVP any player */}
            {isAdmin && (
              <div className="flex gap-3">
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-poker-green focus:border-transparent"
                  disabled={isPending}
                >
                  <option value="">Select player to RSVP...</option>
                  {availablePlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {formatPlayerName(player)}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleRSVP}
                  disabled={!selectedPlayerId || isPending}
                  variant="primary"
                >
                  RSVP Player
                </Button>
              </div>
            )}

            {/* Non-admin players can RSVP themselves */}
            {!isAdmin && user && canSelfRSVP && currentPlayer && (
              <Button
                onClick={() => {
                  startTransition(async () => {
                    const result = await addRSVP(game.id, currentPlayer.id);
                    if ('error' in result) {
                      alert(result.error);
                    }
                  });
                }}
                disabled={isPending}
                variant="primary"
                fullWidth
              >
                RSVP for Myself
              </Button>
            )}

            {/* Show message if player already RSVP'd */}
            {!isAdmin && user && hasRSVPd && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-700 dark:text-green-400 text-center font-medium">
                  ✓ You're {hasRSVPd.status === 'confirmed' ? 'confirmed' : `#${hasRSVPd.waitlistPosition} on the waitlist`}
                </p>
              </div>
            )}

            {/* Show login prompt for non-authenticated users */}
            {!isAdmin && !user && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 text-center text-sm">
                  <a href="/login" className="text-poker-green hover:underline font-medium">Sign in</a> to RSVP for this game
                </p>
              </div>
            )}
          </Card>

          {/* Confirmed Players */}
          {confirmedRSVPs.length > 0 && (
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Confirmed Players ({confirmedRSVPs.length})
              </h3>
              <div className="space-y-2">
                {confirmedRSVPs.map((rsvp, index) => {
                  const player = players.find(p => p.id === rsvp.playerId);
                  if (!player) return null;
                  return (
                    <div
                      key={rsvp.id}
                      className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-poker-green font-bold text-lg">
                          {index + 1}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {player.first_name} {player.nickname ? `"${player.nickname}"` : ''} {player.last_name}
                        </span>
                      </div>
                      {(isAdmin || (user && player.email === user.email)) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelRSVP(player.id)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Waitlist */}
          {waitlistRSVPs.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-4">
                Waitlist ({waitlistRSVPs.length})
              </h3>
              <div className="space-y-2">
                {waitlistRSVPs.map((rsvp) => {
                  const player = players.find(p => p.id === rsvp.playerId);
                  if (!player) return null;
                  return (
                    <div
                      key={rsvp.id}
                      className="flex items-center justify-between p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-amber-700 dark:text-amber-400 font-bold">
                          #{rsvp.waitlistPosition}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {player.first_name} {player.nickname ? `"${player.nickname}"` : ''} {player.last_name}
                        </span>
                      </div>
                      {(isAdmin || (user && player.email === user.email)) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelRSVP(player.id)}
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-amber-700 dark:text-amber-400/70 text-sm mt-4">
                💡 Waitlisted players will be automatically promoted if someone cancels
              </p>
            </Card>
          )}
        </>
      )}

      {/* In Progress Message */}
      {game.status === 'in_progress' && (
        <Card className="p-8 text-center">
          <p className="text-4xl mb-4 animate-pulse">🎲</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Game in Progress</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The game is currently being played. Click below to track buy-ins and rebuys.
          </p>
          <Button onClick={() => router.push(`/game/${game.id}/live`)} variant="primary">
            Go to Live Tracker
          </Button>
        </Card>
      )}

      {/* Completed Message */}
      {game.status === 'completed' && (
        <Card className="p-8 text-center">
          <p className="text-4xl mb-4">✅</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Game Completed</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This game has ended. View the final results and player performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push(`/game/${game.id}/results`)} variant="primary">
              View Results
            </Button>
            {isAdmin && (
              <>
                <Button onClick={() => setShowEditModal(true)} variant="secondary">
                  Edit Game Details
                </Button>
                <Button
                  onClick={async () => {
                    if (confirm('Reset this game back to live tracking? This will allow you to edit player results.')) {
                      startTransition(async () => {
                        await startGame(game.id);
                        router.push(`/game/${game.id}/live`);
                      });
                    }
                  }}
                  variant="ghost"
                  disabled={isPending}
                >
                  Reset to Live
                </Button>
                <Button onClick={handleDeleteGame} variant="danger" disabled={isPending}>
                  Delete Game
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Edit Game Modal */}
      <GameFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditGame}
        initialData={{
          date: game.date,
          time: game.time,
          buyIn: game.buyIn,
          venue: game.venue,
          notes: game.notes || '',
        }}
        mode="edit"
      />
    </>
  );
}
