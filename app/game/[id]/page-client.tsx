'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Game, RSVP, Player } from '@/types';
import { formatDateWithDay, formatTime, formatCurrency, isToday, isGameLive } from '@/lib/utils';
import BackButton from '@/components/BackButton';
import GameFormModal from '@/components/GameFormModal';
import RSVPSection from './components/RSVPSection';
import GameStatusMessage from './components/GameStatusMessage';
import { addRSVP, cancelRSVP, startGame, updateGame, deleteGame } from './actions';
import { Clock, MapPin, CurrencyDollar, Play, Pencil, Trash, Check, X, Trophy } from '@phosphor-icons/react';

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
  const [showPromotion, _setShowPromotion] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const previousMessageRef = useRef<string | undefined>(undefined);

  // Show toast and auto-dismiss after 5 seconds
  useEffect(() => {
    const currentMessage = successMessage || errorMessage;
    if (currentMessage && currentMessage !== previousMessageRef.current) {
      previousMessageRef.current = currentMessage;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing toast visibility with URL params
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
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
  const gameShouldBeLive = isGameLive(game);
  const confirmedRSVPs = rsvps.filter(r => r.status === 'confirmed');
  const displayStatus = gameShouldBeLive ? 'in_progress' : game.status;

  const statusLabels = {
    upcoming: 'Upcoming',
    in_progress: 'Live',
    completed: 'Completed',
  };

  const handleRSVP = async () => {
    if (!selectedPlayerId) return;
    startTransition(async () => {
      await addRSVP(game.id, selectedPlayerId);
      setSelectedPlayerId('');
    });
  };

  const handleSelfRSVP = async () => {
    const currentPlayer = user?.email ? players.find(p => p.email === user.email) : null;
    if (!currentPlayer) return;
    startTransition(async () => {
      const result = await addRSVP(game.id, currentPlayer.id);
      if ('error' in result) {
        alert(result.error);
      }
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
            <p className="text-gray-300 italic">{game.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
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

          {game.status === 'completed' && (
            <button
              onClick={() => router.push(`/game/${game.id}/results`)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-bold rounded-lg transition-all border border-yellow-200 shadow-lg"
            >
              <Trophy weight="fill" size={20} />
              View Results
            </button>
          )}

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

      {/* RSVP Section */}
      <RSVPSection
        game={game}
        rsvps={rsvps}
        players={players}
        user={user}
        isAdmin={isAdmin}
        isPending={isPending}
        gameShouldBeLive={gameShouldBeLive}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={setSelectedPlayerId}
        onRSVP={handleRSVP}
        onSelfRSVP={handleSelfRSVP}
        onCancelRSVP={handleCancelRSVP}
      />

      {/* Game Status Messages */}
      <GameStatusMessage
        game={game}
        isAdmin={isAdmin}
        onEdit={() => setShowEditModal(true)}
      />

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
