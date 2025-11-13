'use client';

import { useState, useTransition } from 'react';
import { Player } from '@/types';
import Button from '@/components/Button';
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

        if (result.error) {
          setError(result.error);
        } else {
          onClose();
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={player ? 'Edit Player' : 'Add Player'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name *
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              defaultValue={player?.first_name || ''}
              required
              disabled={isPending}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
              placeholder="John"
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Name *
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              defaultValue={player?.last_name || ''}
              required
              disabled={isPending}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nickname
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            defaultValue={player?.nickname || ''}
            disabled={isPending}
            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
            placeholder="The Shark (optional)"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={player?.email || ''}
            required
            disabled={isPending}
            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50"
            placeholder="john@example.com"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isPending}
          >
            {isPending ? 'Saving...' : player ? 'Update Player' : 'Add Player'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
