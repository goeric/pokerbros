'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Location } from '@/types';
import Modal from './Modal';
import { formatDate, formatDateWithDay, formatTime } from '@/lib/utils';
import { Calendar, Clock, CurrencyDollar, MapPin, NotePencil, Trophy } from '@phosphor-icons/react';

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
        {/* Date Field */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Calendar weight="bold" className="text-poker-gold" size={18} />
            Date
          </label>
          {mode === 'edit' && date && (
            <div className="mb-3 px-4 py-2 glass-panel rounded-lg border border-poker-gold/20">
              <p className="font-display text-lg font-bold text-white">
                {formatDateWithDay(date)}
              </p>
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
            className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white focus:ring-2 focus:ring-poker-gold/20 focus:outline-none cursor-pointer transition-all font-medium"
            required
          />
          {mode === 'create' && (
            <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
              <span className="text-poker-gold">💡</span> Fridays are poker night tradition!
            </p>
          )}
        </div>

        {/* Time Field */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Clock weight="bold" className="text-poker-gold" size={18} />
            Shuffle Up Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all font-medium"
            required
          />
        </div>

        {/* Buy-in Field */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <CurrencyDollar weight="bold" className="text-poker-gold" size={18} />
            Buy-in Amount
          </label>
          <div className="relative">
            <CurrencyDollar weight="bold" className="absolute left-4 top-1/2 -translate-y-1/2 text-poker-gold" size={20} />
            <input
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(Number(e.target.value))}
              min="1"
              step="1"
              className="w-full pl-12 pr-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white text-center font-display font-bold text-2xl focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* Location Field */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <MapPin weight="bold" className="text-poker-gold" size={18} />
            Location
          </label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all font-medium"
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
            <p className="text-gray-400 text-sm mt-2 flex items-center gap-1">
              <MapPin weight="fill" className="text-poker-gold" size={14} />
              {selectedLocation.address}
            </p>
          )}
          {locations.length === 0 && (
            <p className="text-amber-400 text-sm mt-2 flex items-center gap-1">
              <span className="text-amber-400">⚠️</span>
              No locations available. <a href="/admin/locations" className="underline hover:text-amber-300">Add one first</a>
            </p>
          )}
        </div>

        {/* Notes Field */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <NotePencil weight="bold" className="text-poker-gold" size={18} />
            Notes <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={mode === 'create' ? 'Any special details about the game...' : 'Special rules, food, drinks...'}
            rows={3}
            className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-poker-gold/20 focus:outline-none resize-none transition-all"
          />
        </div>

        {/* Live Preview - only show for create mode */}
        {mode === 'create' && isFormValid && (
          <div className="glass-panel rounded-xl p-5 border-2 border-poker-gold/30 bg-gradient-to-b from-poker-gold/10 to-transparent">
            <div className="flex items-center gap-2 mb-3">
              <Trophy weight="fill" className="text-poker-gold" size={18} />
              <p className="text-xs text-poker-gold font-bold uppercase tracking-wider">Preview</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-bold text-white">
                  {date && formatDate(date)}
                </p>
                <p className="text-gray-400 text-sm">
                  {formatTime(time)} at {selectedLocation?.name || 'TBD'}
                </p>
              </div>
              <div className="font-display text-3xl font-bold text-poker-gold">
                ${buyIn}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="flex-1 px-6 py-3 bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold text-black font-display font-bold rounded-xl transition-all border border-yellow-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (mode === 'create' ? 'Creating...' : 'Saving...') : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
