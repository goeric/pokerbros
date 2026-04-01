'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Game } from '@/types';
import { Play, Trophy, Pencil, Trash } from '@phosphor-icons/react';
import { startGame, deleteGame } from '../actions';

interface GameStatusMessageProps {
  game: Game;
  isAdmin: boolean;
  onEdit: () => void;
}

export default function GameStatusMessage({
  game,
  isAdmin,
  onEdit,
}: GameStatusMessageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDeleteGame = async () => {
    const confirmationMessage = game.status === 'in_progress'
      ? 'Delete this live game? This will remove live tracking, RSVPs, and any recorded buy-ins. This action cannot be undone.'
      : 'Delete this game? This action cannot be undone.';

    if (!confirm(confirmationMessage)) return;

    startTransition(async () => {
      const result = await deleteGame(game.id);
      if ('error' in result) {
        alert(result.error);
        return;
      }
      router.push('/');
    });
  };

  const handleResetToLive = async () => {
    if (!confirm('Reset this game back to live tracking? This will allow you to edit player results.')) return;

    startTransition(async () => {
      await startGame(game.id);
      router.push(`/game/${game.id}/live`);
    });
  };

  if (game.status === 'in_progress') {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-white/10">
        <Play weight="fill" className="text-orange-500 text-6xl mx-auto mb-4 animate-pulse" />
        <h3 className="font-display text-3xl font-bold text-white mb-4">Game in Progress</h3>
        <p className="text-gray-400 mb-8 text-lg">
          The game is currently being played. Click below to track buy-ins and rebuys.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push(`/game/${game.id}/live`)}
            className="px-8 py-4 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-lg transition-all border border-orange-300 shadow-lg inline-flex items-center gap-2"
          >
            <Play weight="fill" size={20} />
            Go to Live Tracker
          </button>
          {isAdmin && (
            <button
              onClick={handleDeleteGame}
              disabled={isPending}
              className="px-6 py-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash weight="bold" size={20} />
              Delete Game
            </button>
          )}
        </div>
      </div>
    );
  }

  if (game.status === 'completed') {
    return (
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
                onClick={onEdit}
                className="px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Pencil weight="bold" size={20} />
                Edit Game Details
              </button>
              <button
                onClick={handleResetToLive}
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
    );
  }

  return null;
}
