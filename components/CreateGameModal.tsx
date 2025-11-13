'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameFormModal from './GameFormModal';

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGameModal({ isOpen, onClose }: CreateGameModalProps) {
  const router = useRouter();

  const handleSubmit = async (formData: { date: string; time: string; buyIn: number; venue: string; notes: string }) => {
    if (!supabase) return;

    // Insert game into Supabase
    const { data, error } = await supabase
      .from('games')
      .insert({
        date: formData.date,
        time: formData.time,
        buyIn: formData.buyIn,
        venue: formData.venue,
        status: 'upcoming',
        notes: formData.notes || null,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
      throw error;
    }

    onClose();

    // Redirect to game page
    if (data) {
      router.push(`/game/${data.id}`);
    }
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
