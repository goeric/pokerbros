'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Location } from '@/types';
import Modal from './Modal';
import Button from './Button';
import { formatDate, formatDateWithDay, formatTime } from '@/lib/utils';

interface GameFormData {
  date: string;
  time: string;
  buyIn: number;
  location_id: string;
  notes: string;
}

interface GameFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GameFormData) => Promise<void>;
  initialData?: Partial<GameFormData>;
  mode: 'create' | 'edit';
}

export default function GameFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: GameFormModalProps) {
  const [date, setDate] = useState(initialData?.date || '');
  const [time, setTime] = useState(initialData?.time || '19:00');
  const [buyIn, setBuyIn] = useState(initialData?.buyIn || 20);
  const [locationId, setLocationId] = useState(initialData?.location_id || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  // Fetch locations on mount
  useEffect(() => {
    async function fetchLocations() {
      if (!supabase) return;
      const { data } = await supabase
        .from('locations')
        .select('*')
        .order('name');
      if (data) {
        const typedData = data as Location[];
        setLocations(typedData);
        // If no location selected yet and we have locations, select the first one
        if (!locationId && typedData.length > 0) {
          setLocationId(typedData[0].id);
        }
      }
    }
    fetchLocations();
  }, []);

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setDate(initialData.date || '');
      setTime(initialData.time || '19:00');
      setBuyIn(initialData.buyIn || 20);
      setLocationId(initialData.location_id || '');
      setNotes(initialData.notes || '');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit({ date, time, buyIn, location_id: locationId, notes });

      // Reset form only for create mode
      if (mode === 'create') {
        setDate('');
        setTime('19:00');
        setBuyIn(20);
        setLocationId(locations[0]?.id || '');
        setNotes('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = date && time && buyIn > 0 && locationId;
  const selectedLocation = locations.find(l => l.id === locationId);
  const title = mode === 'create' ? 'Host New Game' : 'Edit Game';
  const submitLabel = mode === 'create' ? 'Create Game' : 'Save Changes';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date
          </label>
          {mode === 'edit' && date && (
            <div className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              {formatDateWithDay(date)}
            </div>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch (error) {
                // showPicker() not supported in all browsers, fallback to default behavior
              }
            }}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-poker-green focus:border-transparent cursor-pointer"
            required
          />
          {mode === 'create' && (
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
              💡 Fridays are poker night tradition!
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-poker-green focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Buy-in Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">
              $
            </span>
            <input
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              min="1"
              step="1"
              className="w-full pl-8 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-poker-green focus:border-transparent"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Location
          </label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-poker-green focus:border-transparent"
            required
          >
            <option value="">Select a location...</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          {selectedLocation && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              📍 {selectedLocation.address}
            </p>
          )}
          {locations.length === 0 && (
            <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">
              No locations available. <a href="/admin/locations" className="underline">Add one first</a>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={mode === 'create' ? 'Any special details about the game...' : 'Special rules, food, drinks...'}
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-poker-green focus:border-transparent resize-none"
          />
        </div>

        {/* Live Preview - only show for create mode */}
        {mode === 'create' && isFormValid && (
          <div className="bg-gray-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Preview</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 dark:text-white font-bold">
                  {date && formatDate(date)}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {formatTime(time)} at {selectedLocation?.name || 'TBD'}
                </p>
              </div>
              <div className="text-poker-gold-light dark:text-poker-gold-dark font-bold">
                ${buyIn}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            fullWidth
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!isFormValid || isSubmitting}
            fullWidth
          >
            {isSubmitting ? (mode === 'create' ? 'Creating...' : 'Saving...') : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
