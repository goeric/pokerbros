'use client';

import React from 'react';
import { localStore } from '@/lib/store';

export default function DemoModeBanner() {
  const handleReset = () => {
    if (confirm('Reset all data to demo defaults?')) {
      localStore.reset();
      window.location.reload();
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 border-b border-amber-700/50 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎮</span>
          <div>
            <p className="text-amber-400 font-semibold text-sm">Demo Mode Active</p>
            <p className="text-amber-200/70 text-xs">All data is stored locally in your browser</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 bg-amber-800/50 hover:bg-amber-700/50 text-amber-200 rounded-lg text-sm font-medium transition-colors border border-amber-700"
        >
          Reset Data
        </button>
      </div>
    </div>
  );
}
