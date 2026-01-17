'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User } from '@supabase/supabase-js';
import { Game, RSVP, Player } from '@/types';
import { formatDateWithDay, formatTime, formatCurrency, formatPlayerName, isToday } from '@/lib/utils';
import BackButton from '@/components/BackButton';
import GameFormModal from '@/components/GameFormModal';
import { addRSVP, cancelRSVP, startGame, updateGame, deleteGame } from './actions';
import { Clock, MapPin, CurrencyDollar, Users, Play, Pencil, Trash, Check, X, Trophy, ListBullets } from '@phosphor-icons/react';

interface GameDetailClientProps {
  game: Game;
  initialRSVPs: RSVP[];
  players: Player[];
  user: User | null;
  isAdmin: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export default function GameDetailClient({
  game,
  initialRSVPs,
  players,
  user,
  isAdmin,
  successMessage,
  errorMessage,
}: GameDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [showPromotion, setShowPromotion] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const previousMessageRef = useRef<string | undefined>(undefined);

  // Show toast and auto-dismiss after 5 seconds
  useEffect(() => {
    const currentMessage = successMessage || errorMessage;
    // Only update state if the message has changed to avoid cascading renders
    if (currentMessage && currentMessage !== previousMessageRef.current) {
      previousMessageRef.current = currentMessage;
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        // Clean up URL after dismissing
        router.replace(`/game/${game.id}`, { scroll: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage, router, game.id]);

  const getToastMessage = () => {
    if (successMessage === 'rsvp_added') return { type: 'success', text: 'RSVP confirmed! You\'re all set for poker night.' };
    if (successMessage === 'rsvp_cancelled') return { type: 'success', text: 'RSVP cancelled. Your spot has been released.' };
    if (errorMessage === 'invalid_token') return { type: 'error', text: 'Invalid or expired link. Please RSVP manually.' };
    if (errorMessage === 'token_mismatch') return { type: 'error', text: 'Invalid link. Please RSVP manually.' };
    if (errorMessage === 'action_failed') return { type: 'error', text: 'Action failed. Please try again.' };
    return null;
  };

  const toastData = getToastMessage();

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

  const handleEditGame = async (formData: { date: string; time: string; buyIn: number; location_id: string; notes: string }) => {
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

  const statusLabels = {
    upcoming: 'Upcoming',
    in_progress: 'Live',
    completed: 'Completed',
  };

  return (
    <>
      {/* Toast Notification */}
      {showToast && toastData && (
        <div
          className={`fixed top-20 right-4 z-50 max-w-md glass-panel backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-6 py-4 rounded-2xl transform transition-all duration-300 animate-slide-in ${
            toastData.type === 'success'
              ? 'border-2 border-poker-gold/50 bg-black/80'
              : 'border-2 border-red-500/50 bg-black/80'
          }`}
        >
          <div className="flex items-center gap-3">
            {toastData.type === 'success' ? (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-poker-gold/20 border border-poker-gold/30 flex items-center justify-center">
                <Check weight="bold" className="text-poker-gold" size={20} />
              </div>
            ) : (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <X weight="bold" className="text-red-400" size={20} />
              </div>
            )}
            <p className="font-medium text-white flex-1">{toastData.text}</p>
            <button
              onClick={() => {
                setShowToast(false);
                router.replace(`/game/${game.id}`, { scroll: false });
              }}
              className="ml-2 text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* Promotion Banner */}
      {showPromotion && (
        <div className="mb-6 glass-panel border-2 border-poker-gold/50 bg-black/60 backdrop-blur-xl rounded-2xl p-5 animate-slide-in shadow-[0_8px_32px_rgba(212,175,55,0.2)]">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-poker-gold/20 border border-poker-gold/30 flex items-center justify-center">
              <Trophy weight="fill" size={24} className="text-poker-gold" />
            </div>
            <p className="text-white font-display font-bold text-lg">
              You&apos;ve been promoted from the waitlist!
            </p>
          </div>
        </div>
      )}

      {/* Back Button */}
      <BackButton />

      {/* Game Info Header */}
      <div className="glass-panel rounded-2xl p-8 mb-8 border border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
          <div className="flex-1">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-4">
              {formatDateWithDay(game.date)}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-gray-300">
              <div className="flex items-center gap-2">
                <Clock weight="bold" className="text-poker-gold" size={20} />
                <span className="font-medium">{formatTime(game.time)}</span>
              </div>
              <span className="hidden sm:inline text-gray-600">•</span>
              <div className="flex items-center gap-2">
                <MapPin weight="fill" className="text-poker-gold" size={20} />
                <span className="font-medium">{game.venue}</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border-2 ${
            displayStatus === 'upcoming'
              ? 'bg-blue-950/50 border-blue-500 text-blue-400'
              : displayStatus === 'in_progress'
              ? 'bg-orange-950/50 border-orange-500 text-orange-400'
              : 'bg-green-950/50 border-green-500 text-green-400'
          }`}>
            {gameShouldBeLive && <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            {statusLabels[displayStatus]}
          </div>
        </div>

        {/* Buy-in Display */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-poker-gold/10 border border-poker-gold/30 rounded-xl">
          <CurrencyDollar weight="fill" className="text-poker-gold text-3xl" />
          <div>
            <span className="text-3xl font-display font-bold text-poker-gold">{formatCurrency(game.buyIn)}</span>
            <span className="text-gray-400 ml-2 text-lg">buy-in</span>
          </div>
        </div>

        {game.notes && (
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl mb-6">
            <p className="text-gray-300 italic">
              {game.notes}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* View Live Game - show for any live game */}
          {gameShouldBeLive && game.status !== 'completed' && (
            <button
              onClick={() => router.push(`/game/${game.id}/live`)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-lg transition-all border border-orange-300 shadow-lg"
            >
              <Play weight="fill" size={20} />
              <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
              View Live Game
            </button>
          )}

          {/* Start Game - only for admins on upcoming games that aren't live yet */}
          {!gameShouldBeLive && game.status === 'upcoming' && isToday(game.date) && confirmedRSVPs.length > 0 && isAdmin && (
            <button
              onClick={handleStartGame}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play weight="fill" size={20} />
              Start Game
            </button>
          )}

          {/* View Results - completed games */}
          {game.status === 'completed' && (
            <button
              onClick={() => router.push(`/game/${game.id}/results`)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200 shadow-lg"
            >
              <Trophy weight="fill" size={20} />
              View Results
            </button>
          )}

          {/* Edit - admins can edit upcoming and live games (not completed) */}
          {game.status !== 'completed' && isAdmin && (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                disabled={isPending}
                className="px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Pencil weight="bold" size={20} />
                Edit Game
              </button>
              {/* Delete - only for upcoming games that aren't live yet */}
              {!gameShouldBeLive && game.status === 'upcoming' && (
                <button
                  onClick={handleDeleteGame}
                  disabled={isPending}
                  className="px-6 py-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Trash weight="bold" size={20} />
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* RSVP Section - show for upcoming games, or for admins on live games */}
      {((!gameShouldBeLive && game.status === 'upcoming') || (game.status !== 'completed' && isAdmin)) && (
        <>
          {/* Warning banner for admins editing live games */}
          {gameShouldBeLive && isAdmin && (
            <div className="mb-6 glass-panel border-2 border-amber-500 bg-amber-950/50 rounded-xl p-4">
              <p className="text-amber-400 font-bold flex items-center gap-2">
                <X weight="bold" size={24} className="text-amber-500" />
                Managing RSVPs for a live game - changes take effect immediately
              </p>
            </div>
          )}

          <div className="glass-panel rounded-2xl p-6 mb-6 border border-white/10">
            <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Users weight="bold" className="text-poker-gold" size={28} />
              RSVP {gameShouldBeLive && isAdmin && <span className="text-sm text-amber-400 ml-2">(Admin Only)</span>}
            </h2>

            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-400 font-medium">
                  {confirmedRSVPs.length}/8 Seats Filled
                </span>
                {waitlistRSVPs.length > 0 && (
                  <span className="text-amber-400 font-medium">
                    {waitlistRSVPs.length} on waitlist
                  </span>
                )}
              </div>
              {/* Seat Indicator */}
              <div className="flex gap-2">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 flex-1 rounded-full transition-all ${
                      i < confirmedRSVPs.length
                        ? 'bg-poker-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Admin can RSVP any player */}
            {isAdmin && (
              <div className="flex gap-3">
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="flex-1 px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-poker-gold focus:border-poker-gold transition-all"
                  disabled={isPending}
                >
                  <option value="">Select player to RSVP...</option>
                  {availablePlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {formatPlayerName(player)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleRSVP}
                  disabled={!selectedPlayerId || isPending}
                  className="px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  RSVP Player
                </button>
              </div>
            )}

            {/* Non-admin players can RSVP themselves (only on upcoming games) */}
            {!isAdmin && !gameShouldBeLive && user && canSelfRSVP && currentPlayer && (
              <button
                onClick={() => {
                  startTransition(async () => {
                    const result = await addRSVP(game.id, currentPlayer.id);
                    if ('error' in result) {
                      alert(result.error);
                    }
                  });
                }}
                disabled={isPending}
                className="w-full px-6 py-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                RSVP for Myself
              </button>
            )}

            {/* Show message if player already RSVP'd (only on upcoming games) */}
            {!isAdmin && !gameShouldBeLive && user && hasRSVPd && (
              <div className="p-4 bg-green-950/50 border-2 border-green-500 rounded-xl">
                <p className="text-green-400 text-center font-bold flex items-center justify-center gap-2">
                  <Check weight="bold" size={20} />
                  You&apos;re {hasRSVPd.status === 'confirmed' ? 'confirmed' : `#${hasRSVPd.waitlistPosition} on the waitlist`}
                </p>
              </div>
            )}

            {/* Show login prompt for non-authenticated users (only on upcoming games) */}
            {!isAdmin && !gameShouldBeLive && !user && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-gray-300 text-center text-sm">
                  <a href="/login" className="text-poker-gold hover:underline font-bold">Sign in</a> to RSVP for this game
                </p>
              </div>
            )}
          </div>

          {/* Confirmed Players */}
          {confirmedRSVPs.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 mb-6 border border-white/10">
              <h3 className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Check weight="bold" className="text-green-400" size={24} />
                Confirmed Players ({confirmedRSVPs.length})
              </h3>
              <div className="space-y-2">
                {confirmedRSVPs.map((rsvp, index) => {
                  const player = players.find(p => p.id === rsvp.playerId);
                  if (!player) return null;
                  return (
                    <div
                      key={rsvp.id}
                      className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-poker-gold/20 border border-poker-gold/40 flex items-center justify-center">
                          <span className="text-poker-gold font-bold text-lg">
                            {index + 1}
                          </span>
                        </div>
                        <Image
                          src={`/avatars/${player.avatar}`}
                          alt={formatPlayerName(player)}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full border-2 border-gray-600"
                        />
                        <span className="text-white font-display font-bold">
                          {formatPlayerName(player)}
                        </span>
                      </div>
                      {(isAdmin || (user && player.email === user.email)) && (
                        <button
                          onClick={() => handleCancelRSVP(player.id)}
                          disabled={isPending}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Waitlist */}
          {waitlistRSVPs.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 border border-white/10">
              <h3 className="font-display text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">
                <ListBullets weight="bold" className="text-amber-500" size={24} />
                Waitlist ({waitlistRSVPs.length})
              </h3>
              <div className="space-y-2">
                {waitlistRSVPs.map((rsvp) => {
                  const player = players.find(p => p.id === rsvp.playerId);
                  if (!player) return null;
                  return (
                    <div
                      key={rsvp.id}
                      className="flex items-center justify-between p-4 bg-amber-950/30 hover:bg-amber-950/50 border border-amber-700/30 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-900/40 border border-amber-700/50 flex items-center justify-center">
                          <span className="text-amber-400 font-bold">
                            #{rsvp.waitlistPosition}
                          </span>
                        </div>
                        <Image
                          src={`/avatars/${player.avatar}`}
                          alt={formatPlayerName(player)}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full border-2 border-amber-600"
                        />
                        <span className="text-white font-display font-bold">
                          {formatPlayerName(player)}
                        </span>
                      </div>
                      {(isAdmin || (user && player.email === user.email)) && (
                        <button
                          onClick={() => handleCancelRSVP(player.id)}
                          disabled={isPending}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 p-3 bg-amber-950/20 border border-amber-700/30 rounded-lg">
                <p className="text-amber-400/70 text-sm flex items-center gap-2">
                  <Trophy weight="fill" className="text-amber-500" size={16} />
                  Waitlisted players will be automatically promoted if someone cancels
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* In Progress Message */}
      {game.status === 'in_progress' && (
        <div className="glass-panel rounded-2xl p-12 text-center border border-white/10">
          <Play weight="fill" className="text-orange-500 text-6xl mx-auto mb-4 animate-pulse" />
          <h3 className="font-display text-3xl font-bold text-white mb-4">Game in Progress</h3>
          <p className="text-gray-400 mb-8 text-lg">
            The game is currently being played. Click below to track buy-ins and rebuys.
          </p>
          <button
            onClick={() => router.push(`/game/${game.id}/live`)}
            className="px-8 py-4 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-lg transition-all border border-orange-300 shadow-lg inline-flex items-center gap-2"
          >
            <Play weight="fill" size={20} />
            Go to Live Tracker
          </button>
        </div>
      )}

      {/* Completed Message */}
      {game.status === 'completed' && (
        <div className="glass-panel rounded-2xl p-12 text-center border border-white/10">
          <Trophy weight="fill" className="text-poker-gold text-6xl mx-auto mb-4 animate-gold-pulse" />
          <h3 className="font-display text-3xl font-bold text-white mb-4">Game Completed</h3>
          <p className="text-gray-400 mb-8 text-lg">
            This game has ended. View the final results and player performance.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push(`/game/${game.id}/results`)}
              className="px-8 py-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200 shadow-lg inline-flex items-center gap-2"
            >
              <Trophy weight="fill" size={20} />
              View Results
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Pencil weight="bold" size={20} />
                  Edit Game Details
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Reset this game back to live tracking? This will allow you to edit player results.')) {
                      startTransition(async () => {
                        await startGame(game.id);
                        router.push(`/game/${game.id}/live`);
                      });
                    }
                  }}
                  disabled={isPending}
                  className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset to Live
                </button>
                <button
                  onClick={handleDeleteGame}
                  disabled={isPending}
                  className="px-6 py-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Trash weight="bold" size={20} />
                  Delete Game
                </button>
              </>
            )}
          </div>
        </div>
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
          location_id: game.location_id || '',
          notes: game.notes || '',
        }}
        mode="edit"
      />
    </>
  );
}
