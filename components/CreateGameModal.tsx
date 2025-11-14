'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createGame } from '@/app/actions';
import GameFormModal from './GameFormModal';

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGameModal({ isOpen, onClose }: CreateGameModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: { date: string; time: string; buyIn: number; venue: string; notes: string }) => {
    startTransition(async () => {
      const result = await createGame(formData);

      if ('error' in result) {
        alert(result.error);
        return;
      }

      onClose();

      // Redirect to game page
      if (result.data) {
        router.push(`/game/${result.data.id}`);
      }
    });
  };

  return (
    <GameFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      mode="create"
    />
  );
}
