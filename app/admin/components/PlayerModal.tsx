'use client';

import { useState, useTransition } from 'react';
import { Player } from '@/types';
import Modal from '@/components/Modal';
import { createPlayer, updatePlayer } from '../actions';

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player?: Player | null;
}

export default function PlayerModal({ isOpen, onClose, player }: PlayerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        let result;
        if (player) {
          result = await updatePlayer(player.id, formData);
        } else {
          result = await createPlayer(formData);
        }

        if ('error' in result) {
          setError(result.error);
        } else {
          onClose();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={player ? 'Edit Player' : 'Add Player'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-500/20 border-2 border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-semibold text-gray-300 mb-2">
              First Name *
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              defaultValue={player?.first_name || ''}
              required
              disabled={isPending}
              className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all disabled:opacity-50"
              placeholder="John"
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-semibold text-gray-300 mb-2">
              Last Name *
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              defaultValue={player?.last_name || ''}
              required
              disabled={isPending}
              className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all disabled:opacity-50"
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label htmlFor="nickname" className="block text-sm font-semibold text-gray-300 mb-2">
            Nickname
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            defaultValue={player?.nickname || ''}
            disabled={isPending}
            className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all disabled:opacity-50"
            placeholder="The Shark (optional)"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={player?.email || ''}
            required
            disabled={isPending}
            className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all disabled:opacity-50"
            placeholder="john@example.com"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all border border-yellow-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving...' : player ? 'Update Player' : 'Add Player'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
